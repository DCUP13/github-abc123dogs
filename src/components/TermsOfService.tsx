import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface TermsOfServiceProps {
  onBack: () => void;
}

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </button>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p>By accessing and using this email management and CRM platform (the "Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these Terms of Service, please do not use the Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <div className="space-y-4">
                <p>The Service provides tools for email management, automated responses, calendar synchronization, contact management, and customer relationship management (CRM) features. Specifically, the Service includes:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Email inbox management and organization</li>
                  <li>Automated email processing and response generation</li>
                  <li>Email template creation and management</li>
                  <li>Google Calendar integration and synchronization</li>
                  <li>Contact and client relationship tracking</li>
                  <li>Email draft creation and editing</li>
                  <li>Client grading and categorization</li>
                  <li>Custom prompt configuration for AI-powered features</li>
                </ul>
                <p className="mt-4">We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time with or without notice.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts and Registration</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">3.1 Account Creation</h3>
                  <p>To use the Service, you must create an account by providing a valid email address and password. You are responsible for maintaining the confidentiality of your account credentials.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">3.2 Account Responsibility</h3>
                  <p>You are responsible for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any other breach of security.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">3.3 Accurate Information</h3>
                  <p>You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">3.4 Age Requirement</h3>
                  <p>You must be at least 13 years old to use the Service. By using the Service, you represent and warrant that you meet this age requirement.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Acceptable Use Policy</h2>
              <div className="space-y-4">
                <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Service to send spam, unsolicited emails, or bulk commercial messages</li>
                  <li>Violate any applicable laws, regulations, or third-party rights</li>
                  <li>Upload, transmit, or distribute any malicious code, viruses, or harmful software</li>
                  <li>Attempt to gain unauthorized access to the Service, other accounts, or computer systems</li>
                  <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
                  <li>Collect or harvest any information about other users without their consent</li>
                  <li>Use the Service to harass, abuse, threaten, or intimidate others</li>
                  <li>Engage in any activity that could damage, disable, or impair the Service</li>
                  <li>Use automated systems or software to extract data from the Service without permission</li>
                  <li>Reverse engineer, decompile, or disassemble any aspect of the Service</li>
                  <li>Remove or modify any proprietary notices or labels on the Service</li>
                </ul>
                <p className="mt-4 font-medium">Violation of this Acceptable Use Policy may result in immediate termination of your account without notice.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Third-Party Integrations</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">5.1 Google Calendar Integration</h3>
                  <p>The Service integrates with Google Calendar through OAuth authentication. By connecting your Google Calendar, you grant us permission to access, read, and sync your calendar events. You can revoke this access at any time through your account settings or Google account settings.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">5.2 Email Service Integration</h3>
                  <p>The Service processes emails through Amazon SES and other email service providers. You authorize us to send and receive emails on your behalf as configured in your settings.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">5.3 AI Processing</h3>
                  <p>The Service uses artificial intelligence (OpenAI) to process emails, generate responses, and categorize content. By using these features, you acknowledge that your email content may be processed by third-party AI services in accordance with our Privacy Policy.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">5.4 Third-Party Terms</h3>
                  <p>Your use of third-party integrations is subject to the respective third-party terms of service and privacy policies. We are not responsible for the practices or policies of third-party services.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data and Privacy</h2>
              <div className="space-y-4">
                <p>Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy. By using the Service, you consent to our collection and use of information as described in the Privacy Policy.</p>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">6.1 Your Data</h3>
                  <p>You retain all ownership rights to your data, including emails, contacts, calendar events, and templates. We claim no ownership rights over your content.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">6.2 Data Security</h3>
                  <p>We implement reasonable security measures to protect your data. However, no system is completely secure, and we cannot guarantee absolute security of your data.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">6.3 Data Backup</h3>
                  <p>While we perform regular backups, you are responsible for maintaining your own backup copies of important data. We are not liable for any loss of data.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">7.1 Service Ownership</h3>
                  <p>The Service, including its original content, features, and functionality, is owned by us and is protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">7.2 Limited License</h3>
                  <p>We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your personal or business purposes in accordance with these Terms.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">7.3 User Content License</h3>
                  <p>By uploading or creating content through the Service (such as templates, prompts, or custom settings), you grant us a license to use, store, and process that content solely to provide the Service to you.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Service Availability and Modifications</h2>
              <div className="space-y-4">
                <p>We strive to provide reliable service but cannot guarantee uninterrupted or error-free operation. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.</p>
                <p>We reserve the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Modify or discontinue any part of the Service</li>
                  <li>Change features, functionality, or user interface</li>
                  <li>Implement usage limits or restrictions</li>
                  <li>Update these Terms of Service</li>
                </ul>
                <p className="mt-4">We will provide reasonable notice of material changes when possible, but reserve the right to make changes without notice for security or legal reasons.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Fees and Payment</h2>
              <div className="space-y-4">
                <p>Certain features of the Service may be provided for a fee. If you choose to use paid features:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You agree to pay all applicable fees as described at the time of purchase</li>
                  <li>All fees are non-refundable unless otherwise stated</li>
                  <li>We reserve the right to change our fees with notice</li>
                  <li>Failure to pay fees may result in suspension or termination of your account</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Termination</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">10.1 Termination by You</h3>
                  <p>You may terminate your account at any time through your account settings. Upon termination, your data will be deleted in accordance with our data retention policies.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">10.2 Termination by Us</h3>
                  <p>We reserve the right to suspend or terminate your account if you violate these Terms, engage in fraudulent activity, or for any other reason at our sole discretion. We may terminate accounts with or without notice.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">10.3 Effect of Termination</h3>
                  <p>Upon termination, your right to use the Service immediately ceases. We may delete your data after a reasonable period following termination.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Disclaimers and Limitations of Liability</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">11.1 "AS IS" Service</h3>
                  <p className="uppercase font-semibold">THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">11.2 No Guarantees</h3>
                  <p>We do not guarantee that:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>The Service will meet your specific requirements</li>
                    <li>The Service will be uninterrupted, timely, secure, or error-free</li>
                    <li>Results obtained from the Service will be accurate or reliable</li>
                    <li>AI-generated content will be appropriate or error-free</li>
                    <li>Any errors in the Service will be corrected</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">11.3 Limitation of Liability</h3>
                  <p className="uppercase font-semibold mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.</p>
                  <p>Our total liability to you for all claims arising from or related to the Service shall not exceed the amount you paid us in the twelve months preceding the claim.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Indemnification</h2>
              <p>You agree to indemnify, defend, and hold harmless the Service, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses, including reasonable attorney fees, arising out of or in any way connected with your access to or use of the Service, your violation of these Terms, or your violation of any rights of another party.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Dispute Resolution</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">13.1 Informal Resolution</h3>
                  <p>If you have any dispute with us, you agree to first contact us and attempt to resolve the dispute informally.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">13.2 Governing Law</h3>
                  <p>These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">13.3 Arbitration</h3>
                  <p>Any disputes that cannot be resolved informally shall be resolved through binding arbitration, except that either party may seek injunctive relief in court for intellectual property infringement or violation of confidentiality obligations.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">14. General Provisions</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">14.1 Entire Agreement</h3>
                  <p>These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the Service.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">14.2 Severability</h3>
                  <p>If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">14.3 Waiver</h3>
                  <p>Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">14.4 Assignment</h3>
                  <p>You may not assign or transfer these Terms without our prior written consent. We may assign these Terms without restriction.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">14.5 Updates to Terms</h3>
                  <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
              <p>If you have questions about these Terms of Service, please contact us through your account settings or customer support channels provided within the Service.</p>
            </section>

            <section className="border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Terms Summary</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-3">Important Points:</h3>
                <ul className="space-y-2 text-green-900">
                  <li>✓ Use the Service responsibly and lawfully</li>
                  <li>✓ You own your data; we protect it with strong security measures</li>
                  <li>✓ No spam, harassment, or unauthorized access attempts</li>
                  <li>✓ Third-party integrations subject to their own terms</li>
                  <li>✓ We may modify the Service with notice when possible</li>
                  <li>✓ You can terminate your account anytime</li>
                  <li>✓ Service provided "as is" without guarantees</li>
                  <li>✓ Review our Privacy Policy for data handling details</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
