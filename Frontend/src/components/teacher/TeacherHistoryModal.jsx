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
  onClose,
}) {
  const footer = isEditing ? (
    <div className="modal-actions modal-actions--end">
      <button className="btn btn--primary" onClick={onSave}>Save Changes</button>
      <button className="btn" onClick={() => onEditToggle(false)}>Cancel</button>
    </div>
  ) : (
    <div className="modal-actions modal-actions--end">
      <button className="btn" onClick={() => onEditToggle(true)}>Edit</button>
      <button className="btn" onClick={() => onCopy(item?.evaluationResult || '')}>Copy Text</button>
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
      footer={footer}
    >
      {isEditing ? (
        <div className="report-edit-container">
          <div className="report-edit-section">
            <label className="report-edit-label">AI Evaluation</label>
            <textarea
              className="report-textarea"
              value={editedText}
              onChange={(e) => onEditText(e.target.value)}
            />
          </div>
          <div className="report-edit-section">
            <label className="report-edit-label report-edit-label--feedback">Teacher Feedback</label>
            <textarea
              className="report-textarea report-textarea--feedback"
              value={editedFeedback}
              onChange={(e) => onEditFeedback(e.target.value)}
              placeholder="Add your own feedback here..."
            />
          </div>
        </div>
      ) : (
        <div className="report-view-container">
          <EvaluationReport text={item?.evaluationResult} />
          {hasFeedback && (
            <div className="eval-card eval-card--feedback">
              <div className="eval-card__header">
                <span className="eval-card__heading">Teacher Feedback</span>
              </div>
              <div className="eval-card__body">
                <p className="eval-card__note" style={{ fontStyle: 'normal' }}>
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