# Dokumentasi Pengembangan Fitur INoted (Dynamic Title, Share Link, & PDF Export)

Dokumentasi ini ditulis dengan gaya bahasa yang santai dan mudah dipahami, bertujuan untuk memandu developer awam (atau anggota tim baru) agar mengerti apa saja yang sudah dikerjakan pada aplikasi INoted dari awal sesi hingga selesai.

## 1. Fitur Judul Tab Dinamis (Dynamic Page Titles)
**Masalah:** 
Awalnya, ketika pengguna membuka sebuah catatan (misal: "Tugas Kuliah"), judul di tab browser (di bagian paling atas web browser) tetap menampilkan teks bawaan (default) aplikasi, yaitu "INoted - Your daily Note app". Ini sangat membingungkan pengguna jika mereka membuka banyak catatan di banyak tab sekaligus.

**Solusi yang Diterapkan:**
Kita menerapkan dua teknik kolaborasi pada framework **Next.js** agar judul tab selalu sesuai dengan judul catatan:
*   **Server-Side Rendering (SSR) menggunakan `generateMetadata`:** 
    Di file `web/app/notes/[id]/page.tsx`, kita melakukan _query_ (permintaan data) ke database Supabase saat halaman pertama kali dimuat oleh server. Tujuannya agar sebelum halaman sampai ke pengguna, judul HTML-nya sudah siap dan berubah menjadi `[Judul Catatan] - INoted`. Ini sangat bagus untuk SEO (Mesin Pencari).
*   **Client-Side Update menggunakan `useEffect`:**
    Di file editor (`tiptap-editor.tsx`), kita menambahkan kode `document.title = title`. Artinya, ketika pengguna sedang asyik mengetik dan mengubah judul secara _real-time_ di dalam aplikasi, judul tab browser akan ikut berubah secara instan tanpa perlu memuat ulang (refresh) halaman.

---

## 2. Fitur Link Sharing & Preview Meta (OpenGraph)
**Masalah:** 
Saat pengguna membagikan link catatan ke aplikasi chat (seperti WhatsApp, Telegram, atau Discord), kotak _preview_ (cuplikan link) tidak menampilkan judul catatan yang sebenarnya, melainkan selalu memunculkan judul default aplikasi.

**Solusi yang Diterapkan:**
*   **Menambahkan Tag OpenGraph (OG):** Di dalam fungsi `generateMetadata` (poin ke-1), kita menyisipkan properti `openGraph` dan `twitter`. Properti khusus ini bertugas "berbicara" langsung dengan bot/crawler dari WhatsApp untuk memberi tahu: *"Hei, tolong tampilkan judul catatan ini di preview-mu, jangan pakai judul yang default!"*.
*   Fitur ini juga langsung diaplikasikan secara merata ke seluruh rute _share_ yang ada (yakni halaman `Whiteboard` dan `Flowchart`).

---

## 3. Penemuan Bug Kritis: Middleware Menghalangi Bot Chat
**Masalah:** 
Setelah fitur Link Sharing (poin ke-2) selesai dibuat dan dipublikasikan (deploy) ke Netlify, ternyata preview WhatsApp **masih gagal** dan memunculkan teks "INoted - Your daily Note app" (yang merupakan judul halaman Login). Mengapa hal ini bisa terjadi?

**Penyebab Utama (The Root Cause):**
Aplikasi memiliki gerbang keamanan bernama **Middleware** (`web/utils/supabase/middleware.ts`). Tugas utamanya adalah mencegat setiap pengunjung: *"Apakah kamu sudah login? Jika belum, kamu akan saya lempar (redirect) paksa ke halaman /login"*. 
Masalahnya, Bot WhatsApp dan Telegram yang mencoba membaca link adalah pengunjung anonim (belum login). Alhasil, bot chat tersebut selalu dilempar ke `/login`, sehingga yang mereka baca dan tampilkan di preview WhatsApp adalah judul halaman Login.

**Solusi yang Diterapkan:**
Kita memodifikasi keamanan di `middleware.ts` dengan membuat **pengecualian (exemption)** khusus untuk tiga buah jenis link (rute):
1. `/notes/[id]`
2. `/whiteboard/[id]`
3. `/flowchart/[id]`

