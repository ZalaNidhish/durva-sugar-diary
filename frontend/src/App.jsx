import { useState, useEffect, useCallback } from 'react';
import EntryCard from './components/EntryCard';
import AddEntryModal from './components/AddEntryModal';
import { getEntriesByDate, createEntry, updateEntry, deleteEntry } from './api/entryApi';
import './App.css';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getEntriesByDate(selectedDate);
      setEntries(res.data);
    } catch (err) {
      setError(err.message || 'Could not load entries.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleAdd = async (data) => {
    await createEntry(data);
    loadEntries();
  };

  const handleUpdate = async (id, data) => {
    await updateEntry(id, data);
    loadEntries();
  };

  const handleDelete = async (id) => {
    await deleteEntry(id);
    loadEntries();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Durva's Sugar Diary</h1>
        <p className="subtitle">Daily glucose &amp; insulin log</p>
      </header>

      <div className="controls">
        <label className="date-picker">
          <span>Viewing</span>
          <input
            type="date"
            value={selectedDate}
            max={todayStr()}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
        <button className="btn-add" onClick={() => setShowAddModal(true)}>
          + Add reading
        </button>
      </div>

      <p className="selected-date-label">{formatDisplayDate(selectedDate)}</p>

      <main className="entry-list">
        {loading && <p className="status-text">Loading…</p>}
        {!loading && error && <p className="status-text status-text--error">{error}</p>}
        {!loading && !error && entries.length === 0 && (
          <p className="status-text">No readings logged for this day yet.</p>
        )}
        {!loading &&
          !error &&
          entries.map((entry) => (
            <EntryCard
              key={entry._id}
              entry={entry}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
      </main>

      {showAddModal && (
        <AddEntryModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />
      )}
    </div>
  );
}
