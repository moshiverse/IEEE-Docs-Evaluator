const DEFAULT_API_BASE_URL = 'http://localhost:8080/api';
const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = (configuredApiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

/**
 * AUTH: Verifies user against Google Sheets allowlist (Email Only)
 */
export const verifyStudentWithBackend = async (googleEmail) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: googleEmail })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to verify user.');
    }
    return await response.json();
};

/**
 * SUBMISSIONS: Triggers the backend to read the Google Sheet and fetch live Google Doc URLs
 */
export const syncSubmissionsWithBackend = async () => {
    // UPDATED: Points to your new, clean SubmissionController
    const response = await fetch(`${API_BASE_URL}/submissions/sync`);
    if (!response.ok) throw new Error('Submission sync failed.');
    return await response.json();
};

/**
 * AI: Triggers Google Doc text extraction and AI analysis
 */
export const analyzeDocumentWithAI = async (fileId, fileName, model, signal) => {
    const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName, model }),
        signal,          
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed.');
    return data;
};


/**
 * AI: Fetches the evaluation history from Supabase
 */
export const getEvaluationHistory = async () => {
    const response = await fetch(`${API_BASE_URL}/ai/history`);
    if (!response.ok) throw new Error('Failed to fetch history.');
    return await response.json();
};

/**
 * SETTINGS: Fetch all dynamic configurations from Supabase
 */
export const getSystemSettings = async () => {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) throw new Error('Failed to fetch settings.');
    return await response.json();
};

/**
 * SETTINGS: Update a single configuration
 */
export const updateSystemSetting = async (key, value) => {
    const response = await fetch(`${API_BASE_URL}/settings/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update setting.');
    return data;
};

export const updateEvaluationResult = async (id, newResult, teacherFeedback) => {
    const response = await fetch(`${API_BASE_URL}/ai/history/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluationResult: newResult, teacherFeedback: teacherFeedback || '' })
    });
    if (!response.ok) throw new Error('Failed to update evaluation.');
    return await response.json();
};

export const sendEvaluationToStudent = async (id) => {
    const response = await fetch(`${API_BASE_URL}/ai/history/${id}/send`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to send report.');
    return await response.json();
};

export const getStudentReports = async (groupCode) => {
    const response = await fetch(`${API_BASE_URL}/ai/student-reports?groupCode=${encodeURIComponent(groupCode)}`);
    if (!response.ok) throw new Error('Failed to fetch student reports.');
    return await response.json();
};

export const getClassRoster = async () => {
    const response = await fetch(`${API_BASE_URL}/roster`);
    if (!response.ok) throw new Error('Failed to fetch class roster.');
    return await response.json();
};

export const updateMultipleSystemSettings = async (payload) => {
    const response = await fetch(`${API_BASE_URL}/settings/update-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
        const validationErrors = Array.isArray(data.errors) ? data.errors.join(' | ') : '';
        throw new Error(validationErrors || data.error || data.message || 'Failed to update settings.');
    }
    return data;
};

export const getAiRuntimeSettings = async () => {
    const response = await fetch(`${API_BASE_URL}/settings/ai-runtime`);
    if (!response.ok) throw new Error('Failed to fetch AI runtime settings.');
    return await response.json();
};