// Memori sementara di tingkat instance serverless
let latestPlayerData = null;

export default function handler(req, res) {
  // Set CORS header agar bisa diakses dari domain mana saja
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Endpoint POST: Simpan/Update Data
  if (req.method === 'POST') {
    const { player } = req.body || {};

    if (!player) {
      return res.status(400).json({
        status: 'error',
        message: 'Body request harus menyertakan field "player"'
      });
    }

    latestPlayerData = {
      player: player,
      updatedAt: new Date().toISOString()
    };

    return res.status(200).json({
      status: 'success',
      message: 'Data player berhasil diperbarui',
      data: latestPlayerData
    });
  }

  // 2. Endpoint GET: Ambil Data Terakhir
  if (req.method === 'GET') {
    if (!latestPlayerData) {
      return res.status(404).json({
        status: 'error',
        message: 'Belum ada data player yang disimpan'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: latestPlayerData
    });
  }

  // Method selain GET dan POST
  return res.status(405).json({
    status: 'error',
    message: 'Method Not Allowed'
  });
}
