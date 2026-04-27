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

  const isVerifiedRef = useRef(false);
  const pendingErrorRef = useRef(''); // holds error across the SIGNED_OUT event

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {

      if (event === 'SIGNED_IN' && currentSession) {

        if (isVerifiedRef.current) return;

        // If we're returning to login after a failed attempt, clear pending error
        pendingErrorRef.current = '';
        setAuthError('');
        setIsVerifying(true);

        try {
          const googleEmail = currentSession.user.email;
          const data = await verifyStudentWithBackend(googleEmail);
          isVerifiedRef.current = true;
          setStudentData(data);
        } catch (error) {
          console.error('Verification failed:', error);

          const msg = error.message || '';
          const isUnauthorized =
            msg.includes('403') ||
            msg.toLowerCase().includes('unauthorized') ||
            msg.toLowerCase().includes('not on the class') ||
            msg.toLowerCase().includes('forbidden') ||
            msg.toLowerCase().includes('access denied');

          const errorToShow = isUnauthorized
            ? 'Unauthorized: Your Google account is not on the Class Allowlist. Please contact your professor.'
            : msg || 'An unexpected error occurred. Please try again.';

          // Store in ref BEFORE signing out — the SIGNED_OUT handler will restore it
          pendingErrorRef.current = errorToShow;
          isVerifiedRef.current = false;

          await supabase.auth.signOut();
          // After signOut resolves, the SIGNED_OUT event has already fired.
          // Restore the error now.
          setStudentData(null);
          setAuthError(errorToShow);

        } finally {
          setIsVerifying(false);
        }

      } else if (event === 'SIGNED_OUT') {
        isVerifiedRef.current = false;
        setStudentData(null);

        if (pendingErrorRef.current) {
          // Restore the pending error — do NOT clear it
          setAuthError(pendingErrorRef.current);
          // Don't reset pendingErrorRef here; let the next SIGNED_IN clear it
        } else {
          // Normal manual sign-out: clear everything
          setAuthError('');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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