const Redis = require('ioredis');

let redis;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
}

const DB_KEY = 'gt_leaderboard';
const VALID_TOKEN = process.env.API_TOKEN || "token_rahasia_anda_123";

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!redis) {
    return res.status(500).json({ status: 'error', message: 'REDIS_URL belum diatur!' });
  }

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
      message: 'Token tidak valid!'
    });
  }

  const body = req.body || {};

  const rawData = await redis.get(DB_KEY);
  let currentData = rawData ? JSON.parse(rawData) : {};

  const processEntry = (item) => {
    if (!item || !item.growid) return null;

    return {
      growid: String(item.growid),

      locks: {
        lock_5980: Number(item.lock1) || 0,
        lock_4428: Number(item.lock2) || 0,
        lock_9640: Number(item.lock3) || 0
      },

      updatedAt: new Date().toISOString()
    };
  };

  // ==========================================
  // SUPPORT:
  // 1. { leaderboard: [...] }
  // 2. { data: [...] }
  // 3. [...]
  // 4. { growid, lock1, lock2, lock3 }
  // ==========================================

  const itemsToProcess =
    Array.isArray(body)
      ? body
      : Array.isArray(body.leaderboard)
        ? body.leaderboard
        : Array.isArray(body.data)
          ? body.data
          : [body];

  let updatedCount = 0;

  itemsToProcess.forEach((item) => {
    const entry = processEntry(item);

    if (entry) {
      currentData[entry.growid.toLowerCase()] = entry;
      updatedCount++;
    }
  });

  await redis.set(
    DB_KEY,
    JSON.stringify(currentData)
  );

  return res.status(200).json({
    status: 'success',
    message: `Berhasil memperbarui ${updatedCount} pemain`,
    totalPlayersStored: Object.keys(currentData).length
  });
}

    // ==========================================
    // 2. ENDPOINT GET: Membaca Leaderboard
    // ==========================================
    if (req.method === 'GET') {
      const rawData = await redis.get(DB_KEY);
      const currentData = rawData ? JSON.parse(rawData) : {};

      const sortedLeaderboard = Object.values(currentData)
        .map((player) => {
          const totalScore = player.locks.lock_5980 + player.locks.lock_4428 + player.locks.lock_9640;
          return { ...player, totalScore };
        })
        .sort((a, b) => b.totalScore - a.totalScore);

      return res.status(200).json({
        status: 'success',
        totalPlayers: sortedLeaderboard.length,
        leaderboard: sortedLeaderboard
      });
    }

    // ==========================================
    // 3. ENDPOINT DELETE: Hapus Data Player
    // ==========================================
    if (req.method === 'DELETE') {
      const clientToken = 
        req.headers['x-api-token'] || 
        req.headers['authorization']?.replace('Bearer ', '') || 
        req.query?.token || 
        req.body?.token;

      if (!clientToken || clientToken !== VALID_TOKEN) {
        return res.status(401).json({ status: 'error', message: 'Token tidak valid!' });
      }

      // Ambil growid dari query parameter (misal: ?growid=PlayerOne) atau body
      const targetGrowId = req.query?.growid || req.body?.growid;
      const isResetAll = req.query?.all === 'true' || req.body?.all === true;

      // Option A: Reset Seluruh Leaderboard
      if (isResetAll) {
        await redis.del(DB_KEY);
        return res.status(200).json({
          status: 'success',
          message: 'Seluruh data leaderboard berhasil dihapus/direset!'
        });
      }

      // Option B: Hapus 1 GrowID
      if (!targetGrowId) {
        return res.status(400).json({
          status: 'error',
          message: 'Sebutkan "growid" yang ingin dihapus atau gunakan parameter ?all=true untuk reset seluruhnya.'
        });
      }

      const rawData = await redis.get(DB_KEY);
      let currentData = rawData ? JSON.parse(rawData) : {};

      const lowerGrowId = targetGrowId.toLowerCase();
      if (!currentData[lowerGrowId]) {
        return res.status(404).json({
          status: 'error',
          message: `GrowID "${targetGrowId}" tidak ditemukan di leaderboard.`
        });
      }

      // Hapus GrowID dari object JSON
      delete currentData[lowerGrowId];

      // Simpan kembali data yang sudah diperbarui ke Redis
      await redis.set(DB_KEY, JSON.stringify(currentData));

      return res.status(200).json({
        status: 'success',
        message: `Data untuk GrowID "${targetGrowId}" berhasil dihapus.`,
        remainingPlayers: Object.keys(currentData).length
      });
    }

    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });

  } catch (error) {
    console.error("Redis Error:", error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal terhubung ke Database Redis!',
      error: error.message
    });
  }
};
