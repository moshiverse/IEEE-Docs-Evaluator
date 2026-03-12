import { getDisplayType } from '../../utils/dashboardUtils';

function TeacherSubmissionsTable({ files, loading, isSyncing, analyzedFileIds, onSort, onAnalyze }) {
  return (
    <div className="card">
      <table className="app-table" id="teacher-submission-table">
        <thead>
          <tr>
            <th onClick={() => onSort('name')}>Submission Identity</th>
            <th>Type</th>
            <th onClick={() => onSort('date')}>Date Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading || isSyncing ? (
            <tr>
              <td colSpan="4" className="muted">Loading submissions...</td>
            </tr>
          ) : files.length === 0 ? (
            <tr>
              <td colSpan="4" className="muted">No submissions match the selected filters.</td>
            </tr>
          ) : (
            files.map((file, index) => (
              <tr key={`${file.id}-${index}`}>
                <td>
                  <a href={file.webViewLink} target="_blank" rel="noreferrer" className="strong link-reset">
                    {file.name}
                  </a>
                </td>
                <td>{getDisplayType(file.mimeType)}</td>
                <td>{file.submittedAt}</td>
                <td>
                  <button className="btn btn--soft" onClick={() => onAnalyze(file)}>
                    {analyzedFileIds?.has(file.id) ? 'Re-Evaluate' : 'Run AI Analysis'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TeacherSubmissionsTable;
