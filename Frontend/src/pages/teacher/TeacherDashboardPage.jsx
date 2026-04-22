import { useMemo, useState } from 'react';
import PanelHeader from '../../components/common/PanelHeader';
import ToastMessage from '../../components/common/ToastMessage';
import TeacherAnalyzeModal from '../../components/teacher/TeacherAnalyzeModal';
import TeacherFilterPanel from '../../components/teacher/TeacherFilterPanel';
import TeacherHistoryModal from '../../components/teacher/TeacherHistoryModal';
import TeacherSubmissionHistoryModal from '../../components/teacher/TeacherSubmissionHistoryModal';
import TeacherHistoryTable from '../../components/teacher/TeacherHistoryTable';
import TeacherSettingsPanel from '../../components/teacher/TeacherSettingsPanel';
import TeacherSidebar from '../../components/teacher/TeacherSidebar';
import TeacherSubmissionsTable from '../../components/teacher/TeacherSubmissionsTable';
import { useTeacherDashboard } from '../../hooks/useTeacherDashboard';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import '../../styles/pages/teacher-dashboard.css';
import '../../styles/components/layout.css';

function TeacherDashboardPage() {
  const { toast, showToast } = useToast();
  const { themeMode, setThemeMode } = useTheme();
  const vm = useTeacherDashboard(showToast);
  const [isSubmissionHistoryOpen, setIsSubmissionHistoryOpen] = useState(false);
  const [submissionHistoryFile, setSubmissionHistoryFile] = useState(null);
  const [isSubmissionHistoryFlow, setIsSubmissionHistoryFlow] = useState(false);

  const submissionHistoryLogs = useMemo(() => {
    if (!submissionHistoryFile?.id) return [];

    return vm.historyLogs
      .filter((log) => log.fileId === submissionHistoryFile.id)
      .sort((a, b) => new Date(b.evaluatedAt) - new Date(a.evaluatedAt));
  }, [vm.historyLogs, submissionHistoryFile]);

  function openSubmissionHistoryModal() {
    if (!vm.selectedFile?.id) return;

    vm.clearReportFilters();
    vm.closeAnalyzeModal();
    setSubmissionHistoryFile(vm.selectedFile);
    setIsSubmissionHistoryOpen(true);
    setIsSubmissionHistoryFlow(true);
  }

  function closeSubmissionHistoryModal() {
    setIsSubmissionHistoryOpen(false);
    setIsSubmissionHistoryFlow(false);
    setSubmissionHistoryFile(null);
  }

  function returnToAnalyzeModal() {
    if (!submissionHistoryFile) {
      closeSubmissionHistoryModal();
      return;
    }

    setIsSubmissionHistoryOpen(false);
    vm.openAnalyzeModal(submissionHistoryFile);
  }

  function viewSubmissionHistoryReport(item) {
    setIsSubmissionHistoryOpen(false);
    vm.startEditingHistory(item);
  }

  function handleHistoryDetailsClose() {
    vm.closeHistoryModal();

    if (isSubmissionHistoryFlow && submissionHistoryFile?.id) {
      setIsSubmissionHistoryOpen(true);
      return;
    }

    setIsSubmissionHistoryFlow(false);
  }

  return (
    <div className="layout layout--teacher">
      <ToastMessage toast={toast} />

      <TeacherSidebar
        currentView={vm.currentView}
        onNavigate={vm.setCurrentView}
      />

      <main className="layout__main">
        {vm.error && <div className="error-box">{vm.error}</div>}

        {vm.currentView === 'submissions' && (
          <>
            <PanelHeader
              title="Live Submissions"
              subtitle="Sourced directly from the Google Sheets tracker"
              actions={
                <div className="teacher-header-actions">
                  <input
                    type="search"
                    className="teacher-header-search"
                    placeholder="Search student, team, section, doc"
                    value={vm.searchQuery}
                    onChange={(e) => vm.setSearchQuery(e.target.value)}
                    aria-label="Search submissions"
                  />
                  <button className="btn btn--primary" onClick={vm.handleManualSync} disabled={vm.isSyncing}>
                    {vm.isSyncing ? 'Fetching Updates...' : 'Sync Latest Submissions'}
                  </button>
                </div>
              }
            />
            <TeacherFilterPanel
              sections={vm.filterOptions.sections}
              teamCodes={vm.filterOptions.teamCodes}
              docTypes={vm.filterOptions.docTypes}
              selectedSection={vm.selectedSection}
              selectedTeamCode={vm.selectedTeamCode}
              selectedDocType={vm.selectedDocType}
              onSectionChange={vm.setSelectedSection}
              onTeamCodeChange={vm.setSelectedTeamCode}
              onDocTypeChange={vm.setSelectedDocType}
              onClear={vm.clearFilters}
              stats={vm.submissionStats}
            />
            <TeacherSubmissionsTable
              files={vm.files}
              loading={vm.loading}
              isSyncing={vm.isSyncing}
              analyzedFileIds={vm.analyzedFileIds}
              onSort={vm.requestSort}
              onAnalyze={vm.openAnalyzeModal}
            />
          </>
        )}

        {vm.currentView === 'reports' && (
          <>
            <PanelHeader
              title="AI Evaluation History"
              subtitle="Saved results from Supabase Database"
              actions={
                <div className="teacher-header-actions">
                  <input
                    type="search"
                    className="teacher-header-search"
                    placeholder="Search reports"
                    value={vm.reportSearchQuery}
                    onChange={(e) => vm.setReportSearchQuery(e.target.value)}
                    aria-label="Search AI reports"
                  />
                  <button className="btn btn--primary" onClick={vm.loadHistory}>
                    Refresh History
                  </button>
                </div>
              }
            />

            <TeacherFilterPanel
              sections={vm.reportFilterOptions.sections}
              teamCodes={vm.reportFilterOptions.teamCodes}
              docTypes={vm.filterOptions.docTypes}
              selectedSection={vm.reportSelectedSection}
              selectedTeamCode={vm.reportSelectedTeamCode}
              selectedDocType={vm.reportDocTypeFilter}
              statusOptions={[
                { value: '', label: 'All' },
                { value: 'sent', label: 'Sent' },
                { value: 'pending', label: 'Pending' },
              ]}
              selectedStatus={vm.reportStatusFilter}
              onSectionChange={vm.setReportSelectedSection}
              onTeamCodeChange={vm.setReportSelectedTeamCode}
              onDocTypeChange={vm.setReportDocTypeFilter}
              onStatusChange={vm.setReportStatusFilter}
              onClear={vm.clearReportFilters}
            />

            <TeacherHistoryTable
              logs={vm.historyLogs}
              allCount={vm.allHistoryCount}
              loading={vm.loadingHistory}
              onView={vm.startEditingHistory}
              onDelete={vm.deleteReport}
            />
          </>
        )}

        {vm.currentView === 'settings' && (
          <>
            <PanelHeader
              title="System Settings"
              subtitle="Manage API keys, tracker mappings, and submission columns"
            />
            <TeacherSettingsPanel
              settings={vm.settings}
              aiRuntimeSettings={vm.aiRuntimeSettings}
              editedSettings={vm.editedSettings}
              loading={vm.loadingSettings}
              dirtyCount={vm.dirtyCount}
              isSavingAll={vm.isSavingAll}
              themeMode={themeMode}
              onThemeModeChange={setThemeMode}
              onSettingChange={vm.handleSettingChange}
              onSaveMultiple={vm.saveAiSettingsBatch}
              onSave={vm.saveAllSettings}
              trashBinSummary={vm.trashBinSummary}
              onSafeEmptyAllTrashBins={vm.safeEmptyAllTrashBins}
              onRestoreSelectedTrashItems={vm.restoreSelectedTrashItems}
              onDiscard={() => {
                vm.loadSettings();
              }}
            />
          </>
        )}
      </main>

      <TeacherAnalyzeModal
        isOpen={vm.isAnalyzeOpen}
        file={vm.selectedFile}
        aiResult={vm.aiResult}
        aiImages={vm.aiImages}
        isAnalyzing={vm.isAnalyzing}
        hasPreviousEvaluation={Boolean(vm.selectedFile?.id && vm.analyzedFileIds?.has(vm.selectedFile.id))}
        aiRuntimeSettings={vm.aiRuntimeSettings}
        customRules={vm.customRules} 
        setCustomRules={vm.setCustomRules}
        onClose={vm.closeAnalyzeModal}
        onRun={vm.runAnalysis}
        onViewHistory={openSubmissionHistoryModal}
      />

      <TeacherSubmissionHistoryModal
        isOpen={isSubmissionHistoryOpen}
        file={submissionHistoryFile}
        logs={submissionHistoryLogs}
        onViewReport={viewSubmissionHistoryReport}
        onDelete={vm.deleteReport}
        onClose={closeSubmissionHistoryModal}
        onReturn={returnToAnalyzeModal}
      />

      <TeacherHistoryModal
        item={vm.selectedHistoryItem}
        isEditing={vm.isEditingReport}
        editedText={vm.editedReportText}
        editedFeedback={vm.editedTeacherFeedback}
        onEditToggle={vm.setIsEditingReport}
        onEditText={vm.setEditedReportText}
        onEditFeedback={vm.setEditedTeacherFeedback}
        onSave={vm.saveEditedHistory}
        onSend={vm.sendHistoryToStudent}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          showToast('Evaluation text copied to clipboard.', 'success');
        }}
        onReturn={handleHistoryDetailsClose}
        onClose={handleHistoryDetailsClose}
      />
    </div>
  );
}

export default TeacherDashboardPage;
