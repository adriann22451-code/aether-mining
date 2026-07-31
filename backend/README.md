# Aether Mining — Backend (Supabase)

This is the server side: Postgres schema + Edge Functions. It makes the
economy server-authoritative and lays the groundwork for a real
Marketplace between real players.

## What's in this package

```
supabase/
  migrations/
    0001_init.sql             -- tables, indexes, RLS, players_public view
    0002_marketplace_rpc.sql  -- atomic buy/list/cancel functions
  functions/
    _shared/
      telegram.ts   -- verifies Telegram initData (HMAC signature check)
      gameData.ts   -- server's copy of the hp/cost/halving formulas
      cors.ts
    sync-player/    -- login, fetch your data, claim mining income
    marketplace/     -- browse/list/buy/cancel real listings
```

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Note your **Project URL** and **anon key** (Settings → API) — you'll need
   the anon key in the frontend later, and the URL for the CLI.

## 2. Install the Supabase CLI and link the project

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
```

## 3. Run the migrations

```bash
supabase db push
```

This creates all tables, the RLS policies, the `players_public` view, and
the three marketplace RPC functions, and seeds the three starter guilds.

## 4. Set secrets for the Edge Functions

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC-your-bot-token-here
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically
by Supabase — you don't set those yourself.)

## 5. Deploy the Edge Functions

```bash
supabase functions deploy sync-player
supabase functions deploy marketplace
```

Each one gets a URL like:
```
https://<project-ref>.functions.supabase.co/sync-player
https://<project-ref>.functions.supabase.co/marketplace
```

## 6. Test it (before touching the frontend)

You can hit these with `curl` using a **fake** initData string for now
just to confirm the function boots and returns a signature error (proving
verification is actually running):

```bash
curl -X POST https://<project-ref>.functions.supabase.co/sync-player \
  -H "Content-Type: application/json" \
  -d '{"initData":"user=%7B%22id%22%3A1%7D&auth_date=123&hash=fake","action":"init"}'
```

You should get back `{"error":"Invalid Telegram initData signature"}` —
that's correct, it means verification is working (a fake hash is
correctly rejected). Real testing needs a real `initData` string, which
only comes from opening the Mini App inside actual Telegram.

## ⚠️ Important — the frontend isn't wired up to this yet

Everything above is real, deployable, working backend code. But
`app.jsx` right now still saves to **Telegram CloudStorage**, not to
these Edge Functions. Connecting them is Phase 3 work:

- Send `Telegram.WebApp.initData` to `sync-player` (`action: "init"`) once
  on load instead of reading CloudStorage.
- Call `sync-player` (`action: "claim"`) instead of the local
  `handleClaim`/auto-claim logic, and use the server's returned `core`
  value instead of computing it client-side.
- Replace the simulated bot Marketplace (`marketListings`, bot sellers,
  `makeBotListing()`) with real calls to the `marketplace` function.
- Do the same for Shop purchases, Upgrades, and Crafting (right now these
  still mutate `core` directly in the browser — for a truly cheat-proof
  game, these need their own Edge Functions too, following the same
  pattern as `sync-player`'s claim logic).

## What's deliberately NOT done yet (Phase 3+)

- **Guild**: joining/contributing is still simulated client-side. Making
  it real means a `join-guild` and `contribute` Edge Function, and
  computing the shared milestone pool from real member hashrates.
- **Leaderboard**: the query is trivial once players are real
  (`select * from players_public order by cached_hashrate desc limit 20`)
  but nothing calls it yet.
- **Shop / Upgrade / Craft as authoritative**: same pattern as
  `sync-player`, just not written yet — happy to do these next.
- Tightening `Access-Control-Allow-Origin` in `_shared/cors.ts` from `*`
  to your actual Mini App domain once it's live.

Want me to keep going and wire these into `app.jsx`, plus write the
Shop/Upgrade/Craft/Guild Edge Functions? Just say the word.
