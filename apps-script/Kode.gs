/**
 * Penerima hasil Lab Storyboard Kue Lapis → Google Sheet dosen.
 *
 * Halaman lab mengirim setiap hasil (latihan, misi uji, pemeriksaan storyboard)
 * ke aplikasi web ini. Skrip mencatat semuanya di tab Log, lalu memperbarui
 * tab Rekap (satu baris per NIM) dan tab Soal (analisis jawaban pertama).
 * Cara memasang: lihat PANDUAN.md di folder yang sama.
 */

const TAB_REKAP = 'Rekap', TAB_SOAL = 'Soal', TAB_LOG = 'Log';

/* Kolom Rekap: [kunci di kode, judul kolom]. Jangan ubah urutan kolom di Sheet. */
const REKAP = [
  ['nim', 'NIM'], ['name', 'Nama'], ['cls', 'Kelas'], ['first', 'Pertama aktif'], ['last', 'Terakhir aktif'],
  ['score1', 'Latihan: skor pertama'], ['best', 'Latihan: skor terbaik'], ['retry1', 'Latihan: coba lagi (pertama)'],
  ['done', 'Latihan: kali selesai'], ['answers1', 'Latihan: jawaban pertama'],
  ['tested', 'Misi: tombol diuji'], ['links', 'Misi: total tombol'], ['visited', 'Misi: halaman dikunjungi'], ['complete', 'Misi: tuntas'],
  ['checks', 'Periksa: kali (storyboard sendiri)'], ['problems', 'Periksa: masalah terakhir'], ['warnings', 'Periksa: peringatan terakhir'],
  ['pages', 'Periksa: halaman terakhir'], ['edges', 'Periksa: tautan terakhir'], ['copied', 'Laporan disalin']
];
const COL = Object.fromEntries(REKAP.map(([k], i) => [k, i]));
const TEXT_COLS = [COL.nim, COL.name, COL.cls];
const HEADERS = {
  [TAB_REKAP]: REKAP.map(([, h]) => h),
  [TAB_SOAL]: ['Soal', 'Kunci', 'Mahasiswa menjawab', 'Tepat pada jawaban pertama', '% tepat', 'Jawaban pertama: A', 'Jawaban pertama: B', 'Jawaban pertama: C'],
  [TAB_LOG]: ['Waktu', 'NIM', 'Nama', 'Kelas', 'Kegiatan', 'Ringkasan', 'Rincian']
};

/* Kegiatan yang diterima. summary → kolom Ringkasan di Log; detail → kolom Rincian; apply → perubahan baris Rekap. */
const EVENTS = {
  'Lab Dibuka': { summary: () => 'Membuka lab' },
  'Latihan Dijawab': {
    summary: d => `Soal ${int(d.soal)}: ${/^[ABC]$/.test(d.pilihan) ? d.pilihan : '?'} · ${d.tepat === true ? 'tepat' : 'belum tepat'}${d.pertama === true ? '' : ' (setelah coba lagi)'}`
  },
  'Latihan Selesai': {
    summary: d => `Skor ${int(d.skor)} dari ${int(d.dari)} pada jawaban pertama · ${int(d.coba_lagi)} kali coba lagi`,
    detail: d => answers(d.rincian),
    apply(row, d, ss) {
      const score = int(d.skor);
      if (!int(row[COL.done])) {
        row[COL.score1] = score;
        row[COL.retry1] = int(d.coba_lagi);
        row[COL.answers1] = answers(d.rincian);
        tallyItems(ss, answers(d.rincian), clean(d.kunci, 40));
      }
      row[COL.best] = Math.max(score, int(row[COL.best]));
      row[COL.done] = int(row[COL.done]) + 1;
    }
  },
  'Misi Uji': {
    summary: d => `${int(d.diuji)} dari ${int(d.total)} tombol diuji · ${int(d.dikunjungi)} dari ${int(d.halaman)} halaman${d.tuntas === true ? ' · tuntas' : ''}`,
    apply(row, d) {
      row[COL.tested] = Math.max(int(d.diuji), int(row[COL.tested]));
      row[COL.links] = int(d.total) || row[COL.links];
      row[COL.visited] = Math.max(int(d.dikunjungi), int(row[COL.visited]));
      if (d.tuntas === true) row[COL.complete] = 'Ya';
    }
  },
  'Storyboard Diperiksa': {
    summary: d => `${int(d.masalah)} masalah, ${int(d.peringatan)} peringatan · ${int(d.halaman)} halaman, ${int(d.tautan)} tautan${d.contoh === true ? ' · contoh bawaan' : ''}`,
    detail: d => clean(d.laporan, 20000, true),
    apply(row, d) {
      if (d.contoh === true) return;
      row[COL.checks] = int(row[COL.checks]) + 1;
      row[COL.problems] = int(d.masalah);
      row[COL.warnings] = int(d.peringatan);
      row[COL.pages] = int(d.halaman);
      row[COL.edges] = int(d.tautan);
    }
  },
  'Laporan Disalin': {
    summary: d => `Menyalin laporan (${int(d.masalah)} masalah)${d.contoh === true ? ' · contoh bawaan' : ''}`,
    apply(row) { row[COL.copied] = int(row[COL.copied]) + 1; }
  }
};

