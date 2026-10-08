# Inventory Management

Live Vercel URL :
GitHub Repository URL : https://github.com/susantodlaksono/inventory-management

## Screenshots

docs/screenshots

## Getting started

Requires **Node.js 20.9+** (developed on Node 22).

```bash
npm install          # install dependencies
npm run dev          # start the dev server on http://localhost:3000
npm run test         # run unit + integration tests once
npm run build        # production build
npm start            # serve the production build
```

Other scripts:
| Script | What it does |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Tests with a V8 coverage report (fails under 80%) |
| `npm run typecheck` | Generates Next.js route types, then runs `tsc --noEmit` |
| `npm run lint` | ESLint (Next.js + TypeScript rules, `no-explicit-any` as an error) |

## Technical rationale & architecture

### 1. Race condition waktu user mengetik di search

Saya pakai debounce 300 ms supaya aplikasi menunggu user berhenti mengetik sebentar sebelum
mengirim pencarian. Input tetap langsung menampilkan apa yang diketik, tapi nilai search,
URL, dan request baru berubah setelah jeda tersebut.

untuk request cancellation, seperti case misalya user ngetik `phone` lalu mengetik `laptop`. tapi hasil phone data belakangan.saya terapkan cache di RTX Query supaya request sebelumnya tidak dibatalkan, jadi masing masing request punya cache sendiri. saya pakai `currentData` supaya yang tampil selalu hasil untuk
filter yang sedang dipilih.

Request search lama tidak dibatalkan saat kata pencarian berubah. handle
respons yang datang terlambat menggunakan pemisahan cache dan `currentData` tadi.

saat halam dibuka, filter url dimasukan ke redux sebelum query dijalankan, jadi link yg nanti dibagikan langsung memakai filter yg sesuai

### 2. Pembagian state antara Redux, API cache, dan React Hook Form

Saya membagi state berdasarkan kegunaannya supaya alur datanya lebih gampang diikuti.

Data produk dan category dari API dikelola oleh RTK Query. Cache ini sudah menyediakan status
loading, error, dan hasil request. Kalau data yang sama disalin lagi ke slice biasa, cache
itu diperbarui setiap ada perubahan produk.

Redux menyimpan state yang dipakai beberapa komponen: search, category, sorting, pagination,
table/card view etc. Filter juga disimpan di URL supaya bisa dikembalikan saat refresh atau saat link dibuka orang lain.

validasi form menggunakan React Hook Form, agar setiap ketikan tidak perlu dikirim ke Redux. Untuk draft, form disalin setelah autosave 400 ms, lalu disimpan ke Redux dan `localStorage` lewat middleware. Saat user memilih
Resume, salinan draft itu dimasukkan kembali ke form.

### 3. Mengurangi re-render pada variasi SKU

Setiap baris memakai unique `field.id` dari `useFieldArray` untuk key.

Komponen `VariationRow` dibungkus dengan `React.memo`, untuk membatasi pembaruan pada bagian form yang membutuhkan, terutama saat variasinya banyak.

Input memakai `register`, sementara preview harga memakai `useWatch` untuk base price dan extra
price saja. Autosave memakai `subscribe`

### 4. Rollback saat optimistic update gagal

Saat user menyimpan perubahan atau menghapus produk, cache langsung diperbarui lewat
`onQueryStarted`. Jadi user bisa melihat perubahan sebelum request selesai. Untuk delete, produk
langsung hilang dari list dan total produk ikut berkurang.

Snapshot awal cache dan urutan perubahan disimpan dalam catatan sementara. Kalau request gagal,
perubahan dari request itu dikeluarkan dari catatan, lalu cache dibentuk ulang dari snapshot dan
perubahan lain yang masih berlaku.

Contoh, stock awal `3`, lalu ada dua update ke `8` dan `9`. Kalau update ke `9` berhasil lebih
dulu, kemudian update ke `8` gagal, stock tetap `9`. Rollback request lama tidak boleh menghapus
perubahan terbaru yang sudah berhasil.

Saat gagal, menampilkan toast error dengan tombol Retry. Tombol itu mengirim
ulang request dengan parameter yang sama lalu menjalankan optimistic update lagi. Simulasi
kegagalan default-nya 20% untuk update/delete, dan bisa diatur lewat
`NEXT_PUBLIC_SIMULATED_FAILURE_RATE` supaya pengujian bisa dibuat konsisten.
