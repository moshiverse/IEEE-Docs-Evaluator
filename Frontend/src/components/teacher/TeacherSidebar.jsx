import { signOut } from '../../services/authService';

const NAV_ITEMS = [
  { key: 'submissions', label: 'Student Submissions' },
  { key: 'reports', label: 'AI Reports' },
  { key: 'settings', label: 'System Settings' },
];

function TeacherSidebar({ currentView, onNavigate }) {
  return (
    <aside className="teacher-sidebar">
      <div className="teacher-sidebar__brand">IEEE Docs Evaluator</div>
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

      <button className="btn btn--ghost teacher-sidebar__signout" onClick={signOut}>
        Sign Out
      </button>
    </aside>
  );
}

export default TeacherSidebar;
