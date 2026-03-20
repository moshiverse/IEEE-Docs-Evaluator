import { supabase } from '../../supabaseClient';
import '../../styles/pages/login.css';

function Login({ authError }) {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  };

  return (
    <div className="login-wrapper">
      {/* Left Side - Image & Marketing Copy */}
      <div className="login-left">
        <div className="login-left-overlay">
          <div className="secure-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Secure Authentication
          </div>
          
          <div className="hero-text-container">
            <h1 className="hero-title">IEEE 1058 Standard Compliant</h1>
            <p className="hero-subtitle">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">✨</div>
                <div>
                  <div className="feature-title">Fast Access</div>
                  <div className="feature-desc">Quick sign-in process</div>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <div>
                  <div className="feature-title">Secure</div>
                  <div className="feature-desc">Protected by Google</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right">
        <div className="login-form-container">
          <div className="app-logo-container">
            <div className="app-logo">✨</div>
            <div className="logo-dot"></div>
          </div>
          
          <h2 className="login-title">IEEE Docs Evaluator</h2>
          <p className="login-subtitle">Sign in to continue to your workspace</p>

          {/* Your existing error handling */}
          {authError && (
            <div className="auth-error">
              <strong>Access Denied:</strong> {authError}
            </div>
          )}

          {/* Your existing login function triggered here */}
          <button className="google-btn" onClick={handleGoogleLogin}>
            <img src="https://www.google.com/favicon.ico" alt="Google" className="google-icon" />
            Continue with Gmail
          </button>

          <ul className="benefits-list">
            <li>
              <span className="benefit-icon purple">🛡️</span>
              Google-verified secure authentication
            </li>
            <li>
              <span className="benefit-icon pink">✨</span>
              Access all features instantly
            </li>
            <li>
              <span className="benefit-icon orange">🔒</span>
              Your data is encrypted and protected
            </li>
          </ul>

          <p className="terms-text">
            By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;