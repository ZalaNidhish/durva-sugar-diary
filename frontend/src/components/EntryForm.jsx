import { useState } from 'react';

// Auto-fills today's date and the current time, so the "Add Reading"
// button doesn't make anyone type the date/time by hand.
function getCurrentDateTime() {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return { date, time: `${hours}:${minutes}` };
}

export default function EntryForm({ initialData, onSubmit, onCancel }) {
  const defaults = initialData
    ? {
        date: new Date(initialData.date).toISOString().split('T')[0],
        time: initialData.time,
        glucoseLevel: initialData.glucoseLevel,
        insulinUnits: initialData.insulinUnits,
        mealDescription: initialData.mealDescription || '',
      }
    : {
        ...getCurrentDateTime(),
        glucoseLevel: '',
        insulinUnits: '',
        mealDescription: '',
      };

  const [form, setForm] = useState(defaults);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.time || form.glucoseLevel === '' || form.insulinUnits === '') {
      setError('Please fill in date, time, glucose level, and insulin units.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        glucoseLevel: Number(form.glucoseLevel),
        insulinUnits: Number(form.insulinUnits),
      });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      <div className="form-row">
        <label>
          Date
          <input type="date" name="date" value={form.date} onChange={handleChange} required />
        </label>
        <label>
          Time
          <input type="time" name="time" value={form.time} onChange={handleChange} required />
        </label>
      </div>

      <div className="form-row">
        <label>
          Glucose level (mg/dL)
          <input
            type="number"
            name="glucoseLevel"
            value={form.glucoseLevel}
            onChange={handleChange}
            min="0"
            required
          />
        </label>
        <label>
          Insulin units
          <input
            type="number"
            name="insulinUnits"
            value={form.insulinUnits}
            onChange={handleChange}
            min="0"
            step="0.5"
            required
          />
        </label>
      </div>

      <label>
        Meal description
        <textarea
          name="mealDescription"
          value={form.mealDescription}
          onChange={handleChange}
          rows={2}
        />
      </label>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
