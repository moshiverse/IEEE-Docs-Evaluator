/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import AppModal from '../common/AppModal';
import './TeacherSettingsPanel.css';

const CATEGORY_ORDER = ['AI', 'GOOGLE', 'MAPPING'];
const CATEGORY_LABELS = { AI: 'AI Keys', GOOGLE: 'Google Integration', MAPPING: 'Submission Columns' };

const AI_MANAGED_KEYS = new Set([
  'ACTIVE_AI_PROVIDER',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
]);

const PROVIDER_TO_KEYS = {
  openai: { apiKey: 'OPENAI_API_KEY', model: 'OPENAI_MODEL' },
};

const MASKED = '••••••••';

const CONFIRM_PHRASE = 'I CONFIRM THIS ACTION, DELETE ALL EVALUATIONS, AND UNDERSTAND THAT THIS IS IRREVERSIBLE';

function isBlank(value) {
  return !value || value.trim() === '';
}

function isMasked(value) {
  return value === MASKED || value === '********';
}

function validateApiKeyFormat(providerId, value) {
  if (!value || value.trim() === '') return null;
  const trimmed = value.trim();
  if (providerId === 'openai' && !trimmed.startsWith('sk-')) {
    return 'OpenAI API keys must start with "sk-".';
  }
  if (providerId === 'openai' && trimmed.length < 20) {
    return 'This key looks too short. Please double-check your OpenAI API key.';
  }
  return null;
}

