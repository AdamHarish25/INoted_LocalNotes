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
*   **Solusi Akhir (`html2pdf.js`):**
    Karena editor (TipTap) milik kita sangat kaya akan visual (mengandung emoji berwarna, tabel, teks tebal/miring, centang list, dan gambar), merakit ulang semua format itu menggunakan `jsPDF` dari nol adalah pekerjaan yang kaku. 
    Oleh karena itu, kita membuang `jsPDF` murni dan beralih menggunakan library canggih **`html2pdf.js`**. Library ini bekerja cerdas dengan men-screenshot (menangkap) secara utuh elemen HTML editor Anda (menggunakan `html2canvas`) lalu membungkusnya menjadi dokumen PDF beresolusi tinggi. Hasilnya luar biasa: Emoji ⭐, ketebalan tabel, dan warna font tercetak 100% sama persis dengan yang dilihat di layar web (_What You See Is What You Get_).

**Perbaikan TypeScript:**
Saat menyusun pengaturan untuk `html2pdf.js`, program pemeriksa error (TypeScript) sempat marah dan mengeluh karena nilai seperti `'jpeg'` atau `'portrait'` dianggap "kurang spesifik/bisa jadi teks apa saja". Kita menenangkan TypeScript dengan menambahkan penanda khusus `as const` (contoh: `type: 'jpeg' as const`). Penanda ini ibarat janji pasti kepada sistem bahwa nilainya tidak akan berubah-ubah menjadi tipe teks lain.

---
_Catatan Akhir: Dokumentasi ini menjadi bukti perjalanan pengembangan bahwa menyelesaikan masalah koding tidak melulu soal menulis logika, tetapi juga harus paham bagaimana platform pihak ketiga (seperti WhatsApp) bekerja, memahami alur keamanan aplikasi, dan mengenali batasan-batasan teknis suatu teknologi eksternal._
