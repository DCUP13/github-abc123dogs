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
import { AlertCircle } from 'lucide-react';
import { DashboardProvider } from './contexts/DashboardContext';

type View = 'landing' | 'login' | 'register' | 'dashboard' | 'app' | 'settings' | 'templates' | 'emails' | 'addresses' | 'prompts' | 'crm' | 'calendar' | 'support' | 'integrations' | 'team-management' | 'team-view' | 'google-callback' | 'privacy-policy' | 'terms-of-service' | 'cookie-policy' | 'features' | 'pricing' | 'security' | 'updates' | 'about';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: async () => {},
});

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previousView, setPreviousView] = useState<View>('landing');
  const [userRole, setUserRole] = useState<string | null>(null);

  const updateView = (newView: View) => {
    setPreviousView(view);
    setView(newView);
    const path = newView === 'landing' ? '/' : `/${newView}`;
    window.history.pushState({}, '', path);
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
        .select('dark_mode')
        .eq('user_id', user.data.user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setDarkMode(data.dark_mode);
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
            clean_up_loi: false
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
        }

        console.log('Calling getSession...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('getSession completed:', { session: !!session, error });

        if (error) {
          console.error('Session error:', error);
          if (error.message.includes('Refresh Token')) {
            console.log('Clearing corrupted session data...');
            localStorage.clear();
          }
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

            if (loginType === 'manager' && ['owner', 'manager'].includes(memberData.role)) {
              console.log('Setting view to team-management');
              setView('team-management');
            } else {
              console.log('Setting view to dashboard');
              setView('dashboard');
            }
          } else {
            console.log('No organization membership found, setting view to dashboard');
            setUserRole(null);
            localStorage.removeItem('userRole');
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
        setView('landing');
      } finally {
        console.log('Setting isLoading to false');
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }

        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setView('landing');
          setDarkMode(false);
          setUserRole(null);
          return;
        }

        if (session) {
          const loginType = localStorage.getItem('loginType');

          const { data: memberData } = await supabase
            .from('organization_members')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (memberData) {
            setUserRole(memberData.role);
            localStorage.setItem('userRole', memberData.role);

            if (loginType === 'manager' && ['owner', 'manager'].includes(memberData.role)) {
              setView('team-management');
            } else {
              setView('dashboard');
            }
          } else {
            setUserRole(null);
            localStorage.removeItem('userRole');
            setView('dashboard');
          }

          fetchUserSettings();
        } else {
          setView('landing');
          setDarkMode(false);
          setUserRole(null);
        }
      } catch (error: any) {
        console.error('Auth state change error:', error);
        if (error?.message?.includes('Refresh Token')) {
          await supabase.auth.signOut();
          localStorage.clear();
        }
        setView('landing');
      }
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

  const handleLogin = () => {
    updateView('dashboard');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    updateView('landing');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <EmailProvider>
        <DashboardProvider>
          <div className={darkMode ? 'dark' : ''}>
            {view === 'team-management' && (
              <TeamManagement onSignOut={handleSignOut} />
            )}
            {view === 'dashboard' || view === 'settings' || view === 'emails' || view === 'addresses' || view === 'prompts' || view === 'crm' || view === 'calendar' || view === 'support' || view === 'integrations' || view === 'team-view' ? (
              <div className="flex min-h-screen bg-white dark:bg-gray-900">
                <div className="fixed inset-y-0 left-0 w-64">
                  <Sidebar
                    onSignOut={handleSignOut}
                    onHomeClick={() => updateView('dashboard')}
                    onSettingsClick={() => updateView('settings')}
                    onEmailsClick={() => updateView('emails')}
                    onAddressesClick={() => updateView('addresses')}
                    onPromptsClick={() => updateView('prompts')}
                    onCRMClick={() => updateView('crm')}
                    onCalendarClick={() => updateView('calendar')}
                    onSupportClick={() => updateView('support')}
                    onIntegrationsClick={() => updateView('integrations')}
                    {...(userRole === 'owner' || userRole === 'manager' ? { onTeamClick: () => updateView('team-view') } : {})}
                  />
                </div>
                <div className="flex-1 ml-64">
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
                    <EmailsInbox onSignOut={handleSignOut} currentView={view} />
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
                    <div className="p-8">
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
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md">
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