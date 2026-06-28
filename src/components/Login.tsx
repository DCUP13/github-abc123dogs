import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onRegisterClick: () => void;
  onLoginSuccess: () => void;
  onBackToHome: () => void;
}

export function Login({ onRegisterClick, onLoginSuccess, onBackToHome }: LoginProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loginType, setLoginType] = useState<'manager' | 'member'>('member');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    console.log('Clearing existing auth state before login...');
    localStorage.removeItem('supabase.auth.token');

    console.log('Login attempt started:', { email: formData.email, loginType });

    try {
      console.log('Checking for invitation with temporary password...');

      let invitation = null;
      try {
        const invitationQuery = supabase
          .from('member_invitations')
          .select('*')
          .eq('email', formData.email)
          .eq('temporary_password', formData.password)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        const { data, error } = await Promise.race([
          invitationQuery,
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('Invitation check timeout')), 5000)
          )
        ]);

        if (error) {
          console.log('Error checking invitation:', error);
        } else {
          invitation = data;
        }
      } catch (inviteError) {
        console.log('Could not check invitation, continuing with regular login:', inviteError);
      }

      console.log('Invitation check complete:', { found: !!invitation });

      if (invitation) {
        console.log('Valid invitation found, creating account...');

        const joinResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/join-organization`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
              organization_id: invitation.organization_id,
              role: invitation.role || 'member',
              invitation_id: invitation.id
            })
          }
        );

        if (!joinResponse.ok) {
          const error = await joinResponse.json();
          throw new Error(error.error || 'Failed to join organization');
        }

        const result = await joinResponse.json();

        if (!result.session) {
          throw new Error('No session returned from server');
        }

        supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token
        }).catch((sessionError) => {
          console.error('Session setup error (non-blocking):', sessionError);
        });

        localStorage.setItem('userRole', invitation.role || 'member');
        localStorage.setItem('loginType', loginType);
        localStorage.setItem('organizationId', invitation.organization_id);
        localStorage.setItem('needsPasswordChange', 'true');

        console.log('Invitation accepted successfully');
        setStatus('success');
        setTimeout(() => {
          setStatus('idle');
          setFormData({ email: '', password: '' });
          onLoginSuccess();
        }, 1000);
        return;
      }

      console.log('No invitation found, attempting regular login...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let user;

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
          const errorMsg = data.error_description || data.msg || data.error || 'Invalid login credentials';
          if (errorMsg.includes('Invalid login') || errorMsg.includes('invalid_credentials')) {
            throw new Error('The email or password you entered is incorrect. Please try again.');
          }
          if (errorMsg.includes('Email not confirmed')) {
            throw new Error('Please check your email to confirm your account before logging in.');
          }
          throw new Error(errorMsg);
        }

        if (!data.access_token || !data.user) {
          throw new Error('Invalid response from authentication service');
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });

        if (sessionError) {
          throw new Error(sessionError.message || 'Failed to establish session');
        }

        user = data.user;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Login request timed out. The authentication service may be temporarily unavailable.');
        }
        throw fetchError;
      }

      console.log('Login successful, user retrieved:', { userId: user?.id });

      if (user) {
        console.log('Checking organization membership...');

        let memberData: { role: string; organization_id: string } | null = null;
        try {
          const memberQuery = supabase
            .from('organization_members')
            .select('role, organization_id')
            .eq('user_id', user.id)
            .order('joined_at', { ascending: true });

          const { data } = await Promise.race([
            memberQuery,
            new Promise<any>((_, reject) =>
              setTimeout(() => reject(new Error('Organization check timeout')), 5000)
            )
          ]);

          // Pick owner row first, otherwise first membership
          memberData = (data as any[])?.find((r: any) => r.role === 'owner') ?? (data as any[])?.[0] ?? null;
        } catch (e) {
          console.log('Could not fetch member data:', e);
        }

        console.log('Member data:', memberData);

        const userRole = memberData?.role ?? null;

        if (loginType === 'manager' && memberData && userRole === 'member') {
          localStorage.clear();
          throw new Error('You do not have manager permissions. Please login as a member.');
        }

        if (userRole) localStorage.setItem('userRole', userRole);
        else localStorage.removeItem('userRole');
        localStorage.setItem('loginType', loginType);
        if (memberData?.organization_id) {
          localStorage.setItem('organizationId', memberData.organization_id);
        }
      }

      console.log('Login complete, calling onLoginSuccess');
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setFormData({ email: '', password: '' });
        onLoginSuccess();
      }, 1000);
    } catch (error) {
      console.error('Login error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to sign in');
    }
  };

  return (
    <>
      <button
        onClick={onBackToHome}
        className="flex items-center gap-2 text-om-brown hover:text-om-forest-deep mb-6 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>
      <div className="flex items-center gap-3 mb-8">
        <LogIn className="w-5 h-5 text-om-forest" />
        <h1 className="text-2xl font-display font-semibold text-om-forest-deep">Sign In</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {status === 'error' && (
          <div className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-om-brown uppercase tracking-widest mb-2">
            Login As
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setLoginType('member')}
              className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-all border ${
                loginType === 'member'
                  ? 'bg-om-forest border-om-forest text-om-cream'
                  : 'bg-transparent border-om-tan text-om-mahogany hover:border-om-brown'
              }`}
            >
              Member
            </button>
            <button
              type="button"
              onClick={() => setLoginType('manager')}
              className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-all border ${
                loginType === 'manager'
                  ? 'bg-om-forest border-om-forest text-om-cream'
                  : 'bg-transparent border-om-tan text-om-mahogany hover:border-om-brown'
              }`}
            >
              Manager
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-om-brown uppercase tracking-widest mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-2.5 border border-om-tan rounded bg-om-cream text-om-forest-deep placeholder-om-brown/50 focus:ring-1 focus:ring-om-gold focus:border-om-gold outline-none transition-colors text-base"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-om-brown uppercase tracking-widest mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-2.5 border border-om-tan rounded bg-om-cream text-om-forest-deep placeholder-om-brown/50 focus:ring-1 focus:ring-om-gold focus:border-om-gold outline-none transition-colors text-base"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-om-brown hover:text-om-mahogany"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className={`w-full py-2.5 px-4 rounded text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            status === 'loading'
              ? 'bg-om-forest/60 cursor-wait text-om-cream'
              : status === 'success'
              ? 'bg-om-forest-dark cursor-default text-om-cream'
              : 'bg-om-forest hover:bg-om-forest-dark text-om-cream'
          }`}
        >
          {status === 'loading' ? (
            <>
              <div className="w-4 h-4 border-2 border-om-cream border-t-transparent rounded-full animate-spin" />
              Signing in…
            </>
          ) : status === 'success' ? (
            <>
              <div className="w-4 h-4 border-2 border-om-cream border-t-transparent rounded-full animate-spin" />
              Welcome Back!
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign In
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onRegisterClick}
          className="inline-flex items-center gap-2 text-sm text-om-forest hover:text-om-forest-dark font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Create an account
        </button>
      </div>
    </>
  );
}