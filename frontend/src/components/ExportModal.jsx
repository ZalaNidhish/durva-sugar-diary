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

      const rows = entries.map((entry) => ({
        Date: entryDateStr(entry),
        Time: entry.time,
        'Glucose Level (mg/dL)': entry.glucoseLevel,
        'Insulin (units)': entry.insulinUnits,
        Meal: entry.mealDescription || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 12 },
        { wch: 8 },
        { wch: 20 },
        { wch: 16 },
        { wch: 40 },
      ];

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