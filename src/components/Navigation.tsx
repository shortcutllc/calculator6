import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, UserPlus, FileText, Calculator, Settings, Camera, ChevronDown, Clock, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [proposalsDropdownOpen, setProposalsDropdownOpen] = useState(false);
  const [landingPagesDropdownOpen, setLandingPagesDropdownOpen] = useState(false);
  const proposalsDropdownRef = useRef<HTMLDivElement>(null);
  const landingPagesDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (proposalsDropdownRef.current && !proposalsDropdownRef.current.contains(event.target as Node)) {
        setProposalsDropdownOpen(false);
      }
      if (landingPagesDropdownRef.current && !landingPagesDropdownRef.current.contains(event.target as Node)) {
        setLandingPagesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  return (
    <nav className="bg-white py-4 px-4 sm:px-8 shadow-md relative rounded-b-3xl z-[100]">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo on the left */}
        <button 
          onClick={() => navigate('/')}
          className="hover:opacity-80 transition-opacity"
        >
          <img 
            src="/shortcut-logo blue.svg" 
            alt="Shortcut Logo" 
            className="h-6 sm:h-8 w-auto"
          />
        </button>

        {/* Navigation items on the right */}
        <div className="flex items-center gap-2 sm:gap-4">
          {user && (
            <>
              {/* Proposals Dropdown */}
              <div className="relative hidden sm:block" ref={proposalsDropdownRef}>
                <Button 
                  onClick={() => setProposalsDropdownOpen(!proposalsDropdownOpen)}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  Proposals
                  <ChevronDown size={16} className={`transition-transform ${proposalsDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>
                {proposalsDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[150]">
                    <button
                      onClick={() => {
                        navigate('/');
                        setProposalsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-text-dark hover:bg-neutral-light-gray transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} className="text-text-dark-60" />
                      Create New Proposal
                    </button>
                    <button
                      onClick={() => {
                        navigate('/history');
                        setProposalsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-text-dark hover:bg-neutral-light-gray transition-colors flex items-center gap-2"
                    >
                      <Clock size={16} className="text-text-dark-60" />
                      History
                    </button>
                    <button
                      onClick={() => {
                        navigate('/admin');
                        setProposalsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-text-dark hover:bg-neutral-light-gray transition-colors flex items-center gap-2"
                    >
                      <Settings size={16} className="text-text-dark-60" />
                      Admin
                    </button>
                  </div>
                )}
              </div>

              {/* Landing Pages Dropdown */}
              <div className="relative hidden sm:block" ref={landingPagesDropdownRef}>
                <Button 
                  onClick={() => setLandingPagesDropdownOpen(!landingPagesDropdownOpen)}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  Landing Pages
                  <ChevronDown size={16} className={`transition-transform ${landingPagesDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>
                {landingPagesDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[150]">
                    <button
                      onClick={() => {
                        navigate('/holiday-pages');
                        setLandingPagesDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-text-dark hover:bg-neutral-light-gray transition-colors flex items-center gap-2"
                    >
                      <span style={{ fontSize: '16px' }}>🎄</span>
                      Holiday
                    </button>
                    <button
                      onClick={() => {
                        navigate('/social-media-pages');
                        setLandingPagesDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-text-dark hover:bg-neutral-light-gray transition-colors flex items-center gap-2"
                    >
                      <span style={{ fontSize: '16px' }}>📱</span>
                      Social
                    </button>
                  </div>
                )}
              </div>

              {/* Calculator - Direct Button */}
              <Button 
                onClick={() => navigate('/calculator')} 
                variant="secondary"
                icon={<Calculator size={18} />}
                className="hidden sm:flex"
              >
                Calculator
              </Button>

              {/* Headshots - Direct Button */}
              <Button 
                onClick={() => navigate('/headshots')} 
                variant="secondary"
                icon={<Camera size={18} />}
                className="hidden sm:flex"
              >
                Headshots
              </Button>
            </>
          )}
          {!user && (
            <Button 
              onClick={() => navigate('/login')} 
              variant="primary"
              icon={<LogIn size={18} />}
              className="hidden sm:flex"
            >
              Sign In
            </Button>
          )}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-[150] max-h-[90vh] overflow-y-auto">
            {user && (
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm text-text-dark-60 truncate">
                  Signed in as: {user.email}
                </p>
              </div>
            )}
            
            <div className="py-2">
              {user && (
                <>
                  {/* Proposals Section */}
                  <div className="px-4 py-2">
                    <div className="text-xs font-extrabold text-shortcut-blue uppercase tracking-wider mb-2">Proposals</div>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          navigate('/');
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-text-dark hover:bg-neutral-light-gray rounded-md transition-colors flex items-center gap-2"
                      >
                        <Plus size={16} className="text-text-dark-60" />
                        Create New Proposal
                      </button>
                      <button
                        onClick={() => {
                          navigate('/history');
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-text-dark hover:bg-neutral-light-gray rounded-md transition-colors flex items-center gap-2"
                      >
                        <Clock size={16} className="text-text-dark-60" />
                        History
                      </button>
                      <button
                        onClick={() => {
                          navigate('/admin');
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-text-dark hover:bg-neutral-light-gray rounded-md transition-colors flex items-center gap-2"
                      >
                        <Settings size={16} className="text-text-dark-60" />
                        Admin
                      </button>
                    </div>
                  </div>

                  {/* Landing Pages Section */}
                  <div className="px-4 py-2 border-t border-gray-100">
                    <div className="text-xs font-extrabold text-shortcut-blue uppercase tracking-wider mb-2">Landing Pages</div>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          navigate('/holiday-pages');
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-text-dark hover:bg-neutral-light-gray rounded-md transition-colors flex items-center gap-2"
                      >
                        <span style={{ fontSize: '16px' }}>🎄</span>
                        Holiday
                      </button>
                      <button
                        onClick={() => {
                          navigate('/social-media-pages');
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-text-dark hover:bg-neutral-light-gray rounded-md transition-colors flex items-center gap-2"
                      >
                        <span style={{ fontSize: '16px' }}>📱</span>
                        Social
                      </button>
                    </div>
                  </div>

                  {/* Tools Section */}
                  <div className="px-4 py-2 border-t border-gray-100">
                    <div className="text-xs font-extrabold text-shortcut-blue uppercase tracking-wider mb-2">Tools</div>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          navigate('/calculator');
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-text-dark hover:bg-neutral-light-gray rounded-md transition-colors flex items-center gap-2"
                      >
                        <Calculator size={16} className="text-text-dark-60" />
                        Calculator
                      </button>
                      <button
                        onClick={() => {
                          navigate('/headshots');
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-text-dark hover:bg-neutral-light-gray rounded-md transition-colors flex items-center gap-2"
                      >
                        <Camera size={16} className="text-text-dark-60" />
                        Headshots
                      </button>
                      <button
                        onClick={() => {
                          navigate('/brochure');
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-text-dark hover:bg-neutral-light-gray rounded-md transition-colors flex items-center gap-2"
                      >
                        <FileText size={16} className="text-text-dark-60" />
                        Brochures
                      </button>
                      <button
                        onClick={() => {
                          navigate('/qr-code-signs');
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-text-dark hover:bg-neutral-light-gray rounded-md transition-colors flex items-center gap-2"
                      >
                        <span style={{ fontSize: '14px' }}>📋</span>
                        QR Codes
                      </button>
                    </div>
                  </div>

                  {/* Account Actions */}
                  <div className="px-4 py-2 border-t border-gray-200 mt-2">
                    <Button
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      variant="secondary"
                      size="sm"
                      icon={<LogOut className="w-4 h-4" />}
                      className="w-full"
                    >
                      Sign Out
                    </Button>
                  </div>
                </>
              )}
              {!user && (
                <div className="px-4 py-2">
                  <Button
                    onClick={() => {
                      navigate('/login');
                      setIsMenuOpen(false);
                    }}
                    variant="primary"
                    size="sm"
                    icon={<LogIn className="w-4 h-4" />}
                    className="w-full"
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};