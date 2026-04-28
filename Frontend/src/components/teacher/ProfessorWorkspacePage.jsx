/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import PanelHeader from '../../components/common/PanelHeader';
import { useProfessorConfig } from '../../hooks/useProfessorConfig';
import { useToast } from '../../hooks/useToast';
import ToastMessage from '../../components/common/ToastMessage';
import { fetchTeacherSettings, saveSetting } from '../../services/dashboardService';
import './ProfessorWorkspacePage.css';

const DOC_TYPES = ['SRS', 'SDD', 'SPMP', 'STD'];

// ── Hardcoded default labels shown as placeholders ────────────────────────────
const DEFAULT_RUBRIC_HINTS = {
  SRS:  'Default: Introduction and Scope, Overall Description, Functional Requirements, Non-Functional Requirements, External Interfaces',
  SDD:  'Default: System Architecture, Data Design, Component Design, Interface Design, Design Decisions',
  SPMP: 'Default: Project Scope and Objectives, Scheduling and Timeline, Resource Allocation, Risk Management, Monitoring and Control',
  STD:  'Default: Test Plan, Test Cases, Test Procedures, Test Coverage, Traceability to Requirements',
};

// Rough token/cost estimate constants
const TOKENS_PER_IMAGE_AT_300DPI = 1500; // approximate for a full A4 page at 300 DPI
const COST_PER_1K_TOKENS = 0.01;         // gpt-4o input approximate

