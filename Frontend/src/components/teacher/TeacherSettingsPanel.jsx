const CATEGORY_CONFIG = {
  AI: { label: 'AI Keys' },
  GOOGLE: { label: 'Google ID' },
  MAPPING: { label: 'Submission Columns' },
};

const CATEGORY_ORDER = ['AI', 'GOOGLE', 'MAPPING'];

function SettingsBlock({ categoryKey, settings, editedSettings, onChange }) {
  const section = settings.filter((item) => item.category === categoryKey);
  if (!section.length) return null;

  return (
    <div className="card">
      <h3 className="card__title">{CATEGORY_CONFIG[categoryKey]?.label || categoryKey}</h3>
      <div className="settings-grid">
        {section.map((item) => {
          const value = editedSettings[item.key] ?? item.value;
          return (
            <label key={item.key} className="settings-field">
              <span className="strong">{item.key}</span>
              <small className="muted">{item.description}</small>
              <input
                className="settings-input"
                type={item.category === 'AI' ? 'password' : 'text'}
                value={value}
                onChange={(e) => onChange(item.key, e.target.value)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function TeacherSettingsPanel({
  settings,
  editedSettings,
  loading,
  dirtyCount,
  isSavingAll,
  themeMode,
  onThemeModeChange,
  onSettingChange,
  onSave,
  onDiscard,
}) {
  if (loading) return <div className="card muted">Loading configuration from database...</div>;

  return (
    <>
      <div className="settings-actions">
        <button className="btn" onClick={onDiscard}>Discard Changes</button>
        <button className="btn btn--primary" onClick={onSave} disabled={isSavingAll || !dirtyCount}>
          {isSavingAll ? 'Saving...' : `Save All Changes${dirtyCount ? ` (${dirtyCount})` : ''}`}
        </button>
      </div>

      <div className="card">
        <h3 className="card__title">Theme</h3>
        <p className="muted">Choose your preferred display mode.</p>
        <div className="theme-switch" role="group" aria-label="Theme mode">
          {['light', 'dark', 'system'].map((mode) => (
            <button
              key={mode}
              className={`theme-switch__btn ${themeMode === mode ? 'theme-switch__btn--active' : ''}`}
              onClick={() => onThemeModeChange(mode)}
            >
              {mode === 'system' ? 'System Default' : `${mode.charAt(0).toUpperCase()}${mode.slice(1)}`}
            </button>
          ))}
        </div>
      </div>

      {CATEGORY_ORDER.map((category) => (
        <SettingsBlock
          key={category}
          categoryKey={category}
          settings={settings}
          editedSettings={editedSettings}
          onChange={onSettingChange}
        />
      ))}
    </>
  );
}

export default TeacherSettingsPanel;
