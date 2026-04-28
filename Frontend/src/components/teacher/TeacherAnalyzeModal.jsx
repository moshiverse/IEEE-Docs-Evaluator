/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import AppModal from '../common/AppModal';
import EvaluationReport from '../common/EvaluationReport';

function TeacherAnalyzeModal({
  isOpen,
  file,
  aiResult,
  aiImages = [],
  isAnalyzing,
  onClose,
  onRun,
  aiRuntimeSettings,
  customRules,
  setCustomRules,
  onViewHistory,
  hasPreviousEvaluation = false,
  promptTemplates = [],
}) {

  const hasResult = Boolean(aiResult) && !isAnalyzing;
  const hasHistory = Boolean(hasPreviousEvaluation);

  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Reset template selection when modal opens for a new file
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplateId('');
    }
  }, [isOpen, file?.id]);

  const providerOptions = useMemo(() => {
    if (aiRuntimeSettings?.providers?.length) {
      return aiRuntimeSettings.providers;
    }
    return [
      { id: 'openai', label: 'OpenAI', selectedModel: '', apiKeyConfigured: false },
    ];
  }, [aiRuntimeSettings]);

  const activeProviderId = aiRuntimeSettings?.activeProvider || providerOptions[0]?.id || 'openai';
  const selectedProvider = providerOptions.find((p) => p.id === activeProviderId) || providerOptions[0];
  const selectedModel    = selectedProvider?.selectedModel || 'Not configured';
  const hasApiKey        = Boolean(selectedProvider?.apiKeyConfigured);
  const hasProvider      = Boolean(selectedProvider?.id);

  const subtitlePrimary = hasResult
    ? 'AI evaluation complete'
    : 'Using active AI settings from System Settings';

  const subtitle = (
    <>
      <span>{subtitlePrimary}</span>
      <br />
      <span className="analyze-modal-subtitle__meta">
        <strong className="analyze-modal-subtitle__label">Provider:</strong>{' '}
        {selectedProvider?.label || activeProviderId}
        {'\u00A0\u00A0\u00A0\u00A0'}
        <strong className="analyze-modal-subtitle__label">AI Model:</strong>{' '}
        {selectedModel}
      </span>
    </>
  );

  function handleTemplateChange(e) {
    const id = e.target.value;
    setSelectedTemplateId(id);

    if (!id) {
      // "No template" selected — clear the field so professor starts fresh
      setCustomRules('');
      return;
    }

    const template = promptTemplates.find((t) => String(t.id) === id);
    if (template) {
      // Populate the textarea with the template content.
      // The professor can still edit it freely — this does NOT save back to the template.
      setCustomRules(template.content);
    }
  }

  function handleEvaluate() {
    if (!selectedProvider || !hasProvider) return;
    onRun(selectedProvider.id);
  }

  const actionLabel = hasResult ? 'Re-Evaluate' : 'Evaluate';

  const footer = isAnalyzing ? null : (
    <div className="analyze-modal-footer">
      <div className="modal-actions modal-actions--end">
        {hasHistory && (
          <button className="btn btn--secondary" onClick={onViewHistory} disabled={isAnalyzing}>
            View History
          </button>
        )}
        <button className="btn btn--primary" onClick={handleEvaluate} disabled={!hasProvider || isAnalyzing}>
          {actionLabel}
        </button>
      </div>
    </div>
  );

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Analyze: ${file?.name || ''}`}
      subtitle={subtitle}
      containerClassName="teacher-analyze-modal"
      footer={footer}
    >
      {!isAnalyzing && !hasResult && (
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Run evaluation to generate an AI report for this submission.
        </p>
      )}

      {!isAnalyzing && !hasApiKey && (
        <p className="muted" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          API key is not configured for this provider. Evaluating now will return an error.
        </p>
      )}

      {!isAnalyzing && (
        <div className="custom-rules-group">

          {/* ── Template selector ── */}
          {promptTemplates.length > 0 && (
            <div style={{ marginBottom: '0.65rem' }}>
              <label htmlFor="template-select" className="custom-rules-label">
                Load from Template (Optional)
              </label>
              <select
                id="template-select"
                className="custom-rules-select"
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                disabled={isAnalyzing}
              >
                <option value="">— Select a template —</option>
                {promptTemplates.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── Custom instructions textarea ── */}
          <label htmlFor="custom-rules" className="custom-rules-label">
            Professor Directives (Optional)
          </label>
          <textarea
            id="custom-rules"
            className="custom-rules-textarea"
            placeholder="e.g., Be extremely strict on the Diagrams. Ensure they have include and exclude."
            value={customRules}
            onChange={(e) => {
              setCustomRules(e.target.value);
              // If the professor edits the textarea manually, deselect the template
              // so it's clear the content is now a custom draft, not the saved template.
              if (selectedTemplateId) setSelectedTemplateId('');
            }}
            disabled={isAnalyzing}
            rows={hasResult ? 2 : 3}
          />
        </div>
      )}

      {isAnalyzing && (
        <div className="analyze-loading" role="status" aria-live="polite">
          <div className="analyze-loading__spinner" aria-hidden="true">
            <span className="analyze-loading__ring" />
            <span className="analyze-loading__ring analyze-loading__ring--delay" />
          </div>
          <p className="analyze-loading__title">Running AI evaluation...</p>
          <p className="analyze-loading__subtitle">
            Extracting text and generating analysis for this submission.
          </p>
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            color: '#d97706',
            borderRadius: '8px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.85rem',
            textAlign: 'center',
          }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>
              PLEASE DO NOT REFRESH THE PAGE.
            </strong>
            Heavy documents with complex diagrams can take up to 5 minutes to process.
          </div>
        </div>
      )}

      {hasResult && <EvaluationReport text={aiResult} images={aiImages} />}
    </AppModal>
  );
}

export default TeacherAnalyzeModal;