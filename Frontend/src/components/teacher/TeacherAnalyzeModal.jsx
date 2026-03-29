import AppModal from '../common/AppModal';
import EvaluationReport from '../common/EvaluationReport';

function TeacherAnalyzeModal({ isOpen, file, aiResult, isAnalyzing, onClose, onRun }) {
  const hasResult = Boolean(aiResult) && !isAnalyzing;

  const footer = hasResult ? (
    <div className="modal-actions modal-actions--end">
      <button className="btn btn--openai" onClick={() => onRun('openai')}>
        Re-Evaluate (GPT)
      </button>
      <button className="btn btn--gemini" onClick={() => onRun('openrouter')}>
        Re-Evaluate (Gemini - Google AI)
      </button>
      <button className="btn btn--gemini-native" onClick={() => onRun('gemini')}>
        Re-Evaluate (Gemini - Native)
      </button>
      <button className="btn btn--gemini31lite" onClick={() => onRun('gemini-3-flashlite')}>
        Re-Evaluate (Gemini 3.1 Flash-Lite PDF Vision)
      </button>
    </div>
  ) : null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Analyze: ${file?.name || ''}`}
      subtitle={hasResult ? 'AI evaluation complete' : 'Select an AI model to evaluate this submission'}
      footer={footer}
    >
      {!isAnalyzing && !aiResult && (
        <div className="analyze-model-picker">
          <p className="analyze-model-picker__label">Choose an AI model:</p>
          <div className="modal-actions">
            <button className="btn btn--openai" onClick={() => onRun('openai')}>
              OpenAI (GPT)
            </button>
            <button className="btn btn--gemini" onClick={() => onRun('openrouter')}>
              Gemini (Google AI)
            </button>
            <button className="btn btn--gemini-native" onClick={() => onRun('gemini')}>
              Gemini (Native)
            </button>
            <button className="btn btn--gemini31lite" onClick={() => onRun('gemini-3-flashlite')}>
              Gemini 3.1 Flash Lite (PDF Vision)
            </button>
          </div>
        </div>
      )}

      {isAnalyzing && <p className="muted">Extracting text and running analysis...</p>}
      {hasResult && <EvaluationReport text={aiResult}/>}
    </AppModal>
  );
}

export default TeacherAnalyzeModal;
