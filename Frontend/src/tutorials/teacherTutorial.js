export const teacherTutorialSteps = [
  {
    target: null,
    center: true,
    content: 'Quick tour: you can tap anywhere on the screen to move to the next step.',
  },
  {
    target: '.teacher-sidebar',
    center: true,
    content: 'Welcome! This is your Teacher Workspace. Use the sidebar to switch between views.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '.teacher-sidebar__nav .nav-btn:nth-child(1)',
    content: 'Student Submissions: review incoming documents and run AI analysis for each file.',
    placement: 'right',
  },
  {
    target: '.teacher-sidebar__nav .nav-btn:nth-child(2)',
    content: 'AI Reports: browse saved evaluations and resend or delete reports as needed.',
    placement: 'right',
  },
  {
    target: '.teacher-sidebar__nav .nav-btn:nth-child(3)',
    content: 'Professor Workspace: manage workspace tools and focus areas for analysis.',
    placement: 'right',
  },
  {
    target: '.teacher-sidebar__nav .nav-btn:nth-child(4)',
    content: 'System Settings: update API keys, tracker mappings, and evaluation configs.',
    placement: 'right',
  },
  {
    target: '.teacher-header-search',
    content: 'Quickly search submissions by student, team, section, or document type.',
    placement: 'bottom',
  },
  {
    target: '.teacher-filter-panel',
    content: 'Filter submissions by section, team code, and document type to focus your review.',
    placement: 'left',
  },
  {
    target: '#teacher-submission-table',
    content: 'All incoming submissions are listed here. Use the action button to run AI analysis.',
    placement: 'top',
  },
  {
    target: '.teacher-sidebar__signout',
    content: 'Sign out here when you finish your session.',
    placement: 'top',
  },
];
