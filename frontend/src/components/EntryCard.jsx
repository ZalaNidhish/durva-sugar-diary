import { useState } from 'react';
import EntryForm from './EntryForm';

// Simple color cue: flags a reading as low/high so a parent can scan
// a day's cards at a glance. Adjust thresholds to match her doctor's targets.
function glucoseStatus(level) {
  if (level < 70) return 'low';
  if (level > 180) return 'high';
  return 'normal';
}

export default function EntryCard({ entry, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (isEditing) {
    return (
      <div className="entry-card entry-card--editing">
        <EntryForm
          initialData={entry}
          onCancel={() => setIsEditing(false)}
          onSubmit={async (data) => {
            await onUpdate(entry._id, data);
            setIsEditing(false);
          }}
        />
      </div>
    );
  }

  const status = glucoseStatus(entry.glucoseLevel);

  const handleDelete = async () => {
    if (!window.confirm('Delete this reading? This can\'t be undone.')) return;
    setDeleting(true);
    await onDelete(entry._id);
  };

  return (
    <div className={`entry-card status-${status}`}>
      <div className="entry-card-header">
        <span className="entry-time">{entry.time}</span>
        <span className={`status-pill status-pill--${status}`}>{status}</span>
      </div>

      <div className="entry-card-body">
        <div className="entry-stat">
          <span className="stat-label">Glucose</span>
          <span className="stat-value">{entry.glucoseLevel} mg/dL</span>
        </div>
        <div className="entry-stat">
          <span className="stat-label">Insulin</span>
          <span className="stat-value">{entry.insulinUnits} units</span>
        </div>
      </div>

      {entry.mealDescription && (
        <div className="entry-meal">
          <span className="stat-label">Meal</span>
          <p>{entry.mealDescription}</p>
        </div>
      )}

      <div className="entry-card-actions">
        <button className="btn-edit" onClick={() => setIsEditing(true)}>
          Edit
        </button>
        <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
