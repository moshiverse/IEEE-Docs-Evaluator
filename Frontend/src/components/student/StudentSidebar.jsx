import { signOut } from '../../services/authService';
import TutorialButton from '../common/TutorialButton';
import { useTheme } from '../../hooks/useTheme';
import appLogo from '../../assets/logo.png';

function StudentSidebar({ studentData, teamMembers = [], onTutorialStart }) {
  const { themeMode, setThemeMode } = useTheme();
  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const themeIcon = themeMode === 'dark' ? (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M12 4.5V2m0 20v-2.5m7.5-7.5H22M2 12h2.5m12.02-5.52 1.77-1.77M5.71 18.29l1.77-1.77m0-9.05L5.71 5.71m12.79 12.58-1.77-1.77"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M21 14.5A7.5 7.5 0 1 1 9.5 3a6.5 6.5 0 1 0 11.5 11.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
  return (
    <aside className="student-sidebar">
      <div className="student-sidebar__brand">
        <img src={appLogo} alt="IEEE Docs Evaluator logo" className="student-sidebar__brand-logo" />
        <span>IEEE Docs Evaluator</span>
      </div>
      <p className="student-sidebar__caption">Student Workspace</p>

      <div className="student-profile">
        <h4 className="student-profile__name">{studentData.studentName}</h4>
        <span className="student-profile__meta">{studentData.section}</span>
      </div>

            <button
        type="button"
        className="btn btn--ghost student-sidebar__theme-toggle"
        onClick={toggleTheme}
        aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span className="student-sidebar__theme-icon" aria-hidden="true">
          {themeIcon}
        </span>
        <span className="student-sidebar__theme-label">
          {themeMode === 'dark' ? 'Light' : 'Dark'}
        </span>
      </button>
      
      <div className="student-detail">
        <span className="student-detail__key">Team Code</span>
        <span className="student-detail__value">{studentData.groupCode}</span>
      </div>

      {teamMembers.length > 0 && (
        <div className="student-members">
          <p className="student-members__title">Team Members ({teamMembers.length})</p>
          <ul className="student-members__list">
            {teamMembers.map((m) => (
              <li
                key={m.studentName}
                className={`student-members__item${
                  m.studentName === studentData.studentName ? ' student-members__item--you' : ''
                }`}
              >
                <span className="student-members__dot" />
                <span className="student-members__name">{m.studentName}</span>
                {m.studentName === studentData.studentName && (
                  <span className="student-members__you-tag">You</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="student-sidebar__spacer" />

      {onTutorialStart && (
        <TutorialButton onClick={onTutorialStart} label="Quick Tutorial" />
      )}

      <button className="btn btn--ghost student-sidebar__signout" onClick={signOut}>
        Sign Out
      </button>
    </aside>
  );
}

export default StudentSidebar;
