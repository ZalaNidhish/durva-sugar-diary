const express = require('express');
const router = express.Router();
const Entry = require('../models/Entry');
const asyncHandler = require('../middleware/asyncHandler');
const validateEntry = require('../middleware/validateEntry');

// GET /api/entries - all entries, newest day first
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const entries = await Entry.find().sort({ date: -1, time: 1 });
    res.json({ success: true, data: entries });
  })
);

router.get(
  '/day/:date',
  asyncHandler(async (req, res) => {
    const { date } = req.params;

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime())) {
      return res.status(400).json({ success: false, errors: ['Invalid date format'] });
    }

    const entries = await Entry.find({ date: { $gte: start, $lte: end } }).sort({
      time: 1,
    });

    res.json({ success: true, data: entries });
  })
);

// GET /api/entries/:id - single entry
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, errors: ['Entry not found'] });
    }
    res.json({ success: true, data: entry });
  })
);

// POST /api/entries - create
router.post(
  '/',
  validateEntry,
  asyncHandler(async (req, res) => {
    const entry = await Entry.create(req.body);
    res.status(201).json({ success: true, data: entry });
  })
);

// PUT /api/entries/:id - update
router.put(
  '/:id',
  validateEntry,
  asyncHandler(async (req, res) => {
    const entry = await Entry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!entry) {
      return res.status(404).json({ success: false, errors: ['Entry not found'] });
    }
    res.json({ success: true, data: entry });
  })
);

// DELETE /api/entries/:id - delete
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const entry = await Entry.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, errors: ['Entry not found'] });
    }
    res.json({ success: true, data: {} });
  })
);

module.exports = router;
