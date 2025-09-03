import React, { createContext, useContext, useState, useEffect } from 'react';
import type { SESEmail, GoogleEmail } from '../components/settings/types';
import { supabase } from '../lib/supabase';

interface EmailContextType {
  sesEmails: SESEmail[];
  googleEmails: GoogleEmail[];
  sesDomains: string[];
  setSesEmails: (emails: SESEmail[]) => void;
  setGoogleEmails: (emails: GoogleEmail[]) => void;
  setSesDomains: (domains: string[]) => void;
  refreshEmails: () => Promise<void>;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export function EmailProvider({ children }: { children: React.ReactNode }) {
  const [sesEmails, setSesEmails] = useState<SESEmail[]>([]);
  const [googleEmails, setGoogleEmails] = useState<GoogleEmail[]>([]);
  const [sesDomains, setSesDomains] = useState<string[]>([]);

  const fetchEmails = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      // Fetch Amazon SES emails
      const { data: sesData, error: sesError } = await supabase
        .from('amazon_ses_emails')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('address', { ascending: true });

      if (sesError) throw sesError;
      setSesEmails(sesData?.map(email => ({
        address: email.address,
        dailyLimit: email.daily_limit,
        sentEmails: email.sent_emails,
        isLocked: email.sent_emails >= email.daily_limit
      })) || []);

      // Fetch Google SMTP emails
      const { data: googleData, error: googleError } = await supabase
        .from('google_smtp_emails')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('address', { ascending: true });

      if (googleError) throw googleError;
      setGoogleEmails(googleData?.map(email => ({
        address: email.address,
        appPassword: email.app_password,
        dailyLimit: email.daily_limit,
        sentEmails: email.sent_emails,
        isLocked: email.sent_emails >= email.daily_limit
      })) || []);

      // Set empty domains for now
      setSesDomains([]);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEmails();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchEmails();
      } else if (event === 'SIGNED_OUT') {
        setSesEmails([]);
        setGoogleEmails([]);
        setSesDomains([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    sesEmails,
    googleEmails,
    sesDomains,
    setSesEmails,
    setGoogleEmails,
    setSesDomains,
    refreshEmails: fetchEmails
  };

  return (
    <EmailContext.Provider value={value}>
      {children}
    </EmailContext.Provider>
  );
}

export function useEmails() {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmails must be used within an EmailProvider');
  }
  return context;
}