export default function TeacherSettingsPanel({
  settings = [],
  aiRuntimeSettings = null,
  editedSettings = {},
  loading = false,
  dirtyCount = 0,
  isSavingAll = false,
  themeMode = 'light',
  onThemeModeChange,
  onSettingChange,
  onSave,
  onSaveMultiple,
  onDiscard,
  onClearAllHistory,
  trashBinSummary,
  onSafeEmptyAllTrashBins,
  onRestoreSelectedTrashItems,
}) {
  const dbValue = (key) => settings.find((s) => s.key === key)?.value || '';

  const providers = useMemo(() => {
    if (aiRuntimeSettings?.providers?.length) return aiRuntimeSettings.providers;
    return [
      { id: 'openai', label: 'OpenAI', apiKeyConfigured: false, selectedModel: '', availableModels: [] },
    ];
  }, [aiRuntimeSettings]);

  const [selectedProviderId, setSelectedProviderId] = useState(() => {
    const fromRuntime = aiRuntimeSettings?.activeProvider;
    if (!isBlank(fromRuntime)) return fromRuntime;
    const fromSettings = dbValue('ACTIVE_AI_PROVIDER');
    return isBlank(fromSettings) ? 'openai' : fromSettings;
  });

  const [apiKeyDrafts, setApiKeyDrafts]     = useState({ openai: '' });
  const [apiKeyEditing, setApiKeyEditing]   = useState({ openai: false });
  const [apiKeyErrors, setApiKeyErrors]     = useState({ openai: '' });
  const [modelSelections, setModelSelections] = useState({ openai: '' });
  const [showTrashBin, setShowTrashBin]     = useState(false);
  const [selectedTrashKeys, setSelectedTrashKeys] = useState([]);
  const [trashDialog, setTrashDialog]       = useState(null);
  const [saveAttempted, setSaveAttempted]   = useState(false);

  // ── Danger Zone state — MUST be before any early return ──────────────────
  const [dangerPhrase, setDangerPhrase] = useState('');
  const [isClearing, setIsClearing]     = useState(false);

  const phraseMatches = dangerPhrase === CONFIRM_PHRASE;

  async function handleClearAll() {
    if (!phraseMatches) return;
    setIsClearing(true);
    try {
      await onClearAllHistory?.();
    } finally {
      setIsClearing(false);
      setDangerPhrase('');
    }
  }

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const fromRuntime = aiRuntimeSettings?.activeProvider;
    if (!isBlank(fromRuntime)) { setSelectedProviderId(fromRuntime); return; }
    const fromSettings = dbValue('ACTIVE_AI_PROVIDER');
    if (!isBlank(fromSettings)) setSelectedProviderId(fromSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiRuntimeSettings, settings]);

  useEffect(() => {
    setModelSelections((prev) => {
      const next = { ...prev };
      providers.forEach((provider) => {
        const keys = PROVIDER_TO_KEYS[provider.id];
        if (!keys) return;
        const configuredModel = provider.selectedModel || dbValue(keys.model);
        if (!isBlank(configuredModel)) next[provider.id] = configuredModel;
        else if (!isBlank(prev[provider.id])) next[provider.id] = prev[provider.id];
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, settings]);

  const trashItems = useMemo(() => trashBinSummary?.trashedItems || [], [trashBinSummary]);
  const trashItemKey = (item) => `${item.kind}:${item.id}`;
  const selectedTrashItems = useMemo(
    () => trashItems.filter((item) => selectedTrashKeys.includes(trashItemKey(item))),
    [trashItems, selectedTrashKeys],
  );
  const allTrashSelected = trashItems.length > 0 && selectedTrashItems.length === trashItems.length;

  useEffect(() => {
    const validKeys = new Set(trashItems.map(trashItemKey));
    setSelectedTrashKeys((prev) => prev.filter((key) => validKeys.has(key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashItems]);

  const selectedProvider = providers.find((p) => p.id === selectedProviderId) || providers[0];
  const selectedProviderHasStoredKey   = selectedProvider?.apiKeyConfigured || false;
  const selectedProviderDraftKey       = selectedProvider ? apiKeyDrafts[selectedProvider.id] || '' : '';
  const selectedProviderIsEditingKey   = selectedProvider ? apiKeyEditing[selectedProvider.id] || false : false;
  const selectedProviderShowsMaskedKey =
    Boolean(selectedProvider) &&
    selectedProviderHasStoredKey &&
    !selectedProviderIsEditingKey &&
    isBlank(selectedProviderDraftKey);
  const selectedProviderInputValue   = selectedProviderShowsMaskedKey ? MASKED : selectedProviderDraftKey;
  const selectedProviderHasNewKey    = selectedProvider && !isBlank(selectedProviderDraftKey);
  const selectedProviderHasAnyKey    = selectedProviderHasStoredKey || selectedProviderHasNewKey;
  const selectedModelValue           = selectedProvider ? (modelSelections[selectedProvider.id] || '').trim() : '';

  const noApiKey       = !selectedProviderHasAnyKey;
  const noModel        = isBlank(selectedModelValue);
  const hasFormatError = selectedProvider ? !isBlank(apiKeyErrors[selectedProvider.id]) : false;

  const selectedProviderModels = useMemo(() => {
    if (!selectedProvider) return [];
    const available = Array.isArray(selectedProvider.availableModels)
      ? selectedProvider.availableModels.filter((m) => !isBlank(m))
      : [];
    const current = modelSelections[selectedProvider.id];
    if (available.length === 0 && !isBlank(current)) return [current];
    return available;
  }, [modelSelections, selectedProvider]);

  const otherSettings = useMemo(
    () => settings.filter((s) => !AI_MANAGED_KEYS.has(s.key)),
    [settings],
  );

  let saveAllLabel = 'Save All Changes';
  if (dirtyCount) saveAllLabel = `Save All Changes (${dirtyCount})`;
  if (isSavingAll) saveAllLabel = 'Saving...';

  function openTrashDialog(actionType) { setTrashDialog(actionType); }
  function closeTrashDialog() { setTrashDialog(null); }

  function confirmTrashDialog() {
    if (trashDialog === 'empty') onSafeEmptyAllTrashBins?.();
    if (trashDialog === 'restore') onRestoreSelectedTrashItems?.(selectedTrashItems);
    closeTrashDialog();
  }

  function toggleTrashItem(item) {
    const key = trashItemKey(item);
    setSelectedTrashKeys((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    );
  }

  function toggleSelectAllTrashItems() {
    if (allTrashSelected) { setSelectedTrashKeys([]); return; }
    setSelectedTrashKeys(trashItems.map(trashItemKey));
  }

  function handleProviderChange(providerId) {
    setSelectedProviderId(providerId);
    setSaveAttempted(false);
    onSettingChange?.('ACTIVE_AI_PROVIDER', providerId);
  }

  function handleApiKeyChange(providerId, value) {
    if (isMasked(value)) return;
    setApiKeyEditing((prev) => ({ ...prev, [providerId]: true }));
    setApiKeyDrafts((prev) => ({ ...prev, [providerId]: value }));
    const formatError = validateApiKeyFormat(providerId, value);
    setApiKeyErrors((prev) => ({ ...prev, [providerId]: formatError || '' }));
    const keys = PROVIDER_TO_KEYS[providerId];
    if (keys?.apiKey) onSettingChange?.(keys.apiKey, value);
  }

  function handleApiKeyFocus(providerId) {
    setApiKeyEditing((prev) => ({ ...prev, [providerId]: true }));
  }

  function handleApiKeyBlur(providerId) {
    const draft = apiKeyDrafts[providerId] || '';
    const provider = providers.find((p) => p.id === providerId);
    const hasStored = Boolean(provider?.apiKeyConfigured);
    if (hasStored && isBlank(draft)) {
      setApiKeyEditing((prev) => ({ ...prev, [providerId]: false }));
      setApiKeyErrors((prev) => ({ ...prev, [providerId]: '' }));
    }
  }

  function handleModelChange(providerId, model) {
    setModelSelections((prev) => ({ ...prev, [providerId]: model }));
    const keys = PROVIDER_TO_KEYS[providerId];
    if (keys?.model) onSettingChange?.(keys.model, model);
  }

  async function handleSaveAiSettings() {
    setSaveAttempted(true);
    if (!selectedProvider) return;
    if (noApiKey || noModel || hasFormatError) return;

    const payload = { ACTIVE_AI_PROVIDER: selectedProvider.id };
    const keys = PROVIDER_TO_KEYS[selectedProvider.id];
    if (keys?.model) payload[keys.model] = selectedModelValue;
    const selectedDraftKey = (apiKeyDrafts[selectedProvider.id] || '').trim();
    if (keys?.apiKey && !isBlank(selectedDraftKey)) payload[keys.apiKey] = selectedDraftKey;

    await onSaveMultiple?.(payload);
    setSaveAttempted(false);
  }

  const showNoKeyError   = saveAttempted && noApiKey;
  const showNoModelError = saveAttempted && noModel;
  const currentApiKeyError = selectedProvider ? apiKeyErrors[selectedProvider.id] : '';

  // ── Early return AFTER all hooks ──────────────────────────────────────────
  if (loading) return <div className="ssp-loading">Loading configuration...</div>;

  return (
    <div className="ssp-root">
      <div className="ssp-actions-bar">
        <button className="ssp-btn ssp-btn--ghost" onClick={onDiscard}>Discard Changes</button>
        <button className="ssp-btn ssp-btn--primary" onClick={onSave} disabled={isSavingAll || !dirtyCount}>
          {saveAllLabel}
        </button>
      </div>

      {/* ── Display Theme ─────────────────────────────────────────────────── */}
      <section className="ssp-card">
        <h3 className="ssp-card__title">Display Theme</h3>
        <div className="ssp-theme-switch">
          {['light', 'dark', 'system'].map((mode) => (
            <button
              key={mode}
              className={`ssp-theme-btn ${themeMode === mode ? 'ssp-theme-btn--active' : ''}`}
              onClick={() => onThemeModeChange?.(mode)}
              type="button"
            >
              {mode}
            </button>
          ))}
        </div>
      </section>

      {/* ── Trash Bin ─────────────────────────────────────────────────────── */}
      <section className="ssp-card ssp-card--danger-zone">
        <h3 className="ssp-card__title">Trash Bin Management</h3>
        <p className="ssp-muted">Select trashed items below to restore them. Empty Trash Bin clears everything currently hidden from the view.</p>
        <div className="ssp-trash-actions">
          <button className="ssp-btn ssp-btn--ghost" type="button" onClick={() => setShowTrashBin((p) => !p)}>
            {showTrashBin ? 'Hide Trash' : 'View Trash'}
          </button>
          <button className="ssp-btn ssp-btn--ghost" type="button" onClick={() => openTrashDialog('empty')}>
            Empty Trash
          </button>
          <button className="ssp-btn ssp-btn--ghost" type="button" onClick={() => openTrashDialog('restore')} disabled={!selectedTrashItems.length}>
            Restore
          </button>
        </div>
        {showTrashBin && (
          <div className="ssp-trash-viewer">
            <p className="ssp-trash-viewer__summary">
              Trashed Student Submissions: <strong>{trashBinSummary?.submissionCount || 0}</strong> | Trashed AI Reports: <strong>{trashBinSummary?.reportCount || 0}</strong> | Selected: <strong>{selectedTrashItems.length}</strong>
            </p>
            <div className="ssp-trash-toolbar">
              <label className="ssp-trash-select-all">
                <input type="checkbox" checked={allTrashSelected} onChange={toggleSelectAllTrashItems} disabled={!trashItems.length} />
                <span>Select All</span>
              </label>
              <span className="ssp-trash-selection-count">
                {trashItems.length ? `${selectedTrashItems.length} of ${trashItems.length} selected` : 'No trashed items'}
              </span>
            </div>
            <div className="ssp-trash-viewer__section ssp-trash-viewer__section--full">
              <h4 className="ssp-trash-viewer__title">Trash Queue</h4>
              {trashItems.length ? (
                <ul className="ssp-trash-viewer__list ssp-trash-viewer__list--queue">
                  {trashItems.map((item) => {
                    const key = trashItemKey(item);
                    return (
                      <li key={key} className="ssp-trash-viewer__item">
                        <label className="ssp-trash-viewer__item-select">
                          <input type="checkbox" checked={selectedTrashKeys.includes(key)} onChange={() => toggleTrashItem(item)} />
                          <span className="ssp-trash-viewer__item-label">
                            <span className="ssp-trash-viewer__item-kind">{item.meta}</span>
                            {item.label}
                            {item.date ? <span className="ssp-trash-viewer__item-meta">{item.date}</span> : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="ssp-muted">No trashed items to show.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <AppModal
        isOpen={Boolean(trashDialog)}
        title={trashDialog === 'empty' ? 'Empty Trash' : 'Restore Selected Items'}
        subtitle={
          trashDialog === 'empty'
            ? 'This will clear all currently trashed items from the trash view.'
            : `This will restore ${selectedTrashItems.length} selected item(s) from trash.`
        }
        onClose={closeTrashDialog}
        footer={(
          <div className="ssp-trash-dialog-actions">
            <button type="button" className="ssp-btn ssp-btn--ghost" onClick={closeTrashDialog}>Cancel</button>
            <button type="button" className="ssp-btn ssp-btn--primary" onClick={confirmTrashDialog}>
              {trashDialog === 'empty' ? 'Empty Trash' : 'Restore'}
            </button>
          </div>
        )}
      >
        <p className="ssp-muted">
          {trashDialog === 'empty' && 'This action will hide all trashed items from the frontend trash bin.'}
          {trashDialog === 'restore' && 'Only the selected items will be restored.'}
        </p>
      </AppModal>

      {/* ── AI Provider Configuration ─────────────────────────────────────── */}
      <section className="ssp-card ssp-card--ai">
        <div className="ssp-card__header-row">
          <div>
            <h3 className="ssp-card__title">AI Provider Configuration</h3>
            <p className="ssp-muted">Changes are applied immediately on the next analysis request.</p>
          </div>
          <button className="ssp-btn ssp-btn--primary" type="button" onClick={handleSaveAiSettings} disabled={isSavingAll}>
            {isSavingAll ? 'Saving...' : 'Save AI Settings'}
          </button>
        </div>

        {saveAttempted && (noApiKey || noModel || hasFormatError) && (
          <div className="ssp-validation-banner">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>
              {hasFormatError
                ? 'The API key format looks incorrect. Please check the key and try again.'
                : noApiKey && noModel
                ? 'An API key and a model are both required before saving.'
                : noApiKey
                ? 'An API key is required. Please enter your API key before saving.'
                : 'A model must be selected before saving.'}
            </span>
          </div>
        )}

        <div className="ssp-field ssp-field--stacked" style={{ marginTop: '0.9rem' }}>
          <label className="ssp-label" htmlFor="ssp-active-provider">Active AI Provider</label>
          <select
            id="ssp-active-provider"
            className="ssp-select"
            value={selectedProviderId}
            onChange={(e) => handleProviderChange(e.target.value)}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>

        {selectedProvider && (
          <div className="ssp-provider-detail">
            <div className="ssp-field ssp-field--stacked">
              <label className="ssp-label" htmlFor="ssp-provider-api-key">
                API Key
                {!selectedProviderHasAnyKey && <span className="ssp-required-badge">Required</span>}
              </label>
              <span className="ssp-field__hint ssp-field__hint--inline">
                {selectedProviderHasStoredKey
                  ? 'A key is already saved. Focus the input to replace it.'
                  : `Enter your ${selectedProvider.label} API key.`}
              </span>
              <input
                id="ssp-provider-api-key"
                type="password"
                className={`ssp-input ${(showNoKeyError || currentApiKeyError) ? 'ssp-input--error' : ''}`}
                value={selectedProviderInputValue}
                onChange={(e) => handleApiKeyChange(selectedProvider.id, e.target.value)}
                onFocus={() => handleApiKeyFocus(selectedProvider.id)}
                onBlur={() => handleApiKeyBlur(selectedProvider.id)}
                placeholder={selectedProviderHasStoredKey ? 'Enter a new key to replace the existing one' : `Paste your ${selectedProvider.label} API key here`}
                autoComplete="new-password"
              />
              {currentApiKeyError && (
                <span className="ssp-field-error">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {currentApiKeyError}
                </span>
              )}
              {showNoKeyError && !currentApiKeyError && (
                <span className="ssp-field-error">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  API key is required.
                </span>
              )}
            </div>

            <div className="ssp-field ssp-field--stacked">
              <label className="ssp-label" htmlFor="ssp-provider-model">
                Model
                {noModel && <span className="ssp-required-badge">Required</span>}
              </label>
              <select
                id="ssp-provider-model"
                className={`ssp-select ${showNoModelError ? 'ssp-select--error' : ''}`}
                value={selectedModelValue}
                onChange={(e) => handleModelChange(selectedProvider.id, e.target.value)}
                disabled={selectedProviderModels.length === 0}
              >
                {selectedProviderModels.length === 0 ? (
                  <option value="">
                    {selectedProviderHasAnyKey ? 'Save your API key first to load available models' : 'No models available — enter an API key first'}
                  </option>
                ) : (
                  <>
                    {isBlank(selectedModelValue) && <option value="" disabled>Select a model</option>}
                    {selectedProviderModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </>
                )}
              </select>
              {showNoModelError && (
                <span className="ssp-field-error">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Please select a model before saving.
                </span>
              )}
            </div>

            <div className="ssp-key-status-row">
              <span className={`ssp-key-status-pill ${selectedProviderHasAnyKey ? 'ssp-key-status-pill--ok' : 'ssp-key-status-pill--missing'}`}>
                {selectedProviderHasStoredKey && !selectedProviderHasNewKey && 'Key saved'}
                {selectedProviderHasNewKey && 'New key pending save'}
                {!selectedProviderHasAnyKey && 'No key configured'}
              </span>
              {selectedProviderHasStoredKey && !selectedProviderHasNewKey && (
                <span className="ssp-key-status-note">
                  A key is already active. You only need to re-enter it if you want to rotate it.
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Other settings (GOOGLE, MAPPING) ──────────────────────────────── */}
      {CATEGORY_ORDER.filter((c) => c !== 'AI').map((category) => {
        const section = otherSettings.filter((item) => item.category === category);
        if (!section.length) return null;
        return (
          <section key={category} className="ssp-card">
            <h3 className="ssp-card__title">{CATEGORY_LABELS[category] ?? category}</h3>
            <div className="ssp-settings-grid">
              {section.map((item) => {
                const currentValue = editedSettings[item.key] ?? item.value;
                const isSensitive  = /API_KEY|SECRET|PASSWORD|TOKEN/i.test(item.key);
                return (
                  <label key={item.key} className="ssp-field ssp-field--stacked">
                    <span className="ssp-label">{item.key}</span>
                    {item.description && <span className="ssp-field__hint">{item.description}</span>}
                    <input
                      className="ssp-input"
                      type={isSensitive ? 'password' : 'text'}
                      value={isMasked(currentValue) ? '' : currentValue || ''}
                      placeholder={isMasked(currentValue) ? 'Value is already set' : ''}
                      onChange={(e) => onSettingChange?.(item.key, e.target.value)}
                    />
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* ── Danger Zone — Clear All Evaluation History ────────────────────── */}
      <section className="ssp-card ssp-card--danger-zone" style={{ marginTop: '0.5rem' }}>
        <h3 className="ssp-card__title" style={{ color: '#dc2626' }}>Danger Zone</h3>
        <p className="ssp-muted">
          Permanently deletes all rows from <strong>evaluation_history</strong> and <strong>evaluation_images</strong>.
          System settings, prompt templates, rubric overrides, and class context are completely untouched.
          This action cannot be undone.
        </p>

        <div className="ssp-field ssp-field--stacked" style={{ marginTop: '0.9rem' }}>
          <label className="ssp-label">Type the confirmation phrase exactly to enable the delete button</label>
          <span className="ssp-field__hint" style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#dc2626', letterSpacing: '0.02em' }}>
            {CONFIRM_PHRASE}
          </span>
          <input
            className="ssp-input"
            type="text"
            value={dangerPhrase}
            onChange={(e) => setDangerPhrase(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            placeholder="Type the phrase above exactly..."
            disabled={isClearing}
            style={{
              fontFamily: 'monospace',
              width: '100%',
              boxSizing: 'border-box',
              borderColor: dangerPhrase.length > 0
                ? (phraseMatches ? '#16a34a' : '#ef4444')
                : undefined,
            }}
            spellCheck={false}
            autoComplete="off"
          />
          {dangerPhrase.length > 0 && !phraseMatches && (
            <span className="ssp-field-error">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Phrase does not match. Check capitalisation and spacing.
            </span>
          )}
        </div>

        <div className="ssp-trash-actions" style={{ marginTop: '1rem' }}>
          <button
            className="ssp-btn ssp-btn--danger-strong"
            type="button"
            onClick={handleClearAll}
            disabled={!phraseMatches || isClearing}
          >
            {isClearing ? 'Deleting...' : 'Delete All Evaluation History'}
          </button>
        </div>
      </section>
    </div>
  );
}