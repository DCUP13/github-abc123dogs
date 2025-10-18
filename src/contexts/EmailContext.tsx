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
  const [isFetching, setIsFetching] = useState(false);

  const fetchEmails = async () => {
    if (isFetching) return;

    setIsFetching(true);
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

      // Fetch SES domains
      const { data: domainsData, error: domainsError } = await supabase
        .from('amazon_ses_domains')
        .select('domain')
        .eq('user_id', user.data.user.id)
        .order('domain', { ascending: true });

      if (domainsError) throw domainsError;
      setSesDomains(domainsData?.map(d => d.domain) || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setIsFetching(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;
    let sesSubscription: any = null;
    let googleSubscription: any = null;

    const initialize = async () => {
      if (mounted) {
        await fetchEmails();
      }
    };

    initialize();

    // Subscribe to auth changes
    supabase.auth.onAuthStateChange((event) => {
      (async () => {
        if (event === 'SIGNED_IN' && mounted) {
          await fetchEmails();
        } else if (event === 'SIGNED_OUT' && mounted) {
          setSesEmails([]);
          setGoogleEmails([]);
          setSesDomains([]);
        }
      })();
    }).then(({ data }) => {
      if (mounted) {
        authSubscription = data.subscription;
      }
    });

    // Subscribe to realtime changes for amazon_ses_emails
    sesSubscription = supabase
      .channel('amazon_ses_emails_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'amazon_ses_emails'
      }, () => {
        if (mounted) {
          fetchEmails();
        }
      })
      .subscribe();

    // Subscribe to realtime changes for google_smtp_emails
    googleSubscription = supabase
      .channel('google_smtp_emails_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'google_smtp_emails'
      }, () => {
        if (mounted) {
          fetchEmails();
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      if (sesSubscription) {
        sesSubscription.unsubscribe();
      }
      if (googleSubscription) {
        googleSubscription.unsubscribe();
      }
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