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
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
]);

const PROVIDER_TO_KEYS = {
  openai: { apiKey: 'OPENAI_API_KEY', model: 'OPENAI_MODEL' },
  gemini: { apiKey: 'GEMINI_API_KEY', model: 'GEMINI_MODEL' },
};

const MASKED = '••••••••';

function isBlank(value) {
  return !value || value.trim() === '';
}

function isMasked(value) {
  return value === MASKED || value === '********';
}

function detectProviderFromApiKey(value) {
  const trimmed = (value || '').trim();
  if (trimmed.length < 4) return null;

  if (/^AIza[A-Za-z0-9_-]{8,}$/.test(trimmed)) {
    return 'gemini';
  }

  if (/^sk-[a-z0-9_-]{4,}$/i.test(trimmed)) {
    return 'openai';
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
  trashBinSummary,
  onSafeEmptyAllTrashBins,
  onRestoreSelectedTrashItems,
}) {
  const dbValue = (key) => settings.find((s) => s.key === key)?.value || '';

  const providers = useMemo(() => {
    if (aiRuntimeSettings?.providers?.length) {
      return aiRuntimeSettings.providers;
    }
    return [
      { id: 'openai', label: 'OpenAI', apiKeyConfigured: false, selectedModel: '', availableModels: [] },
      { id: 'gemini', label: 'Gemini', apiKeyConfigured: false, selectedModel: '', availableModels: [] },
    ];
  }, [aiRuntimeSettings]);

  const [selectedProviderId, setSelectedProviderId] = useState(() => {
    const fromRuntime = aiRuntimeSettings?.activeProvider;
    if (!isBlank(fromRuntime)) return fromRuntime;
    const fromSettings = dbValue('ACTIVE_AI_PROVIDER');
    return isBlank(fromSettings) ? 'openai' : fromSettings;
  });

  const [apiKeyDrafts, setApiKeyDrafts] = useState({ openai: '', gemini: '' });
  const [apiKeyEditing, setApiKeyEditing] = useState({ openai: false, gemini: false });
  const [providerDetectionNotice, setProviderDetectionNotice] = useState('');
  const [modelSelections, setModelSelections] = useState({ openai: '', gemini: '' });
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [selectedTrashKeys, setSelectedTrashKeys] = useState([]);
  const [trashDialog, setTrashDialog] = useState(null);

  useEffect(() => {
    const fromRuntime = aiRuntimeSettings?.activeProvider;
    if (!isBlank(fromRuntime)) {
      setSelectedProviderId(fromRuntime);
      return;
    }

    const fromSettings = dbValue('ACTIVE_AI_PROVIDER');
    if (!isBlank(fromSettings)) {
      setSelectedProviderId(fromSettings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiRuntimeSettings, settings]);

  useEffect(() => {
    setModelSelections((prev) => {
      const next = { ...prev };

      providers.forEach((provider) => {
        const keys = PROVIDER_TO_KEYS[provider.id];
        if (!keys) return;

        const configuredModel = provider.selectedModel || dbValue(keys.model);
        if (!isBlank(configuredModel)) {
          next[provider.id] = configuredModel;
        } else if (!isBlank(prev[provider.id])) {
          next[provider.id] = prev[provider.id];
        }
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

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId) || providers[0];

  const selectedProviderHasStoredKey = selectedProvider?.apiKeyConfigured || false;
  const selectedProviderDraftKey = selectedProvider ? apiKeyDrafts[selectedProvider.id] || '' : '';
  const selectedProviderIsEditingKey = selectedProvider ? apiKeyEditing[selectedProvider.id] || false : false;
  const selectedProviderShowsMaskedKey =
    Boolean(selectedProvider) &&
    selectedProviderHasStoredKey &&
    !selectedProviderIsEditingKey &&
    isBlank(selectedProviderDraftKey);
  const selectedProviderInputValue = selectedProviderShowsMaskedKey ? MASKED : selectedProviderDraftKey;
  const selectedProviderHasNewKey = selectedProvider && !isBlank(selectedProviderDraftKey);
  const selectedProviderHasAnyKey = selectedProviderHasStoredKey || selectedProviderHasNewKey;

  const selectedModelValue = selectedProvider ? (modelSelections[selectedProvider.id] || '').trim() : '';
  const canSubmitAiSettings = Boolean(selectedProvider && selectedProviderHasAnyKey && !isBlank(selectedModelValue));

  const selectedProviderModels = useMemo(() => {
    if (!selectedProvider) return [];

    const available = Array.isArray(selectedProvider.availableModels)
      ? selectedProvider.availableModels.filter((model) => !isBlank(model))
      : [];

    const current = modelSelections[selectedProvider.id];
    if (available.length === 0 && !isBlank(current)) {
      return [current, ...available];
    }

    return available;
  }, [modelSelections, selectedProvider]);

  const otherSettings = useMemo(
    () => settings.filter((setting) => !AI_MANAGED_KEYS.has(setting.key)),
    [settings],
  );

  let saveAllLabel = 'Save All Changes';
  if (dirtyCount) {
    saveAllLabel = `Save All Changes (${dirtyCount})`;
  }
  if (isSavingAll) {
    saveAllLabel = 'Saving...';
  }

  function openTrashDialog(actionType) {
    setTrashDialog(actionType);
  }

  function closeTrashDialog() {
    setTrashDialog(null);
  }

  function confirmTrashDialog() {
    if (trashDialog === 'empty') {
      onSafeEmptyAllTrashBins?.();
    }

    if (trashDialog === 'restore') {
      onRestoreSelectedTrashItems?.(selectedTrashItems);
    }

    closeTrashDialog();
  }

  function toggleTrashItem(item) {
    const key = trashItemKey(item);
    setSelectedTrashKeys((prev) => (
      prev.includes(key)
        ? prev.filter((entry) => entry !== key)
        : [...prev, key]
    ));
  }

  function toggleSelectAllTrashItems() {
    if (allTrashSelected) {
      setSelectedTrashKeys([]);
      return;
    }

    setSelectedTrashKeys(trashItems.map(trashItemKey));
  }

  function handleProviderChange(providerId) {
    setSelectedProviderId(providerId);
    setProviderDetectionNotice('');
    onSettingChange?.('ACTIVE_AI_PROVIDER', providerId);
  }

  function handleApiKeyChange(providerId, value) {
    if (isMasked(value)) {
      return;
    }

    const detectedProvider = detectProviderFromApiKey(value);
    if (detectedProvider && detectedProvider !== providerId) {
      const sourceKeys = PROVIDER_TO_KEYS[providerId];
      const targetKeys = PROVIDER_TO_KEYS[detectedProvider];
      const detectedProviderLabel =
        providers.find((provider) => provider.id === detectedProvider)?.label || detectedProvider;

      setApiKeyEditing((prev) => ({
        ...prev,
        [providerId]: false,
        [detectedProvider]: true,
      }));

      setApiKeyDrafts((prev) => ({
        ...prev,
        [providerId]: '',
        [detectedProvider]: value,
      }));

      if (sourceKeys?.apiKey) {
        onSettingChange?.(sourceKeys.apiKey, '');
      }
      if (targetKeys?.apiKey) {
        onSettingChange?.(targetKeys.apiKey, value);
      }

      setSelectedProviderId(detectedProvider);
      setProviderDetectionNotice(`Provider auto-detected: ${detectedProviderLabel}`);
      onSettingChange?.('ACTIVE_AI_PROVIDER', detectedProvider);
      return;
    }

    setProviderDetectionNotice('');

    setApiKeyEditing((prev) => ({ ...prev, [providerId]: true }));
    setApiKeyDrafts((prev) => ({ ...prev, [providerId]: value }));
    const keys = PROVIDER_TO_KEYS[providerId];
    if (keys?.apiKey) {
      onSettingChange?.(keys.apiKey, value);
    }
  }

  function handleApiKeyFocus(providerId) {
    setApiKeyEditing((prev) => ({ ...prev, [providerId]: true }));
  }

  function handleApiKeyBlur(providerId) {
    const draft = apiKeyDrafts[providerId] || '';
    const provider = providers.find((entry) => entry.id === providerId);
    const hasStored = Boolean(provider?.apiKeyConfigured);

    if (hasStored && isBlank(draft)) {
      setApiKeyEditing((prev) => ({ ...prev, [providerId]: false }));
    }
  }

  function handleModelChange(providerId, model) {
    setModelSelections((prev) => ({ ...prev, [providerId]: model }));
    const keys = PROVIDER_TO_KEYS[providerId];
    if (keys?.model) {
      onSettingChange?.(keys.model, model);
    }
  }

  async function handleSaveAiSettings() {
    if (!selectedProvider || !canSubmitAiSettings) {
      return;
    }

    const payload = { ACTIVE_AI_PROVIDER: selectedProvider.id };
    const keys = PROVIDER_TO_KEYS[selectedProvider.id];
    if (keys?.model) {
      payload[keys.model] = selectedModelValue;
    }

    const selectedDraftKey = (apiKeyDrafts[selectedProvider.id] || '').trim();
    if (keys?.apiKey && !isBlank(selectedDraftKey)) {
      payload[keys.apiKey] = selectedDraftKey;
    }

    await onSaveMultiple?.(payload);
  }

  if (loading) {
    return <div className="ssp-loading">Loading configuration...</div>;
  }

  return (
    <div className="ssp-root">
      <div className="ssp-actions-bar">
        <button className="ssp-btn ssp-btn--ghost" onClick={onDiscard}>
          Discard Changes
        </button>
        <button
          className="ssp-btn ssp-btn--primary"
          onClick={onSave}
          disabled={isSavingAll || !dirtyCount}
        >
          {saveAllLabel}
        </button>
      </div>

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

      <section className="ssp-card ssp-card--danger-zone">
        <h3 className="ssp-card__title">Trash Bin Management</h3>
        <p className="ssp-muted">Select trashed items below to restore them. Empty Trash Bin clears everything currently hidden from the view.</p>
        <div className="ssp-trash-actions">
          <button
            className="ssp-btn ssp-btn--ghost"
            type="button"
            onClick={() => setShowTrashBin((prev) => !prev)}
          >
            {showTrashBin ? 'Hide Trash' : 'View Trash'}
          </button>
          <button
            className="ssp-btn ssp-btn--ghost"
            type="button"
            onClick={() => openTrashDialog('empty')}
          >
            Empty Trash
          </button>
          <button
            className="ssp-btn ssp-btn--ghost"
            type="button"
            onClick={() => openTrashDialog('restore')}
            disabled={!selectedTrashItems.length}
          >
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
                <input
                  type="checkbox"
                  checked={allTrashSelected}
                  onChange={toggleSelectAllTrashItems}
                  disabled={!trashItems.length}
                />
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
                          <input
                            type="checkbox"
                            checked={selectedTrashKeys.includes(key)}
                            onChange={() => toggleTrashItem(item)}
                          />
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
            <button type="button" className="ssp-btn ssp-btn--ghost" onClick={closeTrashDialog}>
              Cancel
            </button>
            <button
              type="button"
              className="ssp-btn ssp-btn--primary"
              onClick={confirmTrashDialog}
            >
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

      <section className="ssp-card ssp-card--ai">
        <div className="ssp-card__header-row">
          <div>
            <h3 className="ssp-card__title">AI Provider Configuration</h3>
            <p className="ssp-muted">Changes are applied immediately on the next analysis request.</p>
          </div>
          <button
            className="ssp-btn ssp-btn--primary"
            type="button"
            onClick={handleSaveAiSettings}
            disabled={!canSubmitAiSettings || isSavingAll}
          >
            {isSavingAll ? 'Saving...' : 'Save AI Settings'}
          </button>
        </div>

        <div className="ssp-field ssp-field--stacked">
          <label className="ssp-label" htmlFor="ssp-active-provider">Active AI Provider</label>
          <select
            id="ssp-active-provider"
            className="ssp-select"
            value={selectedProviderId}
            onChange={(event) => handleProviderChange(event.target.value)}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>

        {selectedProvider && (
          <div className="ssp-provider-detail">
            <div className="ssp-field ssp-field--stacked">
              <label className="ssp-label" htmlFor="ssp-provider-api-key">API Key</label>
              <span className="ssp-field__hint ssp-field__hint--inline">
                {selectedProviderHasStoredKey
                  ? 'Key already exists in backend. Focus input to replace it.'
                  : 'No key saved yet. Prefix auto-detect is enabled (sk- => OpenAI, AIza => Gemini).'}
              </span>
              {providerDetectionNotice && (
                <span className="ssp-info">{providerDetectionNotice}</span>
              )}
              <input
                id="ssp-provider-api-key"
                type="password"
                className="ssp-input"
                value={selectedProviderInputValue}
                onChange={(event) => handleApiKeyChange(selectedProvider.id, event.target.value)}
                onFocus={() => handleApiKeyFocus(selectedProvider.id)}
                onBlur={() => handleApiKeyBlur(selectedProvider.id)}
                placeholder={selectedProviderHasStoredKey ? 'Enter new API key to replace existing key' : 'Enter API key'}
                autoComplete="new-password"
              />
            </div>

            <div className="ssp-field ssp-field--stacked">
              <label className="ssp-label" htmlFor="ssp-provider-model">Model</label>
              <select
                id="ssp-provider-model"
                className="ssp-select"
                value={selectedModelValue}
                onChange={(event) => handleModelChange(selectedProvider.id, event.target.value)}
                disabled={selectedProviderModels.length === 0}
              >
                {selectedProviderModels.length === 0 && (
                  <option value="">No models available. Save API key first.</option>
                )}
                {selectedProviderModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              {!selectedProviderHasAnyKey && (
                <span className="ssp-warning">
                  The selected provider must have an API key before saving.
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {CATEGORY_ORDER.filter((category) => category !== 'AI').map((category) => {
        const section = otherSettings.filter((item) => item.category === category);
        if (!section.length) return null;

        return (
          <section key={category} className="ssp-card">
            <h3 className="ssp-card__title">{CATEGORY_LABELS[category] ?? category}</h3>
            <div className="ssp-settings-grid">
              {section.map((item) => {
                const currentValue = editedSettings[item.key] ?? item.value;
                const isSensitive = /API_KEY|SECRET|PASSWORD|TOKEN/i.test(item.key);

                return (
                  <label key={item.key} className="ssp-field ssp-field--stacked">
                    <span className="ssp-label">{item.key}</span>
                    {item.description && <span className="ssp-field__hint">{item.description}</span>}
                    <input
                      className="ssp-input"
                      type={isSensitive ? 'password' : 'text'}
                      value={isMasked(currentValue) ? '' : currentValue || ''}
                      placeholder={isMasked(currentValue) ? 'Value is already set' : ''}
                      onChange={(event) => onSettingChange?.(item.key, event.target.value)}
                    />
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
