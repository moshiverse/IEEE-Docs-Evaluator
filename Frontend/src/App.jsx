import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { verifyStudentWithBackend } from './api'; 
import Login from './pages/auth/LoginPage';
import Home from './Home';
import TeacherDashboard from './pages/teacher/TeacherDashboardPage';
import LoadingScreen from './components/common/LoadingScreen';

function App() {
  const [studentData, setStudentData] = useState(null);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Listen for authentication state changes (Sign In / Sign Out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      
      if (event === 'SIGNED_IN' && currentSession) {
        setIsVerifying(true);
        setAuthError('');
        
        try {
          // 1. Extract Google metadata from Supabase session
          const googleEmail = currentSession.user.email; 
          
          // 2. Knock on Spring Boot's door to verify and get the Role Flag
          const data = await verifyStudentWithBackend(googleEmail);
          
          // 3. Store the full record (Name, Section, Group, and Role)
          setStudentData(data); 
          
        } catch (error) {
          console.error("Verification failed:", error);
          setAuthError(error.message);
          
          // If backend rejects them, sign them out of Supabase immediately
          await supabase.auth.signOut();
          setStudentData(null);
        } finally {
          setIsVerifying(false);
        }
      } else if (event === 'SIGNED_OUT') {
        // Clean up local state on logout
        setStudentData(null);
        setAuthError('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Display a loading screen while the backend is checking the Google Sheet/VIP list
  if (isVerifying) {
    return (
      <LoadingScreen
        title="Verifying Credentials..."
        subtitle="Syncing with Google Services"
      />
    );
  }

  /**
   * ROUTING LOGIC:
   * 1. If no studentData -> Show Login screen.
   * 2. If studentData exists AND role is TEACHER -> Show TeacherDashboard.
   * 3. If studentData exists AND role is STUDENT -> Show Home (Student View).
   */
  return (
    <div className="app-container">
      {studentData ? (
        studentData.role === 'TEACHER' ? (
          <TeacherDashboard user={studentData} />
        ) : (
          <Home studentData={studentData} />
        )
      ) : (
        <Login authError={authError} />
      )}
    </div>
  );
}

export default App;