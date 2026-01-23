import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Home from './components/Home';
import History from './components/History';
import ProposalViewer from './components/ProposalViewer';
import { ProposalTypeRouter } from './components/ProposalTypeRouter';
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
import { SocialMediaPageProvider } from './contexts/SocialMediaPageContext';
import { QRCodeSignProvider } from './contexts/QRCodeSignContext';
import { GenericLandingPageProvider } from './contexts/GenericLandingPageContext';
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
const SocialMediaProposal = lazy(() => import('./components/SocialMediaProposal'));
const SocialMediaPageManager = lazy(() => import('./components/SocialMediaPageManager'));
const QRCodeSignManager = lazy(() => import('./components/QRCodeSignManager'));
const QRCodeSignDisplay = lazy(() => import('./components/QRCodeSignDisplay'));
const MindfulnessProgramManager = lazy(() => import('./components/MindfulnessProgramManager'));
const GenericLandingPageManager = lazy(() => import('./components/GenericLandingPageManager'));
const GenericLandingPage = lazy(() => import('./components/GenericLandingPage'));
const Plan2026 = lazy(() => import('./components/Plan2026'));

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
    location.pathname === '/holiday-generic' ||
    location.pathname === '/holiday2025' ||
    location.pathname === '/social-media/linkedin' ||
    location.pathname === '/social-media/meta' ||
    location.pathname === '/social-media-pages/linkedin' ||
    location.pathname === '/social-media-pages/meta' ||
    location.pathname.startsWith('/qr-code-sign/') ||
    location.pathname.startsWith('/generic-landing-page/') ||
    location.pathname === '/corporatepartnerships' ||
    location.pathname === '/2026-plan';

  useEffect(() => {
    // Non-blocking initialization - don't await or block rendering
    const initializeApp = async () => {
      try {
        // Use setTimeout to ensure this doesn't block initial render
        setTimeout(async () => {
        const connected = await testSupabaseConnection();
        if (!connected) {
          console.error('Failed to establish connection to Supabase after multiple attempts');
        }
        }, 100);
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
                path="/mindfulness-programs"
                element={
                  <PrivateRoute>
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <LoadingSpinner size="large" />
                      </div>
                    }>
                      <MindfulnessProgramManager />
                    </Suspense>
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
                    <ProposalTypeRouter />
                  ) : (
                    <PrivateRoute>
                      <ProposalTypeRouter />
                    </PrivateRoute>
                  )
                } 
              />
              <Route 
                path="/shared/:id"
                element={<ProposalTypeRouter />}
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
                path="/holiday-generic"
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
              
              {/* Social Media Landing Pages - Public Routes */}
              <Route 
                path="/social-media/linkedin"
                element={
                  <SocialMediaPageProvider>
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <LoadingSpinner size="large" />
                      </div>
                    }>
                      <SocialMediaProposal platform="linkedin" />
                    </Suspense>
                  </SocialMediaPageProvider>
                }
              />
              <Route 
                path="/social-media/meta"
                element={
                  <SocialMediaPageProvider>
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <LoadingSpinner size="large" />
                      </div>
                    }>
                      <SocialMediaProposal platform="meta" />
                    </Suspense>
                  </SocialMediaPageProvider>
                }
              />
              {/* Social Media Landing Pages - Alternative Routes */}
              <Route 
                path="/social-media-pages/linkedin"
                element={
                  <SocialMediaPageProvider>
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <LoadingSpinner size="large" />
                      </div>
                    }>
                      <SocialMediaProposal platform="linkedin" />
                    </Suspense>
                  </SocialMediaPageProvider>
                }
              />
              <Route 
                path="/social-media-pages/meta"
                element={
                  <SocialMediaPageProvider>
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <LoadingSpinner size="large" />
                      </div>
                    }>
                      <SocialMediaProposal platform="meta" />
                    </Suspense>
                  </SocialMediaPageProvider>
                }
              />
              {/* Social Media Admin Manager */}
              <Route 
                path="/social-media-pages"
                element={
                  <PrivateRoute>
                    <SocialMediaPageProvider>
                      <Suspense fallback={
                        <div className="min-h-screen flex items-center justify-center">
                          <LoadingSpinner size="large" />
                        </div>
                      }>
                        <SocialMediaPageManager />
                      </Suspense>
                    </SocialMediaPageProvider>
                  </PrivateRoute>
                }
              />
              {/* QR Code Signs Routes */}
              <Route
                path="/qr-code-signs"
                element={
                  <PrivateRoute>
                    <QRCodeSignProvider>
                      <Suspense fallback={
                        <div className="min-h-screen flex items-center justify-center">
                          <LoadingSpinner size="large" />
                        </div>
                      }>
                        <QRCodeSignManager />
                      </Suspense>
                    </QRCodeSignProvider>
                  </PrivateRoute>
                }
              />
              <Route
                path="/qr-code-sign/:id"
                element={
                  <QRCodeSignProvider>
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <LoadingSpinner size="large" />
                      </div>
                    }>
                      <QRCodeSignDisplay />
                    </Suspense>
                  </QRCodeSignProvider>
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
              
              {/* Generic Landing Pages Routes */}
              <Route 
                path="/generic-landing-pages"
                element={
                  <PrivateRoute>
                    <GenericLandingPageProvider>
                      <Suspense fallback={
                        <div className="min-h-screen flex items-center justify-center">
                          <LoadingSpinner size="large" />
                        </div>
                      }>
                        <GenericLandingPageManager />
                      </Suspense>
                    </GenericLandingPageProvider>
                  </PrivateRoute>
                }
              />
              <Route
                path="/corporatepartnerships"
                element={
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <LoadingSpinner size="large" />
                    </div>
                  }>
                    <GenericLandingPage isGeneric={true} />
                  </Suspense>
                }
              />
              <Route
                path="/2026-plan"
                element={
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <LoadingSpinner size="large" />
                    </div>
                  }>
                    <Plan2026 />
                  </Suspense>
                }
              />
              <Route 
                path="/generic-landing-page/:id"
                element={
                  <GenericLandingPageProvider>
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <LoadingSpinner size="large" />
                      </div>
                    }>
                      <GenericLandingPage />
                    </Suspense>
                  </GenericLandingPageProvider>
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