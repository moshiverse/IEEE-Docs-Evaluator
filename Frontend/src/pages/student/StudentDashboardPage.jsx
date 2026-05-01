import { useState } from 'react';
import PanelHeader from '../../components/common/PanelHeader';
import StudentReportModal from '../../components/student/StudentReportModal';
import StudentReportsTable from '../../components/student/StudentReportsTable';
import StudentSidebar from '../../components/student/StudentSidebar';
import TutorialOverlay from '../../components/common/TutorialOverlay';
import { useStudentReports } from '../../hooks/useStudentReports';
import { useTutorial } from '../../hooks/useTutorial';
import { studentTutorialSteps } from '../../tutorials/studentTutorial';
import { TUTORIAL_TYPES } from '../../tutorials/tutorialConfig';
import '../../styles/pages/student-dashboard.css';
import '../../styles/components/layout.css';
import '../../styles/components/tutorial.css';
import { getStudentReportById } from '../../api'

function StudentDashboardPage({ studentData }) {
  const vm = useStudentReports(studentData.groupCode);
  const tutorial = useTutorial({
    tutorialType: TUTORIAL_TYPES.STUDENT,
    userKey: studentData?.email || studentData?.googleEmail || studentData?.studentName,
    maxRuns: 2,
    autoStart: true,
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

async function handleOpenReport(reportSummary) {
    vm.markViewed(reportSummary.id);
    
    try {
      setIsFetchingDetails(true);
      // Fetch the full report with images
      const fullReport = await getStudentReportById(reportSummary.id);
      setSelectedReport(fullReport);
    } catch (error) {
      console.error("Failed to load report images", error);
      // Fallback: show what we have, but images will be missing
      setSelectedReport(reportSummary); 
    } finally {
      setIsFetchingDetails(false);
    }
  }

  return (
    <div className="layout layout--student">
      <StudentSidebar
        studentData={studentData}
        teamMembers={vm.teamMembers}
        onTutorialStart={tutorial.startTutorial}
      />

      <TutorialOverlay
        steps={studentTutorialSteps}
        run={tutorial.isTutorialOpen}
        stepIndex={tutorial.currentStepIndex}
        onNext={() => tutorial.nextStep(studentTutorialSteps.length)}
        onPrev={tutorial.prevStep}
        onClose={tutorial.closeTutorial}
      />

      <main className="layout__main">
        <PanelHeader
          title="My Team Evaluations"
          subtitle="View feedback sent by your professor."
          actions={
            <div className="student-header-actions">
              <input
                type="search"
                className="student-header-search"
                placeholder="Search evaluations"
                value={vm.searchQuery}
                onChange={(e) => vm.setSearchQuery(e.target.value)}
                aria-label="Search evaluations"
              />
              <button className="btn btn--primary" onClick={vm.refresh} disabled={vm.loading}>
                {vm.loading ? 'Checking...' : 'Check for Updates'}
              </button>
            </div>
          }
        />

        <section className="student-stats" aria-label="Evaluation summary">
          <div className="student-stats__total">
            <span className="student-stats__total-count">{vm.allReportCount}</span>
            <span className="student-stats__total-label">Total Evaluations</span>
          </div>
          <div className="student-stats__divider" />
          <div className="student-stats__docs">
            {vm.docStats.map((doc) => (
              <div key={doc.type} className="student-stats__doc">
                <span className="student-stats__doc-type">{doc.type}</span>
                <span className="student-stats__doc-count">{doc.count}</span>
              </div>
            ))}
          </div>
        </section>

        <nav className="student-doc-tabs" aria-label="Filter by document type">
          <button
            type="button"
            className={`student-doc-tab${vm.selectedDocType === '' ? ' student-doc-tab--active' : ''}`}
            onClick={() => vm.setSelectedDocType('')}
          >
            All
          </button>
          {vm.docTypes.map((dt) => (
            <button
              key={dt}
              type="button"
              className={`student-doc-tab${vm.selectedDocType === dt ? ' student-doc-tab--active' : ''}`}
              onClick={() => vm.setSelectedDocType(dt)}
            >
              {dt}
            </button>
          ))}
        </nav>

        <div className="card">
          <StudentReportsTable
            reports={vm.reports}
            loading={vm.loading}
            viewedIds={vm.viewedIds}
            onOpen={handleOpenReport}
          />
        </div>
      </main>

      <StudentReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}

export default StudentDashboardPage;
