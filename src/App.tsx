import React, { useState, createContext, useContext, useEffect } from 'react';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { AppPage } from './components/AppPage';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';
import { TemplatesPage } from './features/templates/TemplatesPage';
import { Addresses } from './components/Emails';
import { EmailsInbox } from './components/EmailsInbox';
import { Prompts } from './components/Prompts';
import { CRM } from './components/CRM';
import { Calendar } from './components/Calendar';
import { GoogleCallback } from './components/GoogleCallback';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { CookiePolicy } from './components/CookiePolicy';
import { LandingPage } from './components/LandingPage';
import { FeaturesPage } from './components/FeaturesPage';
import { PricingPage } from './components/PricingPage';
import { SecurityPage } from './components/SecurityPage';
import { UpdatesPage } from './components/UpdatesPage';
import { AboutPage } from './components/AboutPage';
import { Support } from './components/Support';
import { Integrations } from './components/Integrations';
import { TeamManagement } from './components/TeamManagement';
import { TeamView } from './components/TeamView';
import { EmailProvider } from './contexts/EmailContext';
import { supabase } from './lib/supabase';
import { toast } from './lib/toast';
import { ToastProvider } from './components/ui/ToastProvider';
import { ConfirmProvider } from './components/ui/ConfirmProvider';
import { AlertCircle, Menu, Mail } from 'lucide-react';
import { DashboardProvider } from './contexts/DashboardContext';

type View = 'landing' | 'login' | 'register' | 'dashboard' | 'app' | 'settings' | 'templates' | 'emails' | 'addresses' | 'prompts' | 'crm' | 'calendar' | 'support' | 'integrations' | 'team-management' | 'team-view' | 'google-callback' | 'privacy-policy' | 'terms-of-service' | 'cookie-policy' | 'features' | 'pricing' | 'security' | 'updates' | 'about';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => Promise<void>;
  colorScheme: string;
  updateColorScheme: (scheme: string) => Promise<void>;
  pageBg: string;
  cardBg: string;
}

export const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: async () => {},
  colorScheme: 'indigo',
  updateColorScheme: async () => {},
  pageBg: '#f9fafb',
  cardBg: '#ffffff',
});

