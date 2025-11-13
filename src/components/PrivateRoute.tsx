import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import { config } from '../config';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Log routing information in development
    if (config.env.DEV) {
      console.log('PrivateRoute:', {
        path: location.pathname,
        authenticated: !!user,
        loading
      });
    }
  }, [location.pathname, user, loading]);

  // Always wait for auth to finish loading before making routing decisions
  // This ensures we don't allow access before auth check completes
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Only redirect to login if we've finished loading and there's no user
  // This handles both direct navigation and hard refresh scenarios
  if (!user) {
    // Save the attempted URL for redirecting after login
    if (config.env.DEV) {
      console.log('Redirecting to login from:', location.pathname);
    }
    return <Navigate to={config.app.routes.login} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;