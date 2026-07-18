const Entry = require('../models/Entry');
const DailySummary = require('../models/dailySummary.js');

function dayBounds(dateInput) {
  const start = new Date(dateInput);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateInput);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function updateDailySummary(dateInput) {
  const { start, end } = dayBounds(dateInput);

  const entries = await Entry.find({ date: { $gte: start, $lte: end } });

  if (entries.length === 0) {
    await DailySummary.findOneAndDelete({ date: start });
    return null;
  }

  const total = entries.reduce((sum, e) => sum + e.glucoseLevel, 0);
  const avgGlucose = Math.round((total / entries.length) * 100) / 100;

  const summary = await DailySummary.findOneAndUpdate(
    { date: start },
    { date: start, avgGlucose, entryCount: entries.length },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return summary;
}

module.exports = { updateDailySummary, dayBounds };
