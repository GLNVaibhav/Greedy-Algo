function validateAllocate(req, res, next) {
  const { patients, totalSlots } = req.body || {};
  if (!Array.isArray(patients) || typeof totalSlots !== 'number') {
    return res.status(400).json({ error: 'Invalid payload: expected { patients: [...], totalSlots: number }' });
  }
  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    if (!p || typeof p.name !== 'string' || p.name.trim() === '') return res.status(400).json({ error: `Patient at index ${i} missing name` });
    if (typeof p.emergency !== 'number' || p.emergency < 0 || p.emergency > 100) return res.status(400).json({ error: `Patient ${p.name} has invalid emergency` });
    if (typeof p.req_time !== 'number' || p.req_time <= 0) return res.status(400).json({ error: `Patient ${p.name} has invalid req_time` });
  }
  next();
}

module.exports = { validateAllocate };
