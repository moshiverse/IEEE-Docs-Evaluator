import { API_BASE_URL } from '../api';

import {
  analyzeDocumentWithAI,
  getClassRoster,
  getEvaluationHistory,
  getStudentReports,
  getSystemSettings,
  getAiRuntimeSettings,
  sendEvaluationToStudent,
  syncSubmissionsWithBackend,
  updateMultipleSystemSettings,
  updateEvaluationResult,
  updateSystemSetting,
  deleteEvaluationReport,
  restoreEvaluationReport,
  getHiddenSubmissionIds,
  hideSubmission as hideSubmissionApi,
  restoreSubmission as restoreSubmissionApi,
  getPromptTemplates,
  clearAllEvaluationHistory,
} from '../api';

export async function fetchPromptTemplates() {
  return getPromptTemplates();
}

export async function fetchStudentReports(groupCode) {
  return getStudentReports(groupCode);
}

export async function fetchTeacherSubmissions() {
  const data = await syncSubmissionsWithBackend();
  return Array.from(new Map(data.map((item) => [item.id, item])).values());
}

export async function fetchTeacherHistory() {
  return getEvaluationHistory();
}

export async function fetchTeacherSettings() {
  return getSystemSettings();
}

export async function saveSetting(key, value) {
  return updateSystemSetting(key, value);
}

export async function saveMultipleSettings(payload) {
  return updateMultipleSystemSettings(payload);
}

export async function fetchAiRuntimeSettings() {
  return getAiRuntimeSettings();
}

export async function analyzeSubmission(fileId, fileName, model, customInstructions, signal) {
  return analyzeDocumentWithAI(fileId, fileName, model, customInstructions, signal);
}

export async function saveEvaluation(id, text, teacherFeedback) {
  return updateEvaluationResult(id, text, teacherFeedback);
}

export async function sendEvaluation(id) {
  return sendEvaluationToStudent(id);
}

export async function fetchClassRoster() {
  return getClassRoster();
}

export async function fetchHistoryItem(id) {
    // USE THE CONSTANT: This ensures it hits 8080, not 5173
    const res = await fetch(`${API_BASE_URL}/ai/history/${id}`);
    
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server Error: ${errorText}`);
    }
    return res.json();
}

export async function softDeleteReport(id) {
  return deleteEvaluationReport(id);
}

export async function restoreReport(id) {
  return restoreEvaluationReport(id);
}

export async function fetchHiddenSubmissionIds() {
  return getHiddenSubmissionIds();
}

export async function hideSubmission(fileId) {
  return hideSubmissionApi(fileId);
}

export async function restoreSubmission(fileId) {
  return restoreSubmissionApi(fileId);
}

export async function clearAllHistory() {
  return clearAllEvaluationHistory();
}