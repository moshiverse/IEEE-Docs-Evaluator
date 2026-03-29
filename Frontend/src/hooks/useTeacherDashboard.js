import { useEffect, useMemo, useRef, useState } from 'react';
import {
  analyzeSubmission,
  fetchClassRoster,
  fetchTeacherHistory,
  fetchTeacherSettings,
  fetchTeacherSubmissions,
  saveEvaluation,
  saveSetting,
  sendEvaluation,
} from '../services/dashboardService';
import { buildFilterOptions, extractSubmissionMeta, filterSubmissions, normalizeSection, sortSubmissions } from '../utils/dashboardUtils';

export function useTeacherDashboard(showToast) {
  const [currentView, setCurrentView] = useState('submissions');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedTeamCode, setSelectedTeamCode] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [aiResult, setAiResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editedReportText, setEditedReportText] = useState('');
  const [editedTeacherFeedback, setEditedTeacherFeedback] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('');
  const [reportDocTypeFilter, setReportDocTypeFilter] = useState('');
  const [reportSelectedStudent, setReportSelectedStudent] = useState('');
  const [reportSelectedSection, setReportSelectedSection] = useState('');
  const [reportSelectedTeamCode, setReportSelectedTeamCode] = useState('');

  const [settings, setSettings] = useState([]);
  const [editedSettings, setEditedSettings] = useState({});
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const [roster, setRoster] = useState([]);

  // Holds the AbortController for the currently running analysis.
  // Each new runAnalysis() call creates a fresh one, cancelling any prior run.
  const analysisAbortRef = useRef(null);

  async function loadSubmissions() {
    try {
      setLoading(true);
      setError('');
      const data = await fetchTeacherSubmissions();
      setFiles(data);
    } catch (err) {
      setError(`Failed to load submissions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      setLoadingHistory(true);
      setError('');
      const data = await fetchTeacherHistory();
      setHistoryLogs(data);
    } catch (err) {
      setError(`Failed to load history: ${err.message}`);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadSettings() {
    try {
      setLoadingSettings(true);
      setError('');
      const data = await fetchTeacherSettings();
      setSettings(data);
      setEditedSettings({});
    } catch (err) {
      setError(`Failed to load settings: ${err.message}`);
    } finally {
      setLoadingSettings(false);
    }
  }

  const analyzedFileIds = useMemo(() => {
    return new Set(historyLogs.map((h) => h.fileId));
  }, [historyLogs]);

  useEffect(() => {
    if (currentView === 'submissions') {
      loadSubmissions();
      loadHistory();
    }
    if (currentView === 'reports') loadHistory();
    if (currentView === 'settings') loadSettings();
    if (currentView === 'submissions' || currentView === 'reports') {
      fetchClassRoster().then(setRoster).catch(() => {});
    }
  }, [currentView]);

  const filterOptions = useMemo(() => {
    const base = buildFilterOptions(files);
    if (roster.length > 0) {
      const rosterSections = [...new Set(roster.map((s) => s.section).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const rosterTeamCodes = [...new Set(roster.map((s) => s.groupCode).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      return { ...base, sections: rosterSections, teamCodes: rosterTeamCodes };
    }
    return base;
  }, [files, roster]);

  const filteredFiles = useMemo(
    () =>
      filterSubmissions(files, {
        selectedStudent,
        selectedSection,
        selectedTeamCode,
        selectedDocType,
        searchQuery,
      }),
    [files, selectedStudent, selectedSection, selectedTeamCode, selectedDocType, searchQuery],
  );

  const sortedFiles = useMemo(() => sortSubmissions(filteredFiles, sortConfig), [filteredFiles, sortConfig]);

  const submissionStats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const isSearchingStudent = query.length > 0;

    const scoped = files.filter((item) => {
      const meta = extractSubmissionMeta(item.name);
      if (selectedSection && meta.section !== normalizeSection(selectedSection)) return false;
      if (selectedTeamCode && meta.teamCode !== selectedTeamCode.toUpperCase()) return false;
      return true;
    });

    const scopedRoster = roster.filter((s) => {
      if (selectedSection && s.section !== selectedSection) return false;
      if (selectedTeamCode && s.groupCode?.toUpperCase() !== selectedTeamCode.toUpperCase()) return false;
      return true;
    });

    if (isSearchingStudent) {
      const matched = scoped.filter((item) => {
        const meta = extractSubmissionMeta(item.name);
        return meta.studentName.toLowerCase().includes(query);
      });

      const rosterMatched = scopedRoster.filter((s) => s.studentName?.toLowerCase().includes(query));
      const matchedNames = [...new Set([
        ...matched.map((f) => extractSubmissionMeta(f.name).studentName),
        ...rosterMatched.map((s) => s.studentName),
      ].filter(Boolean))];

      const displayName = matchedNames.length === 1 ? matchedNames[0] : null;

      return {
        studentName: displayName,
        studentCount: matchedNames.length,
        docCounts: ['SRS', 'SDD', 'SPMP', 'STD'].map((type) => ({
          type,
          count: matched.filter((f) => extractSubmissionMeta(f.name).documentType === type).length,
        })),
      };
    }

    const studentCount = scopedRoster.length > 0
      ? scopedRoster.length
      : new Set(scoped.map((item) => extractSubmissionMeta(item.name).studentName).filter(Boolean)).size;

    return {
      studentName: null,
      studentCount,
      docCounts: ['SRS', 'SDD', 'SPMP', 'STD'].map((type) => ({
        type,
        count: scoped.filter((f) => extractSubmissionMeta(f.name).documentType === type).length,
      })),
    };
  }, [files, roster, selectedSection, selectedTeamCode, searchQuery]);

  const reportDocTypeOptions = useMemo(
    () =>
      [...new Set(historyLogs.map((item) => extractSubmissionMeta(item.fileName).documentType).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b)),
    [historyLogs],
  );

  const reportFilterOptions = useMemo(() => {
    const students = new Set();
    const sections = new Set();
    const teamCodes = new Set();

    historyLogs.forEach((item) => {
      const meta = extractSubmissionMeta(item.fileName);
      if (meta.studentName) students.add(meta.studentName);
      if (meta.section) sections.add(meta.section);
      if (meta.teamCode) teamCodes.add(meta.teamCode);
    });

    if (roster.length > 0) {
      const rosterSections = [...new Set(roster.map((s) => s.section).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const rosterTeamCodes = [...new Set(roster.map((s) => s.groupCode).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      return {
        students: [...students].sort((a, b) => a.localeCompare(b)),
        sections: rosterSections,
        teamCodes: rosterTeamCodes,
      };
    }

    return {
      students: [...students].sort((a, b) => a.localeCompare(b)),
      sections: [...sections].sort((a, b) => a.localeCompare(b)),
      teamCodes: [...teamCodes].sort((a, b) => a.localeCompare(b)),
    };
  }, [historyLogs, roster]);

  const filteredHistoryLogs = useMemo(() => {
    const query = reportSearchQuery.trim().toLowerCase();

    return historyLogs.filter((log) => {
      const docType = extractSubmissionMeta(log.fileName).documentType;
      const meta = extractSubmissionMeta(log.fileName);

      if (reportStatusFilter === 'sent' && !log.isSent) return false;
      if (reportStatusFilter === 'pending' && log.isSent) return false;
      if (reportDocTypeFilter && docType !== reportDocTypeFilter) return false;
      if (reportSelectedStudent && meta.studentName !== reportSelectedStudent) return false;
      if (reportSelectedSection && meta.section !== normalizeSection(reportSelectedSection)) return false;
      if (reportSelectedTeamCode && meta.teamCode !== reportSelectedTeamCode.toUpperCase()) return false;

      if (query) {
        const searchable = [
          log.fileName,
          log.isSent ? 'sent' : 'pending',
          log.evaluatedAt,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }, [
    historyLogs,
    reportSearchQuery,
    reportStatusFilter,
    reportDocTypeFilter,
    reportSelectedStudent,
    reportSelectedSection,
    reportSelectedTeamCode,
  ]);

  function clearReportFilters() {
    setReportSelectedStudent('');
    setReportSelectedSection('');
    setReportSelectedTeamCode('');
    setReportStatusFilter('');
    setReportDocTypeFilter('');
    setReportSearchQuery('');
  }

  async function handleManualSync() {
    if (loading || isSyncing) return;
    try {
      setIsSyncing(true);
      setError('');
      const data = await fetchTeacherSubmissions();
      setFiles(data);
      showToast('Submissions synced successfully.', 'success');
    } catch (err) {
      setError(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  }

  function requestSort(key) {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  }

  function clearFilters() {
    setSelectedStudent('');
    setSelectedSection('');
    setSelectedTeamCode('');
    setSelectedDocType('');
    setSearchQuery('');
  }

  function openAnalyzeModal(file) {
    setSelectedFile(file);
    setAiResult('');
    setIsAnalyzeOpen(true);
  }

  async function runAnalysis(modelName) {
    if (!selectedFile) return;

    // Cancel any previous analysis still in flight
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
    }

    // Fresh controller for this specific run
    const controller = new AbortController();
    analysisAbortRef.current = controller;

    const fileToAnalyze = selectedFile;

    try {
      setIsAnalyzing(true);
      setAiResult('');

      const data = await analyzeSubmission(
        fileToAnalyze.id,
        fileToAnalyze.name,
        modelName,
        controller.signal,
      );

      // If this run was aborted because a newer one started, bail silently
      if (controller.signal.aborted) return;

      const result = data.analysis || data;
      setAiResult(result);

      // Refresh history in background — must not block or clear the result
      loadHistory().catch(() => {});
    } catch (err) {
      // AbortError = a new analysis was started intentionally, stay silent
      if (err.name === 'AbortError') return;
      setAiResult(`Error: ${err.message}`);
    } finally {
      // Only clear the loading flag if this is still the active run
      if (analysisAbortRef.current === controller) {
        setIsAnalyzing(false);
        analysisAbortRef.current = null;
      }
    }
  }

  function startEditingHistory(item) {
    setSelectedHistoryItem(item);
    setEditedReportText(item.evaluationResult);
    setEditedTeacherFeedback(item.teacherFeedback || '');
    setIsEditingReport(false);
    console.log(item);
  }

  async function saveEditedHistory() {
    if (!selectedHistoryItem) return;
    try {
      await saveEvaluation(selectedHistoryItem.id, editedReportText, editedTeacherFeedback);
      const updated = { ...selectedHistoryItem, evaluationResult: editedReportText, teacherFeedback: editedTeacherFeedback };
      setSelectedHistoryItem(updated);
      setHistoryLogs((prev) => prev.map((log) => (log.id === updated.id ? updated : log)));
      setIsEditingReport(false);
      showToast('Evaluation updated successfully.', 'success');
    } catch (err) {
      showToast(`Error updating report: ${err.message}`, 'error');
    }
  }

  async function sendHistoryToStudent() {
    if (!selectedHistoryItem) return;
    try {
      await sendEvaluation(selectedHistoryItem.id);
      const updated = { ...selectedHistoryItem, isSent: true };
      setSelectedHistoryItem(updated);
      setHistoryLogs((prev) => prev.map((log) => (log.id === updated.id ? updated : log)));
      showToast('Result sent to Student Dashboard.', 'success');
    } catch (err) {
      showToast(`Error sending report: ${err.message}`, 'error');
    }
  }

  function closeHistoryModal() {
    setSelectedHistoryItem(null);
    setIsEditingReport(false);
  }

  function handleSettingChange(key, value) {
    setEditedSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function saveAllSettings() {
    const keys = Object.keys(editedSettings);
    if (!keys.length) return;
    try {
      setIsSavingAll(true);
      await Promise.all(keys.map((key) => saveSetting(key, editedSettings[key])));
      showToast('All settings saved.', 'success');
      await loadSettings();
    } catch (err) {
      showToast(`Failed to save settings: ${err.message}`, 'error');
    } finally {
      setIsSavingAll(false);
    }
  }

  return {
    currentView,
    setCurrentView,
    files: sortedFiles,
    filterOptions,
    submissionStats,
    selectedStudent,
    selectedSection,
    selectedTeamCode,
    selectedDocType,
    searchQuery,
    loading,
    isSyncing,
    analyzedFileIds,
    error,
    historyLogs: filteredHistoryLogs,
    allHistoryCount: historyLogs.length,
    reportDocTypeOptions,
    reportFilterOptions,
    reportSearchQuery,
    reportStatusFilter,
    reportDocTypeFilter,
    reportSelectedStudent,
    reportSelectedSection,
    reportSelectedTeamCode,
    loadingHistory,
    settings,
    loadingSettings,
    editedSettings,
    isSavingAll,
    dirtyCount: Object.keys(editedSettings).length,
    isAnalyzeOpen,
    setIsAnalyzeOpen,
    selectedFile,
    aiResult,
    isAnalyzing,
    selectedHistoryItem,
    isEditingReport,
    setIsEditingReport,
    editedReportText,
    setEditedReportText,
    editedTeacherFeedback,
    setEditedTeacherFeedback,
    handleManualSync,
    requestSort,
    setSelectedStudent,
    setSelectedSection,
    setSelectedTeamCode,
    setSelectedDocType,
    setSearchQuery,
    setReportSearchQuery,
    setReportStatusFilter,
    setReportDocTypeFilter,
    setReportSelectedStudent,
    setReportSelectedSection,
    setReportSelectedTeamCode,
    clearReportFilters,
    clearFilters,
    openAnalyzeModal,
    runAnalysis,
    loadHistory,
    startEditingHistory,
    saveEditedHistory,
    sendHistoryToStudent,
    closeHistoryModal,
    handleSettingChange,
    saveAllSettings,
    loadSettings,
  };
}