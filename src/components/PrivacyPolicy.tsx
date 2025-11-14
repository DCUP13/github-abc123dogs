import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">1.1 Account Information</h3>
                  <p>When you create an account, we collect your email address and encrypted password. This information is necessary to provide you with access to our services and to communicate with you about your account.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">1.2 Email Data</h3>
                  <p>With your explicit consent, we access and process emails through your connected email accounts. This includes email content, metadata (sender, recipient, subject, date), and attachments. We only access emails necessary to provide our services.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">1.3 Calendar Information</h3>
                  <p>If you connect your Google Calendar, we collect and sync calendar events including event titles, descriptions, dates, times, locations, and attendees. This data is used solely to display and manage your calendar within our application.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">1.4 Contact Information</h3>
                  <p>We store contact information you add or import, including names, email addresses, phone numbers, companies, and custom notes. This helps you manage your professional relationships.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">1.5 Usage Data</h3>
                  <p>We automatically collect information about how you interact with our services, including feature usage, settings preferences, and email processing statistics.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <div className="space-y-4">
                <p>We use the collected information for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Service Delivery:</strong> To provide, maintain, and improve our email management, calendar synchronization, and CRM features</li>
                  <li><strong>Email Processing:</strong> To automatically categorize, respond to, and manage emails based on your configured settings and templates</li>
                  <li><strong>Calendar Management:</strong> To display, organize, and sync your calendar events across platforms</li>
                  <li><strong>Contact Management:</strong> To help you organize and track interactions with your contacts</li>
                  <li><strong>Personalization:</strong> To customize your experience based on your preferences and usage patterns</li>
                  <li><strong>Communication:</strong> To send you service-related notifications, updates, and important account information</li>
                  <li><strong>Security:</strong> To detect, prevent, and address technical issues, fraud, or security threats</li>
                  <li><strong>Analytics:</strong> To understand how our services are used and to improve functionality</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Data Storage and Security</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">3.1 Data Storage</h3>
                  <p>Your data is stored securely using Supabase, a leading database platform built on PostgreSQL. All data is stored in encrypted databases with enterprise-grade security measures.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">3.2 Encryption</h3>
                  <p>We use industry-standard encryption protocols:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>All data transmission uses TLS/SSL encryption</li>
                    <li>Passwords are hashed using bcrypt before storage</li>
                    <li>Database connections are encrypted</li>
                    <li>OAuth tokens are stored encrypted and refreshed automatically</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">3.3 Access Controls</h3>
                  <p>We implement Row Level Security (RLS) policies ensuring that users can only access their own data. No user can view or modify another user's information. All database queries are authenticated and authorized.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">3.4 Third-Party Services</h3>
                  <p>We use the following third-party services with appropriate security measures:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li><strong>Amazon SES:</strong> For sending and receiving emails securely</li>
                    <li><strong>Google Calendar API:</strong> For calendar synchronization (with your explicit OAuth consent)</li>
                    <li><strong>OpenAI API:</strong> For AI-powered email processing (data is not used for training)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
              <div className="space-y-4">
                <p>We do not sell, rent, or trade your personal information. We may share your information only in the following circumstances:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>With Your Consent:</strong> When you explicitly authorize us to share specific information</li>
                  <li><strong>Service Providers:</strong> With trusted third-party services that help us operate our platform (email delivery, AI processing, hosting) under strict confidentiality agreements</li>
                  <li><strong>Legal Requirements:</strong> When required by law, court order, or government regulation</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with notice to you)</li>
                  <li><strong>Protection:</strong> To protect the rights, property, or safety of our users or the public</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Your Rights and Choices</h2>
              <div className="space-y-4">
                <p>You have the following rights regarding your personal information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> You can access and review all your personal information within your account dashboard</li>
                  <li><strong>Correction:</strong> You can update or correct your information at any time through your account settings</li>
                  <li><strong>Deletion:</strong> You can delete your account and all associated data at any time. Data deletion is permanent and irreversible</li>
                  <li><strong>Export:</strong> You can export your data including templates, contacts, and settings</li>
                  <li><strong>Revoke Access:</strong> You can disconnect third-party integrations (Google Calendar, email accounts) at any time</li>
                  <li><strong>Opt-Out:</strong> You can disable automated email processing and choose which features to use</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <div className="space-y-4">
                <p>We retain your information for as long as your account is active or as needed to provide services. Specifically:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Data:</strong> Retained until you delete your account</li>
                  <li><strong>Emails:</strong> Retained based on your settings and storage limits</li>
                  <li><strong>Calendar Events:</strong> Synced and retained while your Google Calendar connection is active</li>
                  <li><strong>Logs:</strong> System logs are retained for 90 days for security and debugging purposes</li>
                  <li><strong>Deleted Data:</strong> Permanently removed from active systems within 30 days of deletion</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. International Data Transfers</h2>
              <p>Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable data protection laws.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p>Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to This Privacy Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of our services after changes constitutes acceptance of the updated policy.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
              <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us through your account settings or at the email address associated with your account support.</p>
            </section>

            <section className="border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Processing Summary</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">Our Commitment to Data Safety:</h3>
                <ul className="space-y-2 text-blue-900">
                  <li>✓ All data is encrypted in transit and at rest</li>
                  <li>✓ Row-level security ensures complete data isolation between users</li>
                  <li>✓ OAuth tokens are encrypted and automatically refreshed</li>
                  <li>✓ We never sell or share your data with advertisers</li>
                  <li>✓ AI processing is done securely without training on your data</li>
                  <li>✓ You maintain full control and can delete all data at any time</li>
                  <li>✓ Regular security audits and monitoring</li>
                  <li>✓ Compliance with industry-standard security practices</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
