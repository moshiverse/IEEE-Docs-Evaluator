import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../api';

/**
 * Manages all professor configuration state with real-time Supabase subscriptions.
 * Used by the Professor Workspace (Step 11).
 *
 * Covers:
 *   - professor_doc_profiles  (rubric + diagram overrides per doc type)
 *   - prompt_templates        (named reusable instruction sets)
 *   - class_context_profile   (single paragraph describing the current class)
 */
export function useProfessorConfig(showToast) {

  const [docProfiles, setDocProfiles]         = useState([]);
  const [promptTemplates, setPromptTemplates] = useState([]);
  const [classContext, setClassContext]        = useState('');
  const [loading, setLoading]                 = useState(true);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadDocProfiles = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/professor/doc-profiles`);
      if (!res.ok) throw new Error('Failed to fetch doc profiles.');
      setDocProfiles(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadPromptTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/professor/prompt-templates`);
      if (!res.ok) throw new Error('Failed to fetch prompt templates.');
      setPromptTemplates(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadClassContext = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/professor/class-context`);
      if (!res.ok) throw new Error('Failed to fetch class context.');
      const data = await res.json();
      setClassContext(data.context || '');
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadDocProfiles(), loadPromptTemplates(), loadClassContext()]);
    setLoading(false);
  }, [loadDocProfiles, loadPromptTemplates, loadClassContext]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Real-time subscriptions ───────────────────────────────────────────────

  useEffect(() => {
    const docProfilesChannel = supabase
      .channel('prof-doc-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'professor_doc_profiles' }, () => {
        loadDocProfiles();
      })
      .subscribe();

    const templatesChannel = supabase
      .channel('prof-prompt-templates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prompt_templates' }, () => {
        loadPromptTemplates();
      })
      .subscribe();

    const classContextChannel = supabase
      .channel('prof-class-context')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_context_profile' }, () => {
        loadClassContext();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(docProfilesChannel);
      supabase.removeChannel(templatesChannel);
      supabase.removeChannel(classContextChannel);
    };
  }, [loadDocProfiles, loadPromptTemplates, loadClassContext]);

  // ── Doc profile actions ───────────────────────────────────────────────────

  async function saveDocProfile(docType, rubricSection, diagramSection) {
    try {
      const res = await fetch(`${API_BASE_URL}/professor/doc-profiles/${docType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubricSection, diagramSection }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save doc profile.');
      }
      showToast?.(`${docType} profile saved.`, 'success');
      await loadDocProfiles();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  }

  // ── Prompt template actions ───────────────────────────────────────────────

  async function createTemplate(name, content) {
    try {
      const res = await fetch(`${API_BASE_URL}/professor/prompt-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create template.');
      }
      showToast?.('Template created.', 'success');
      await loadPromptTemplates();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  }

  async function updateTemplate(id, name, content) {
    try {
      const res = await fetch(`${API_BASE_URL}/professor/prompt-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update template.');
      }
      showToast?.('Template updated.', 'success');
      await loadPromptTemplates();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  }

  async function deleteTemplate(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/professor/prompt-templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete template.');
      }
      showToast?.('Template deleted.', 'success');
      await loadPromptTemplates();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  }

  // ── Class context actions ─────────────────────────────────────────────────

  async function saveClassContext(context) {
    try {
      const res = await fetch(`${API_BASE_URL}/professor/class-context`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save class context.');
      }
      showToast?.('Class context saved.', 'success');
      await loadClassContext();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  }

  return {
    docProfiles,
    promptTemplates,
    classContext,
    setClassContext,
    loading,
    loadAll,
    saveDocProfile,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    saveClassContext,
  };
}