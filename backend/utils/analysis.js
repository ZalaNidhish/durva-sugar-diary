const Entry = require('../models/Entry');

function dayBounds(dateInput) {
  const start = new Date(dateInput);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateInput);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Monday 00:00:00 of the week containing dateInput.
function mondayOf(dateInput) {
  const d = new Date(dateInput);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Daily view: every individual reading for one calendar day, in
// chronological order — this is the raw trend within a single day.
async function getDailyAnalysis(dateInput) {
  const { start, end } = dayBounds(dateInput);
  const entries = await Entry.find({ date: { $gte: start, $lte: end } }).sort({ time: 1 });

  const data = entries.map((e) => ({
    label: e.time,
    value: e.glucoseLevel,
  }));

  const avg =
    entries.length > 0
      ? Math.round((entries.reduce((s, e) => s + e.glucoseLevel, 0) / entries.length) * 100) / 100
      : null;

  return {
    data,
    avg,
    entryCount: entries.length,
    date: start.toISOString().split('T')[0],
  };
}

// Weekly view: one point per day (Mon..Sun) of the week containing
// dateInput, each point being that day's average glucose. Days with no
// readings are omitted from the plotted data but counted in entryCount.
async function getWeeklyAnalysis(dateInput) {
  const monday = mondayOf(dateInput);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const entries = await Entry.find({ date: { $gte: monday, $lte: sunday } });

  const buckets = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    buckets.push({ key: day.toISOString().split('T')[0], date: day, sum: 0, count: 0 });
  }

  for (const entry of entries) {
    const key = new Date(entry.date).toISOString().split('T')[0];
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) {
      bucket.sum += entry.glucoseLevel;
      bucket.count += 1;
    }
  }

  const data = buckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      label: b.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
      value: Math.round((b.sum / b.count) * 100) / 100,
      entryCount: b.count,
    }));

  const totalCount = buckets.reduce((s, b) => s + b.count, 0);
  const totalSum = buckets.reduce((s, b) => s + b.sum, 0);
  const avg = totalCount > 0 ? Math.round((totalSum / totalCount) * 100) / 100 : null;

  return {
    data,
    avg,
    entryCount: totalCount,
    daysWithData: data.length,
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  };
}

module.exports = { getDailyAnalysis, getWeeklyAnalysis, mondayOf, dayBounds };