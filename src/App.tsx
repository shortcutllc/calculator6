import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Home from './components/Home';
import History from './components/History';
import ProposalViewer from './components/ProposalViewer';
import { StandaloneProposalViewer } from './components/StandaloneProposalViewer';
import Calculator from './components/Calculator';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import EmployeeGallery from './components/EmployeeGallery';
import ManagerGallery from './components/ManagerGallery';
import PhotographerDashboard from './components/PhotographerDashboard';
import PhotographerEventManager from './components/PhotographerEventManager';
import { HeadshotsPage } from './components/HeadshotsPage';
import { CustomUrlResolver } from './components/CustomUrlResolver';
import { ProposalProvider } from './contexts/ProposalContext';
import { HolidayPageProvider } from './contexts/HolidayPageContext';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import { testSupabaseConnection } from './lib/supabaseClient';
import { Navigation } from './components/Navigation';
import { config } from './config';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load components
const BrochurePage = lazy(() => import('./components/BrochurePage'));
const PDFViewer = lazy(() => import('./components/PDFViewer'));
const HolidayProposal = lazy(() => import('./components/HolidayProposal'));
const HolidayPageManager = lazy(() => import('./components/HolidayPageManager'));

function App() {
  const location = useLocation();
  const isSharedView = location.pathname.startsWith('/shared/') || 
    (location.pathname.startsWith('/proposal/') && location.search.includes('shared=true')) ||
    location.pathname === '/brochure' ||
    (location.pathname.startsWith('/brochures/') && location.search.includes('shared=true')) ||
    location.pathname.startsWith('/gallery/') ||
    location.pathname.startsWith('/manager/') ||
    location.pathname.startsWith('/photographer/') ||
    location.pathname === '/holiday-proposal' ||
    location.pathname.startsWith('/holiday-page/') ||
    location.pathname === '/holiday2025';

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
        <HolidayPageProvider>
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
                path="/calculator"
                element={
                  <PrivateRoute>
                    <Calculator />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/headshots"
                element={
                  <PrivateRoute>
                    <HeadshotsPage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/admin"
                element={
                  <PrivateRoute>
                    <AdminDashboard />
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
                path="/gallery/:token"
                element={<EmployeeGallery />}
              />
              <Route 
                path="/manager/:token"
                element={<ManagerGallery />}
              />
              <Route 
                path="/photographer/:token"
                element={<PhotographerDashboard />}
              />
              <Route 
                path="/photographer/:token/event/:eventId"
                element={<PhotographerEventManager />}
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
                path="/holiday-proposal"
                element={
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <LoadingSpinner size="large" />
                    </div>
                  }>
                    <HolidayProposal />
                  </Suspense>
                }
              />
              <Route 
                path="/holiday-page/:id"
                element={
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <LoadingSpinner size="large" />
                    </div>
                  }>
                    <HolidayProposal />
                  </Suspense>
                }
              />
              <Route 
                path="/holiday2025"
                element={
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <LoadingSpinner size="large" />
                    </div>
                  }>
                    <HolidayProposal isGeneric={true} />
                  </Suspense>
                }
              />
              <Route 
                path="/holiday-pages"
                element={
                  <PrivateRoute>
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <LoadingSpinner size="large" />
                      </div>
                    }>
                      <HolidayPageManager />
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
              
              {/* Custom URL Routes */}
              <Route
                path="/:client/:type/:slug"
                element={
                  <CustomUrlResolver>
                    <div>Redirecting...</div>
                  </CustomUrlResolver>
                }
              />
              
              <Route path="*" element={<Navigate to={config.app.routes.home} replace />} />
            </Routes>
          </main>
        </div>
        </HolidayPageProvider>
      </ProposalProvider>
    </AuthProvider>
  );
}

export default App;