Dengan kode pengecualian ini, jika pengunjung (atau bot chat) mengakses link _share_ yang sifatnya publik, Middleware akan membiarkannya lewat. Keamanan catatan Anda tetap terjamin 100%, karena jika catatan itu sifatnya "Private", database Supabase (lewat _Row Level Security_ / RLS) akan otomatis memblokir datanya dan mengembalikan status *Not Found* (Tidak Ditemukan).

---

## 4. Ekspor PDF Tingkat Lanjut & Masalah Karakter
**Masalah:** 
Fitur ekspor ke PDF sebelumnya sangat standar karena hanya mengandalkan `window.print()` (seperti menekan tombol Ctrl+P di browser). Pengguna meminta peningkatan agar dicetak lebih bagus menggunakan library PDF khusus.

**Proses Perbaikan & Kendala:**
*   **Percobaan Pertama (`jsPDF` & `jspdf-autotable`):** 
    Kita mengintegrasikan library `jsPDF` untuk membuat dokumen asli. Namun, ada masalah teknis yang lucu: ketika ada karakter Emoji (seperti bintang ⭐) di dalam teks, PDF malah mencetak huruf acak yang berantakan seperti tulisan `+P`. Ini terjadi karena `jsPDF` secara default menggunakan jenis font klasik (Helvetica/WinAnsi) yang **sama sekali tidak mengenali dan tidak mendukung karakter Unicode/Emoji**.
*   **Eksperimen Kedua (`html2pdf.js` & Bug Tailwind v4):**
    Karena `jsPDF` tidak mengenali emoji, kita mencoba beralih ke library canggih `html2pdf.js` yang bekerja dengan cara men-screenshot layar (memakai mesin `html2canvas`). Namun, muncul masalah baru yang fatal: proses PDF **crash total**. Setelah diselidiki, penyebabnya adalah aplikasi menggunakan **Tailwind CSS versi 4** yang secara default menggunakan format warna modern `oklch()`. Alat pemindai `html2canvas` rupanya sangat kuno, tidak mengerti format `oklch`, dan langsung mati saat melihat file `globals.css`.
*   **Solusi Final (Kembali ke `jsPDF` Murni):**
    Meskipun kita sempat menemukan library alternatif (`html-to-image`) untuk mengatasi masalah Tailwind v4, pengguna menyadari satu kelemahan fatal dari metode screenshot: **teks di dalam PDF yang dihasilkan akan menjadi gambar mati; tidak bisa diblok, di-copy paste, atau di-search**.
    Karena fitur "bisa di-copy" jauh lebih penting dan krusial untuk sebuah dokumen teks/catatan dibandingkan sekadar ikon emoji, kita akhirnya mengambil keputusan tegas untuk **kembali menggunakan logika parser asli `jsPDF` dan `jspdf-autotable`**. Kita rela mengorbankan visual emoji (membuat sistem filter `sanitizeText` agar emoji otomatis dihapus) demi mendapatkan dokumen PDF vektor yang rapi, profesional, dan teks tabelnya 100% interaktif.

**Perbaikan Tambahan (TypeScript & CSS):**
Selama proses uji coba berbagai library, kita menyelesaikan kendala tipe data TypeScript menggunakan penanda `as const` (agar pengaturan seperti tipe `'jpeg'` dikenali pasti). Kita juga sempat mengonversi warna `oklch` di `globals.css` menjadi kode HEX standar agar lebih ramah terhadap library eksternal lama, sebelum akhirnya mantap menggunakan metode parser Tiptap JSON murni.

---
_Catatan Akhir: Dokumentasi ini menjadi bukti nyata perjalanan pengembangan perangkat lunak, di mana menyelesaikan masalah koding seringkali mengharuskan kita menimbang kompromi (trade-off)—dalam hal ini, memilih antara visual emoji yang cantik (tapi teks menjadi gambar mati) vs dokumen PDF profesional murni (teks bisa dikopas, namun visual emoji harus dikorbankan)._
