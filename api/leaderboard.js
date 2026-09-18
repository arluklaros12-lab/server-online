let leaderboardData = {};

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const VALID_TOKEN = process.env.API_SECRET_TOKEN || "token_rahasia_anda_123";

  if (req.method === 'POST') {
    const clientToken = req.headers['x-api-token'] || req.query.token || req.body?.token;

    if (!clientToken || clientToken !== VALID_TOKEN) {
      return res.status(401).json({ status: 'error', message: 'Token tidak valid' });
    }

    const body = req.body || {};
    const items = Array.isArray(body) ? body : [body];

    items.forEach(item => {
      if (item.growid) {
        leaderboardData[item.growid.toLowerCase()] = {
          growid: item.growid,
          locks: {
            lock_5980: Number(item.lock1) || 0,
            lock_4428: Number(item.lock2) || 0,
            lock_9640: Number(item.lock3) || 0
          },
          updatedAt: new Date().toISOString()
        };
      }
    });

    return res.status(200).json({ status: 'success', message: 'Data berhasil diperbarui' });
  }

  if (req.method === 'GET') {
    const sorted = Object.values(leaderboardData)
      .map(p => ({ ...p, totalScore: p.locks.lock_5980 + p.locks.lock_4428 + p.locks.lock_9640 }))
      .sort((a, b) => b.totalScore - a.totalScore);

    return res.status(200).json({ status: 'success', leaderboard: sorted });
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
};
