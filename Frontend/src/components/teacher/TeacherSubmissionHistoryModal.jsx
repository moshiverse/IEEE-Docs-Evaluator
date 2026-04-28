import AppModal from '../common/AppModal';
import { extractSubmissionMeta, formatDateTime } from '../../utils/dashboardUtils';

function TeacherSubmissionHistoryModal({ isOpen, file, logs, onViewReport, onDelete, onClose, onReturn }) {
	const subtitle = file?.name ? `Submission: ${file.name}` : '';

	function parseOverallScore(text) {
		if (!text) return null;
		const match = String(text).match(/Overall\s+Score\s*:\s*(\d+(?:\.\d+)?)\s*\/\s*100/i);
		return match ? Number(match[1]) : null;
	}

	function detectExplicitStatus(text) {
		if (!text) return null;
		const match = String(text).match(/\*{0,2}\s*Status\s*\*{0,2}\s*:\s*\[?(IMPROVED|WORSENED|SAME)\]?/i);
		return match ? match[1].toUpperCase() : null;
	}

	function computeStatus(log, index) {
		const explicit = detectExplicitStatus(log.evaluationResult);
		if (explicit) return explicit;

		// Version 1 is always INITIAL — no previous to compare against
		if (log.version === 1) return 'INITIAL';

		const currentScore  = parseOverallScore(log.evaluationResult);
		const previousLog   = logs[index + 1];
		if (!previousLog) return 'INITIAL';

		const previousScore = parseOverallScore(previousLog.evaluationResult);
		if (currentScore == null || previousScore == null) return 'SAME';
		if (currentScore > previousScore) return 'IMPROVED';
		if (currentScore < previousScore) return 'WORSENED';
		return 'SAME';
	}

	function statusClass(status) {
		switch (status) {
			case 'IMPROVED': return 'eval-status-badge eval-status-badge--improved';
			case 'WORSENED': return 'eval-status-badge eval-status-badge--worsened';
			case 'INITIAL':  return 'eval-status-badge eval-status-badge--same';
			default:         return 'eval-status-badge eval-status-badge--same';
		}
	}

	// Compute score trend for compelling demo moment
	const scoreTrend = logs
		.slice()
		.reverse() // oldest first
		.map((log) => parseOverallScore(log.evaluationResult))
		.filter((s) => s !== null);

	return (
		<AppModal
			isOpen={isOpen}
			onClose={onClose}
			title="Evaluation History"
			subtitle={subtitle}
			containerClassName="submission-history-modal"
			footer={
				<div className="modal-actions modal-actions--end submission-history-modal__footer-actions">
					{scoreTrend.length > 1 && (
						<span style={{
							marginRight: 'auto',
							fontSize: '0.82rem',
							color: 'var(--text-muted)',
							display: 'flex',
							alignItems: 'center',
							gap: '0.4rem',
						}}>
							Score trend:
							{scoreTrend.map((score, i) => (
								<span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
									{i > 0 && <span style={{ color: 'var(--line-soft)' }}>→</span>}
									<strong style={{
										color: i === scoreTrend.length - 1 ? 'var(--brand)' : 'var(--text-main)'
									}}>
										{score}
									</strong>
								</span>
							))}
						</span>
					)}
					<button className="btn" onClick={onReturn}>Return</button>
				</div>
			}
		>
			<div className="card">
				<table className="app-table submission-history-modal__table">
					<thead>
						<tr>
							<th>Version</th>
							<th>Date Evaluated</th>
							<th>Submission Identity</th>
							<th>Status</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{logs.length === 0 ? (
							<tr>
								<td colSpan="5" className="muted">No saved evaluations found for this submission.</td>
							</tr>
						) : (
							logs.map((log, index) => {
								const meta     = extractSubmissionMeta(log.fileName || '');
								const identity = meta.studentName || log.fileName;
								const status   = computeStatus(log, index);

								return (
									<tr key={log.id}>
										<td>
											<span style={{
												display: 'inline-flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: '2rem',
												height: '2rem',
												borderRadius: '50%',
												background: 'var(--brand-soft)',
												color: 'var(--brand)',
												fontWeight: '800',
												fontSize: '0.82rem',
											}}>
												v{log.version ?? 1}
											</span>
										</td>
										<td>{formatDateTime(log.evaluatedAt)}</td>
										<td className="strong">{identity}</td>
										<td>
											<span className={statusClass(status)}>
												{status === 'INITIAL' ? 'INITIAL' : status}
											</span>
										</td>
										<td>
											<div className="modal-actions modal-actions--end submission-history-modal__row-actions">
												<button className="btn btn--soft" onClick={() => onViewReport(log)}>
													View Details
												</button>
												<button
													className="btn btn--danger btn--small"
													onClick={() => onDelete(log.id)}
													title="Remove from view (data preserved in database)"
												>
													Delete
												</button>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</AppModal>
	);
}

export default TeacherSubmissionHistoryModal;