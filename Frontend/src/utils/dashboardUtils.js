export function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

export function getDisplayType(mimeType) {
  return mimeType === 'application/vnd.google-apps.document' ? 'Google Doc' : 'Document';
}

const DOC_TYPES = ['SRS', 'SDD', 'SPMP', 'STD'];

export function normalizeSection(section) {
  if (!section) return '';
  const upper = String(section).trim().toUpperCase();
  const goMatch = upper.match(/^GO(\d)$/);
  if (goMatch) return `G0${goMatch[1]}`;
  const shortMatch = upper.match(/^G(\d)$/);
  if (shortMatch) return `G0${shortMatch[1]}`;
  return upper;
}

export function extractSubmissionMeta(fileName) {
  const name = String(fileName || '');
  const upper = name.toUpperCase();

  const docMatch = upper.match(/^\[(SRS|SDD|SPMP|STD)\]/) || upper.match(/\b(SRS|SDD|SPMP|STD)\b/);
  const sectionMatch = upper.match(/\bG[O0]?\d\b/);
  const teamMatch = upper.match(/\b\d{4}-SEM\d-IT\d+-\d{2}\b/);
  const studentPart = name.includes('|') ? name.split('|').pop().trim() : '';

  return {
    documentType: docMatch?.[1] || '',
    section: normalizeSection(sectionMatch?.[0] || ''),
    teamCode: teamMatch?.[0] || '',
    studentName: studentPart || '',
  };
}

export function buildFilterOptions(files = []) {
  const students = new Set();
  const sections = new Set();
  const teamCodes = new Set();

  files.forEach((item) => {
    const meta = extractSubmissionMeta(item.name);
    if (meta.studentName) students.add(meta.studentName);
    if (meta.section) sections.add(meta.section);
    if (meta.teamCode) teamCodes.add(meta.teamCode);
  });

  return {
    students: [...students].sort((a, b) => a.localeCompare(b)),
    sections: [...sections].sort((a, b) => a.localeCompare(b)),
    teamCodes: [...teamCodes].sort((a, b) => a.localeCompare(b)),
    docTypes: DOC_TYPES,
  };
}

export function filterSubmissions(files = [], filters = {}) {
  const {
    selectedStudent = '',
    selectedSection = '',
    selectedTeamCode = '',
    selectedDocType = '',
    searchQuery = '',
  } = filters;

  const normalizedQuery = String(searchQuery).trim().toLowerCase();

  return files.filter((item) => {
    const meta = extractSubmissionMeta(item.name);

    if (selectedStudent && meta.studentName !== selectedStudent) return false;
    if (selectedSection && meta.section !== normalizeSection(selectedSection)) return false;
    if (selectedTeamCode && meta.teamCode !== selectedTeamCode.toUpperCase()) return false;
    if (selectedDocType && meta.documentType !== selectedDocType.toUpperCase()) return false;

    if (normalizedQuery) {
      const searchable = [
        item.name,
        meta.studentName,
        meta.section,
        meta.teamCode,
        meta.documentType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(normalizedQuery)) return false;
    }

    return true;
  });
}

export function sortSubmissions(files, sortConfig) {
  const items = [...files];
  return items.sort((a, b) => {
    if (sortConfig.key === 'name') {
      return sortConfig.direction === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    if (sortConfig.key === 'date') {
      return sortConfig.direction === 'asc'
        ? new Date(a.submittedAt) - new Date(b.submittedAt)
        : new Date(b.submittedAt) - new Date(a.submittedAt);
    }
    return 0;
  });
}
