import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const DB_KEY = 'gt_leaderboard';
  const VALID_TOKEN = process.env.API_SECRET_TOKEN || "token_rahasia_anda_123";

  // ==========================================
  // 1. ENDPOINT POST: Simpan / Update Data (Protected)
  // ==========================================
  if (req.method === 'POST') {
    // Cek Token dari Header, Query, atau Body
    const clientToken = 
      req.headers['x-api-token'] || 
      req.headers['authorization']?.replace('Bearer ', '') || 
      req.query.token || 
      req.body?.token;

    // Validasi Token
    if (!clientToken || clientToken !== VALID_TOKEN) {
      return res.status(401).json({
        status: 'error',
        message: 'Akses ditolak: Token tidak valid atau tidak disertakan!'
      });
    }

    const body = req.body || {};
    let currentData = (await kv.get(DB_KEY)) || {};

    const processEntry = (item) => {
      if (!item.growid) return null;

      const lock1 = Number(item.lock1) || 0; // ID 5980
      const lock2 = Number(item.lock2) || 0; // ID 4428
      const lock3 = Number(item.lock3) || 0; // ID 9640

      return {
        growid: item.growid,
        locks: {
          lock_5980: lock1,
          lock_4428: lock2,
          lock_9640: lock3
        },
        updatedAt: new Date().toISOString()
      };
    };

    // A. Request Bulk (Array)
    const itemsToProcess = Array.isArray(body) ? body : body.data;
    if (Array.isArray(itemsToProcess)) {
      let updatedCount = 0;
      itemsToProcess.forEach((item) => {
        const entry = processEntry(item);
        if (entry) {
          currentData[entry.growid.toLowerCase()] = entry;
          updatedCount++;
        }
      });

      await kv.set(DB_KEY, currentData);

      return res.status(200).json({
        status: 'success',
        message: `Berhasil memperbarui ${updatedCount} pemain`,
        totalPlayersStored: Object.keys(currentData).length
      });
    }

    // B. Request Single Object
    const entry = processEntry(body);
    if (!entry) {
      return res.status(400).json({
        status: 'error',
        message: 'Field "growid" wajib diisi'
      });
    }

    currentData[entry.growid.toLowerCase()] = entry;
    await kv.set(DB_KEY, currentData);

    return res.status(200).json({
      status: 'success',
      message: `Data untuk GrowID ${entry.growid} berhasil diperbarui`,
      data: entry
    });
  }

  // ==========================================
  // 2. ENDPOINT GET: Membaca Leaderboard (Public)
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
}
