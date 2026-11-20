const API = "http://localhost:5000/api";

let alat = [];
let kategori = [];
let pinjam = [];

const $ = (id) => document.getElementById(id);

function esc(t) {
  const el = document.createElement("div");
  el.textContent = t ?? "";
  return el.innerHTML.replace(/"/g, "&quot;");
}


function tgl(t) {
  if (!t) return "-";
  const d = t.includes("T") ? new Date(t) : new Date(t + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function tampilError(id, pesan) {
  $(id).textContent = pesan;
  $(id).classList.remove("hidden");
}

// Satu fungsi fetch untuk semua metode
async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, data: await res.json() };
}

const BTN = "rounded px-2 py-1 text-xs font-medium text-white";
const BADGE = {
  Dipinjam: "bg-amber-100 text-amber-800",
  Dikembalikan: "bg-green-100 text-green-800",
  Terlambat: "bg-red-100 text-red-800",
};

// READ 
async function muatSemua() {
  try {
    const [k, a, p] = await Promise.all([
      api("GET", "/kategori_alat"),
      api("GET", "/alat"),
      api("GET", "/peminjaman"),
    ]);
    if (!k.ok || !a.ok || !p.ok) throw new Error("Respons server tidak valid");
    kategori = k.data;
    alat = a.data;
    pinjam = p.data;
    renderPilihan();
    renderKategori();
    renderAlat();
    renderPeminjaman();
  } catch (err) {
    console.error(err);
    $("kategori-body").innerHTML = `<tr><td colspan="3" class="p-3 text-red-600">Gagal memuat data. Pastikan backend berjalan.</td></tr>`;
    $("alat-body").innerHTML = `<tr><td colspan="6" class="p-3 text-red-600">Gagal memuat data. Pastikan backend berjalan.</td></tr>`;
    $("pinjam-body").innerHTML = `<tr><td colspan="8" class="p-3 text-red-600">Gagal memuat data. Pastikan backend berjalan.</td></tr>`;
  }
}

// Isi dropdown alat (form pinjam) dan kategori (form alat)
function renderPilihan() {
  $("p-alat").innerHTML = alat
    .map((a) => `<option value="${a.id_alat}" ${a.stok === 0 ? "disabled" : ""}>${esc(a.nama_alat)} (stok ${a.stok})</option>`)
    .join("");
  $("a-kategori").innerHTML = kategori
    .map((k) => `<option value="${k.id_kategori}">${esc(k.nama_kategori)}</option>`)
    .join("");
}

function renderKategori() {
  if (kategori.length === 0) {
    $("kategori-body").innerHTML = `<tr><td colspan="3" class="p-3 text-slate-500">Belum ada kategori.</td></tr>`;
    return;
  }
  $("kategori-body").innerHTML = kategori
    .map((k) => `
      <tr class="border-t">
        <td class="p-2 font-medium">${esc(k.nama_kategori)}</td>
        <td class="p-2">${esc(k.deskripsi) || "-"}</td>
        <td class="space-x-1 p-2">
          <button data-edit-kategori="${k.id_kategori}" class="${BTN} bg-amber-500 hover:bg-amber-600">Edit</button>
          <button data-hapus-kategori="${k.id_kategori}" class="${BTN} bg-red-600 hover:bg-red-700">Hapus</button>
        </td>
      </tr>`)
    .join("");
}

function renderAlat() {
  if (alat.length === 0) {
    $("alat-body").innerHTML = `<tr><td colspan="6" class="p-3 text-slate-500">Belum ada alat.</td></tr>`;
    return;
  }
  $("alat-body").innerHTML = alat
    .map((a) => `
      <tr class="border-t">
        <td class="p-2 font-medium">${esc(a.nama_alat)}</td>
        <td class="p-2">${esc(a.nama_kategori) || "-"}</td>
        <td class="p-2">${esc(a.lokasi) || "-"}</td>
        <td class="p-2">${esc(a.kondisi)}</td>
        <td class="p-2">${a.stok}</td>
        <td class="space-x-1 p-2">
          <button data-edit="${a.id_alat}" class="${BTN} bg-amber-500 hover:bg-amber-600">Edit</button>
          <button data-hapus-alat="${a.id_alat}" class="${BTN} bg-red-600 hover:bg-red-700">Hapus</button>
        </td>
      </tr>`)
    .join("");
}

function renderPeminjaman() {
  if (pinjam.length === 0) {
    $("pinjam-body").innerHTML = `<tr><td colspan="8" class="p-3 text-slate-500">Belum ada peminjaman.</td></tr>`;
    return;
  }
  $("pinjam-body").innerHTML = pinjam
    .map((p) => {
      let aksi = "";
      if (p.status === "Dipinjam") {
        aksi = `<button data-kembali="${p.id_peminjaman}" class="${BTN} bg-blue-600 hover:bg-blue-700">Kembalikan</button>`;
      } else if (p.status === "Dikembalikan") {
        aksi = `<button data-hapus-pinjam="${p.id_peminjaman}" class="${BTN} bg-red-600 hover:bg-red-700">Hapus</button>`;
      }
      return `
        <tr class="border-t">
          <td class="p-2 font-medium">${esc(p.nama_alat)}</td>
          <td class="p-2">${esc(p.nama_peminjam)}</td>
          <td class="p-2">${esc(p.kelas)}</td>
          <td class="p-2">${p.jumlah}</td>
          <td class="p-2">${tgl(p.tanggal_pinjam)}</td>
          <td class="p-2">${tgl(p.tanggal_kembali)}</td>
          <td class="p-2"><span class="rounded px-2 py-0.5 text-xs ${BADGE[p.status] || ""}">${esc(p.status)}</span></td>
          <td class="p-2">${aksi}</td>
        </tr>`;
    })
    .join("");
}

//  CREATE + UPDATE form kategori
function bukaFormKategori(k) {
  $("form-kategori").reset();
  $("k-error").classList.add("hidden");
  $("kategori-id").value = k ? k.id_kategori : "";
  $("judul-kategori").textContent = k ? "Edit Kategori" : "Tambah Kategori";
  if (k) {
    $("k-nama").value = k.nama_kategori;
    $("k-deskripsi").value = k.deskripsi ?? "";
  }
  $("form-kategori").classList.remove("hidden");
  $("k-nama").focus();
}

$("btn-tambah-kategori").addEventListener("click", () => bukaFormKategori(null));
$("btn-batal-kategori").addEventListener("click", () => $("form-kategori").classList.add("hidden"));

$("form-kategori").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("kategori-id").value;
  const body = {
    nama_kategori: $("k-nama").value.trim(),
    deskripsi: $("k-deskripsi").value.trim() || null,
  };
  try {
    const { ok, data } = id
      ? await api("PATCH", `/kategori_alat/${id}`, body)
      : await api("POST", "/kategori_alat", body);
    if (!ok) return tampilError("k-error", data.error || "Gagal menyimpan kategori");
    $("form-kategori").classList.add("hidden");
    await muatSemua();
  } catch (err) {
    console.error(err);
    tampilError("k-error", "Tidak dapat terhubung ke server.");
  }
});

