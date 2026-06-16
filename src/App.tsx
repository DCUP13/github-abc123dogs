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
import { AlertCircle, Menu, Mail } from 'lucide-react';
import { DashboardProvider } from './contexts/DashboardContext';

type View = 'landing' | 'login' | 'register' | 'dashboard' | 'app' | 'settings' | 'templates' | 'emails' | 'addresses' | 'prompts' | 'crm' | 'calendar' | 'support' | 'integrations' | 'team-management' | 'team-view' | 'google-callback' | 'privacy-policy' | 'terms-of-service' | 'cookie-policy' | 'features' | 'pricing' | 'security' | 'updates' | 'about';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => Promise<void>;
  colorScheme: string;
  updateColorScheme: (scheme: string) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: async () => {},
  colorScheme: 'indigo',
  updateColorScheme: async () => {},
});

const SCHEME_VARS: Record<string, Record<string, string>> = {
  classic: { '--sb-bg': '#3730a3', '--sb-hover': '#4338ca', '--sb-border': 'rgba(67,56,202,0.3)',   '--accent': '#4f46e5', '--accent-dark': '#818cf8', '--page-bg': '#ffffff',  '--page-bg-d': '#111827', '--card-bg': '#ffffff', '--card-bg-d': '#1f2937', '--card-bg-inner-d': '#374151', '--sb-bg-d': '#1f2937', '--sb-hover-d': '#374151' },
  indigo:  { '--sb-bg': '#312e81', '--sb-hover': '#3730a3', '--sb-border': 'rgba(99,102,241,0.3)',   '--accent': '#4f46e5', '--accent-dark': '#818cf8', '--page-bg': '#f5f4ff',  '--page-bg-d': '#1a1730', '--card-bg': '#ffffff', '--card-bg-d': '#252040', '--card-bg-inner-d': '#312c54', '--sb-bg-d': '#231e5c', '--sb-hover-d': '#2d2870' },
  forest:  { '--sb-bg': '#1a3a26', '--sb-hover': '#2d5a3d', '--sb-border': 'rgba(45,90,61,0.4)',     '--accent': '#2d5a3d', '--accent-dark': '#c9a84c', '--page-bg': '#f2f7f4',  '--page-bg-d': '#0d1f15', '--card-bg': '#ffffff', '--card-bg-d': '#162b1d', '--card-bg-inner-d': '#1e3828', '--sb-bg-d': '#132f1e', '--sb-hover-d': '#1a3c27' },
  ocean:   { '--sb-bg': '#0c4a6e', '--sb-hover': '#075985', '--sb-border': 'rgba(2,132,199,0.3)',    '--accent': '#0369a1', '--accent-dark': '#38bdf8', '--page-bg': '#f0f7ff',  '--page-bg-d': '#091a28', '--card-bg': '#ffffff', '--card-bg-d': '#112236', '--card-bg-inner-d': '#192e46', '--sb-bg-d': '#0d263c', '--sb-hover-d': '#143249' },
  rose:    { '--sb-bg': '#881337', '--sb-hover': '#9f1239', '--sb-border': 'rgba(244,63,94,0.3)',    '--accent': '#e11d48', '--accent-dark': '#fb7185', '--page-bg': '#fff0f3',  '--page-bg-d': '#1f0a0f', '--card-bg': '#ffffff', '--card-bg-d': '#2d1219', '--card-bg-inner-d': '#3d1a23', '--sb-bg-d': '#2d0e16', '--sb-hover-d': '#3a1120' },
  emerald: { '--sb-bg': '#064e3b', '--sb-hover': '#065f46', '--sb-border': 'rgba(16,185,129,0.3)',  '--accent': '#059669', '--accent-dark': '#34d399', '--page-bg': '#f0faf5',  '--page-bg-d': '#071a12', '--card-bg': '#ffffff', '--card-bg-d': '#0e2a1d', '--card-bg-inner-d': '#183828', '--sb-bg-d': '#0e2a1c', '--sb-hover-d': '#133822' },
  amber:   { '--sb-bg': '#78350f', '--sb-hover': '#92400e', '--sb-border': 'rgba(217,119,6,0.3)',   '--accent': '#b45309', '--accent-dark': '#fbbf24', '--page-bg': '#fffbf0',  '--page-bg-d': '#1a0e05', '--card-bg': '#ffffff', '--card-bg-d': '#27180a', '--card-bg-inner-d': '#36220e', '--sb-bg-d': '#241508', '--sb-hover-d': '#2e1b0a' },
  violet:  { '--sb-bg': '#4c1d95', '--sb-hover': '#5b21b6', '--sb-border': 'rgba(124,58,237,0.3)', '--accent': '#6d28d9', '--accent-dark': '#a78bfa', '--page-bg': '#f8f4ff',  '--page-bg-d': '#160a2e', '--card-bg': '#ffffff', '--card-bg-d': '#21123e', '--card-bg-inner-d': '#2d1855', '--sb-bg-d': '#1e1040', '--sb-hover-d': '#27134f' },
  sky:     { '--sb-bg': '#075985', '--sb-hover': '#0369a1', '--sb-border': 'rgba(14,165,233,0.3)', '--accent': '#0284c7', '--accent-dark': '#7dd3fc', '--page-bg': '#f0f9ff',  '--page-bg-d': '#071827', '--card-bg': '#ffffff', '--card-bg-d': '#0d253a', '--card-bg-inner-d': '#173348', '--sb-bg-d': '#0e2638', '--sb-hover-d': '#133148' },
  stone:   { '--sb-bg': '#1c1917', '--sb-hover': '#292524', '--sb-border': 'rgba(168,162,158,0.3)','--accent': '#78716c', '--accent-dark': '#d6d3d1', '--page-bg': '#f9f8f7',  '--page-bg-d': '#131110', '--card-bg': '#ffffff', '--card-bg-d': '#1e1c1a', '--card-bg-inner-d': '#282624', '--sb-bg-d': '#1a1815', '--sb-hover-d': '#22201e' },
};

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [darkMode, setDarkMode] = useState(false);
  const [colorScheme, setColorScheme] = useState('classic');
  const [isLoading, setIsLoading] = useState(true);
  const [previousView, setPreviousView] = useState<View>('landing');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
        .select('dark_mode, color_scheme')
        .eq('user_id', user.data.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDarkMode(data.dark_mode);
        setColorScheme(data.color_scheme || 'classic');
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

          const { data: memberData } = await supabase
            .from('organization_members')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

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
            // Don't change the view on token refresh, just update the role if needed
            if (session) {
              const memberQuery = supabase
                .from('organization_members')
                .select('role')
                .eq('user_id', session.user.id)
                .maybeSingle();

              const timeout = new Promise<{ data: null }>((resolve) => {
                setTimeout(() => resolve({ data: null }), 2000);
              });

              const result = await Promise.race([memberQuery, timeout]);

              if (result.data) {
                setUserRole(result.data.role);
                localStorage.setItem('userRole', result.data.role);
              } else {
                setUserRole(null);
                localStorage.removeItem('userRole');
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
              .maybeSingle();

            const timeout = new Promise<{ data: null }>((resolve) => {
              setTimeout(() => resolve({ data: null }), 2000);
            });

            const result = await Promise.race([memberQuery, timeout]);

            if (result.data) {
              setUserRole(result.data.role);
              localStorage.setItem('userRole', result.data.role);
            } else {
              setUserRole(null);
              localStorage.removeItem('userRole');
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
    } catch (error) {
      console.error('Error updating dark mode:', error);
      alert('Failed to update dark mode setting. Please try again.');
    }
  };

  const updateColorScheme = async (scheme: string) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({ color_scheme: scheme, updated_at: new Date().toISOString() })
        .eq('user_id', user.data.user.id);

      if (error) throw error;
      setColorScheme(scheme);
    } catch (error) {
      console.error('Error updating color scheme:', error);
    }
  };

  const handleLogin = () => {
    updateView('dashboard');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('loginType');
    localStorage.removeItem('userRole');
    localStorage.removeItem('organizationId');
    updateView('landing');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-om-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-om-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, colorScheme, updateColorScheme }}>
      <EmailProvider>
        <DashboardProvider>
          <div
            className={darkMode ? 'dark' : ''}
            style={(SCHEME_VARS[colorScheme] ?? SCHEME_VARS['indigo']) as React.CSSProperties}
          >
            {view === 'team-management' && (
              <TeamManagement onSignOut={handleSignOut} />
            )}
            {view === 'dashboard' || view === 'settings' || view === 'emails' || view === 'addresses' || view === 'prompts' || view === 'crm' || view === 'calendar' || view === 'support' || view === 'integrations' || view === 'team-view' ? (
              <div className="flex min-h-screen app-bg">
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
                  isOpen={mobileNavOpen}
                  onClose={() => setMobileNavOpen(false)}
                />
                <div className="flex-1 md:ml-64 min-w-0">
                  {/* Mobile top bar */}
                  <div
                    className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 text-white shadow"
                    style={{ backgroundColor: darkMode ? (SCHEME_VARS[colorScheme]?.['--sb-bg-d'] ?? '#1e1b4b') : (SCHEME_VARS[colorScheme]?.['--sb-bg'] ?? '#3730a3') }}
                  >
                    <button
                      onClick={() => setMobileNavOpen(true)}
                      className="p-1.5 rounded transition-colors"
                      style={{}}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = darkMode ? (SCHEME_VARS[colorScheme]?.['--sb-hover-d'] ?? '#2a2568') : (SCHEME_VARS[colorScheme]?.['--sb-hover'] ?? '#4338ca'))}
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
                    <Support onSignOut={handleSignOut} currentView={view} />
                  )}
                  {view === 'integrations' && (
                    <Integrations onSignOut={handleSignOut} currentView={view} />
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
  );
}