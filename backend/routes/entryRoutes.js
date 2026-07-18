const express = require('express');
const router = express.Router();
const Entry = require('../models/Entry');
const asyncHandler = require('../middleware/asyncHandler');
const validateEntry = require('../middleware/validateEntry');
const { updateDailySummary } = require('../utils/dailySummary');

// GET /api/entries - all entries, newest day first
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const entries = await Entry.find().sort({ date: -1, time: 1 });
    res.json({ success: true, data: entries });
  })
);

// GET /api/entries/day/:date - entries for one day + that day's stored average
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

    // Keep the stored summary fresh, then hand it back alongside the entries.
    const summary = await updateDailySummary(date);

    res.json({
      success: true,
      data: entries,
      average: summary
        ? { avgGlucose: summary.avgGlucose, entryCount: summary.entryCount }
        : null,
    });
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
    await updateDailySummary(entry.date);
    res.status(201).json({ success: true, data: entry });
  })
);

// PUT /api/entries/:id - update
router.put(
  '/:id',
  validateEntry,
  asyncHandler(async (req, res) => {
    const existing = await Entry.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, errors: ['Entry not found'] });
    }
    const oldDate = existing.date;

    const entry = await Entry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Refresh the summary for the entry's new day, and for its old day too
    // in case the date field itself was changed.
    await updateDailySummary(entry.date);
    if (new Date(oldDate).toDateString() !== new Date(entry.date).toDateString()) {
      await updateDailySummary(oldDate);
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
    await updateDailySummary(entry.date);
    res.json({ success: true, data: {} });
  })
);

module.exports = router;