import {
  analyzeDocumentWithAI,
  getClassRoster,
  getEvaluationHistory,
  getStudentReports,
  getSystemSettings,
  sendEvaluationToStudent,
  syncSubmissionsWithBackend,
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

export async function analyzeSubmission(fileId, fileName, model) {
  return analyzeDocumentWithAI(fileId, fileName, model);
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
