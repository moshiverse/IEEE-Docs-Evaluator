import { formatDateTime } from '../../utils/dashboardUtils';

function TeacherHistoryTable({ logs, allCount = 0, loading, onView }) {
  return (
    <div className="card">
      <table className="app-table">
        <thead>
          <tr>
            <th>Date Analyzed</th>
            <th>Document Name</th>
            <th>Model</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="5" className="muted">Loading report history...</td>
            </tr>
          ) : logs.length === 0 ? (
            <tr>
              <td colSpan="5" className="muted">
                {allCount === 0 ? 'No evaluations saved.' : 'No reports match the current search/filter.'}
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id}>
                <td>{formatDateTime(log.evaluatedAt)}</td>
                <td className="strong">{log.fileName}</td>
                <td>{log.modelUsed}</td>
                <td>
                  <span className={`status-chip ${log.isSent ? 'status-chip--sent' : 'status-chip--pending'}`}>
                    {log.isSent ? 'Sent' : 'Pending'}
                  </span>
                </td>
                <td>
                  <button className="btn btn--soft" onClick={() => onView(log)}>View Full Report</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TeacherHistoryTable;
