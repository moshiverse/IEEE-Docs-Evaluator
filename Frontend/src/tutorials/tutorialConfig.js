export const TUTORIAL_TYPES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
};

const RUNS_STORAGE_KEY = 'ieee_docs_tutorial_runs';

function safeReadStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    return JSON.parse(window.localStorage.getItem(RUNS_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function safeWriteStorage(value) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(RUNS_STORAGE_KEY, JSON.stringify(value));
}

export function buildTutorialKey(tutorialType, userKey) {
  const normalizedUserKey = userKey ? String(userKey).trim().toLowerCase() : 'anonymous';
  return `${tutorialType}:${normalizedUserKey}`;
}

export function getTutorialRunCount(tutorialType, userKey) {
  const store = safeReadStorage();
  const key = buildTutorialKey(tutorialType, userKey);
  return Number(store[key] || 0);
}

export function incrementTutorialRunCount(tutorialType, userKey) {
  const store = safeReadStorage();
  const key = buildTutorialKey(tutorialType, userKey);
  const next = Number(store[key] || 0) + 1;
  store[key] = next;
  safeWriteStorage(store);
  return next;
}
