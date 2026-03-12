import { signOut } from '../../services/authService';

function StudentSidebar({ studentData, teamMembers = [] }) {
  return (
    <aside className="student-sidebar">
      <div className="student-sidebar__brand">IEEE Docs Evaluator</div>
      <p className="student-sidebar__caption">Student Workspace</p>

      <div className="student-profile">
        <h4 className="student-profile__name">{studentData.studentName}</h4>
        <span className="student-profile__meta">{studentData.section}</span>
      </div>

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

      <button className="btn btn--ghost student-sidebar__signout" onClick={signOut}>
        Sign Out
      </button>
    </aside>
  );
}

export default StudentSidebar;
