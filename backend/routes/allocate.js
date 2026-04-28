const express = require('express');
const router = express.Router();
const { allocate } = require('../controllers/allocateController');
const { validateAllocate } = require('../middleware/validate');

router.post('/', validateAllocate, (req, res) => {
  try {
    const { patients, totalSlots } = req.body;
    const result = allocate(patients, totalSlots);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
