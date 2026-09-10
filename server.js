const express = require('express');
const app = express();
const PORT = 3000;

// Middleware untuk membaca JSON body dari request
app.use(express.json());

// Variabel untuk menyimpan data sementara di dalam memori
let latestPlayerData = null;

// 1. Endpoint POST: Menerima request dan menyimpan data sementara
app.post('/api/player', (req, res) => {
  // Ambil data player dari body
  const { player } = req.body;

  // Validasi sederhana
  if (!player) {
    return res.status(400).json({
      status: 'error',
      message: 'Body request harus menyertakan field "player"'
    });
  }

  // Simpan/perbarui data sementara di memori
  latestPlayerData = {
    player: player,
    updatedAt: new Date().toISOString()
  };

  return res.status(200).json({
    status: 'success',
    message: 'Data player berhasil diperbarui',
    data: latestPlayerData
  });
});

// 2. Endpoint GET: Memunculkan data yang terakhir kali di-request
app.get('/api/player', (req, res) => {
  if (!latestPlayerData) {
    return res.status(404).json({
      status: 'error',
      message: 'Belum ada data player yang di-request/disimpan'
    });
  }

  return res.status(200).json({
    status: 'success',
    data: latestPlayerData
  });
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server backend berjalan di http://localhost:${PORT}`);
});
