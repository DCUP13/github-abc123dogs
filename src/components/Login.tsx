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

    console.log('Login attempt started:', { email: formData.email, loginType });

    try {
      console.log('Using direct fetch for login...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Aborting login after 10 seconds');
        controller.abort();
      }, 10000);

      let user;

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        console.log('Making direct fetch to auth endpoint...');
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
        console.log('Direct fetch completed:', { status: response.status });

        const data = await response.json();
        console.log('Response data:', { hasAccessToken: !!data.access_token, hasError: !!data.error });

        if (!response.ok) {
          const errorMsg = data.error_description || data.msg || data.error || 'Invalid login credentials';
          if (errorMsg.includes('Invalid login')) {
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

        console.log('Setting session in Supabase client...');
        try {
          const sessionResult = await Promise.race([
            supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Session setup timeout')), 5000)
            )
          ]);
          console.log('Session set successfully', sessionResult);
        } catch (sessionError) {
          console.error('Session setup error:', sessionError);
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

        let memberData = null;
        try {
          const memberQuery = supabase
            .from('organization_members')
            .select('role, organization_id')
            .eq('user_id', user.id)
            .maybeSingle();

          const { data } = await Promise.race([
            memberQuery,
            new Promise<any>((_, reject) =>
              setTimeout(() => reject(new Error('Organization check timeout')), 5000)
            )
          ]);

          memberData = data;
        } catch (e) {
          console.log('Could not fetch member data, continuing as owner:', e);
        }

        console.log('Member data:', memberData);

        const userRole = memberData?.role || 'owner';

        if (loginType === 'manager' && memberData && userRole === 'member') {
          localStorage.clear();
          throw new Error('You do not have manager permissions. Please login as a member.');
        }

        localStorage.setItem('userRole', userRole);
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
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>
      <div className="flex items-center gap-3 mb-8">
        <LogIn className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-800">Login</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {status === 'error' && (
          <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Login As
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setLoginType('member')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                loginType === 'member'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Member
            </button>
            <button
              type="button"
              onClick={() => setLoginType('manager')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                loginType === 'manager'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Manager
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className={`w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            status === 'loading' 
              ? 'bg-indigo-400 cursor-wait' 
              : status === 'success'
              ? 'bg-green-500 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-700'
          } text-white`}
        >
          {status === 'loading' ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Logging in...
            </>
          ) : status === 'success' ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Welcome Back!
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Login
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onRegisterClick}
          className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Create an account
        </button>
      </div>
    </>
  );
}