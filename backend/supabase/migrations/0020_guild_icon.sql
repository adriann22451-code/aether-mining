-- =========================================================
-- AETHER MINING — guild emblems (Phase 20)
--
-- Guild creation had no icon/emblem option — every guild was just a
-- colored box with its tag letters. This adds a simple `icon` key
-- column (validated server-side against a fixed allow-list matching
-- src/data/guild.js's GUILD_ICON_PRESETS) so guilds can show a real
-- emblem image instead. The actual images are static public/ assets,
-- not uploads, so we only ever store the preset *key*, never a URL.
-- =========================================================

alter table guilds add column if not exists icon text not null default 'flame-core';