const THEME_VARS: Record<string, Record<string, string>> = {
  slate: {
    '--accent': 'rgb(71, 85, 105)',   '--accent-dark': 'rgb(100, 116, 139)',
    '--sb-bg': '#334155', '--sb-hover': '#475569', '--sb-border': 'rgba(100,116,139,0.4)',
    '--sb-bg-d': '#1f2937', '--sb-hover-d': '#374151',
    '--page-bg': '#f9fafb', '--page-bg-d': '#111827',
    '--card-bg': '#ffffff', '--card-bg-d': '#1f2937', '--card-bg-inner-d': '#374151',
  },
  blue: {
    '--accent': 'rgb(37, 99, 235)',   '--accent-dark': 'rgb(59, 130, 246)',
    '--sb-bg': '#1d4ed8', '--sb-hover': '#2563eb', '--sb-border': 'rgba(59,130,246,0.3)',
    '--sb-bg-d': '#1e3a5f', '--sb-hover-d': '#1d4ed8',
    '--page-bg': '#eff6ff', '--page-bg-d': '#0a1628',
    '--card-bg': '#ffffff', '--card-bg-d': '#112138', '--card-bg-inner-d': '#1a2e4a',
  },
  emerald: {
    '--accent': 'rgb(5, 150, 105)',   '--accent-dark': 'rgb(16, 185, 129)',
    '--sb-bg': '#065f46', '--sb-hover': '#047857', '--sb-border': 'rgba(16,185,129,0.3)',
    '--sb-bg-d': '#0a2e1c', '--sb-hover-d': '#065f46',
    '--page-bg': '#ecfdf5', '--page-bg-d': '#061a10',
    '--card-bg': '#ffffff', '--card-bg-d': '#0e2a1c', '--card-bg-inner-d': '#163622',
  },
  violet: {
    '--accent': 'rgb(124, 58, 237)',  '--accent-dark': 'rgb(139, 92, 246)',
    '--sb-bg': '#5b21b6', '--sb-hover': '#6d28d9', '--sb-border': 'rgba(139,92,246,0.3)',
    '--sb-bg-d': '#2e1065', '--sb-hover-d': '#5b21b6',
    '--page-bg': '#f5f3ff', '--page-bg-d': '#0d0920',
    '--card-bg': '#ffffff', '--card-bg-d': '#1a1038', '--card-bg-inner-d': '#221845',
  },
  amber: {
    '--accent': 'rgb(217, 119, 6)',   '--accent-dark': 'rgb(245, 158, 11)',
    '--sb-bg': '#92400e', '--sb-hover': '#b45309', '--sb-border': 'rgba(245,158,11,0.3)',
    '--sb-bg-d': '#3a1a06', '--sb-hover-d': '#92400e',
    '--page-bg': '#fffbeb', '--page-bg-d': '#1a1205',
    '--card-bg': '#ffffff', '--card-bg-d': '#28200c', '--card-bg-inner-d': '#342c10',
  },
  rose: {
    '--accent': 'rgb(225, 29, 72)',   '--accent-dark': 'rgb(244, 63, 94)',
    '--sb-bg': '#9f1239', '--sb-hover': '#be123c', '--sb-border': 'rgba(244,63,94,0.3)',
    '--sb-bg-d': '#3f0e1c', '--sb-hover-d': '#9f1239',
    '--page-bg': '#fff1f2', '--page-bg-d': '#1a0610',
    '--card-bg': '#ffffff', '--card-bg-d': '#2a0e1a', '--card-bg-inner-d': '#361422',
  },
  teal: {
    '--accent': 'rgb(13, 148, 136)',  '--accent-dark': 'rgb(20, 184, 166)',
    '--sb-bg': '#0f766e', '--sb-hover': '#0d9488', '--sb-border': 'rgba(20,184,166,0.3)',
    '--sb-bg-d': '#0a302a', '--sb-hover-d': '#0f766e',
    '--page-bg': '#f0fdfa', '--page-bg-d': '#051816',
    '--card-bg': '#ffffff', '--card-bg-d': '#0e2824', '--card-bg-inner-d': '#16342e',
  },
  indigo: {
    '--accent': 'rgb(79, 70, 229)',   '--accent-dark': 'rgb(99, 102, 241)',
    '--sb-bg': '#3730a3', '--sb-hover': '#4338ca', '--sb-border': 'rgba(99,102,241,0.3)',
    '--sb-bg-d': '#1e1b4b', '--sb-hover-d': '#3730a3',
    '--page-bg': '#eef2ff', '--page-bg-d': '#08091e',
    '--card-bg': '#ffffff', '--card-bg-d': '#14152e', '--card-bg-inner-d': '#1e2040',
  },
  fuchsia: {
    '--accent': 'rgb(192, 38, 211)',  '--accent-dark': 'rgb(217, 70, 239)',
    '--sb-bg': '#86198f', '--sb-hover': '#a21caf', '--sb-border': 'rgba(217,70,239,0.3)',
    '--sb-bg-d': '#3a0a40', '--sb-hover-d': '#86198f',
    '--page-bg': '#fdf4ff', '--page-bg-d': '#160520',
    '--card-bg': '#ffffff', '--card-bg-d': '#24103a', '--card-bg-inner-d': '#301548',
  },
  cyan: {
    '--accent': 'rgb(8, 145, 178)',   '--accent-dark': 'rgb(6, 182, 212)',
    '--sb-bg': '#0e7490', '--sb-hover': '#0891b2', '--sb-border': 'rgba(6,182,212,0.3)',
    '--sb-bg-d': '#0a2e3a', '--sb-hover-d': '#0e7490',
    '--page-bg': '#ecfeff', '--page-bg-d': '#051520',
    '--card-bg': '#ffffff', '--card-bg-d': '#0e2430', '--card-bg-inner-d': '#163040',
  },
};

