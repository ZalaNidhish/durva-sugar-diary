import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { getEntriesByRange } from '../api/entryApi';

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Excel export config                                                 */
/* ------------------------------------------------------------------ */

// Slot cut-offs (minutes from midnight). First slot whose cut-off is
// greater than the entry time wins.
const SLOTS = [
  { key: 'breakfast', label: 'Before Breakfast', before: 11 * 60 }, // < 11:00
  { key: 'lunch', label: 'Before Lunch', before: 15 * 60 }, //        < 15:00
  { key: 'dinner', label: 'Before Dinner', before: 22 * 60 }, //      < 22:00
];

const INCLUDE_NOTES = true; // set false to drop the Meal / Notes column

// Three shades per block: top header, sub header, data cells.
const THEMES = {
  date: { head: 'A6A6A6', sub: 'A6A6A6', data: 'BFBFBF' },
  breakfast: { head: 'E6B8B7', sub: 'F2DCDB', data: 'F8EAEA' },
  lunch: { head: 'C4D79B', sub: 'D8E4BC', data: 'EBF1DE' },
  dinner: { head: 'B1A0C7', sub: 'CCC0DA', data: 'E4DFEC' },
  extra: { head: '95B3D7', sub: 'B8CCE4', data: 'DCE6F1' },
  notes: { head: 'FABF8F', sub: 'FABF8F', data: 'FDE9D9' },
};

const BORDER_SIDE = { style: 'thin', color: { rgb: '808080' } };
const BORDER = {
  top: BORDER_SIDE,
  bottom: BORDER_SIDE,
  left: BORDER_SIDE,
  right: BORDER_SIDE,
};

/* ------------------------------------------------------------------ */
/* Excel export helpers                                                */
/* ------------------------------------------------------------------ */

const timeToMinutes = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};

// Returns 'breakfast' | 'lunch' | 'dinner', or null if 10 PM or later.
const getSlotKey = (time) => {
  const mins = timeToMinutes(time);
  const slot = SLOTS.find((s) => mins < s.before);
  return slot ? slot.key : null;
};

const applyStyles = (worksheet, aoa, themes) => {
  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c < themes.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      // make sure merged / empty cells exist so they get styled too
      if (!worksheet[addr]) worksheet[addr] = { t: 's', v: '' };

      const theme = THEMES[themes[c]];
      const color = r === 0 ? theme.head : r === 1 ? theme.sub : theme.data;

      worksheet[addr].s = {
        fill: { patternType: 'solid', fgColor: { rgb: color } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: BORDER,
        font: { name: 'Calibri', sz: 12 },
      };
    }
  }

  worksheet['!rows'] = aoa.map((_, r) => ({ hpt: r < 2 ? 22 : 20 }));
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
      else extras.push(entry); //                     duplicates / after 10 PM
      if (entry.mealDescription) {
        notes.push(`${entry.time} - ${entry.mealDescription}`);
      }
    });

    return { date, slots, extras, notes: notes.join('; ') };
  });

  const maxExtras = Math.max(0, ...days.map((d) => d.extras.length));

  // 3. header rows (+ a theme per column for styling)
  const top = ['Date'];
  const sub = [''];
  const themes = ['date'];
  const merges = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }]; // Date spans 2 rows

  SLOTS.forEach((slot) => {
    const c = top.length;
    top.push(slot.label, '');
    sub.push('Sugar', 'Insulin');
    themes.push(slot.key, slot.key);
    merges.push({ s: { r: 0, c }, e: { r: 0, c: c + 1 } });
  });

  for (let i = 0; i < maxExtras; i++) {
    const c = top.length;
    top.push(`Extra ${i + 1}`, '', '');
    sub.push('Time', 'Sugar', 'Insulin');
    themes.push('extra', 'extra', 'extra');
    merges.push({ s: { r: 0, c }, e: { r: 0, c: c + 2 } });
  }

  if (INCLUDE_NOTES) {
    const c = top.length;
    top.push('Meal / Notes');
    sub.push('');
    themes.push('notes');
    merges.push({ s: { r: 0, c }, e: { r: 1, c } });
  }

  // 4. data rows
  const dataRows = days.map((day) => {
    const row = [day.date];

    SLOTS.forEach((slot) => {
      const e = day.slots[slot.key];
      row.push(e ? e.glucoseLevel ?? '' : '', e ? e.insulinUnits ?? '' : '');
    });

    for (let i = 0; i < maxExtras; i++) {
      const e = day.extras[i];
      row.push(
        e ? e.time : '',
        e ? e.glucoseLevel ?? '' : '',
        e ? e.insulinUnits ?? '' : ''
      );
    }

    if (INCLUDE_NOTES) row.push(day.notes);
    return row;
  });

  // 5. build + style
  const aoa = [top, sub, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet['!merges'] = merges;

  const cols = [{ wch: 12 }];
  SLOTS.forEach(() => cols.push({ wch: 10 }, { wch: 10 }));
  for (let i = 0; i < maxExtras; i++) cols.push({ wch: 9 }, { wch: 10 }, { wch: 10 });
  if (INCLUDE_NOTES) cols.push({ wch: 50 });
  worksheet['!cols'] = cols;

  applyStyles(worksheet, aoa, themes);
  return worksheet;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ExportModal({ onClose }) {
  const [startDate, setStartDate] = useState(daysAgoStr(6));
  const [endDate, setEndDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        return; // finally{} resets loading
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