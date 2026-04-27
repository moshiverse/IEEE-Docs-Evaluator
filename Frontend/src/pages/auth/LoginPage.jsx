import { supabase } from '../../supabaseClient';
import loginBackground from '../../assets/CIT-U.jpeg';
import appLogo from '../../assets/logo.png';
import '../../styles/pages/login.css';

function Login({ authError }) {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
  };

  const isUnauthorized = authError && (
    authError.toLowerCase().includes('unauthorized') ||
    authError.toLowerCase().includes('not on the class') ||
    authError.toLowerCase().includes('allowlist') ||
    authError.toLowerCase().includes('403') ||
    authError.toLowerCase().includes('forbidden') ||
    authError.toLowerCase().includes('access denied')
  );

  return (
    <div className="login-wrapper">
      <div className="login-left" style={{ backgroundImage: `url(${loginBackground})` }}>
        <div className="login-left-overlay">
          <div className="secure-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Secure Authentication
          </div>

          <div className="hero-text-container">
            <h1 className="hero-title">IEEE 1058 Standard Compliant</h1>
            <p className="hero-subtitle">
              Evaluate and validate your software project documentation against the IEEE 1058 standard. Get instant compliance feedback and detailed reports.
            </p>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">01</div>
                <div>
                  <div className="feature-title">Fast Access</div>
                  <div className="feature-desc">Quick sign-in process</div>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">02</div>
                <div>
                  <div className="feature-title">Secure</div>
                  <div className="feature-desc">Protected by Google</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-container">
          <div className="app-logo-container">
            <img src={appLogo} alt="IEEE Docs Evaluator logo" className="app-logo-image" />
          </div>

          <h2 className="login-title">IEEE Docs Evaluator</h2>
          <p className="login-subtitle">Sign in to continue to your workspace</p>

          {authError && (
            <div className={`auth-alert ${isUnauthorized ? 'auth-alert--unauthorized' : 'auth-alert--error'}`}>
              <div className="auth-alert__icon-row">
                {isUnauthorized ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                )}
                <span className="auth-alert__title">
                  {isUnauthorized ? 'Access Denied' : 'Sign-in Error'}
                </span>
              </div>
              <p className="auth-alert__body">
                {isUnauthorized
                  ? 'Your Google account is not registered in the class allowlist. Contact your professor to be added.'
                  : authError}
              </p>
              {isUnauthorized && (
                <p className="auth-alert__hint">
                  Make sure you are using your Gmail address from the class list.
                </p>
              )}
            </div>
          )}

          <button className="google-btn" onClick={handleGoogleLogin}>
            <img src="https://www.google.com/favicon.ico" alt="Google" className="google-icon" />
            Continue with Gmail
          </button>

          <ul className="benefits-list">
            <li>
              <span className="benefit-icon purple">01</span>
              Google-verified secure authentication
            </li>
            <li>
              <span className="benefit-icon pink">02</span>
              Access all features instantly
            </li>
            <li>
              <span className="benefit-icon orange">03</span>
              Your data is encrypted and protected
            </li>
          </ul>

          <p className="terms-text">
            Sign in with your verified Google account to access your IEEE Docs Evaluator workspace.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;