const THEME_MIGRATION: Record<string, string> = {
  classic: 'indigo', forest: 'emerald', ocean: 'teal', sky: 'cyan', stone: 'slate',
};

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('app-dark-mode') === '1');
  const [colorScheme, setColorScheme] = useState(() => {
    const stored = localStorage.getItem('app-color-scheme') || 'indigo';
    if (THEME_VARS[stored]) return stored;
    return THEME_MIGRATION[stored] || 'indigo';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [previousView, setPreviousView] = useState<View>('landing');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSupportAdmin, setIsSupportAdmin] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-scheme', colorScheme);
  }, [colorScheme]);

  const updateView = (newView: View) => {
    setPreviousView(view);
    setView(newView);
    const path = newView === 'landing' ? '/' : `/${newView}`;
    window.history.pushState({}, '', path);

    // Clear loginType when navigating away from team-management or to a different authenticated view
    if (view === 'team-management' && newView !== 'team-management') {
      localStorage.removeItem('loginType');
    }
  };

  const handleBackFromPolicy = () => {
    if (previousView === 'landing') {
      updateView('landing');
    } else {
      updateView('settings');
    }
  };

  const fetchUserSettings = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      // First, ensure a profile exists for this user
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.data.user.id)
        .maybeSingle();

      if (profileCheckError) throw profileCheckError;

      // If no profile exists, create one
      if (!existingProfile) {
        const { error: profileInsertError } = await supabase
          .from('profiles')
          .insert({
            id: user.data.user.id,
            email: user.data.user.email || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (profileInsertError) {
          console.error('Error creating profile:', profileInsertError);
          throw profileInsertError;
        }
      }

      // Now fetch or create user settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('dark_mode, color_scheme, support_admin')
        .eq('user_id', user.data.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDarkMode(data.dark_mode);
        setColorScheme(data.color_scheme || 'classic');
        setIsSupportAdmin(data.support_admin ?? false);
        localStorage.setItem('app-dark-mode', data.dark_mode ? '1' : '0');
        localStorage.setItem('app-color-scheme', data.color_scheme || 'classic');
      } else {
        // Create default settings if none exist
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.data.user.id,
            dark_mode: false,
            notifications: true,
            two_factor_auth: false,
            newsletter: false,
            public_profile: true,
            debugging: false,
            clean_up_loi: false,
            color_scheme: 'classic'
          });
        
        if (insertError) {
          console.error('Error creating default settings:', insertError);
        } else {
          setDarkMode(false);
        }
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    }
  };

  useEffect(() => {
    const pathToView = (pathname: string): View => {
      const path = pathname.replace(/^\//, '');
      if (!path) return 'landing';
      if (path === 'login') return 'login';
      return path as View;
    };

    // Check if this is the Google OAuth callback
    if (window.location.pathname === '/google-callback') {
      setView('google-callback');
      setIsLoading(false);
      return;
    }

    // Handle browser back/forward buttons
    const handlePopState = () => {
      const newView = pathToView(window.location.pathname);
      setView(newView);
    };

    window.addEventListener('popstate', handlePopState);

    // Handle custom navigation event for features
    const handleNavigateToFeatures = () => {
      updateView('features');
    };

    // Handle custom navigation event for pricing
    const handleNavigateToPricing = () => {
      updateView('pricing');
    };

    // Handle custom navigation event for security
    const handleNavigateToSecurity = () => {
      updateView('security');
    };

    // Handle custom navigation event for updates
    const handleNavigateToUpdates = () => {
      updateView('updates');
    };

    // Handle custom navigation event for about
    const handleNavigateToAbout = () => {
      updateView('about');
    };

    window.addEventListener('navigate-to-features', handleNavigateToFeatures);
    window.addEventListener('navigate-to-pricing', handleNavigateToPricing);
    window.addEventListener('navigate-to-security', handleNavigateToSecurity);
    window.addEventListener('navigate-to-updates', handleNavigateToUpdates);
    window.addEventListener('navigate-to-about', handleNavigateToAbout);

    // Check for existing session
    const initAuth = async () => {
      console.log('Starting auth initialization...');

      try {
        const storedToken = localStorage.getItem('supabase.auth.token');
        if (storedToken) {
          try {
            const parsedToken = JSON.parse(storedToken);
            const expiresAt = parsedToken?.expires_at || parsedToken?.expiresAt;

            if (expiresAt && expiresAt < Date.now() / 1000) {
              console.log('Token expired, clearing localStorage');
              localStorage.clear();
              setView('landing');
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error parsing token, clearing localStorage');
            localStorage.clear();
            setView('landing');
            setIsLoading(false);
            return;
          }
        } else {
          console.log('No stored token, skipping getSession');
          setView('landing');
          setIsLoading(false);
          return;
        }

        console.log('Calling getSession with timeout...');
        const timeout = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 3000);
        });

        const sessionPromise = supabase.auth.getSession();
        const result = await Promise.race([sessionPromise, timeout]);

        if (result === null) {
          console.log('Session check timed out, clearing and redirecting');
          localStorage.clear();
          setView('landing');
          setIsLoading(false);
          return;
        }

        const { data: { session }, error } = result;
        console.log('getSession completed:', { session: !!session, error });

        if (error) {
          console.error('Session error:', error);
          console.log('Clearing session data due to error');
          localStorage.clear();
          setView('landing');
          setIsLoading(false);
          return;
        }

        if (session) {
          console.log('Session found, checking organization membership...');
          const loginType = localStorage.getItem('loginType');

          const { data: memberRows } = await supabase
            .from('organization_members')
            .select('role')
            .eq('user_id', session.user.id)
            .order('joined_at', { ascending: true });

          const memberData = (memberRows as any[])?.find((r: any) => r.role === 'owner') ?? (memberRows as any[])?.[0] ?? null;

          if (memberData) {
            setUserRole(memberData.role);
            localStorage.setItem('userRole', memberData.role);
          } else {
            setUserRole(null);
            localStorage.removeItem('userRole');
          }

          // Restore URL path unless it's an auth page
          const currentPath = window.location.pathname.replace(/^\//, '');
          const authPages = ['login', 'register'];
          if (currentPath && !authPages.includes(currentPath)) {
            console.log('Restoring view from URL:', currentPath);
            setView(currentPath as View);
          } else {
            console.log('Setting view to dashboard');
            setView('dashboard');
          }

          console.log('Fetching user settings...');
          await fetchUserSettings();
          console.log('User settings fetched');
        } else {
          console.log('No session, setting view to landing');
          setView('landing');
          setUserRole(null);
        }
      } catch (error) {
        console.error('Auth init failed:', error);
        localStorage.clear();
        setView('landing');
      } finally {
        console.log('Auth initialization complete, setting isLoading to false');
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        try {
          if (event === 'TOKEN_REFRESHED') {
            console.log('Token refreshed successfully');
            if (session) {
              const memberQuery = supabase
                .from('organization_members')
                .select('role')
                .eq('user_id', session.user.id)
                .order('joined_at', { ascending: true });

              const timeout = new Promise<{ data: null }>((resolve) => {
                setTimeout(() => resolve({ data: null }), 2000);
              });

              const result = await Promise.race([memberQuery, timeout]);

              const rows = result.data as any[] | null;
              const row = rows?.find((r: any) => r.role === 'owner') ?? rows?.[0] ?? null;
              if (row) {
                setUserRole(row.role);
                localStorage.setItem('userRole', row.role);
              }
            }
            return;
          }

          if (event === 'SIGNED_OUT') {
            console.log('User signed out');
            setView('landing');
            setDarkMode(false);
            setUserRole(null);
            return;
          }

          // On SIGNED_IN, only update role state — navigation is handled by handleLogin
          if (event === 'SIGNED_IN' && session) {
            const memberQuery = supabase
              .from('organization_members')
              .select('role')
              .eq('user_id', session.user.id)
              .order('joined_at', { ascending: true });

            const timeout = new Promise<{ data: null }>((resolve) => {
              setTimeout(() => resolve({ data: null }), 2000);
            });

            const result = await Promise.race([memberQuery, timeout]);

            const rows = result.data as any[] | null;
            const row = rows?.find((r: any) => r.role === 'owner') ?? rows?.[0] ?? null;
            if (row) {
              setUserRole(row.role);
              localStorage.setItem('userRole', row.role);
            }

            fetchUserSettings();
          }
        } catch (error: any) {
          console.error('Auth state change error:', error);
          if (error?.message?.includes('Refresh Token')) {
            await supabase.auth.signOut();
            localStorage.clear();
          }
          setView('landing');
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('navigate-to-features', handleNavigateToFeatures);
      window.removeEventListener('navigate-to-pricing', handleNavigateToPricing);
      window.removeEventListener('navigate-to-security', handleNavigateToSecurity);
      window.removeEventListener('navigate-to-updates', handleNavigateToUpdates);
      window.removeEventListener('navigate-to-about', handleNavigateToAbout);
    };
  }, []);

  const toggleDarkMode = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const newDarkMode = !darkMode;

      const { error } = await supabase
        .from('user_settings')
        .update({ 
          dark_mode: newDarkMode,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.data.user.id);

      if (error) throw error;
      setDarkMode(newDarkMode);
      localStorage.setItem('app-dark-mode', newDarkMode ? '1' : '0');
    } catch (error) {
      console.error('Error updating dark mode:', error);
      toast.error('Failed to update dark mode setting. Please try again.');
    }
  };

  const updateColorScheme = async (scheme: string) => {
    setColorScheme(scheme);
    localStorage.setItem('app-color-scheme', scheme);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;
      await supabase
        .from('user_settings')
        .update({ color_scheme: scheme, updated_at: new Date().toISOString() })
        .eq('user_id', user.data.user.id);
    } catch (error) {
      console.error('Error updating color scheme:', error);
    }
  };

  const handleLogin = () => {
    const userRole = localStorage.getItem('userRole');
    const loginType = localStorage.getItem('loginType');
    // Sync React state immediately from localStorage so components that
    // depend on userRole render correctly without waiting for SIGNED_IN.
    if (userRole) setUserRole(userRole);
    if (userRole === 'owner') {
      updateView('dashboard');
    } else if (userRole === 'manager') {
      updateView('team-view');
    } else if (loginType === 'member') {
      updateView('team-management');
    } else {
      updateView('dashboard');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('loginType');
    localStorage.removeItem('userRole');
    localStorage.removeItem('organizationId');
    updateView('landing');
  };

  if (isLoading) {
    const theme = THEME_VARS[colorScheme] ?? THEME_VARS['indigo'];
    const bgColor = darkMode ? theme['--page-bg-d'] : theme['--page-bg'];
    const accentColor = darkMode ? theme['--accent-dark'] : theme['--accent'];
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: accentColor, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <ToastProvider>
    <ConfirmProvider>
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, colorScheme, updateColorScheme, pageBg: darkMode ? (THEME_VARS[colorScheme]?.['--page-bg-d'] ?? '#0f172a') : (THEME_VARS[colorScheme]?.['--page-bg'] ?? '#f8fafc'), cardBg: darkMode ? (THEME_VARS[colorScheme]?.['--card-bg-d'] ?? '#1e293b') : (THEME_VARS[colorScheme]?.['--card-bg'] ?? '#ffffff') }}>
      <EmailProvider>
        <DashboardProvider>
          <div
            className={darkMode ? 'dark' : ''}
            style={(THEME_VARS[colorScheme] ?? THEME_VARS['indigo']) as React.CSSProperties}
          >
            {view === 'team-management' && (
              <TeamManagement onSignOut={handleSignOut} />
            )}
            {view === 'dashboard' || view === 'settings' || view === 'emails' || view === 'addresses' || view === 'prompts' || view === 'crm' || view === 'calendar' || view === 'support' || view === 'integrations' || view === 'team-view' ? (
              <div className="flex min-h-screen" style={{ backgroundColor: darkMode ? (THEME_VARS[colorScheme]?.['--page-bg-d'] ?? '#0f172a') : (THEME_VARS[colorScheme]?.['--page-bg'] ?? '#f8fafc') }}>
                <Sidebar
                  onSignOut={handleSignOut}
                  onHomeClick={() => { updateView('dashboard'); setMobileNavOpen(false); }}
                  onSettingsClick={() => { updateView('settings'); setMobileNavOpen(false); }}
                  onEmailsClick={() => { updateView('emails'); setMobileNavOpen(false); }}
                  onAddressesClick={() => { updateView('addresses'); setMobileNavOpen(false); }}
                  onPromptsClick={() => { updateView('prompts'); setMobileNavOpen(false); }}
                  onCRMClick={() => { updateView('crm'); setMobileNavOpen(false); }}
                  onCalendarClick={() => { updateView('calendar'); setMobileNavOpen(false); }}
                  onSupportClick={() => { updateView('support'); setMobileNavOpen(false); }}
                  onIntegrationsClick={() => { updateView('integrations'); setMobileNavOpen(false); }}
                  onTeamClick={() => { updateView('team-view'); setMobileNavOpen(false); }}
                  isSupportAdmin={isSupportAdmin}
                  isOpen={mobileNavOpen}
                  onClose={() => setMobileNavOpen(false)}
                />
                <div className="flex-1 md:ml-64 min-w-0" style={{ backgroundColor: darkMode ? (THEME_VARS[colorScheme]?.['--page-bg-d'] ?? '#0f172a') : (THEME_VARS[colorScheme]?.['--page-bg'] ?? '#f8fafc') }}>
                  {/* Mobile top bar */}
                  <div
                    className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 text-white shadow"
                    style={{ backgroundColor: darkMode ? (THEME_VARS[colorScheme]?.['--sb-bg-d'] ?? '#1e1b4b') : (THEME_VARS[colorScheme]?.['--sb-bg'] ?? '#3730a3') }}
                  >
                    <button
                      onClick={() => setMobileNavOpen(true)}
                      className="p-1.5 rounded transition-colors"
                      style={{}}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = darkMode ? (THEME_VARS[colorScheme]?.['--sb-hover-d'] ?? '#2a2568') : (THEME_VARS[colorScheme]?.['--sb-hover'] ?? '#4338ca'))}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      aria-label="Open navigation"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-white/60" />
                      <span className="font-semibold text-sm tracking-wide">LoiReply</span>
                    </div>
                  </div>
                  {view === 'dashboard' && (
                    <Dashboard onSignOut={handleSignOut} currentView={view} />
                  )}
                  {view === 'settings' && (
                    <Settings
                      onSignOut={handleSignOut}
                      currentView={view}
                      onPrivacyClick={() => updateView('privacy-policy')}
                      onTermsClick={() => updateView('terms-of-service')}
                    />
                  )}
                  {view === 'emails' && (
                    <EmailsInbox onSignOut={handleSignOut} currentView={view} userRole={userRole} />
                  )}
                  {view === 'addresses' && (
                    <Addresses onSignOut={handleSignOut} currentView={view} />
                  )}
                  {view === 'prompts' && (
                    <Prompts onSignOut={handleSignOut} currentView={view} />
                  )}
                  {view === 'crm' && (
                    <CRM onSignOut={handleSignOut} currentView={view} />
                  )}
                  {view === 'calendar' && (
                    <div className="p-4 md:p-8">
                      <Calendar />
                    </div>
                  )}
                  {view === 'support' && (
                    <Support onSignOut={handleSignOut} currentView={view} isSupportAdmin={isSupportAdmin} />
                  )}
                  {view === 'integrations' && (
                    <Integrations onSignOut={handleSignOut} currentView={view} isSupportAdmin={isSupportAdmin} />
                  )}
                  {view === 'team-view' && (
                    <TeamView onSignOut={handleSignOut} />
                  )}
                </div>
              </div>
            ) : view === 'privacy-policy' ? (
              <PrivacyPolicy onBack={handleBackFromPolicy} />
            ) : view === 'terms-of-service' ? (
              <TermsOfService onBack={handleBackFromPolicy} />
            ) : view === 'cookie-policy' ? (
              <CookiePolicy onBackClick={handleBackFromPolicy} />
            ) : view === 'google-callback' ? (
              <GoogleCallback />
            ) : view === 'features' ? (
              <FeaturesPage
                onBackClick={() => updateView('landing')}
                onSignInClick={() => updateView('login')}
                onCreateAccountClick={() => updateView('register')}
              />
            ) : view === 'pricing' ? (
              <PricingPage
                onBackClick={() => updateView('landing')}
                onSignInClick={() => updateView('login')}
                onCreateAccountClick={() => updateView('register')}
              />
            ) : view === 'security' ? (
              <SecurityPage
                onBackClick={() => updateView('landing')}
                onSignInClick={() => updateView('login')}
                onCreateAccountClick={() => updateView('register')}
              />
            ) : view === 'updates' ? (
              <UpdatesPage
                onBackClick={() => updateView('landing')}
                onSignInClick={() => updateView('login')}
                onCreateAccountClick={() => updateView('register')}
              />
            ) : view === 'about' ? (
              <AboutPage
                onBackClick={() => updateView('landing')}
                onSignInClick={() => updateView('login')}
                onCreateAccountClick={() => updateView('register')}
              />
            ) : view === 'landing' ? (
              <LandingPage
                onSignInClick={() => updateView('login')}
                onCreateAccountClick={() => updateView('register')}
                onPrivacyClick={() => updateView('privacy-policy')}
                onTermsClick={() => updateView('terms-of-service')}
                onCookieClick={() => updateView('cookie-policy')}
              />
            ) : (
              <div className="min-h-screen bg-om-cream flex items-center justify-center p-4">
                <div className="bg-white border border-om-tan rounded-xl shadow-sm p-8 w-full max-w-md">
                  {view === 'login' ? (
                    <Login
                      onRegisterClick={() => updateView('register')}
                      onLoginSuccess={handleLogin}
                      onBackToHome={() => updateView('landing')}
                    />
                  ) : (
                    <Register
                      onLoginClick={() => updateView('login')}
                      onBackToHome={() => updateView('landing')}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </DashboardProvider>
      </EmailProvider>
    </ThemeContext.Provider>
    </ConfirmProvider>
    </ToastProvider>
  );
}