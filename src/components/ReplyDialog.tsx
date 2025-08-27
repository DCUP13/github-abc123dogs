import React, { useState, useEffect } from 'react';
import { X, Send, User } from 'lucide-react';
import { useEmails } from '../contexts/EmailContext';
import { RichTextEditor, type RichTextEditorRef } from '../features/templates/components/RichTextEditor';

interface Email {
  id: string;
  sender: string;
  receiver: string;
  subject: string;
  body: string;
  created_at: string;
}

interface ReplyDialogProps {
  originalEmail: Email;
  onSend: (replyData: {
    to: string;
    from: string;
    subject: string;
    body: string;
  }) => void;
  onClose: () => void;
}

export function ReplyDialog({ originalEmail, onSend, onClose }: ReplyDialogProps) {
  const { sesEmails, googleEmails } = useEmails();
  const editorRef = React.useRef<RichTextEditorRef>(null);
  const [fromEmail, setFromEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [initialBody, setInitialBody] = useState('');

  // Get configured email addresses
  const configuredEmails = [
    ...sesEmails.map(email => ({ address: email.address, provider: 'Amazon SES' })),
    ...googleEmails.map(email => ({ address: email.address, provider: 'Gmail' }))
  ];

  // Add the recipient email (the email that received the original message) as an option
  const availableEmails = [
    // Add recipient email first (it's the most logical choice for replies)
    { address: originalEmail.receiver, provider: 'AWS Domain' },
    ...configuredEmails.filter(email => email.address !== originalEmail.receiver)
  ];

  useEffect(() => {
    // Set default from email
    if (availableEmails.length > 0) {
      // Default to the email that received the message (most logical for replies)
      setFromEmail(originalEmail.receiver);
    }

    // Set reply subject
    const replySubject = originalEmail.subject?.startsWith('Re: ') 
      ? originalEmail.subject 
      : `Re: ${originalEmail.subject || '(No Subject)'}`;
    setSubject(replySubject);

    // Set reply body with original message
    const originalDate = new Date(originalEmail.created_at).toLocaleString();
    const replyBody = `<br><br><br><br><br><br>--- Original Message ---<br><br>From: ${originalEmail.sender}<br><br>Date: ${originalDate}<br><br>Subject: ${originalEmail.subject || '(No Subject)'}<br><br>${originalEmail.body || ''}`;
    setInitialBody(replyBody);
  }, [originalEmail, availableEmails]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    
    const body = editorRef.current?.getContent() || '';
    if (!fromEmail || !body.trim()) {
      alert('Please select a sender email and enter a message.');
      return;
    }

    onSend({
      to: originalEmail.sender,
      from: fromEmail,
      subject: subject.trim(),
      body: body.trim()
    });
  };

  if (availableEmails.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Reply</h3>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-5xl h-[600px] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Reply</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSend} className="flex-1 flex flex-col">
          <div className="p-4 space-y-2 flex-shrink-0">
            {/* Original Email Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <User className="w-4 h-4" />
                <span>Replying to: {originalEmail.sender}</span>
              </div>
            </div>

            {/* From and To fields side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From
                </label>
                <select
                  id="fromEmail"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select sender email</option>
                  {availableEmails.map((email) => (
                    <option key={email.address} value={email.address}>
                      {email.address} ({email.provider})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="toEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To
                </label>
                <input
                  id="toEmail"
                  type="email"
                  value={originalEmail.sender}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                />
              </div>
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
                placeholder="Reply subject"
              />
            </div>
          </div>

          {/* Message Body */}
          <div className="flex-1 p-4 flex flex-col">
            <label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <div className="flex-1">
              <RichTextEditor
                ref={editorRef}
                content={initialBody}
                className="h-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Reply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}