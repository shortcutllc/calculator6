import React, { useEffect } from 'react';
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

function App() {
  const location = useLocation();
  const isSharedView = location.pathname.startsWith('/shared/') || (location.pathname.startsWith('/proposal/') && location.search.includes('shared=true'));

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
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
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
                <Route path="*" element={<Navigate to={config.app.routes.home} replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </ProposalProvider>
    </AuthProvider>
  );
}

export default App;