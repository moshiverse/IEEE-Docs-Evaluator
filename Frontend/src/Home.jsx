import StudentDashboardPage from './pages/student/StudentDashboardPage';

function Home({ studentData }) {
  return <StudentDashboardPage studentData={studentData} />;
}

export default Home;