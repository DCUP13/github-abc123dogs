import React, { useState, useRef } from 'react';
import { X, Send, User, Mail as MailIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEmails } from '../contexts/EmailContext';
import { RichTextEditor, type RichTextEditorRef } from '../features/templates/components/RichTextEditor';

interface ComposeEmailDialogProps {
  onClose: () => void;
  onSend?: () => void;
}

export function ComposeEmailDialog({ onClose, onSend }: ComposeEmailDialogProps) {
  const { sesEmails, googleEmails, sesDomains } = useEmails();
  const editorRef = useRef<RichTextEditorRef>(null);
  const [fromEmail, setFromEmail] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [customFromEmail, setCustomFromEmail] = useState('');
  const [showCustomFrom, setShowCustomFrom] = useState(false);

  // Get configured email addresses
  const configuredEmails = [
    ...sesEmails.map(email => ({ address: email.address, provider: 'Amazon SES' })),
    ...googleEmails.map(email => ({ address: email.address, provider: 'Gmail' }))
  ];

  // Generate domain-based email options
  const domainEmails = sesDomains.flatMap(domain => [
    { address: `info@${domain}`, provider: 'SES Domain', isDomain: true },
    { address: `support@${domain}`, provider: 'SES Domain', isDomain: true },
    { address: `noreply@${domain}`, provider: 'SES Domain', isDomain: true },
    { address: `custom@${domain}`, provider: 'SES Domain', isDomain: true, isCustom: true }
  ]);

  const allEmailOptions = [...configuredEmails, ...domainEmails];

  const handleFromEmailChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomFrom(true);
      setFromEmail('');
    } else if (value.includes('custom@')) {
      setShowCustomFrom(true);
      const domain = value.split('@')[1];
      setCustomFromEmail(`@${domain}`);
      setFromEmail('');
    } else {
      setShowCustomFrom(false);
      setFromEmail(value);
      setCustomFromEmail('');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const body = editorRef.current?.getContent() || '';
    const finalFromEmail = showCustomFrom ? customFromEmail : fromEmail;
    
    if (!finalFromEmail || !toEmail || !body.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    // Validate custom email format
    if (showCustomFrom && !customFromEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsSending(true);
    
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      // Add to outbox
      const { error } = await supabase
        .from('email_outbox')
        .insert({
          user_id: user.data.user.id,
          to_email: toEmail,
          from_email: finalFromEmail,
          subject: subject.trim() || '(No Subject)',
          body: body.trim(),
          status: 'pending'
        });

      if (error) throw error;

      // Try to send immediately
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.ok) {
            alert('Email sent successfully!');
          } else {
            alert('Email added to outbox. It will be sent shortly.');
          }
        } catch {
          alert('Email added to outbox. It will be sent shortly.');
        }
      }

      onSend?.();
      onClose();
      
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  if (allEmailOptions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Compose Email</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              No sender email addresses configured
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Please configure Amazon SES or Gmail SMTP settings in the Settings page before sending emails.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-5xl my-4 flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Compose Email</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSend} className="flex-1 flex flex-col">
          <div className="p-4 space-y-2 flex-shrink-0">
            {/* From field */}
            <div>
              <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From
              </label>
              {showCustomFrom ? (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={customFromEmail}
                    onChange={(e) => setCustomFromEmail(e.target.value)}
                    placeholder="your-email@domain.com"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomFrom(false);
                      setCustomFromEmail('');
                    }}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  id="fromEmail"
                  value={fromEmail}
                  onChange={(e) => handleFromEmailChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select sender email</option>
                  {configuredEmails.map((email) => (
                    <option key={email.address} value={email.address}>
                      {email.address} ({email.provider})
                    </option>
                  ))}
                  {sesDomains.length > 0 && (
                    <optgroup label="SES Domains">
                      {domainEmails.filter(email => !email.isCustom).map((email) => (
                        <option key={email.address} value={email.address}>
                          {email.address}
                        </option>
                      ))}
                      {sesDomains.map(domain => (
                        <option key={`custom@${domain}`} value={`custom@${domain}`}>
                          Custom address @{domain}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
            </div>
            
            {/* To field */}
            <div>
              <label htmlFor="toEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To
              </label>
              <input
                id="toEmail"
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="recipient@example.com"
                required
              />
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Email subject"
              />
            </div>
          </div>

          {/* Message Body */}
          <div className="flex-1 p-4 flex flex-col min-h-0">
            <label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <div className="flex-1 min-h-0">
              <RichTextEditor
                ref={editorRef}
                content=""
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white ${
                isSending 
                  ? 'bg-indigo-400 cursor-wait' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}