// CREATE peminjaman baru 
$("form-pinjam").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const { ok, data } = await api("POST", "/peminjaman", {
      id_alat: Number($("p-alat").value),
      nama_peminjam: $("p-nama").value.trim(),
      kelas: $("p-kelas").value.trim(),
      jumlah: Number($("p-jumlah").value),
    });
    if (!ok) return tampilError("p-error", data.error || "Gagal menyimpan peminjaman");
    e.target.reset();
    $("p-error").classList.add("hidden");
    await muatSemua();
  } catch (err) {
    console.error(err);
    tampilError("p-error", "Tidak dapat terhubung ke server.");
  }
});

// CREATE + UPDATE
function bukaFormAlat(a) {
  $("form-alat").reset();
  $("a-error").classList.add("hidden");
  $("alat-id").value = a ? a.id_alat : "";
  $("judul-alat").textContent = a ? "Edit Alat" : "Tambah Alat";
  if (a) {
    $("a-nama").value = a.nama_alat;
    $("a-kategori").value = a.id_kategori;
    $("a-kondisi").value = a.kondisi;
    $("a-stok").value = a.stok;
    $("a-lokasi").value = a.lokasi ?? "";
  }
  $("form-alat").classList.remove("hidden");
  $("a-nama").focus();
}

$("btn-tambah").addEventListener("click", () => bukaFormAlat(null));
$("btn-batal").addEventListener("click", () => $("form-alat").classList.add("hidden"));

$("form-alat").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("alat-id").value;
  const body = {
    id_kategori: Number($("a-kategori").value),
    nama_alat: $("a-nama").value.trim(),
    kondisi: $("a-kondisi").value.trim() || undefined,
    stok: Number($("a-stok").value),
    lokasi: $("a-lokasi").value.trim() || undefined,
  };
  try {
    const { ok, data } = id ? await api("PATCH", `/alat/${id}`, body) : await api("POST", "/alat", body);
    if (!ok) return tampilError("a-error", data.error || "Gagal menyimpan alat");
    $("form-alat").classList.add("hidden");
    await muatSemua();
  } catch (err) {
    console.error(err);
    tampilError("a-error", "Tidak dapat terhubung ke server.");
  }
});

//  UPDATE  DELETE
async function jalankan(method, path, konfirmasi) {
  if (!confirm(konfirmasi)) return;
  try {
    const { ok, data } = await api(method, path);
    if (!ok) return alert(data.error || "Gagal memproses permintaan");
    await muatSemua();
  } catch (err) {
    console.error(err);
    alert("Tidak dapat terhubung ke server.");
  }
}

$("kategori-body").addEventListener("click", (e) => {
  const edit = e.target.closest("[data-edit-kategori]");
  if (edit) return bukaFormKategori(kategori.find((k) => k.id_kategori === Number(edit.dataset.editKategori)));

  const hapus = e.target.closest("[data-hapus-kategori]");
  if (hapus) jalankan("DELETE", `/kategori_alat/${hapus.dataset.hapusKategori}`, "Hapus kategori ini? Alat di dalam kategori ini juga akan ikut terhapus.");
});

$("alat-body").addEventListener("click", (e) => {
  const edit = e.target.closest("[data-edit]");
  if (edit) return bukaFormAlat(alat.find((a) => a.id_alat === Number(edit.dataset.edit)));

  const hapus = e.target.closest("[data-hapus-alat]");
  if (hapus) jalankan("DELETE", `/alat/${hapus.dataset.hapusAlat}`, "Hapus alat ini?");
});

$("pinjam-body").addEventListener("click", (e) => {
  const kembali = e.target.closest("[data-kembali]");
  if (kembali) return jalankan("PATCH", `/peminjaman/${kembali.dataset.kembali}`, "Tandai sudah dikembalikan?");

  const hapus = e.target.closest("[data-hapus-pinjam]");
  if (hapus) jalankan("DELETE", `/peminjaman/${hapus.dataset.hapusPinjam}`, "Hapus catatan peminjaman ini?");
});


muatSemua();