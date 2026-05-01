export const studentTutorialSteps = [
  {
    target: null,
    center: true,
    content: 'Quick tour: you can tap anywhere on the screen to move to the next step.',
  },
  {
    target: '.student-sidebar',
    center: true,
    content: 'Welcome! This is your Student Workspace. Use this sidebar to access your info and sign out.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '.student-profile',
    content: 'Your profile and section details appear here for quick reference.',
    placement: 'right',
  },
  {
    target: '.student-detail',
    content: 'This is your Team Code. Share this with your professor to link your submissions.',
    placement: 'right',
  },
  {
    target: '.student-members',
    content: 'This is the list of your team members. Contact your professor if there are any changes needed.',
    placement: 'right',
  },
  {
    target: '.student-header-search',
    content: 'Search for a specific evaluation by file name or keyword.',
    placement: 'bottom',
  },
  {
    target: '.student-doc-tabs',
    content: 'Filter evaluations by document type. Choose "All" to see everything.',
    placement: 'bottom',
  },
  {
    target: '.student-stats',
    content: 'See total evaluations and counts by document type at a glance.',
    placement: 'top',
  },
  {
    target: '.layout--student .app-table',
    content: 'Your evaluation reports appear here. Open any report to view feedback and annotations.',
    placement: 'top',
  },
  {
    target: '.student-sidebar__signout',
    content: 'You can sign out here when you are done.',
    placement: 'top',
  },
];
