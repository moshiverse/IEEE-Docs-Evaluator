import AppModal from '../common/AppModal';
import EvaluationReport from '../common/EvaluationReport';

function StudentReportModal({ report, onClose }) {
  const hasFeedback = report?.teacherFeedback?.trim();

  return (
    <AppModal
      isOpen={Boolean(report)}
      onClose={onClose}
      title="Professor's Evaluation"
      subtitle={report ? `File: ${report.fileName}` : ''}
    >
      <div className="report-view-container">
        <EvaluationReport text={report?.evaluationResult} />
        {hasFeedback && (
          <div className="eval-card eval-card--feedback">
            <div className="eval-card__header">
              <span className="eval-card__heading">Teacher Feedback</span>
            </div>
            <div className="eval-card__body">
              <p className="eval-card__note" style={{ fontStyle: 'normal' }}>
                {report.teacherFeedback}
              </p>
            </div>
          </div>
        )}
      </div>
    </AppModal>
  );
}

export default StudentReportModal;
