# Dokumentasi Pembaruan: INoted Editor (24 Februari 2026)

**Fokus Utama:** Responsivitas Tabel Ponsel (Mobile Table Scrolling), Kompatibilitas Print-to-PDF, dan Stabilitas Realtime Sync (Mencegah Duplikasi Konten).

---

## 1. Perbaikan Layout Tabel Flexbox & Scroll Independent di Mobile

**File Terdampak:**
- `web/app/globals.css`
- `web/components/editor/tiptap-editor.tsx`

**Masalah Utama:**
Tabel yang di-render pada mode layar ponsel memaksa elemen kontainer utama melebar (*flexbox blowout*). Hal ini menyebabkan *scroll* horisontal memakan seluruh halaman (menggeser area input judul dll), sehingga UI editor hancur dan gagal menyediakan porsi *scroll* secara mandiri untuk isi sel tabel. Sistem bawaan *Tiptap Inline Styles* pada node HTML `<table/>` terbukti mengunci lebar kolom untuk menolak modifikasi *media-query* standar secara paksa.

**Solusi:**
1. **Strict Tiptap Parent Containerization (`tiptap-editor.tsx`)**
   Mengimplementasikan trik *CSS Grid* `grid-cols-1` bersama utilitas Tailwind `min-w-0 max-w-full` pada pembungkus `<EditorContent/>`. Trik ini mewajibkan browser untuk menghitung lebar maksimum kolom Editor secara mutlak berdasarkan ruang layar fisik yang tersisa, mencegah pendorongan lebar flexbox sekecil apa pun dari konten *ProseMirror* di dalamnya.
2. **Absolute Viewport Constraints (`globals.css`)**
   Menetapkan batasan dimensi paksa dengan imbuhan `!important` baru pada limitasi layar mobile (`@media (max-width: 768px)`):
   - `.ProseMirror .tableWrapper`: `max-width: calc(100vw - 3rem) !important` & `overflow-x: auto !important`. Secara paksa membatasi bingkai pembungkus tidak lebih dari bentang peramban perangkat.
   - `.ProseMirror table`: `width: max-content !important` & `table-layout: auto !important`. Membongkar paksa batasan blok-inline asali milik Tiptap agar lebar sel bisa merangkak secara alami tanpa menyentuh *parent* DOM, alhasil ini memantik berjalannya _horizontal scroll_ yang hanya khusus menargetkan area tag tersebut secara individual layaknya elemen dokumen yang melampir normal.

---

## 2. Inkonsistensi Tabel Pada Viewer Mode (Read-Only)

**File Terdampak:** 
- `web/components/editor/tiptap-editor.tsx`

**Masalah Utama:**
Sistem batas penahan (struktur layout *wrapper*) penahan gulir di layar seluler telah berjalan seratus persen bagi pengetik, namun luapan bug "tabel gembok tanpa batas layar" terjadi bagi para pembaca yang menaut dari *Viewer Mode*. Diketahui bahwa saat properti status editor `editable` adalah `false`, modul ekstensi dari Tiptap akan lalai lalu melepas _Render NodeView_-nya. Konsekuensinya tag `<div class="tableWrapper">` yang tadinya dibekali pelindung _max-width_ hilang ditelan dari susunan perantara HTML layar tayang.

**Solusi:**
Mengubah *configuration object* saat Tipe Table Editor sedang disuntik ke inti komponen Editor. `Table.configure({ resizable: true, renderWrapper: true })`. Variabel *boolean* perintah paksa `renderWrapper: true` berfungsi menahan modul agar ia patuh selalu mencetak properti `div` dari komponennya tanpa pandang bulu kendati status editor sedang interaktif (_Editable_) ataupun di-_lock_ menjadi Read-Only dokumen publik.

---

## 3. Ekspor PDF & Print Layout Formatting Untuk Tabel

**File Terdampak:**
- `web/app/globals.css` (Khususan Blok `@media print`)

**Masalah Utama:** 
Tatkala pengguna sedang melansir fungsi kompilator mencetak dan mencadangkan halaman langsung via *Export to PDF*, elemen tulisan kolom yang memiliki lebar ekstra terpotong rata (_truncated_ / luput porsi *off-side*). Permasalahannya kertas A4 bukan ranah digital sehingga tak berkemampuan dimanipulasi pergerakan *horizontal-scroll*. 

**Solusi:**
1. Saat dipanggil ke dalam instruksi pemeta gaya _Print_, modifikasi `globals.css` mencopot pelindung *scroll bar* horisontal lalu menyuntik perataan tak berbatas lebar paksa (`overflow: visible !important` untuk *Table Wrapper*).
2. Membuka alur *word-layout* menjadi auto elastis (`table-layout: auto !important;`).
3. Menginstrusikan agar perbaris frasa atau untai link URL yang ekstra sempit menabrak pojok kertas dipatah paksa supaya menurun pada halaman baru secara rapi tanpa harus menembus pinggiran layar PDF (`word-break: break-word`, dan `white-space: normal`).
4. Mewajibkan pemisahan lembaran pemotong otomatis agar sel tidak dibelah-dua patah pada batas kertasnya yang menjumbai bawah (`page-break-inside: avoid`).

---

## 4. Perbaikan Serius Bug Duplikasi *Hydration* pada Sistem Kolaborasi Yjs (Double Hydration)

**File Terdampak:** 
- `web/components/editor/tiptap-editor.tsx`

**Masalah Utama (Race Condition):**
Tiap skenario dua entitas klien secara tak terduga terkoneksi / ter-_load_ secara harafiah di milidetik bersamaan ke papan kolaborasi web (Misal: *Guest* membuka laman seiring dengan *Author* utama beraktivitas me-_refresh_ di layar lain). Keduanya secara awam sama-sama mengklaim berstatus mandiri/bersebelahan lalu melakukan pengunduhan teks yang sama dari *database* lokal lalu menyuntik rekam *(Hydrate Content)* menuju peladen _Tiptap YDoc_ mereka satu per satu tanpa sinkronisasi hal penguncian antar satu sama tak diakui. Akibatnya terjadi malfungsi _Infinite Doppelganger / Dobel Teks_ dengan isi data di papan tertumpuk terduplikat parah, mengancam kebengkakan *Cloud Memory Database Storage*.

**Solusi:**
1. Mengamankan Logika Inisial Pendamping / Algoritma *Global Peer Authorization Lock* 
2. Memperbaiki dan memperkuat celah `Client ID` dan *Awarness Timeout Period* (Ditunda ~1200ms) menggunakan metode penguncian mutlak (*Native P2P State Map*).
3. Pemetaan status dikunci dari Yjs Core (`const metaMap = ydoc.getMap('documentMeta')`). 
4. Segala *peer* (HP klien di luar antrean komputer pertama) yang sudah memindai sinyal "Gembok Sedang Terkunci oleh partisipan lain / Leader" dengan *state* `isHydrated: true` di-*override* untuk patuh diam merender tanpa diberi akses mencetak isian _database_-nya sendiri ke laman. Menggaransi perlindungan instan untuk memonopoli arus sehingga konten selalu absolut merender tunggal sekalipun dikeroyok bersama secara paralel bruteforce.
