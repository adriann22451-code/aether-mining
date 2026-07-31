-- =========================================================
-- AETHER MINING — Marketplace RPC functions (Phase 2)
-- These run as single atomic transactions in Postgres itself, so two
-- buyers can never both "win" the same listing, and a seller can never
-- list more of an item than they actually have.
-- =========================================================

create or replace function create_listing(
  p_seller_id uuid,
  p_item_name text,
  p_item_type text,
  p_price numeric
) returns marketplace_listings
language plpgsql
security definer
as $$
declare
  v_qty int;
  v_listing marketplace_listings;
begin
  if p_price <= 0 then
    raise exception 'Price must be positive';
  end if;

  select qty into v_qty from inventory_items
    where player_id = p_seller_id and name = p_item_name
    for update;

  if v_qty is null or v_qty < 1 then
    raise exception 'You do not have this item to list';
  end if;

  if v_qty = 1 then
    delete from inventory_items where player_id = p_seller_id and name = p_item_name;
  else
    update inventory_items set qty = qty - 1 where player_id = p_seller_id and name = p_item_name;
  end if;

  insert into marketplace_listings (seller_id, item_name, item_type, price)
    values (p_seller_id, p_item_name, p_item_type, p_price)
    returning * into v_listing;

  return v_listing;
end;
$$;

create or replace function cancel_listing(
  p_listing_id uuid,
  p_seller_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_listing marketplace_listings;
begin
  select * into v_listing from marketplace_listings
    where id = p_listing_id and status = 'active'
    for update;

  if v_listing.id is null then
    raise exception 'Listing not found or already resolved';
  end if;
  if v_listing.seller_id <> p_seller_id then
    raise exception 'This is not your listing';
  end if;

  update marketplace_listings set status = 'cancelled' where id = p_listing_id;

  insert into inventory_items (player_id, name, type, qty)
    values (p_seller_id, v_listing.item_name, v_listing.item_type, 1)
    on conflict (player_id, name) do update set qty = inventory_items.qty + 1;
end;
$$;

create or replace function buy_listing(
  p_listing_id uuid,
  p_buyer_id uuid
) returns marketplace_listings
language plpgsql
security definer
as $$
declare
  v_listing marketplace_listings;
  v_buyer_core numeric;
  v_fee_rate numeric := 0.05;
  v_net numeric;
begin
  select * into v_listing from marketplace_listings
    where id = p_listing_id and status = 'active'
    for update;

  if v_listing.id is null then
    raise exception 'Listing not found or already sold';
  end if;
  if v_listing.seller_id = p_buyer_id then
    raise exception 'You cannot buy your own listing';
  end if;

  select core into v_buyer_core from players where id = p_buyer_id for update;
  if v_buyer_core is null or v_buyer_core < v_listing.price then
    raise exception 'Not enough AETHER';
  end if;

  v_net := round(v_listing.price * (1 - v_fee_rate));

  update players set core = core - v_listing.price, updated_at = now() where id = p_buyer_id;
  update players set core = core + v_net, total_earned = total_earned + v_net, updated_at = now() where id = v_listing.seller_id;

  update marketplace_listings
    set status = 'sold', buyer_id = p_buyer_id, sold_at = now()
    where id = p_listing_id
    returning * into v_listing;

  insert into inventory_items (player_id, name, type, qty)
    values (p_buyer_id, v_listing.item_name, v_listing.item_type, 1)
    on conflict (player_id, name) do update set qty = inventory_items.qty + 1;

  return v_listing;
end;
$$;
