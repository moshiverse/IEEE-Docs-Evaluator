import '../../styles/components/submission-stats.css';

function SubmissionStats({ stats }) {
  if (!stats) return null;

  return (
    <section className="submission-stats" aria-label="Submission Statistics">
      <div className="submission-stats__filters">
        {stats.sectionLabel && (
          <div className="submission-stats__tag">
            <span className="submission-stats__tag-label">Section</span>
            <span className="submission-stats__tag-value">{stats.sectionLabel}</span>
          </div>
        )}
        {stats.teamLabel && (
          <div className="submission-stats__tag">
            <span className="submission-stats__tag-label">Team</span>
            <span className="submission-stats__tag-value">{stats.teamLabel}</span>
          </div>
        )}
      </div>

      <div className="submission-stats__summary">
        <div className="submission-stats__count-card">
          <span className="submission-stats__count-label">
            {stats.studentName ? 'Student' : 'Students'}
          </span>
          <span className="submission-stats__count-value">
            {stats.studentName || stats.studentCount}
          </span>
        </div>
      </div>

      <div className="submission-stats__docs">
        <h3 className="submission-stats__docs-title">
          {stats.studentName ? 'Submissions' : 'Submission Count'}
        </h3>
        <div className="submission-stats__docs-grid">
          {stats.docCounts.map((doc) => (
            <div key={doc.type} className="submission-stats__doc-card">
              <span className="submission-stats__doc-type">{doc.type}</span>
              <span className="submission-stats__doc-count">{doc.count}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SubmissionStats;
