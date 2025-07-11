import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Home from './components/Home';
import History from './components/History';
import ProposalViewer from './components/ProposalViewer';
import { StandaloneProposalViewer } from './components/StandaloneProposalViewer';
import Login from './components/Login';
import Register from './components/Register';
import { ProposalProvider } from './contexts/ProposalContext';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import { testSupabaseConnection } from './lib/supabaseClient';
import { Navigation } from './components/Navigation';
import { config } from './config';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load components
const BrochurePage = lazy(() => import('./components/BrochurePage'));
const PDFViewer = lazy(() => import('./components/PDFViewer'));

function App() {
  const location = useLocation();
  const isSharedView = location.pathname.startsWith('/shared/') || 
    (location.pathname.startsWith('/proposal/') && location.search.includes('shared=true')) ||
    location.pathname === '/brochure' ||
    (location.pathname.startsWith('/brochures/') && location.search.includes('shared=true'));

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const connected = await testSupabaseConnection();
        if (!connected) {
          console.error('Failed to establish connection to Supabase after multiple attempts');
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <AuthProvider>
      <ProposalProvider>
        <div className="min-h-screen flex flex-col bg-gray-100">
          {!isSharedView && <Navigation />}
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path={config.app.routes.login} element={<Login />} />
              <Route path={config.app.routes.register} element={<Register />} />
              <Route 
                path={config.app.routes.home}
                element={
                  <PrivateRoute>
                    <Home />
                  </PrivateRoute>
                } 
              />
              <Route 
                path={config.app.routes.history}
                element={
                  <PrivateRoute>
                    <History />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/proposal/:id"
                element={
                  location.search.includes('shared=true') ? (
                    <StandaloneProposalViewer />
                  ) : (
                    <PrivateRoute>
                      <ProposalViewer />
                    </PrivateRoute>
                  )
                } 
              />
              <Route 
                path="/shared/:id"
                element={<StandaloneProposalViewer />}
              />
              <Route
                path="/brochure"
                element={
                  <PrivateRoute>
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <LoadingSpinner size="large" />
                      </div>
                    }>
                      <BrochurePage />
                    </Suspense>
                  </PrivateRoute>
                }
              />
              <Route
                path="/brochures/:name"
                element={
                  location.search.includes('shared=true') ? (
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <LoadingSpinner size="large" />
                      </div>
                    }>
                      <PDFViewer />
                    </Suspense>
                  ) : (
                    <PrivateRoute>
                      <Suspense fallback={
                        <div className="min-h-screen flex items-center justify-center">
                          <LoadingSpinner size="large" />
                        </div>
                      }>
                        <PDFViewer />
                      </Suspense>
                    </PrivateRoute>
                  )
                }
              />
              <Route path="*" element={<Navigate to={config.app.routes.home} replace />} />
            </Routes>
          </main>
        </div>
      </ProposalProvider>
    </AuthProvider>
  );
}

export default App;