/** Jalankan sekali dari editor Apps Script: membuat tab Rekap, Soal, dan Log. */
function siapkan() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  const ours = [TAB_REKAP, TAB_SOAL, TAB_LOG];
  ours.forEach(n => sheet(ss, n));
  ss.getSheets().forEach(s => { if (!ours.includes(s.getName()) && s.getLastRow() === 0 && s.getLastColumn() === 0) ss.deleteSheet(s); });
  ss.getSheetByName(TAB_REKAP).getRange('D:E').setNumberFormat('dd/mm/yyyy hh:mm');
  ss.getSheetByName(TAB_LOG).getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  ss.getSheetByName(TAB_SOAL).getRange('E:E').setNumberFormat('0%');
  ss.setActiveSheet(ss.getSheetByName(TAB_REKAP));
}

/** Membuka URL aplikasi web di browser menampilkan pesan ini, tanda pemasangan berhasil. */
function doGet() {
  return ContentService.createTextOutput('Penerima Lab Storyboard aktif. Tempel URL ini ke SHEET_URL di halaman lab.');
}

function doPost(e) {
  let msg;
  try { msg = JSON.parse(e.postData.contents); } catch (err) { return reply('format salah'); }
  const ev = EVENTS[clean(msg.ev, 40)];
  const who = {
    nim: clean(msg.nim, 20).replace(/\s+/g, '').toUpperCase(),
    name: clean(msg.nama, 80),
    cls: clean(msg.kelas, 30)
  };
  if (!ev || !who.nim || !who.name) return reply('data tidak lengkap');
  const d = msg.data && typeof msg.data === 'object' ? msg.data : {};

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    /* Halaman lab mengirim ulang jika koneksi putus; id yang sama tidak dicatat dua kali. Dicek di dalam kunci agar dua kiriman bersamaan tidak lolos berdua. */
    const id = clean(msg.id, 40), cache = CacheService.getScriptCache();
    if (id && cache.get(id)) return reply('sudah diterima');
    const ss = book(), now = new Date();
    sheet(ss, TAB_LOG).appendRow([now, asText(who.nim), asText(who.name), asText(who.cls), clean(msg.ev, 40), safe(ev.summary(d)), safe(ev.detail ? ev.detail(d) : '')]);
    updateRekap(ss, who, now, ev, d);
    if (id) cache.put(id, '1', 21600);
  } finally {
    lock.releaseLock();
  }
  return reply('ok');
}

function updateRekap(ss, who, now, ev, d) {
  const sh = sheet(ss, TAB_REKAP), W = REKAP.length, last = sh.getLastRow();
  let r = 0, row = null;
  if (last > 1) {
    const ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
    const i = ids.findIndex(x => String(x[0]).trim().toUpperCase() === who.nim);
    if (i >= 0) { r = i + 2; row = sh.getRange(r, 1, 1, W).getValues()[0]; }
  }
  if (!row) { r = Math.max(last, 1) + 1; row = new Array(W).fill(''); row[COL.first] = now; }
  row[COL.nim] = who.nim;
  row[COL.name] = who.name;
  if (who.cls) row[COL.cls] = who.cls;
  row[COL.last] = now;
  if (ev.apply) ev.apply(row, d, ss);
  sh.getRange(r, 1, 1, W).setValues([row.map((v, i) => TEXT_COLS.includes(i) ? asText(v) : safe(v))]);
}

/* Tab Soal: hanya dari latihan pertama yang diselesaikan setiap mahasiswa, agar tidak tercampur hafalan. */
function tallyItems(ss, rincian, key) {
  if (!rincian) return;
  const sh = sheet(ss, TAB_SOAL), W = HEADERS[TAB_SOAL].length, last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, W).getValues() : [];
  rincian.split(' ').forEach(t => {
    const m = t.match(/^(\d{1,2})([ABC])([✓✗])$/);
    if (!m) return;
    const n = +m[1];
    let row = rows.find(v => int(v[0]) === n);
    if (!row) { row = [n, '', 0, 0, '', 0, 0, 0]; rows.push(row); }
    if (/^[ABC]$/.test(key.charAt(n - 1))) row[1] = key.charAt(n - 1);
    row[2] = int(row[2]) + 1;
    if (m[3] === '✓') row[3] = int(row[3]) + 1;
    const c = 5 + 'ABC'.indexOf(m[2]);
    row[c] = int(row[c]) + 1;
  });
  if (!rows.length) return;
  rows.sort((a, b) => int(a[0]) - int(b[0]));
  rows.forEach((row, i) => { row[4] = `=IF(C${i + 2}>0,D${i + 2}/C${i + 2},"")`; });
  sh.getRange(2, 1, rows.length, W).setValues(rows);
  sh.getRange(2, 5, rows.length, 1).setNumberFormat('0%');
}

function book() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const head = HEADERS[name];
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function reply(s) { return ContentService.createTextOutput(s); }

/* Teks bebas dari mahasiswa: buang karakter kontrol dan batasi panjangnya. */
function clean(v, max, keepLines) {
  const s = String(v == null ? '' : v).replace(keepLines ? /[\u0000-\u0009\u000B-\u001F]/g : /[\u0000-\u001F]/g, ' ');
  return (keepLines ? s : s.replace(/\s+/g, ' ')).trim().slice(0, max);
}
function int(v) { const n = Math.round(Number(v)); return isFinite(n) && n > 0 ? Math.min(n, 100000) : 0; }
function answers(v) { const s = clean(v, 120); return /^\d{1,2}(?:[ABC][✓✗]|-)(?: \d{1,2}(?:[ABC][✓✗]|-))*$/.test(s) ? s : ''; }

/* Apostrof di depan memaksa Sheets menyimpan teks apa adanya: NIM tetap dengan nol di depan, dan isian seperti "=RUMUS()" tidak dijalankan. */
function asText(v) { return v === '' || v == null ? '' : "'" + String(v); }
function safe(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }
