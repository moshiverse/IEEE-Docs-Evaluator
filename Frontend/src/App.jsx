import { useEffect, useRef, useState } from 'react';
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

  // A ref is always current inside the onAuthStateChange closure,
  // unlike state which gets captured at the time the effect runs.
  const isVerifiedRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      
      if (event === 'SIGNED_IN' && currentSession) {

        // isVerifiedRef.current is always the latest value — no stale closure.
        // If already verified, Supabase is just silently refreshing the JWT
        // on tab focus. Do nothing so the dashboard is never unmounted.
        if (isVerifiedRef.current) return;

        setIsVerifying(true);
        setAuthError('');
        
        try {
          const googleEmail = currentSession.user.email; 
          const data = await verifyStudentWithBackend(googleEmail);
          isVerifiedRef.current = true;  // mark verified before setting state
          setStudentData(data); 
        } catch (error) {
          console.error("Verification failed:", error);
          setAuthError(error.message);
          isVerifiedRef.current = false;
          await supabase.auth.signOut();
          setStudentData(null);
        } finally {
          setIsVerifying(false);
        }

      } else if (event === 'SIGNED_OUT') {
        // Reset everything on explicit sign out
        isVerifiedRef.current = false;
        setStudentData(null);
        setAuthError('');
      }
    });

    return () => subscription.unsubscribe();
  }, []); // empty dep array is correct — the ref keeps the closure fresh

  if (isVerifying) {
    return (
      <LoadingScreen
        title="Verifying Credentials..."
        subtitle="Syncing with Google Services"
      />
    );
  }

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