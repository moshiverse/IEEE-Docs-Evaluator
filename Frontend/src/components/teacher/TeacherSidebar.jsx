import { signOut } from '../../services/authService';
import TutorialButton from '../common/TutorialButton';
import { useTheme } from '../../hooks/useTheme';
import appLogo from '../../assets/logo.png';

const NAV_ITEMS = [
  { key: 'submissions', label: 'Student Submissions' },
  { key: 'reports',     label: 'AI Reports' },
  { key: 'workspace',   label: 'Professor Workspace' },
  { key: 'settings',    label: 'System Settings' },
];

function TeacherSidebar({ currentView, onNavigate, onTutorialStart }) {
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
    <aside className="teacher-sidebar">
      <div className="teacher-sidebar__brand">
        <img src={appLogo} alt="IEEE Docs Evaluator logo" className="teacher-sidebar__brand-logo" />
        <span>IEEE Docs Evaluator</span>
      </div>
      <p className="teacher-sidebar__caption">Teacher Workspace</p>

      <nav className="teacher-sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`nav-btn ${currentView === item.key ? 'nav-btn--active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="teacher-sidebar__spacer" />

      {onTutorialStart && (
        <TutorialButton onClick={onTutorialStart} label="Quick Tutorial" />
      )}

      <button className="btn btn--ghost teacher-sidebar__signout" onClick={signOut}>
        Sign Out
      </button>
    </aside>
  );
}

export default TeacherSidebar;