# Rekap nilai Lab Storyboard di Google Sheet

Halaman lab meminta mahasiswa mengisi nama, NIM, dan kelas sekali di perangkatnya. Setelah itu, hasil latihan, misi uji, dan pemeriksaan storyboard dikirim otomatis ke Google Sheet milik dosen melalui skrip `Kode.gs`. Jika internet putus, hasil disimpan dulu di perangkat mahasiswa dan dikirim saat koneksi kembali.

Selama `SHEET_URL` di halaman lab masih kosong, formulir identitas tidak muncul dan tidak ada data yang dikirim.

## Isi Sheet

**Tab Rekap**: satu baris per NIM, diperbarui setiap kali ada hasil baru.

| Kolom | Arti |
|---|---|
| Pertama aktif, Terakhir aktif | Waktu kiriman pertama dan terakhir dari mahasiswa ini |
| Latihan: skor pertama | Jumlah soal (dari 8) yang dijawab tepat pada pilihan pertama, pada latihan pertama yang diselesaikan. Paling cocok dipakai sebagai nilai, karena ulangan berikutnya sudah dipengaruhi hafalan |
| Latihan: skor terbaik | Skor tertinggi dari semua ulangan latihan |
| Latihan: coba lagi (pertama) | Berapa kali mahasiswa menekan "Coba lagi" pada latihan pertama |
| Latihan: kali selesai | Berapa kali latihan diselesaikan sampai soal ke-8 |
| Latihan: jawaban pertama | Pilihan pertama di tiap soal, misalnya `1A✗ 2A✓ 3C✓`: soal 1 memilih A (belum tepat), dan seterusnya |
| Misi: tombol diuji, total tombol, halaman dikunjungi | Kemajuan tertinggi pada misi "uji semua jalur" (80 tombol, 37 halaman) |
| Misi: tuntas | "Ya" jika semua tombol sudah diuji |
| Periksa: kali (storyboard sendiri) | Berapa kali mahasiswa memeriksa storyboard buatannya. Contoh bawaan di halaman lab tidak dihitung |
| Periksa: masalah, peringatan, halaman, tautan terakhir | Hasil pemeriksaan storyboard sendiri yang terakhir. Laporan lengkapnya ada di kolom Rincian tab Log |
| Laporan disalin | Berapa kali tombol "Salin laporan" ditekan |

**Tab Soal**: ringkasan per soal, seperti ringkasan pertanyaan di Google Classroom. Tab ini hanya menghitung jawaban pertama dari latihan pertama setiap mahasiswa. Pilihan salah yang sering dipilih menunjukkan miskonsepsi yang perlu dibahas di kelas.

**Tab Log**: setiap kegiatan beserta waktunya (membuka lab, menjawab soal, menyelesaikan latihan, kemajuan misi, memeriksa storyboard, menyalin laporan). Kolom Rincian berisi jawaban latihan dan laporan pemeriksaan lengkap.

## Memasang (sekali, sekitar 5 menit)

1. Buka <https://sheets.new> dengan akun Google Anda, lalu beri nama, misalnya "Rekap Lab Storyboard".
2. Buka menu **Ekstensi → Apps Script**. Hapus isi file kode yang terbuka, tempel seluruh isi `Kode.gs` dari folder ini, lalu simpan (Ctrl+S).
3. Di bilah atas editor, pilih fungsi **siapkan**, lalu klik **Jalankan**. Izinkan akses saat diminta: **Tinjau izin → pilih akun → Lanjutan → Buka proyek → Izinkan**. Tab Rekap, Soal, dan Log akan muncul di Sheet.
4. Klik **Terapkan → Deployment baru**, klik ikon roda gigi, lalu pilih **Aplikasi web**. Atur:
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   
   Klik **Terapkan**, lalu salin **URL aplikasi web** (berakhiran `/exec`).
5. Buka URL itu di browser. Jika muncul "Penerima Lab Storyboard aktif.", pemasangan berhasil.
6. Tempel URL itu di `10_Lab_Storyboard_Kue_Lapis.html`, pada baris `const SHEET_URL = '';`, lalu gabungkan ke cabang `main`. Vercel akan memasang ulang situsnya otomatis.
7. Uji sekali: buka lab, isi identitas uji, lalu jawab satu soal latihan. Dalam beberapa detik, baris baru muncul di tab Log dan Rekap. Hapus baris uji itu setelahnya.

## Catatan

- **Mengubah skrip nanti:** pakai **Terapkan → Kelola deployment → ikon pensil → Versi: Versi baru → Terapkan**, supaya URL-nya tetap sama. "Deployment baru" menghasilkan URL baru yang harus diganti juga di halaman lab.
- **Akun kampus (Google Workspace):** admin kampus bisa menonaktifkan pilihan akses "Siapa saja". Jika pilihan itu tidak ada, pasang skrip dengan akun Gmail pribadi.
- **Kolom:** jangan ubah urutan atau judul kolom di tab Rekap, Soal, dan Log. Anda boleh menambah kolom sendiri di sebelah kanan kolom terakhir Rekap (misalnya "Nilai akhir"), atau tab baru untuk grafik dan tabel pivot.
- **Identitas:** nama dan NIM diketik sendiri oleh mahasiswa, jadi cocokkan dengan daftar kelas. Untuk nilai resmi, minta mahasiswa juga menempelkan laporan dari tombol "Salin laporan" ke tugas Google Classroom, karena di sana identitasnya terikat ke akun.
- **Komputer bersama:** tombol "Bukan kamu? Ganti" di halaman lab mengganti identitas. NIM yang berbeda mengosongkan kemajuan yang tersimpan di perangkat itu, sehingga hasil mahasiswa sebelumnya tidak tercatat atas nama mahasiswa baru.
- **Data pribadi:** Sheet berisi nama dan nilai mahasiswa. Jangan bagikan tautannya. Formulir di halaman lab sudah memberi tahu mahasiswa data apa yang dikirim dan ke mana.
- **Kiriman palsu:** URL `/exec` terlihat di kode halaman, jadi siapa pun bisa mengirim data ke sana. Skrip hanya menerima enam jenis kegiatan dari halaman lab, membatasi panjang isian, dan menyimpan isian sebagai teks, bukan rumus. Periksa tab Log jika ada baris yang janggal.
