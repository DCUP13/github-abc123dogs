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
import { EmailProvider } from './contexts/EmailContext';
import { supabase } from './lib/supabase';
import { AlertCircle } from 'lucide-react';
import { DashboardProvider } from './contexts/DashboardContext';

type View = 'login' | 'register' | 'dashboard' | 'app' | 'settings' | 'templates' | 'emails' | 'addresses' | 'prompts' | 'crm' | 'calendar';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: async () => {},
});

export default function App() {
  const [view, setView] = useState<View>('login');
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseError, setSupabaseError] = useState(false);

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
    // Check Supabase connection
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('profiles').select('count');
        if (error) throw error;
        setSupabaseError(false);
      } catch (error) {
        console.error('Supabase connection error:', error);
        setSupabaseError(true);
      }
    };

    checkConnection();

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error);
        // Don't set supabaseError to true here since other parts work
        setView('login');
      } else if (session) {
        setView('dashboard');
        fetchUserSettings();
      }
      setIsLoading(false);
    }).catch((error) => {
      console.error('Auth session check failed:', error);
      setView('login');
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (session) {
          setView('dashboard');
          fetchUserSettings();
        } else {
          setView('login');
          setDarkMode(false);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setView('login');
      }
    });

    return () => subscription.unsubscribe();
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
    setView('dashboard');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setView('login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (supabaseError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h1 className="text-xl font-semibold">Connection Error</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Unable to connect to the database. Please click the "Connect to Supabase" button in the top right corner to establish a connection.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <EmailProvider>
        <DashboardProvider>
          <div className={darkMode ? 'dark' : ''}>
            {view === 'dashboard' || view === 'settings' || view === 'emails' || view === 'addresses' || view === 'prompts' || view === 'crm' || view === 'calendar' ? (
              <div className="flex min-h-screen bg-white dark:bg-gray-900">
                <div className="fixed inset-y-0 left-0 w-64">
                  <Sidebar
                    onSignOut={handleSignOut}
                    onHomeClick={() => setView('dashboard')}
                    onSettingsClick={() => setView('settings')}
                    onEmailsClick={() => setView('emails')}
                    onAddressesClick={() => setView('addresses')}
                    onPromptsClick={() => setView('prompts')}
                    onCRMClick={() => setView('crm')}
                    onCalendarClick={() => setView('calendar')}
                  />
                </div>
                <div className="flex-1 ml-64">
                  {view === 'dashboard' && (
                    <Dashboard onSignOut={handleSignOut} currentView={view} />
                  )}
                  {view === 'settings' && (
                    <Settings onSignOut={handleSignOut} currentView={view} />
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
                </div>
              </div>
            ) : (
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md">
                  {view === 'login' ? (
                    <Login 
                      onRegisterClick={() => setView('register')}
                      onLoginSuccess={handleLogin}
                    />
                  ) : (
                    <Register onLoginClick={() => setView('login')} />
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