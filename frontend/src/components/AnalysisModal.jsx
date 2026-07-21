import { useState, useEffect, useCallback } from 'react';
import { getDailyAnalysis, getWeeklyAnalysis } from '../api/entryApi';
import GlucoseLineChart from './GlucoseLineChart';

const PERIODS = [
  { key: 'daily', label: 'Daily', icon: '📅' },
  { key: 'weekly', label: 'Weekly', icon: '🗓️' },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

// Local calendar date as 'YYYY-MM-DD'. Deliberately NOT toISOString(),
// which reports the UTC date and drifts a day off from local "today" for
// timezones ahead of or behind UTC (e.g. IST) for part of the day.
function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayStr() {
  return toDateStr(new Date());
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function formatDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AnalysisModal({ onClose }) {
  const [period, setPeriod] = useState('daily');
  // The single date driving whichever view is active: the exact day for
  // "daily", or any date inside the target week for "weekly".
  const [refDate, setRefDate] = useState(todayStr());
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p, date) => {
    setLoading(true);
    setError('');
    try {
      const res = p === 'daily' ? await getDailyAnalysis(date) : await getWeeklyAnalysis(date);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Could not load analysis.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period, refDate);
  }, [period, refDate, load]);

  // Close on Escape for a proper "page" feel.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isToday = refDate === todayStr();
  const goPrev = () => setRefDate((d) => addDays(d, period === 'daily' ? -1 : -7));
  const goNext = () => {
    if (isToday) return;
    setRefDate((d) => addDays(d, period === 'daily' ? 1 : 7));
  };

  const data = result?.data || [];
  const overallAvg = result?.avg ?? null;
  const values = data.map((d) => d.value);
  const highest = values.length > 0 ? Math.max(...values) : null;
  const lowest = values.length > 0 ? Math.min(...values) : null;

  let rangeLabel = '';
  if (period === 'daily') {
    rangeLabel = formatDay(refDate);
  } else if (result?.weekStart && result?.weekEnd) {
    rangeLabel = `${formatShort(result.weekStart)} – ${formatShort(result.weekEnd)}`;
  }

  return (
    <div className="analysis-page">
      <header className="analysis-page-header">
        <button className="analysis-back" onClick={onClose} aria-label="Back">
          ←
        </button>
        <div className="analysis-page-title">
          <h1>Glucose analysis</h1>
          <p>See how her readings trend over time</p>
        </div>
      </header>

      <div className="analysis-page-body">
        <div className="period-toggle">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`period-btn ${period === p.key ? 'period-btn--active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              <span className="period-btn-icon">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>

        <div className="analysis-nav">
          <button className="analysis-nav-arrow" onClick={goPrev} aria-label="Previous">
            ‹
          </button>

          <div className="analysis-nav-current">
            <span className="analysis-nav-range">{rangeLabel}</span>
            <input
              type="date"
              className="analysis-nav-date"
              value={refDate}
              max={todayStr()}
              onChange={(e) => setRefDate(e.target.value)}
            />
          </div>

          <button
            className="analysis-nav-arrow"
            onClick={goNext}
            disabled={isToday}
            aria-label="Next"
          >
            ›
          </button>
        </div>

        {loading && <p className="status-text">Loading…</p>}
        {!loading && error && <p className="status-text status-text--error">{error}</p>}
        {!loading && !error && data.length === 0 && (
          <p className="status-text">
            {period === 'daily'
              ? 'No readings logged for this day.'
              : 'No readings logged for this week.'}
          </p>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            <div className="analysis-stats-grid">
              <div className="analysis-stat-card analysis-stat-card--accent">
                <span className="analysis-stat-label">Average</span>
                <span className="analysis-stat-value">{overallAvg}</span>
                <span className="analysis-stat-unit">mg/dL</span>
              </div>
              <div className="analysis-stat-card">
                <span className="analysis-stat-label">Highest</span>
                <span className="analysis-stat-value analysis-stat-value--high">{highest}</span>
                <span className="analysis-stat-unit">mg/dL</span>
              </div>
              <div className="analysis-stat-card">
                <span className="analysis-stat-label">Lowest</span>
                <span className="analysis-stat-value analysis-stat-value--low">{lowest}</span>
                <span className="analysis-stat-unit">mg/dL</span>
              </div>
              <div className="analysis-stat-card">
                <span className="analysis-stat-label">Readings</span>
                <span className="analysis-stat-value">{result.entryCount}</span>
                <span className="analysis-stat-unit">
                  {period === 'daily' ? 'today' : `across ${data.length} day${data.length === 1 ? '' : 's'}`}
                </span>
              </div>
            </div>

            <div className="analysis-chart-card">
              <h3 className="analysis-chart-title">
                {period === 'daily'
                  ? 'Glucose readings through the day'
                  : 'Average glucose by day this week'}
              </h3>
              <GlucoseLineChart data={data} height={380} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}