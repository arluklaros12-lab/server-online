const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const DB_KEY = 'gt_leaderboard';
  const VALID_TOKEN = process.env.API_TOKEN || "token_rahasia_anda_123";

  try {
    // ==========================================
    // 1. ENDPOINT POST: Simpan / Update Data
    // ==========================================
    if (req.method === 'POST') {
      const clientToken = 
        req.headers['x-api-token'] || 
        req.headers['authorization']?.replace('Bearer ', '') || 
        req.query?.token || 
        req.body?.token;

      if (!clientToken || clientToken !== VALID_TOKEN) {
        return res.status(401).json({
          status: 'error',
          message: 'Akses ditolak: Token tidak valid!'
        });
      }

      const body = req.body || {};
      let currentData = (await kv.get(DB_KEY)) || {};

      const processEntry = (item) => {
        if (!item.growid) return null;

        return {
          growid: item.growid,
          locks: {
            lock_5980: Number(item.lock1) || 0,
            lock_4428: Number(item.lock2) || 0,
            lock_9640: Number(item.lock3) || 0
          },
          updatedAt: new Date().toISOString()
        };
      };

      const itemsToProcess = Array.isArray(body) ? body : (body.data || [body]);
      let updatedCount = 0;

      itemsToProcess.forEach((item) => {
        const entry = processEntry(item);
        if (entry) {
          currentData[entry.growid.toLowerCase()] = entry;
          updatedCount++;
        }
      });

      // Simpan data terbaru ke Vercel KV
      await kv.set(DB_KEY, currentData);

      return res.status(200).json({
        status: 'success',
        message: `Berhasil memperbarui ${updatedCount} pemain`,
        totalPlayersStored: Object.keys(currentData).length
      });
    }

    // ==========================================
    // 2. ENDPOINT GET: Ambil Data Leaderboard
    // ==========================================
    if (req.method === 'GET') {
      const currentData = (await kv.get(DB_KEY)) || {};

      const sortedLeaderboard = Object.values(currentData)
        .map((player) => {
          const totalScore = player.locks.lock_5980 + player.locks.lock_4428 + player.locks.lock_9640;
          return {
            ...player,
            totalScore: totalScore
          };
        })
        .sort((a, b) => b.totalScore - a.totalScore);

      return res.status(200).json({
        status: 'success',
        totalPlayers: sortedLeaderboard.length,
        leaderboard: sortedLeaderboard
      });
    }

    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });

  } catch (error) {
    // Menangkap error jika koneksi KV gagal
    console.error("Database Error:", error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal terhubung ke database KV. Pastikan Vercel KV Storage sudah di-connect.',
      error: error.message
    });
  }
};
