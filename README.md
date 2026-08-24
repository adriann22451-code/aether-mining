# Aether Mining — Frontend (dirapikan)

Versi rapi dari `telegram-mini-app/app.jsx` (aslinya 1 file, ~5,2 MB, 4.764 baris).
Fungsionalitas **tidak diubah sama sekali** — hanya dipecah menjadi modul dan
dipindah ke build step Vite. Setiap potongan kode sudah diverifikasi 1:1 identik
dengan sumber aslinya (lihat "Cara verifikasi" di bawah).

## Yang berubah

1. **34 gambar base64 di-ekstrak ke file asli** (`src/assets/images/`), diimpor
   lewat `import X from "./assets/images/x.png"` — inilah alasan utama file
   lama berukuran 5,2 MB (gambar-gambar itu >90% dari isi file).
2. **Kode dipecah per tanggung jawab**:
   - `src/data/` — konstanta & rumus game (parts, sites, market, mission, event,
     craft, guild, lootbox, inventory, economy/halving, dst)
   - `src/lib/` — util murni (`format.js`, `hooks.js` / `useTween`, `api.js` /
     helper Supabase)
   - `src/components/icons/` — 12 komponen ikon custom
   - `src/components/cards/` — kartu-kartu list (Part, Shop, Market, Craft, dst)
   - `src/components/modals/` & `src/components/layout/` — modal & BottomNav/Header
   - `src/screens/` — 14 layar (Dashboard, Shop, Market, Profile, Guild, dst)
   - `src/App.jsx` — komponen root (state utama, tetap 1 file karena semua
     screen memang berbagi satu state besar di desain aslinya)
   - `src/main.jsx` — entry point (pengganti bagian `createRoot(...)` di akhir
     file lama)
3. **Build step ditambahkan** (Vite + `@vitejs/plugin-react`) — sebelumnya JSX
   di-transform langsung di browser pakai Babel Standalone tanpa proses build.
4. **Tailwind dipindah dari CDN ke setup lokal** (`tailwind.config.js` +
   `postcss.config.js`) untuk konsistensi dengan pipeline Vite.
5. Satu inkonsistensi kecil dirapikan: `React.useRef(...)` → `useRef(...)`
   (satu-satunya tempat yang tadinya memakai `React.xxx` alih-alih hook yang
   sudah di-destructure).

`backend/` (Supabase) disalin apa adanya — tidak disentuh, di luar scope
permintaan ini.

## Cara menjalankan

```bash
npm install
npm run dev       # dev server, buka http://localhost:5173
npm run build     # build produksi ke dist/
```

## Cara verifikasi (opsional, untuk dicek sendiri)

Setiap fungsi/konstanta top-level di file lama sudah dicocokkan karakter-per-karakter
dengan isi file barunya — 109 dari 109 blok kode cocok 100%, dan `tsc --noEmit`
(mode JSX, tanpa type-check) tidak menemukan satupun error sintaks atau import
yang salah alamat di 50 file yang dihasilkan.

## Catatan

- `src/App.jsx` sengaja masih besar (~1.100 baris) karena memang di situlah
  semua `useState` dan handler event game disimpan di desain aslinya — memecahnya
  lebih jauh butuh refactor state management (mis. Context/reducer), bukan
  sekadar "merapikan file", jadi saya tidak ubah itu tanpa diminta.
- Endpoint TON Connect manifest masih menunjuk ke
  `https://aether-mining.vercel.app/tonconnect-manifest.json` — sesuaikan kalau
  domain deploy berubah.
