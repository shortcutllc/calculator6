import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  return (
    <nav className="bg-white py-4 px-4 sm:px-8 shadow-md relative">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
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

        <div className="flex items-center gap-2 sm:gap-4">
          <Button 
            onClick={() => navigate('/')} 
            variant="primary"
            className="hidden sm:flex"
          >
            Home
          </Button>
          <Button 
            onClick={() => navigate('/history')} 
            variant="secondary"
            className="hidden sm:flex"
          >
            History
          </Button>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg py-4 z-50">
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-gray-600 truncate">
                {user ? (
                  <span>Signed in as: {user.email}</span>
                ) : (
                  <span>Not signed in</span>
                )}
              </p>
            </div>
            
            <div className="p-2">
              <div className="sm:hidden space-y-2 mb-4">
                <Button
                  onClick={() => {
                    navigate('/');
                    setIsMenuOpen(false);
                  }}
                  variant="primary"
                  className="w-full"
                >
                  Home
                </Button>
                <Button
                  onClick={() => {
                    navigate('/history');
                    setIsMenuOpen(false);
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  History
                </Button>
              </div>
              
              {user ? (
                <>
                  <Button
                    onClick={() => {
                      navigate('/register');
                      setIsMenuOpen(false);
                    }}
                    variant="primary"
                    icon={<UserPlus className="w-4 h-4" />}
                    className="w-full mb-2"
                  >
                    Create Account
                  </Button>
                  <Button
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    variant="secondary"
                    icon={<LogOut className="w-4 h-4" />}
                    className="w-full"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    navigate('/login');
                    setIsMenuOpen(false);
                  }}
                  variant="primary"
                  icon={<LogIn className="w-4 h-4" />}
                  className="w-full"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};