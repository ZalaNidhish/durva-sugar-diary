const mongoose = require('mongoose');

// One document per calendar day. Recomputed/upserted whenever entries for
// that day are created, edited, or deleted (see utils/dailySummary.js), so
// the average is a stored, precomputed value rather than something
// recalculated on every page load.
const dailySummarySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
    },
    avgGlucose: {
      type: Number,
      required: true,
    },
    entryCount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailySummary', dailySummarySchema);