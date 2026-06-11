import React, { useState } from 'react';
import { UserPlus, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RegisterProps {
  onLoginClick: () => void;
  onBackToHome: () => void;
}

export function Register({ onLoginClick, onBackToHome }: RegisterProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');
    
    if (formData.password !== formData.confirmPassword) {
      setStatus('error');
      setErrorMessage('Passwords do not match');
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        throw error;
      }

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setFormData({ email: '', password: '', confirmPassword: '' });
        onLoginClick();
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create account');
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
        <UserPlus className="w-5 h-5 text-om-forest" />
        <h1 className="text-2xl font-display font-semibold text-om-forest-deep">Create Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {status === 'error' && (
          <div className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-medium text-om-brown uppercase tracking-widest mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-2.5 border border-om-tan rounded bg-om-cream text-om-forest-deep placeholder-om-brown/50 focus:ring-1 focus:ring-om-gold focus:border-om-gold outline-none transition-colors text-sm"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-om-brown uppercase tracking-widest mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-2.5 border border-om-tan rounded bg-om-cream text-om-forest-deep placeholder-om-brown/50 focus:ring-1 focus:ring-om-gold focus:border-om-gold outline-none transition-colors text-sm"
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

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-medium text-om-brown uppercase tracking-widest mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-4 py-2.5 border border-om-tan rounded bg-om-cream text-om-forest-deep placeholder-om-brown/50 focus:ring-1 focus:ring-om-gold focus:border-om-gold outline-none transition-colors text-sm"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-om-brown hover:text-om-mahogany"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              Creating Account…
            </>
          ) : status === 'success' ? (
            <>
              <div className="w-4 h-4 border-2 border-om-cream border-t-transparent rounded-full animate-spin" />
              Account Created!
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Create Account
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onLoginClick}
          className="inline-flex items-center gap-2 text-sm text-om-forest hover:text-om-forest-dark font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>
      </div>
    </>
  );
}