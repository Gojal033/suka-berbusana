# suka.berbusana

Web app katalog dan stok jaket untuk suka.berbusana.

- `index.html`: katalog publik yang hanya membaca produk terbit.
- `admin.html`: dashboard penjual dengan login Supabase.
- Pemulihan password admin melalui email Supabase.
- Supabase Database: data produk dan ukuran.
- Supabase Storage: beberapa foto per produk.
- Row Level Security: publik hanya membaca; satu UID admin dapat mengubah data.

## GitHub Pages

Repository Settings → Pages → Deploy from a branch → `main` / `(root)`.
