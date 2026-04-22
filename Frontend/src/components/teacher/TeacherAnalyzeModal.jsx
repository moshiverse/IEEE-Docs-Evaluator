/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react';
import AppModal from '../common/AppModal';
import EvaluationReport from '../common/EvaluationReport';

function TeacherAnalyzeModal({ isOpen, file, aiResult, isAnalyzing, onClose, onRun, aiRuntimeSettings, customRules, setCustomRules }) {

  const hasResult = Boolean(aiResult) && !isAnalyzing;

  const providerOptions = useMemo(() => {
    if (aiRuntimeSettings?.providers?.length) {
      return aiRuntimeSettings.providers;
    }
    return [
      { id: 'openai', label: 'OpenAI', selectedModel: '', apiKeyConfigured: false },
      { id: 'gemini', label: 'Gemini', selectedModel: '', apiKeyConfigured: false },
    ];
  }, [aiRuntimeSettings]);

  const activeProviderId = aiRuntimeSettings?.activeProvider || providerOptions[0]?.id || 'openai';
  const selectedProvider = providerOptions.find((provider) => provider.id === activeProviderId) || providerOptions[0];
  const selectedModel = selectedProvider?.selectedModel || 'Not configured';
  const hasApiKey = Boolean(selectedProvider?.apiKeyConfigured);
  const hasProvider = Boolean(selectedProvider?.id);
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

  function handleEvaluate() {
    if (!selectedProvider || !hasProvider) return;
    // 2. Pass the customRules up to the parent component when clicked
    onRun(selectedProvider.id);
  }

  const actionLabel = hasResult ? 'Re-Evaluate' : 'Evaluate';
  const footer = isAnalyzing ? null : (
    <div className="analyze-modal-footer">
      <div className="modal-actions modal-actions--end">
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
      footer={footer}
    >
      {!isAnalyzing && !hasResult && (
        <p className="muted" style={{ marginBottom: '1rem' }}>Run evaluation to generate an AI report for this submission.</p>
      )}

      {!isAnalyzing && !hasApiKey && (
        <p className="muted" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          API key is not configured for this provider. Evaluating now will return an error.
        </p>
      )}

      {/* --- NEW: Custom Rules Text Box --- */}
      {!isAnalyzing && (
        <div className="custom-rules-group">
          <label htmlFor="custom-rules" className="custom-rules-label">
            Professor Directives (Optional)
          </label>
          <textarea
            id="custom-rules"
            className="custom-rules-textarea"
            placeholder="e.g., Be extremely strict on the Database Schema. Ensure they mention Role-Based Access Control."
            value={customRules}
            onChange={(e) => setCustomRules(e.target.value)}
            disabled={isAnalyzing}
            rows={hasResult ? 2 : 3} // Makes it slightly smaller if the report is already showing
          />
        </div>
      )}

      {isAnalyzing && <p className="muted">Extracting text and running analysis...</p>}
      {hasResult && <EvaluationReport text={aiResult}/>}
    </AppModal>
  );
}

export default TeacherAnalyzeModal;