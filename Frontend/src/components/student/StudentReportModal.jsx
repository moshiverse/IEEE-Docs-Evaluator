import { useState } from 'react';
import AppModal from '../common/AppModal';
import EvaluationReport from '../common/EvaluationReport';
import { useAnnotations } from '../../hooks/useAnnotations';

function StudentReportModal({ report, onClose }) {
  const hasFeedback = report?.teacherFeedback?.trim();
  const { annotations } = useAnnotations(report?.id);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AppModal
      isOpen={Boolean(report)}
      onClose={onClose}
      title="Professor's Evaluation"
      subtitle={report ? `File: ${report.fileName}` : ''}
      containerClassName="student-report-modal"
    >
      <div className="report-view-container">

        {/* ── Professor Annotations banner — shown first ── */}
        {annotations.length > 0 && (
          <div style={{
            marginBottom: '1.25rem',
            border: '1px solid color-mix(in srgb, #f59e0b 30%, var(--line-soft))',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {/* Toggle header */}
            <button
              onClick={() => setCollapsed((p) => !p)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'color-mix(in srgb, #f59e0b 10%, var(--bg-surface-2))',
                border: 'none', cursor: 'pointer',
                borderBottom: collapsed
                  ? 'none'
                  : '1px solid color-mix(in srgb, #f59e0b 20%, var(--line-soft))',
              }}
            >
              <span style={{
                fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#f59e0b', color: '#fff',
                  fontSize: '0.7rem', fontWeight: 800,
                }}>
                  {annotations.length}
                </span>
                Professor Annotations
                <span style={{
                  fontSize: '0.72rem', fontWeight: 600,
                  color: 'var(--text-muted)', fontStyle: 'italic',
                }}>
                  — numbered bubbles are also shown inline in the report below
                </span>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                {collapsed ? 'Show' : 'Hide'}
              </span>
            </button>

            {/* Annotation list */}
            {!collapsed && (
              <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {annotations.map((ann, idx) => (
                  <div key={ann.id} style={{
                    display: 'flex', gap: '0.65rem',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '10px',
                    border: '1px solid color-mix(in srgb, #f59e0b 20%, var(--line-soft))',
                    background: 'var(--bg-surface)',
                  }}>
                    {/* Number badge */}
                    <div style={{
                      flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%',
                      background: '#f59e0b', color: '#fff',
                      fontSize: '0.72rem', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: '2px',
                    }}>
                      {idx + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Quoted text */}
                      <p style={{
                        margin: '0 0 0.35rem',
                        fontSize: '0.78rem', color: 'var(--text-muted)',
                        fontStyle: 'italic', lineHeight: 1.45,
                        borderLeft: '2px solid #f59e0b', paddingLeft: '0.5rem',
                      }}>
                        "{ann.selectedText}"
                      </p>

                      {/* Comment */}
                      <p style={{
                        margin: 0,
                        fontSize: '0.9rem', color: 'var(--text-main)',
                        lineHeight: 1.6, whiteSpace: 'pre-wrap',
                      }}>
                        {ann.comment}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── AI Evaluation report with inline annotation bubbles ── */}
        <EvaluationReport
          text={report?.evaluationResult}
          images={report?.extractedImages || []}
          annotations={annotations}
          canDelete={false}
        />

        {/* ── Teacher feedback ── */}
        {hasFeedback && (
          <div className="eval-card eval-card--feedback" style={{ marginTop: '1rem' }}>
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