export default function ProfessorWorkspacePage() {
  const { toast, showToast } = useToast();
  const config = useProfessorConfig(showToast);

  const [activeDocType, setActiveDocType] = useState('SRS');

  // Per-doctype draft state
  const [rubricDrafts, setRubricDrafts]   = useState({ SRS: '', SDD: '', SPMP: '', STD: '' });
  const [diagramDrafts, setDiagramDrafts] = useState({ SRS: '', SDD: '', SPMP: '', STD: '' });

  // Class context draft
  const [contextDraft, setContextDraft] = useState('');

  // Prompt template form
  const [templateForm, setTemplateForm]     = useState({ name: '', content: '' });
  const [editingTemplate, setEditingTemplate] = useState(null); // { id, name, content }

  // Render settings
  const [renderDpi, setRenderDpi]         = useState('300');
  const [renderQuality, setRenderQuality] = useState('1.0');
  const [renderMaxPages, setRenderMaxPages] = useState('999');
  const [savingRender, setSavingRender]   = useState(false);

  // ── Sync drafts from loaded config ─────────────────────────────────────────

  useEffect(() => {
    if (!config.loading) {
      setContextDraft(config.classContext || '');

      const newRubric  = { SRS: '', SDD: '', SPMP: '', STD: '' };
      const newDiagram = { SRS: '', SDD: '', SPMP: '', STD: '' };

      config.docProfiles.forEach((p) => {
        if (newRubric[p.docType]  !== undefined) newRubric[p.docType]  = p.rubricSection  || '';
        if (newDiagram[p.docType] !== undefined) newDiagram[p.docType] = p.diagramSection || '';
      });

      setRubricDrafts(newRubric);
      setDiagramDrafts(newDiagram);
    }
  }, [config.loading, config.docProfiles, config.classContext]);

  // ── Load render settings from system_settings ───────────────────────────────

  useEffect(() => {
    fetchTeacherSettings()
      .then((settings) => {
        const get = (key) => settings.find((s) => s.key === key)?.value || '';
        const dpi  = get('RENDER_DPI');
        const qual = get('RENDER_JPEG_QUALITY');
        const max  = get('RENDER_MAX_PAGES');
        if (dpi)  setRenderDpi(dpi);
        if (qual) setRenderQuality(qual);
        if (max)  setRenderMaxPages(max);
      })
      .catch(() => {});
  }, []);

  // ── Cost estimate ─────────────────────────────────────────────────────────

  const costEstimate = (() => {
    const pages = parseInt(renderMaxPages, 10);
    if (isNaN(pages) || pages <= 0) return null;
    const capped = Math.min(pages, 50); // cap display at 50 for sanity
    const tokens = capped * TOKENS_PER_IMAGE_AT_300DPI;
    const cost   = (tokens / 1000) * COST_PER_1K_TOKENS;
    return { tokens: tokens.toLocaleString(), cost: cost.toFixed(4), pages: capped };
  })();

  // ── Doc profile actions ───────────────────────────────────────────────────

  function handleSaveDocProfile(docType) {
    config.saveDocProfile(docType, rubricDrafts[docType], diagramDrafts[docType]);
  }

  function handleClearDocProfile(docType) {
    setRubricDrafts((prev)  => ({ ...prev,  [docType]: '' }));
    setDiagramDrafts((prev) => ({ ...prev, [docType]: '' }));
    config.saveDocProfile(docType, '', '');
  }

  // ── Template actions ──────────────────────────────────────────────────────

  function handleStartEdit(template) {
    setEditingTemplate({ ...template });
    setTemplateForm({ name: template.name, content: template.content });
  }

  function handleCancelEdit() {
    setEditingTemplate(null);
    setTemplateForm({ name: '', content: '' });
  }

  async function handleSaveTemplate() {
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      showToast('Name and content are both required.', 'error');
      return;
    }
    if (editingTemplate) {
      await config.updateTemplate(editingTemplate.id, templateForm.name, templateForm.content);
      setEditingTemplate(null);
    } else {
      await config.createTemplate(templateForm.name, templateForm.content);
    }
    setTemplateForm({ name: '', content: '' });
  }

  async function handleDeleteTemplate(id) {
    await config.deleteTemplate(id);
  }

  // ── Render settings actions ───────────────────────────────────────────────

  async function handleSaveRenderSettings() {
    setSavingRender(true);
    try {
      await Promise.all([
        saveSetting('RENDER_DPI',          renderDpi),
        saveSetting('RENDER_JPEG_QUALITY', renderQuality),
        saveSetting('RENDER_MAX_PAGES',    renderMaxPages),
      ]);
      showToast('Render settings saved.', 'success');
    } catch (err) {
      showToast(`Failed to save render settings: ${err.message}`, 'error');
    } finally {
      setSavingRender(false);
    }
  }

  if (config.loading) {
    return (
      <div>
        <PanelHeader title="Professor Workspace" subtitle="Loading configuration..." />
        <p className="muted" style={{ padding: '1rem' }}>Loading...</p>
      </div>
    );
  }

  const activeProfile = config.docProfiles.find((p) => p.docType === activeDocType);
  const hasRubricOverride  = Boolean(activeProfile?.rubricSection?.trim());
  const hasDiagramOverride = Boolean(activeProfile?.diagramSection?.trim());

  return (
    <div className="pw-root">
      <ToastMessage toast={toast} />

      <PanelHeader
        title="Professor Workspace"
        subtitle="Configure evaluation behavior, templates, and render settings"
      />

      {/* ── Section 1: Class Context ─────────────────────────────────────── */}
      <section className="pw-card">
        <div className="pw-card__header-row">
          <div>
            <h3 className="pw-card__title">Class Context Profile</h3>
            <p className="pw-muted">
              Describe the current class — their tools, semester stage, and common weaknesses.
              This paragraph is injected into every evaluation so the AI understands the academic context.
            </p>
          </div>
          <button
            className="pw-btn pw-btn--primary"
            onClick={() => config.saveClassContext(contextDraft)}
          >
            Save Context
          </button>
        </div>
        <textarea
          className="pw-textarea pw-textarea--tall"
          placeholder="e.g. This is a 3rd year IT class using StarUML and Lucidchart. They are in Week 10 of the semester and commonly struggle with UML multiplicity and crow's foot notation in ERDs."
          value={contextDraft}
          onChange={(e) => setContextDraft(e.target.value)}
          rows={5}
        />
      </section>

      {/* ── Section 2: Document Type Profiles ───────────────────────────── */}
      <section className="pw-card">
        <h3 className="pw-card__title">Document Type Profiles</h3>
        <p className="pw-muted">
          Override the default rubric and diagram analysis instructions per document type.
          Leave blank to use the hardcoded defaults.
        </p>

        {/* Doc type tab strip */}
        <div className="pw-tabs">
          {DOC_TYPES.map((dt) => {
            const profile = config.docProfiles.find((p) => p.docType === dt);
            const hasOverride = Boolean(profile?.rubricSection?.trim() || profile?.diagramSection?.trim());
            return (
              <button
                key={dt}
                className={`pw-tab ${activeDocType === dt ? 'pw-tab--active' : ''}`}
                onClick={() => setActiveDocType(dt)}
              >
                {dt}
                {hasOverride && <span className="pw-tab__dot" title="Has active override" />}
              </button>
            );
          })}
        </div>

        <div className="pw-doc-profile">
          {/* Override status pills */}
          <div className="pw-override-status-row">
            <span className={`pw-override-pill ${hasRubricOverride ? 'pw-override-pill--active' : 'pw-override-pill--default'}`}>
              Rubric: {hasRubricOverride ? 'Override active' : 'Using default'}
            </span>
            <span className={`pw-override-pill ${hasDiagramOverride ? 'pw-override-pill--active' : 'pw-override-pill--default'}`}>
              Diagram Analysis: {hasDiagramOverride ? 'Override active' : 'Using default'}
            </span>
          </div>

          {/* Rubric section */}
          <div className="pw-field">
            <label className="pw-label">Rubric Section</label>
            <span className="pw-hint">{DEFAULT_RUBRIC_HINTS[activeDocType]}</span>
            <textarea
              className="pw-textarea"
              placeholder="Leave blank to use the default rubric criteria above."
              value={rubricDrafts[activeDocType]}
              onChange={(e) => setRubricDrafts((prev) => ({ ...prev, [activeDocType]: e.target.value }))}
              rows={6}
            />
          </div>

          {/* Diagram section */}
          <div className="pw-field">
            <label className="pw-label">Diagram Analysis Section</label>
            <span className="pw-hint">Leave blank to use the default diagram analysis instructions for {activeDocType}.</span>
            <textarea
              className="pw-textarea"
              placeholder="Leave blank to use the default diagram analysis instructions."
              value={diagramDrafts[activeDocType]}
              onChange={(e) => setDiagramDrafts((prev) => ({ ...prev, [activeDocType]: e.target.value }))}
              rows={8}
            />
          </div>

          <div className="pw-action-row">
            <button
              className="pw-btn pw-btn--ghost"
              onClick={() => handleClearDocProfile(activeDocType)}
            >
              Clear Override
            </button>
            <button
              className="pw-btn pw-btn--primary"
              onClick={() => handleSaveDocProfile(activeDocType)}
            >
              Save {activeDocType} Profile
            </button>
          </div>
        </div>
      </section>

      {/* ── Section 3: Prompt Template Library ──────────────────────────── */}
      <section className="pw-card">
        <h3 className="pw-card__title">Prompt Template Library</h3>
        <p className="pw-muted">
          Named reusable instruction sets. Select a template in the Analyze modal to populate
          the Professor Directives field. You can still edit it per session without affecting the saved template.
        </p>

        {/* Existing templates */}
        {config.promptTemplates.length > 0 ? (
          <div className="pw-template-list">
            {config.promptTemplates.map((t) => (
              <div key={t.id} className="pw-template-item">
                <div className="pw-template-item__info">
                  <span className="pw-template-item__name">{t.name}</span>
                  <span className="pw-template-item__preview">{t.content.slice(0, 120)}{t.content.length > 120 ? '…' : ''}</span>
                </div>
                <div className="pw-template-item__actions">
                  <button className="pw-btn pw-btn--soft" onClick={() => handleStartEdit(t)}>Edit</button>
                  <button className="pw-btn pw-btn--danger" onClick={() => handleDeleteTemplate(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="pw-muted" style={{ marginBottom: '1rem' }}>No templates saved yet. Create one below.</p>
        )}

        {/* Create / edit form */}
        <div className="pw-template-form">
          <h4 className="pw-template-form__title">
            {editingTemplate ? `Editing: ${editingTemplate.name}` : 'New Template'}
          </h4>
          <div className="pw-field">
            <label className="pw-label">Template Name</label>
            <input
              className="pw-input"
              type="text"
              placeholder='e.g. "Strict Final Submission"'
              value={templateForm.name}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="pw-field">
            <label className="pw-label">Instructions</label>
            <textarea
              className="pw-textarea"
              placeholder="e.g. Be extremely strict on diagrams. Penalize missing multiplicities heavily."
              value={templateForm.content}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, content: e.target.value }))}
              rows={5}
            />
          </div>
          <div className="pw-action-row">
            {editingTemplate && (
              <button className="pw-btn pw-btn--ghost" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
            <button className="pw-btn pw-btn--primary" onClick={handleSaveTemplate}>
              {editingTemplate ? 'Update Template' : 'Save as New Template'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Section 4: Render Settings ───────────────────────────────────── */}
      <section className="pw-card">
        <div className="pw-card__header-row">
          <div>
            <h3 className="pw-card__title">Render Settings</h3>
            <p className="pw-muted">
              Controls how PDF pages are rendered before being sent to GPT-4o.
              Changes take effect on the next evaluation.
            </p>
          </div>
          <button
            className="pw-btn pw-btn--primary"
            onClick={handleSaveRenderSettings}
            disabled={savingRender}
          >
            {savingRender ? 'Saving...' : 'Save Render Settings'}
          </button>
        </div>

        <div className="pw-render-grid">
          <div className="pw-field">
            <label className="pw-label">Render DPI</label>
            <span className="pw-hint">Recommended range: 150–300. Higher DPI improves diagram clarity but increases token usage.</span>
            <input
              className="pw-input"
              type="number"
              min="72"
              max="600"
              value={renderDpi}
              onChange={(e) => setRenderDpi(e.target.value)}
            />
          </div>

          <div className="pw-field">
            <label className="pw-label">JPEG Quality</label>
            <span className="pw-hint">Range: 0.5–1.0. Values below 0.80 may introduce artifacts on thin diagram edges.</span>
            <input
              className="pw-input"
              type="number"
              min="0.5"
              max="1.0"
              step="0.05"
              value={renderQuality}
              onChange={(e) => setRenderQuality(e.target.value)}
            />
          </div>

          <div className="pw-field">
            <label className="pw-label">Max Pages to Render</label>
            <span className="pw-hint">Set to 999 to render all pages. Reducing this lowers token cost but may miss diagrams on later pages.</span>
            <input
              className="pw-input"
              type="number"
              min="1"
              max="999"
              value={renderMaxPages}
              onChange={(e) => setRenderMaxPages(e.target.value)}
            />
          </div>
        </div>

        {/* Live cost estimate */}
        {costEstimate && (
          <div className="pw-cost-estimate">
            <span className="pw-cost-estimate__label">Estimated image tokens per evaluation</span>
            <span className="pw-cost-estimate__value">
              ~{costEstimate.tokens} tokens
              {' '}({costEstimate.pages} pages × ~{TOKENS_PER_IMAGE_AT_300DPI.toLocaleString()} tokens)
              {' '}≈ <strong>${costEstimate.cost}</strong> in image input cost
            </span>
            <span className="pw-cost-estimate__note">
              Estimate is approximate. Actual cost depends on page content complexity.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}