const express = require("express");
const cors = require("cors");
const app = express();
const pool = require("./db");

require("dotenv").config();

app.use(cors());
app.use(express.json());

// Body kosong tetap dianggap objek kosong, supaya tidak error 500
app.use((req, res, next) => {
    req.body = req.body || {};
    next();
});

// Semua :id harus angka, kalau bukan dibalas 400
app.param("id", (req, res, next, val) => {
    if (!/^\d+$/.test(val)) {
        return res.status(400).json({ error: "ID harus berupa angka" });
    }
    next();
});

app.get("/", (req, res) => {
    res.send("Selamat datang di Server Backend Peminjaman Alat!");
});




// READ
app.get("/api/alat", async (req, res) => {
    try {
        const query = `
      SELECT a.*, k.nama_kategori
      FROM alat a
      LEFT JOIN kategori_alat k ON a.id_kategori = k.id_kategori
      ORDER BY a.id_alat ASC`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

app.get("/api/peminjaman", async (req, res) => {
    try {
        const query = `
      SELECT p.*, a.nama_alat
      FROM peminjaman p
      LEFT JOIN alat a ON p.id_alat = a.id_alat
      ORDER BY p.id_peminjaman DESC`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

app.get("/api/kategori_alat", async (req, res) => {
    try {
        const query = "SELECT * FROM kategori_alat ORDER BY id_kategori ASC";
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// CREATE
app.post("/api/alat", async (req, res) => {
    try {
        const { id_kategori, nama_alat, kondisi, stok, lokasi } = req.body;

        if (!nama_alat || !Number.isInteger(stok) || stok < 0) {
            return res.status(400).json({
                error: "nama_alat wajib diisi dan stok harus bilangan bulat >= 0",
            });
        }

        const query = `INSERT INTO alat (id_kategori, nama_alat, kondisi, stok, lokasi)
      VALUES ($1, $2, COALESCE($3, 'Baik'), $4, $5) RETURNING *`;
        const result = await pool.query(query, [id_kategori, nama_alat, kondisi, stok, lokasi]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.code === "23503") {
            return res.status(400).json({ error: "Kategori tidak ditemukan" });
        }
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

app.post("/api/kategori_alat", async (req, res) => {
    try {
        const { nama_kategori, deskripsi } = req.body;

        if (!nama_kategori) {
            return res.status(400).json({ error: "nama_kategori wajib diisi" });
        }

        const query = `INSERT INTO kategori_alat (nama_kategori, deskripsi)
      VALUES ($1, $2) RETURNING *`;
        const result = await pool.query(query, [nama_kategori, deskripsi]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

app.post("/api/peminjaman", async (req, res) => {
    try {
        const { id_alat, nama_peminjam, kelas, jumlah } = req.body;

        if (!id_alat || !nama_peminjam || !kelas || !Number.isInteger(jumlah) || jumlah < 1) {
            return res.status(400).json({ error: "Data tidak lengkap atau jumlah tidak valid" });
        }

        const query = `INSERT INTO peminjaman (id_alat, nama_peminjam, kelas, jumlah)
      VALUES ($1, $2, $3, $4) RETURNING *`;
        const result = await pool.query(query, [id_alat, nama_peminjam, kelas, jumlah]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.code === "P0001") {
            return res.status(400).json({ error: err.message });
        }
        if (err.code === "23503") {
            return res.status(404).json({ error: "Alat tidak ditemukan" });
        }
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// UPDATE
app.patch("/api/alat/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { id_kategori, nama_alat, kondisi, stok, lokasi } = req.body;

        const query = `
      UPDATE alat
      SET id_kategori = COALESCE($1, id_kategori),
          nama_alat = COALESCE($2, nama_alat),
          kondisi = COALESCE($3, kondisi),
          stok = COALESCE($4, stok),
          lokasi = COALESCE($5, lokasi)
      WHERE id_alat = $6 RETURNING *`;
        const result = await pool.query(query, [id_kategori, nama_alat, kondisi, stok, lokasi, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Data tidak ditemukan" }); //tandai 
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.code === "23514") {
            return res.status(400).json({ error: "Stok tidak boleh negatif" });
        }
        if (err.code === "23503") {
            return res.status(400).json({ error: "Kategori tidak ditemukan" });
        }
        res.status(500).json({ error: "Data tidak bisa diupdate" });
    }
});

app.patch("/api/kategori_alat/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_kategori, deskripsi } = req.body;

        const query = `
      UPDATE kategori_alat
      SET nama_kategori = COALESCE($2, nama_kategori),
          deskripsi = COALESCE($3, deskripsi)
      WHERE id_kategori = $1 RETURNING *`;
        const result = await pool.query(query, [id, nama_kategori, deskripsi]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Data tidak ditemukan" });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Data tidak bisa diupdate" });
    }
});

app.patch("/api/peminjaman/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      UPDATE peminjaman
      SET status = 'Dikembalikan', tanggal_kembali = CURRENT_DATE
      WHERE id_peminjaman = $1 AND status = 'Dipinjam' RETURNING *`;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Data tidak ditemukan atau sudah dikembalikan" });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Data tidak bisa diupdate" });
    }
});

// DELETE
app.delete("/api/alat/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const query = "DELETE FROM alat WHERE id_alat = $1 RETURNING *";
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Data tidak ditemukan" });
        }
        res.json({ pesan: "Alat berhasil dihapus" });
    } catch (err) {
        console.error(err.message);
        if (err.code === "23503") {
            return res.status(409).json({
                error: "Alat tidak bisa dihapus karena masih memiliki riwayat peminjaman",
            });
        }
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

app.delete("/api/kategori_alat/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const query = "DELETE FROM kategori_alat WHERE id_kategori = $1 RETURNING *";
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Data tidak ditemukan" });
        }
        res.json({ pesan: "Kategori berhasil dihapus" });
    } catch (err) {
        console.error(err.message);
        if (err.code === "23503") {
            return res.status(409).json({
                error: "Kategori tidak bisa dihapus karena alatnya masih punya riwayat peminjaman",
            });
        }
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

app.delete("/api/peminjaman/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const query = `DELETE FROM peminjaman
      WHERE id_peminjaman = $1 AND status = 'Dikembalikan' RETURNING *`;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Data tidak ditemukan atau belum dikembalikan" });
        }
        res.json({ pesan: "Peminjaman berhasil dihapus" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// JALANKAN SERVER
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server berhasil berjalan di http://localhost:${PORT}`);
});



