import React, { useState } from 'react';
import { useRosieAuth } from './RosieAuthContext';
import './rosie.css';

type AuthView = 'welcome' | 'signin' | 'magic-link-sent' | 'signup-name' | 'signup-baby';

interface RosieAuthProps {
  onComplete: () => void;
}

export const RosieAuth: React.FC<RosieAuthProps> = ({ onComplete }) => {
  const {
    user,
    profile,
    babies,
    loading,
    error,
    signInWithMagicLink,
    signInWithGoogle,
    createProfile,
    addBaby,
    clearError,
  } = useRosieAuth();

  const [view, setView] = useState<AuthView>('welcome');
  const [email, setEmail] = useState('');
  const [parentName, setParentName] = useState('');
  const [babyName, setBabyName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // If user is signed in and has profile and babies, complete
  React.useEffect(() => {
    if (user && profile && babies.length > 0) {
      onComplete();
    } else if (user && !profile) {
      setView('signup-name');
    } else if (user && profile && babies.length === 0) {
      setView('signup-baby');
    }
  }, [user, profile, babies, onComplete]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalLoading(true);

    const result = await signInWithMagicLink(email);

    if (result.success) {
      setView('magic-link-sent');
    } else {
      setLocalError(result.error || 'Failed to send magic link');
    }

    setLocalLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    const result = await signInWithGoogle();
    if (!result.success) {
      setLocalError(result.error || 'Failed to sign in with Google');
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalLoading(true);

    const result = await createProfile(parentName);

    if (result.success) {
      setView('signup-baby');
    } else {
      setLocalError(result.error || 'Failed to create profile');
    }

    setLocalLoading(false);
  };

  const handleAddBaby = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalLoading(true);

    const result = await addBaby({
      name: babyName,
      birthDate,
    });

    if (result.success) {
      onComplete();
    } else {
      setLocalError(result.error || 'Failed to add baby');
    }

    setLocalLoading(false);
  };

  const displayError = localError || error;

  // Welcome Screen
  if (view === 'welcome') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card">
          <div className="rosie-auth-logo">
            <span className="rosie-auth-logo-icon">🌸</span>
            <h1 className="rosie-auth-logo-text">Rosie</h1>
          </div>

          <p className="rosie-auth-tagline">
            Calm technology for chaotic moments
          </p>

          <p className="rosie-auth-description">
            Track feeds, sleep, and diapers. Get personalized developmental insights.
            All with the support of expert-backed guidance.
          </p>

          {/* Sign In Section */}
          <div className="rosie-auth-section">
            <h2 className="rosie-auth-section-title">Sign In</h2>
            <button
              className="rosie-auth-btn rosie-auth-btn-primary"
              onClick={() => setView('signin')}
            >
              Sign in with Email
            </button>
          </div>

          <div className="rosie-auth-divider">
            <span>or</span>
          </div>

          {/* Sign Up Section */}
          <div className="rosie-auth-section">
            <h2 className="rosie-auth-section-title">New to Rosie?</h2>
            <button
              className="rosie-auth-btn rosie-auth-btn-google"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="rosie-auth-google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
            </button>
            <button
              className="rosie-auth-btn rosie-auth-btn-secondary"
              onClick={() => setView('signin')}
            >
              Sign up with Email
            </button>
          </div>

          <p className="rosie-auth-footer">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    );
  }

  // Sign In with Email
  if (view === 'signin') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card">
          <button
            className="rosie-auth-back"
            onClick={() => { setView('welcome'); clearError(); setLocalError(null); }}
          >
            ← Back
          </button>

          <h1 className="rosie-auth-title">Sign in with email</h1>
          <p className="rosie-auth-subtitle">
            We'll send you a magic link - no password needed
          </p>

          {displayError && (
            <div className="rosie-auth-error">
              {displayError}
            </div>
          )}

          <form onSubmit={handleMagicLink} className="rosie-auth-form">
            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rosie-auth-input"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="rosie-auth-btn rosie-auth-btn-primary"
              disabled={localLoading || loading || !email}
            >
              {localLoading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>

          <div className="rosie-auth-divider">
            <span>or</span>
          </div>

          <button
            className="rosie-auth-btn rosie-auth-btn-google"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="rosie-auth-google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  // Magic Link Sent
  if (view === 'magic-link-sent') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card rosie-auth-card-centered">
          <div className="rosie-auth-success-icon">✉️</div>

          <h1 className="rosie-auth-title">Check your email</h1>
          <p className="rosie-auth-subtitle">
            We sent a magic link to <strong>{email}</strong>
          </p>
          <p className="rosie-auth-description">
            Click the link in the email to sign in. You can close this window.
          </p>

          <button
            className="rosie-auth-btn rosie-auth-btn-secondary"
            onClick={() => { setView('signin'); setEmail(''); }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  // Signup Step 1: Parent Name
  if (view === 'signup-name') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card">
          <div className="rosie-auth-progress">
            <div className="rosie-auth-progress-step active">1</div>
            <div className="rosie-auth-progress-line"></div>
            <div className="rosie-auth-progress-step">2</div>
          </div>

          <h1 className="rosie-auth-title">What should we call you?</h1>
          <p className="rosie-auth-subtitle">
            This is how Rosie will greet you
          </p>

          {displayError && (
            <div className="rosie-auth-error">
              {displayError}
            </div>
          )}

          <form onSubmit={handleCreateProfile} className="rosie-auth-form">
            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Your name</label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g., Sarah, Mom, Mama"
                className="rosie-auth-input"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="rosie-auth-btn rosie-auth-btn-primary"
              disabled={localLoading || !parentName.trim()}
            >
              {localLoading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Signup Step 2: Add Baby
  if (view === 'signup-baby') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card">
          <div className="rosie-auth-progress">
            <div className="rosie-auth-progress-step completed">✓</div>
            <div className="rosie-auth-progress-line active"></div>
            <div className="rosie-auth-progress-step active">2</div>
          </div>

          <h1 className="rosie-auth-title">Tell us about your little one</h1>
          <p className="rosie-auth-subtitle">
            We'll personalize everything for their age
          </p>

          {displayError && (
            <div className="rosie-auth-error">
              {displayError}
            </div>
          )}

          <form onSubmit={handleAddBaby} className="rosie-auth-form">
            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Baby's name</label>
              <input
                type="text"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                placeholder="e.g., Emma"
                className="rosie-auth-input"
                required
                autoFocus
              />
            </div>

            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Date of birth</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="rosie-auth-input"
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <button
              type="submit"
              className="rosie-auth-btn rosie-auth-btn-primary"
              disabled={localLoading || !babyName.trim() || !birthDate}
            >
              {localLoading ? 'Setting up...' : 'Start Using Rosie'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
};

export default RosieAuth;
