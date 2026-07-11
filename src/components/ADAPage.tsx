import React from 'react';
import { ArrowLeft, Accessibility } from 'lucide-react';

interface ADAPageProps {
  onBack: () => void;
}

export default function ADAPage({ onBack }: ADAPageProps) {
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
          <div className="flex items-center gap-3 mb-2">
            <Accessibility className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Accessibility Statement</h1>
          </div>
          <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Our Commitment to Accessibility</h2>
              <p>
                LoiReply is committed to ensuring digital accessibility for people with disabilities. We continually
                improve the user experience for everyone and apply relevant accessibility standards to meet the
                requirements of the Americans with Disabilities Act (ADA) and Web Content Accessibility Guidelines
                (WCAG) 2.1, Level AA.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Conformance Status</h2>
              <p>
                We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA. These
                guidelines explain how to make web content more accessible to people with disabilities. Conformance
                with these guidelines helps make the web more user-friendly for everyone.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Accessibility Features</h2>
              <p className="mb-3">LoiReply incorporates the following accessibility features:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Keyboard navigation support throughout the application</li>
                <li>Screen reader compatibility using semantic HTML and ARIA labels</li>
                <li>Sufficient color contrast ratios meeting WCAG 2.1 AA standards</li>
                <li>Resizable text without loss of content or functionality</li>
                <li>Descriptive alt text for all meaningful images and icons</li>
                <li>Focus indicators visible on all interactive elements</li>
                <li>Forms with clearly associated labels and error messages</li>
                <li>No content that flashes more than three times per second</li>
                <li>Skip navigation links to bypass repetitive content</li>
                <li>Consistent navigation and page structure across the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Assistive Technologies</h2>
              <p className="mb-3">LoiReply has been tested with the following assistive technologies:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>NVDA (NonVisual Desktop Access) screen reader</li>
                <li>JAWS (Job Access With Speech) screen reader</li>
                <li>VoiceOver (macOS and iOS)</li>
                <li>TalkBack (Android)</li>
                <li>Windows High Contrast Mode</li>
                <li>Browser zoom up to 200%</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Known Limitations</h2>
              <p className="mb-3">
                While we strive for full accessibility, some areas of the platform may still present challenges.
                We are actively working to address the following known limitations:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Some rich text editor features may have limited screen reader support — we are working on improvements.</li>
                <li>Certain dynamically loaded content may require manual page refresh for screen readers to detect updates.</li>
                <li>PDF exports may not be fully tagged for accessibility — we recommend using the HTML view when available.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Alternative Access</h2>
              <p>
                If you are having difficulty accessing any part of LoiReply, we are here to help. Please contact
                our support team and we will work with you to provide the information or functionality you need in
                an accessible format.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Feedback and Contact Information</h2>
              <p className="mb-3">
                We welcome your feedback on the accessibility of LoiReply. If you experience accessibility
                barriers or have suggestions for improvement, please contact us:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:support@loireply.com?subject=Accessibility Feedback"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    support@loireply.com
                  </a>
                </li>
                <li><strong>Subject line:</strong> Accessibility Feedback</li>
              </ul>
              <p className="mt-3">
                We aim to respond to accessibility feedback within 2 business days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Formal Complaints</h2>
              <p>
                If you are not satisfied with our response to your accessibility concern, you may contact the
                U.S. Department of Justice, Civil Rights Division, regarding ADA compliance. More information
                is available at{' '}
                <a
                  href="https://www.ada.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  www.ada.gov
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ongoing Efforts</h2>
              <p>
                Accessibility is an ongoing effort. We conduct regular accessibility audits, incorporate
                accessibility testing into our development process, and provide accessibility training for
                our team. We are committed to continuous improvement and making LoiReply accessible to all users.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
