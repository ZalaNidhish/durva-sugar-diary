import { useState } from 'react';
import * as XLSX from 'xlsx';
import { getEntriesByRange } from '../api/entryApi';

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayStr() {
  return toDateStr(new Date());
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

function entryDateStr(entry) {
  return entry.date.slice(0, 10);
}

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ExportModal({ onClose }) {
  const [startDate, setStartDate] = useState(daysAgoStr(6));
  const [endDate, setEndDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

// ---------- helpers (put these outside the component) ----------

const SLOTS = [
  { key: 'breakfast', label: 'Before Breakfast', before: 11 * 60 }, // < 11:00
  { key: 'lunch',     label: 'Before Lunch',     before: 15 * 60 }, // < 15:00
  { key: 'dinner',    label: 'Before Dinner',    before: 22 * 60 }, // < 22:00
];

const INCLUDE_NOTES = true; // set false to drop the Meal/Notes column

const timeToMinutes = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};

const getSlotKey = (time) => {
  const mins = timeToMinutes(time);
  const slot = SLOTS.find((s) => mins < s.before);
  return slot ? slot.key : null; // null => 10 PM or later
};

const buildSheet = (entries) => {
  // 1. group by date
  const byDate = new Map();
  entries.forEach((entry) => {
    const date = entryDateStr(entry);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(entry);
  });

  // 2. assign each entry to a slot, or to extras
  const days = [...byDate.keys()].sort().map((date) => {
    const list = byDate
      .get(date)
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    const slots = {};
    const extras = [];
    const notes = [];

    list.forEach((entry) => {
      const key = getSlotKey(entry.time);
      if (key && !slots[key]) slots[key] = entry; // first reading in slot wins
      else extras.push(entry);                    // duplicates / after 10 PM
      if (entry.mealDescription) {
        notes.push(`${entry.time} - ${entry.mealDescription}`);
      }
    });

    return { date, slots, extras, notes: notes.join('; ') };
  });

  const maxExtras = Math.max(0, ...days.map((d) => d.extras.length));

  // 3. header rows
  const top = ['Date'];
  const sub = [''];
  const merges = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }]; // Date spans 2 rows

  SLOTS.forEach((slot) => {
    const c = top.length;
    top.push(slot.label, '');
    sub.push('Sugar', 'Insulin');
    merges.push({ s: { r: 0, c }, e: { r: 0, c: c + 1 } });
  });

  for (let i = 0; i < maxExtras; i++) {
    const c = top.length;
    top.push(`Extra ${i + 1}`, '', '');
    sub.push('Time', 'Sugar', 'Insulin');
    merges.push({ s: { r: 0, c }, e: { r: 0, c: c + 2 } });
  }

  if (INCLUDE_NOTES) {
    const c = top.length;
    top.push('Meal / Notes');
    sub.push('');
    merges.push({ s: { r: 0, c }, e: { r: 1, c } });
  }

  // 4. data rows
  const dataRows = days.map((day) => {
    const row = [day.date];

    SLOTS.forEach((slot) => {
      const e = day.slots[slot.key];
      row.push(e ? e.glucoseLevel : '', e ? e.insulinUnits : '');
    });

    for (let i = 0; i < maxExtras; i++) {
      const e = day.extras[i];
      row.push(e ? e.time : '', e ? e.glucoseLevel : '', e ? e.insulinUnits : '');
    }

    if (INCLUDE_NOTES) row.push(day.notes);
    return row;
  });

  const aoa = [top, sub, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet['!merges'] = merges;

  // column widths
  const cols = [{ wch: 12 }];
  SLOTS.forEach(() => cols.push({ wch: 9 }, { wch: 9 }));
  for (let i = 0; i < maxExtras; i++) cols.push({ wch: 8 }, { wch: 9 }, { wch: 9 });
  if (INCLUDE_NOTES) cols.push({ wch: 50 });
  worksheet['!cols'] = cols;

  return worksheet;
};

// ---------- your handler ----------

const handleExport = async (e) => {
  e.preventDefault();
  setError('');

  if (!startDate || !endDate) {
    setError('Please choose both a start and end date.');
    return;
  }
  if (startDate > endDate) {
    setError('Start date must be on or before the end date.');
    return;
  }

  setLoading(true);
  try {
    const res = await getEntriesByRange(startDate, endDate);
    const entries = res.data || [];

    if (entries.length === 0) {
      setError('No readings found in that date range.');
      setLoading(false);
      return;
    }

    const worksheet = buildSheet(entries);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sugar Diary');

    const filename = `sugar-diary_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(workbook, filename);

    onClose();
  } catch (err) {
    setError(err.message || 'Could not export entries.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export to Excel</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="entry-form" onSubmit={handleExport}>
          <p className="status-text" style={{ margin: 0, textAlign: 'left' }}>
            Choose a date range. Every glucose, meal, and insulin reading in that
            range ({formatDisplayDate(startDate)} – {formatDisplayDate(endDate)})
            will be included.
          </p>

          <div className="form-row">
            <label>
              Start date
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label>
              End date
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={todayStr()}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Exporting…' : 'Download .xlsx'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}