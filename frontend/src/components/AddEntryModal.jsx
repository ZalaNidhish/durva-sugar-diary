import EntryForm from './EntryForm';

export default function AddEntryModal({ onClose, onAdd }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New reading</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <EntryForm
          onCancel={onClose}
          onSubmit={async (data) => {
            await onAdd(data);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
