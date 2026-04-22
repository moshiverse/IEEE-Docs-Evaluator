// File: Frontend/src/components/teacher/TeacherHistoryModal.jsx
import AppModal from '../common/AppModal';
import EvaluationReport from '../common/EvaluationReport';

function TeacherHistoryModal({
  item,
  isEditing,
  editedText,
  editedFeedback,
  onEditToggle,
  onEditText,
  onEditFeedback,
  onSave,
  onSend,
  onCopy,
  onReturn,
  onClose,
}) {
  const footer = isEditing ? (
    <div className="modal-actions modal-actions--end">
      <button className="btn btn--primary" onClick={onSave}>Save Changes</button>
      <button className="btn" onClick={() => onEditToggle(false)}>Cancel</button>
    </div>
  ) : (
    <div className="modal-actions modal-actions--end">
      <button className="btn" onClick={() => onCopy(item?.evaluationResult || '')}>Copy Text</button>
      <button className="btn" onClick={() => onEditToggle(true)}>Edit</button>
      <button className="btn btn--secondary" onClick={onReturn}>Return</button>
      <button className="btn btn--primary" onClick={onSend} disabled={item?.isSent}>
        {item?.isSent ? 'Sent to Student' : 'Send Result'}
      </button>
    </div>
  );

  const hasFeedback = item?.teacherFeedback?.trim();

  return (
    <AppModal
      isOpen={Boolean(item)}
      onClose={onClose}
      title="Saved Evaluation Report"
      subtitle={item ? `File: ${item.fileName}` : ''}
      containerClassName="submission-history-modal"
      footer={footer}
    >
      {isEditing ? (
        // --- ADDED STRICT INLINE SCROLLING HERE ---
        <div className="report-edit-container" style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>
          <div className="report-edit-section">
            <label className="report-edit-label">AI Evaluation</label>
            <textarea
              className="report-textarea"
              value={editedText}
              onChange={(e) => onEditText(e.target.value)}
              style={{ minHeight: '300px' }} // Ensures text area is tall enough to edit comfortably
            />
          </div>
          <div className="report-edit-section">
            <label className="report-edit-label report-edit-label--feedback">Teacher Feedback</label>
            <textarea
              className="report-textarea report-textarea--feedback"
              value={editedFeedback}
              onChange={(e) => onEditFeedback(e.target.value)}
              placeholder="Add your own feedback here..."
              style={{ minHeight: '150px' }}
            />
          </div>
        </div>
      ) : (
        // --- ADDED STRICT INLINE SCROLLING HERE ---
        <div className="report-view-container" style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>
          
          <EvaluationReport 
            text={item?.evaluationResult} 
            images={item?.extractedImages || []} 
          />
          
          {hasFeedback && (
            <div className="eval-card eval-card--feedback" style={{ marginTop: '1.5rem' }}>
              <div className="eval-card__header">
                <span className="eval-card__heading" style={{ color: 'var(--text-main)' }}>Teacher Feedback</span>
              </div>
              <div className="eval-card__body">
                <p className="eval-card__note" style={{ fontStyle: 'normal', whiteSpace: 'pre-wrap' }}>
                  {item.teacherFeedback}
                </p>
              </div>
            </div>
          )}
          
        </div>
      )}
    </AppModal>
  );
}

export default TeacherHistoryModal;