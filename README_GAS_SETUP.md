# Panduan Deploy Google Sheets Backend (Google Apps Script)

Berikut adalah panduan langkah demi langkah untuk menghubungkan aplikasi **HabitPulse PWA** dengan **Google Sheets** sebagai database/backend berbasis Google Apps Script (GAS):

---

## 1. Buat Google Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.google.com) dan buat dokumen spreadsheet baru (misal dengan nama `HabitPulse Database`).

---

## 2. Pasang Kode Google Apps Script (`Code.gs`)
1. Di dalam Google Spreadsheet Anda, buka menu **Extensions (Ekstensi)** > **Apps Script**.
2. Hapus seluruh isi file default `Code.gs`.
3. Salin dan tempel (copy-paste) seluruh isi dari file [`Code.gs`](file:///d:/Hala/Random/Play/Android/Code.gs) yang berada di proyek ini.
4. Klik ikon **Save** (💾) atau tekan `Ctrl + S`.

---

## 3. Deploy sebagai Web App
1. Di pojok kanan atas editor Apps Script, klik tombol **Deploy** > **New deployment**.
2. Klik ikon roda gigi (Select type) dan pilih **Web app**.
3. Isi konfigurasi sebagai berikut:
   - **Description**: `HabitPulse Web App API`
   - **Execute as**: `Me (email_anda@gmail.com)`
   - **Who has access**: `Anyone` *(Sangat penting agar PWA lokal dapat mengakses tanpa blokir OAuth)*
4. Klik **Deploy**.
5. Jika diminta otorifikasi (Review Permissions), klik akun Google Anda > **Advanced** > **Go to HabitPulse (unsafe)** > **Allow**.

---

## 4. Hubungkan Web App URL ke HabitPulse PWA
1. Salin **Web App URL** yang dihasilkan (format URL: `https://script.google.com/macros/s/AKfycbx.../exec`).
2. Buka aplikasi **HabitPulse PWA**.
3. Navigasi ke menu **Sync & Settings**.
4. Tempelkan Web App URL pada kolom **Google Apps Script Web App URL**.
5. Klik **Upload Data (Push)** atau **Download Data (Pull)** untuk menguji koneksi!

---

## 5. Struktur Tab Otomatis
Google Apps Script akan secara otomatis membuat dan menyusun tab-tab berikut di Google Spreadsheet Anda saat pertama kali melakukan Push data:
- `DailyTasks`: Menyimpan daftar tugas harian lengkap dengan status & rentang waktu.
- `Ibadah`: Menyimpan log sholat 5 waktu, sunnah (Dhuha & Tahajud), dan menit Al-Qur'an.
- `Goals_and_Streaks`: Menyimpan NoFap streak counter, record tertinggi, dan durasi belajar Bahasa Inggris.
- `ExercisePlan`: Menyimpan target program latihan & rutinitas menu harian.
