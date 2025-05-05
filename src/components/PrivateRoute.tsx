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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!user) {
    // Save the attempted URL for redirecting after login
    return <Navigate to={config.app.routes.login} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;