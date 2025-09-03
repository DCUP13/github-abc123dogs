import React, { createContext, useContext, useState, useEffect } from 'react';
import type { SESEmail, GoogleEmail } from '../components/settings/types';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchEmails = async (user?: User) => {
    const userToUse = user || currentUser;
    if (!userToUse) return;

    try {
      // Fetch Amazon SES emails
      const { data: sesData, error: sesError } = await supabase
        .from('amazon_ses_emails')
        .select('*')
        .eq('user_id', userToUse.id)
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
        .eq('user_id', userToUse.id)
        .order('address', { ascending: true });

      if (googleError) throw googleError;
      setGoogleEmails(googleData?.map(email => ({
        address: email.address,
        appPassword: email.app_password,
        dailyLimit: email.daily_limit,
        sentEmails: email.sent_emails,
        isLocked: email.sent_emails >= email.daily_limit
      })) || []);

      // Skip SES domains fetch until table is created via migration
      // TODO: Enable this once amazon_ses_domains table migration is applied
      setSesDomains([]);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }

    // Fetch SES domains
    try {
      const { data: domainsData, error: domainsError } = await supabase
        .from('amazon_ses_domains')
        .select('domain')
        .eq('user_id', userToUse.id)
        .order('domain', { ascending: true });

      if (domainsError) throw domainsError;
      setSesDomains(domainsData?.map(d => d.domain) || []);
    } catch (error) {
      console.error('Error fetching SES domains:', error);
      setSesDomains([]);
    }
  };

  // Initial fetch
  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        await fetchEmails(user);
      }
    };

    initializeAuth();
  }, []);

  // Handle auth state changes
  useEffect(() => {
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      const user = session?.user || null;
      setCurrentUser(user);
      
      if (event === 'SIGNED_IN' && user) {
        fetchEmails(user);
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

  // Handle realtime subscriptions
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to realtime changes for amazon_ses_emails
    const sesSubscription = supabase
      .channel('amazon_ses_emails_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'amazon_ses_emails'
      }, () => {
        fetchEmails();
      })
      .subscribe();

    // Subscribe to realtime changes for google_smtp_emails
    const googleSubscription = supabase
      .channel('google_smtp_emails_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'google_smtp_emails'
      }, () => {
        fetchEmails();
      })
      .subscribe();

    return () => {
      sesSubscription.unsubscribe();
      googleSubscription.unsubscribe();
    };
  }, [currentUser]);

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