// Memori sementara di tingkat instance serverless
let latestPlayerData = null;

export default function handler(req, res) {
  // Set CORS header
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ==========================================
  // 1. ENDPOINT POST: SIMPAN / UPDATE DATA
  // ==========================================
  if (req.method === 'POST') {

    // Ambil token dari header Authorization
    const authHeader = req.headers.authorization;

    // Format: Bearer TOKEN_KAMU
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    // Cek token
    if (!token || token !== process.env.API_TOKEN) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: Token tidak valid'
      });
    }

    // Ambil data player
    const { player } = req.body || {};

    if (!player) {
      return res.status(400).json({
        status: 'error',
        message: 'Body request harus menyertakan field "player"'
      });
    }

    // Simpan data
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

  // ==========================================
  // 2. ENDPOINT GET: AMBIL DATA TERAKHIR
  // ==========================================
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

  // ==========================================
  // 3. METHOD SELAIN GET DAN POST
  // ==========================================
  return res.status(405).json({
    status: 'error',
    message: 'Method Not Allowed'
  });
}
