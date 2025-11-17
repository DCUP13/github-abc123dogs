import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface CookiePolicyProps {
  onBackClick: () => void;
}

export function CookiePolicy({ onBackClick }: CookiePolicyProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <button
          onClick={onBackClick}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: November 17, 2025</p>

          <div className="prose prose-blue max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What Are Cookies</h2>
              <p className="text-gray-700 leading-relaxed">
                Cookies are small text files that are placed on your computer or mobile device when you visit a website.
                They are widely used to make websites work more efficiently and provide information to the website owners.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                LoiReply uses cookies to enhance your experience on our platform. We use cookies for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Essential Cookies:</strong> Required for the operation of our website, including authentication and security features.</li>
                <li><strong>Performance Cookies:</strong> Help us understand how visitors interact with our website by collecting anonymous information.</li>
                <li><strong>Functional Cookies:</strong> Enable enhanced functionality and personalization, such as remembering your preferences.</li>
                <li><strong>Analytics Cookies:</strong> Help us analyze user behavior to improve our services.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Types of Cookies We Use</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Session Cookies</h3>
                  <p className="text-gray-700 leading-relaxed">
                    These are temporary cookies that remain in your browser only until you close it. They help us maintain
                    your session and remember your activities during your visit.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Persistent Cookies</h3>
                  <p className="text-gray-700 leading-relaxed">
                    These cookies remain on your device for a set period or until you delete them. They help us recognize
                    you when you return to our website and remember your preferences.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Third-Party Cookies</h3>
                  <p className="text-gray-700 leading-relaxed">
                    We may use third-party services that set cookies on our behalf for analytics and functionality purposes.
                    These third parties include:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
                    <li>Authentication providers (Google OAuth)</li>
                    <li>Analytics services to understand user behavior</li>
                    <li>Service providers that help us deliver our platform</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Managing Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Setting or amending your web browser controls to accept or refuse cookies</li>
                <li>Deleting cookies from your browser at any time</li>
                <li>Blocking cookies by activating the setting on your browser that allows you to refuse all or some cookies</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                Please note that if you choose to block cookies, you may not be able to access all or parts of our website,
                and some functionality may not work as intended.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Browser Controls</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Most web browsers allow you to manage your cookie preferences. You can set your browser to refuse cookies
                or delete certain cookies. Here are links to cookie management in popular browsers:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Google Chrome: Settings → Privacy and security → Cookies and other site data</li>
                <li>Mozilla Firefox: Options → Privacy & Security → Cookies and Site Data</li>
                <li>Safari: Preferences → Privacy → Manage Website Data</li>
                <li>Microsoft Edge: Settings → Privacy, search, and services → Cookies and site permissions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookie Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                The length of time a cookie remains on your device depends on its type. Session cookies are automatically
                deleted when you close your browser, while persistent cookies remain until they expire or you delete them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Updates to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for legal,
                regulatory, or operational reasons. We will notify you of any material changes by posting the new policy
                on this page with an updated "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
              </p>
              <p className="text-gray-700 leading-relaxed mt-2">
                Email: <a href="mailto:support@loireply.com" className="text-blue-600 hover:text-blue-700">support@loireply.com</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
