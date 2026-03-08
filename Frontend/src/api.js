const API_BASE_URL = 'http://localhost:8080/api';

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
export const analyzeDocumentWithAI = async (fileId, fileName, model) => {
    const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName, model })
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