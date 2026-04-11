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
} from '../api';

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

export async function analyzeSubmission(fileId, fileName, model, signal) {
  return analyzeDocumentWithAI(fileId, fileName, model, signal);
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
