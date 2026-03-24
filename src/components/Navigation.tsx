import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, LogOut, FileText, Calculator, Settings, Camera,
  ChevronDown, Clock, Plus, Users, Handshake, Gift, Smartphone,
  Scale, Mail, Receipt, FileSignature, QrCode, Brain, TrendingUp, Link2, CalendarCheck, Ticket, Palette
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isMasterAccount } from '../utils/isMasterAccount';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
  masterOnly?: boolean;
  collapsible?: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Proposals',
    items: [
      { label: 'New Proposal', path: '/', icon: <Plus size={18} /> },
      { label: 'History', path: '/history', icon: <Clock size={18} /> },
      { label: 'Admin', path: '/admin', icon: <Settings size={18} /> },
    ],
  },
  {
    title: 'Event Operations',
    items: [
      { label: 'Upcoming Events', path: '/upcoming-events', icon: <CalendarCheck size={18} /> },
      { label: 'Client Emails', path: '/client-emails', icon: <Mail size={18} /> },
      { label: 'Agreements', path: '/pro-agreements', icon: <FileSignature size={18} /> },
      { label: 'QR Codes', path: '/qr-code-signs', icon: <QrCode size={18} /> },
      { label: 'Invoices', path: '/invoices', icon: <Receipt size={18} /> },
      { label: 'Sign-Up Links', path: '/sign-up-links', icon: <Link2 size={18} /> },
      { label: 'Workhuman 2026', path: '/workhuman', icon: <Ticket size={18} /> },
      { label: 'Workhuman Designs', path: '/workhuman/booth-designs', icon: <Palette size={18} /> },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { label: 'Landing Pages', path: '/generic-landing-pages', icon: <Handshake size={18} /> },
      { label: 'Holiday Pages', path: '/holiday-pages', icon: <Gift size={18} /> },
      { label: 'Social Media', path: '/social-media-pages', icon: <Smartphone size={18} /> },
    ],
  },
  {
    title: 'CLE Program',
    collapsible: true,
    items: [
      { label: 'New York', path: '/cle', icon: <Scale size={18} /> },
      { label: 'Pennsylvania', path: '/cle/pa', icon: <Scale size={18} /> },
      { label: 'California', path: '/cle/ca', icon: <Scale size={18} /> },
      { label: 'Texas', path: '/cle/tx', icon: <Scale size={18} /> },
      { label: 'Florida', path: '/cle/fl', icon: <Scale size={18} /> },
    ],
  },
  {
    title: 'Services',
    items: [
      { label: 'Headshots', path: '/headshots', icon: <Camera size={18} /> },
      { label: 'Mindfulness', path: '/mindfulness-programs', icon: <Brain size={18} /> },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Calculator', path: '/calculator', icon: <Calculator size={18} /> },
      { label: 'Brochures', path: '/brochure', icon: <FileText size={18} /> },
      { label: '2026 Plan', path: '/2026-plan', icon: <TrendingUp size={18} /> },
      { label: '2026 Plan ML', path: '/2026-plan-ml', icon: <TrendingUp size={18} /> },
    ],
  },
  {
    title: 'Admin',
    masterOnly: true,
    items: [
      { label: 'Users', path: '/users', icon: <Users size={18} /> },
    ],
  },
];

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cleExpanded, setCleExpanded] = useState(false);

  const isMaster = isMasterAccount(user);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <button onClick={() => handleNav('/')} className="hover:opacity-80 transition-opacity">
          <img src="/shortcut-logo-blue.svg" alt="Shortcut Logo" className="h-7 w-auto" />
        </button>
      </div>

      {/* Nav Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_SECTIONS.map((section) => {
          if (section.masterOnly && !isMaster) return null;

          const isCollapsible = section.collapsible;
          const isExpanded = !isCollapsible || cleExpanded;

          return (
            <div key={section.title}>
              <button
                onClick={isCollapsible ? () => setCleExpanded(!cleExpanded) : undefined}
                className={`flex items-center gap-1 px-2 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 ${
                  isCollapsible ? 'cursor-pointer hover:text-gray-600' : 'cursor-default'
                }`}
              >
                {section.title}
                {isCollapsible && (
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              {isExpanded && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNav(item.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-shortcut-blue/10 text-shortcut-blue'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className={active ? 'text-shortcut-blue' : 'text-gray-400'}>
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: User + Sign Out */}
      {user && (
        <div className="border-t border-gray-100 px-4 py-4">
          <p className="text-xs text-gray-400 truncate mb-3">{user.email}</p>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut size={18} className="text-gray-400" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );

  if (!user) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 bg-white border-r border-gray-200 z-[100]">
        {renderSidebarContent()}
      </aside>

      {/* Mobile: Top bar with hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-[100] px-4 py-3 flex items-center justify-between">
        <button onClick={() => handleNav('/')} className="hover:opacity-80 transition-opacity">
          <img src="/shortcut-logo-blue.svg" alt="Shortcut Logo" className="h-6 w-auto" />
        </button>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile: Sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-[140]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 w-72 bg-white z-[150] shadow-xl">
            {renderSidebarContent()}
          </aside>
        </>
      )}
    </>
  );
};
