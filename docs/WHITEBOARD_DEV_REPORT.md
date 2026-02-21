# Laporan Pengembangan Fitur Whiteboard & Debugging Log

**Tanggal:** 26 Desember 2025  
**Proyek:** INoted - Whiteboard Module  
**Penulis:** Antigravity (AI Assistant)  

---

## Bagian 1: Debugging & Perbaikan Masalah Hari Ini

Berikut adalah rangkuman masalah yang dihadapi pada sesi ini dan bagaimana solusinya diterapkan.

### 1. Masalah Cursor Kursor Tidak Terlihat (Invisible Cursor)
**Gejala:**  
Saat pengguna mengarahkan mouse ke area canvas whiteboard, kursor mouse asli menghilang, tetapi kursor kustom alat (misal: ikon pensil) juga tidak muncul, membuat pengguna bingung posisi mouse mereka.

**Penyebab Teknis:**  
Elemen `<canvas>` memiliki properti CSS hardcoded `style={{ cursor: 'none' }}`. Ini dimaksudkan untuk menyembunyikan kursor default agar bisa menggambar kursor kustom via software (menggambar ikon di canvas). Namun, kursor kustom tersebut belum diimplementasikan sepenuhnya untuk pengguna lokal (hanya untuk kolaborator jarak jauh).

**Solusi:**  
Kami menghapus `cursor: 'none'` dan menggantinya dengan logika CSS cursor dinamis menggunakan fungsi `getCursorStyle()`.

```typescript
// Logic baru untuk menentukan bentuk kursor
const getCursorStyle = () => {
    if (isPanning) return 'grabbing' // Saat menggeser layar
    if (draggingElement) return 'move' // Saat memindahkan objek
    
    switch (activeTool) {
        case 'hand': return 'grab'
        case 'text': return 'text'
        case 'selection': return 'default'
        default: return 'crosshair' // Untuk pencil, shape, dll
    }
}
```

### 2. Masalah Koneksi Terputus ("Disconnected") di Production (Netlify)
**Gejala:**  
Fitur kolaborasi berjalan lancar di `localhost`, namun saat dibuka lewat URL Netlify (`inoted-daily.netlify.app`), status menunjukkan "Disconnected".

**Penyebab Teknis:**  
1.  **Mixed Content / Protokol:** Browser memblokir koneksi dari HTTPS (Netlify) ke WebSocket tidak aman (ws://) di localhost.
2.  **Environment Variable Hilang:** Netlify tidak memiliki akses ke file `.env.local` di komputer lokal, sehingga variabel `NEXT_PUBLIC_COLLAB_SERVER_URL` tidak terbaca.
3.  **Format URL:** Awalnya URL dimasukkan tanpa protokol (`wss://`), sehingga kode gagal melakukan koneksi.

**Solusi:**  
1.  Backend Hocuspocus dideploy ke **Railway**.
2.  Menambahkan Environment Variable di Dashboard Netlify:
    *   **Key:** `NEXT_PUBLIC_COLLAB_SERVER_URL`
    *   **Value:** `wss://inoted-collab-server-production.up.railway.app`
3.  Melakukan *Re-deploy* di Netlify agar perubahan konfigurasi diterapkan.

---

## Bagian 2: Panduan Membangun Fitur Collaborative Whiteboard (From Scratch)

Jika Anda ingin membangun fitur seperti ini dari awal, berikut adalah arsitektur dan langkah-langkah utamanya.

### Tech Stack
1.  **Frontend:** Next.js + React
2.  **Rendering:** HTML5 Canvas API (untuk performa tinggi dibanding SVG/DOM elements).
3.  **State Management (CRDT):** Yjs (Y.Array, Y.Map) untuk sinkronisasi data real-time tanpa konflik.
4.  **WebSocket Server:** Hocuspocus (Backend ringan berbasis Node.js untuk Yjs).
5.  **Styling:** Tailwind CSS.

### Langkah Implementasi

#### Langkah 1: Setup Canvas & Event Listeners
Buat komponen REACT yang merender elemen `<canvas>`. Anda perlu menangani event mouse/touch untuk menggambar.

*   **State:** Simpan elemen gambar dalam array objek (misal: `{ type: 'rect', x: 0, y: 0, w: 100, h: 100 }`).
*   **Koordinat Dunia vs Layar:** Sangat PENTING. Jangan simpan koordinat layar mouse mentah.
    *   Rumus Konversi: `WorldX = (ScreenX - PanOffset.x) / ZoomLevel`
*   **Render Loop:** Gunakan `useEffect` atau `requestAnimationFrame` untuk membersihkan (`clearRect`) dan menggambar ulang (`context.strokeRect`, dll) seluruh elemen setiap kali state berubah.

#### Langkah 2: Integrasi Yjs (The Magic Sauce)
Alih-alih hanya menyimpan state di React (`useState`), kita simpan state di **Shared Type Yjs**.

1.  Buat Dokumen: `const ydoc = new Y.Doc()`
2.  Buat Shared Array: `const yElements = ydoc.getArray('elements')`
3.  **Sinkronisasi:**
    *   Saat Yjs berubah (dapat data dari server), update state React agar me-render ulang canvas.
    *   Saat User menggambar, push data ke `yElements` (jangan hanya ke state React).

```typescript
// Contoh sederhana observer
yElements.observe(() => {
    setElements(yElements.toArray()) // Update tampilan React saat data Yjs berubah
})
```

#### Langkah 3: Backend Server (Hocuspocus)
Next.js adalah framework serverless/frontend, kurang cocok untuk WebSocket long-running process. Kita butuh server terpisah (seperti yang kita deploy ke Railway).

1.  Init project Node.js baru.
2.  Install `@hocuspocus/server`.
3.  Jalankan server di port tertentu. Server ini bertugas me-broadcast perubahan Yjs dari satu user ke user lain.

#### Langkah 4: Fitur Awareness (Cursor Teman)
Fitur "Cursor Teman" tidak disimpan di database (karena terlalu cepat berubah dan tidak perlu permanen). Yjs memiliki fitur **Awareness**.

1.  **Kirim Posisi Saya:** Pada event `onMouseMove`, kirim koordinat dunia saya ke awareness.
    ```typescript
    provider.awareness.setLocalStateField('cursor', { x: worldX, y: worldY })
    ```
2.  **Terima Posisi Teman:** Dengar perubahan awareness dan render cursor div absolute di atas canvas.
    ```typescript
    provider.awareness.on('change', () => {
        setRemoteCursors(provider.awareness.getStates())
    })
    ```

#### Langkah 5: Deployment
1.  **Frontend:** Deploy ke Netlify/Vercel.
2.  **Backend (Hocuspocus):** Deploy ke Railway/VPS/Render (harus support WebSocket).
3.  **Koneksi:** Pastikan Frontend menggunakan protokol `wss://` (Secure WebSocket) jika Frontend menggunakan HTTPS.

---

### Kesimpulan
Fitur whiteboard ini adalah kombinasi dari **manipulasi Canvas 2D klasik** (untuk menggambar) dan **Distributed State Management** (Yjs) untuk kolaborasi. Kunci keberhasilannya adalah memisahkan logika "Tampilan" (Canvas) dari "Data" (Yjs Array) dan menjembatankannya dengan Observer Pattern.
