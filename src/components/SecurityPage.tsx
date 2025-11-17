import React from 'react';
import { Mail, ArrowLeft, Shield, Lock, Key, Server, Eye, FileCheck, UserCheck, AlertTriangle, CheckCircle, Database, Cloud, Fingerprint } from 'lucide-react';

interface SecurityPageProps {
  onBackClick: () => void;
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
}

export function SecurityPage({ onBackClick, onSignInClick, onCreateAccountClick }: SecurityPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackClick}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <Mail className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">LoiReply</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onSignInClick}
              className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onCreateAccountClick}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
            >
              Create Account
            </button>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Shield className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Security First, Always
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your data security and privacy are our top priorities. We employ industry-leading security measures to protect your communications and sensitive information.
          </p>
        </div>
      </section>

      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Data Encryption & Protection</h2>
            <p className="text-lg text-gray-600">Multiple layers of encryption to keep your data secure</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">End-to-End Encryption</h3>
              <p className="text-gray-600">
                All email data is encrypted using AES-256 encryption both at rest and in transit. Your communications remain private and secure at all times.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Key className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Key Management</h3>
              <p className="text-gray-600">
                Advanced key management systems ensure your encryption keys are stored securely and never exposed. Keys are rotated regularly for maximum security.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Encrypted Database Storage</h3>
              <p className="text-gray-600">
                All data stored in our databases is encrypted at rest. Multiple layers of security protect your information from unauthorized access.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">TLS/SSL Protocols</h3>
              <p className="text-gray-600">
                Industry-standard TLS 1.3 encryption protects all data in transit. All connections to our servers use the latest security protocols.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Cloud className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Cloud Infrastructure</h3>
              <p className="text-gray-600">
                Hosted on secure, SOC 2 Type II certified cloud infrastructure with advanced DDoS protection and network security.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileCheck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Backups</h3>
              <p className="text-gray-600">
                Automated encrypted backups ensure your data is never lost. All backups are stored securely with the same encryption standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Access Control & Authentication</h2>
            <p className="text-lg text-gray-600">Advanced authentication to protect your account</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Fingerprint className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Multi-Factor Authentication</h3>
              <p className="text-gray-600">
                Optional two-factor authentication adds an extra layer of security to your account, ensuring only you can access your data.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">OAuth Integration</h3>
              <p className="text-gray-600">
                Secure OAuth 2.0 integration with Google and other providers. We never store your email provider passwords.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Key className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Role-Based Access Control</h3>
              <p className="text-gray-600">
                Team plans feature granular permissions and role-based access control, ensuring team members only see what they need.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Session Management</h3>
              <p className="text-gray-600">
                Automatic session timeouts and secure session handling prevent unauthorized access. You can revoke sessions from any device.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Login Monitoring</h3>
              <p className="text-gray-600">
                Track all login attempts and receive alerts for suspicious activity. Review your account access history at any time.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Password Security</h3>
              <p className="text-gray-600">
                Passwords are hashed using bcrypt with strong salting. We enforce strong password requirements and never store passwords in plain text.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Compliance & Privacy</h2>
            <p className="text-lg text-gray-600">Meeting the highest standards for data protection</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">GDPR Compliant</h3>
                  <p className="text-gray-600">
                    Fully compliant with the General Data Protection Regulation. You have complete control over your data with the right to access, modify, or delete it at any time.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">CCPA Compliant</h3>
                  <p className="text-gray-600">
                    In compliance with the California Consumer Privacy Act. We never sell your data, and you can request deletion of your information at any time.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">SOC 2 Type II</h3>
                  <p className="text-gray-600">
                    Our infrastructure partners maintain SOC 2 Type II certification, demonstrating rigorous security controls and annual third-party audits.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Privacy by Design</h3>
                  <p className="text-gray-600">
                    Privacy is built into every feature. We collect only the data necessary to provide our services and never share it with third parties.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Regular Security Audits</h3>
                  <p className="text-gray-600">
                    Third-party security audits and penetration testing are conducted regularly to identify and address potential vulnerabilities.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Data Ownership</h3>
                  <p className="text-gray-600">
                    You own your data, period. We're merely custodians. Export your data at any time in standard formats, with no lock-in.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Our Security Commitments
          </h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">We never sell your data</h3>
                <p className="text-gray-600">
                  Your information is yours. We will never sell, rent, or share your data with third parties for marketing purposes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Transparent security practices</h3>
                <p className="text-gray-600">
                  We maintain transparency about our security practices and notify users promptly of any security incidents.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Continuous security improvements</h3>
                <p className="text-gray-600">
                  Security is not a one-time effort. We continuously monitor, test, and improve our security measures to stay ahead of threats.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Dedicated security team</h3>
                <p className="text-gray-600">
                  Our security team works around the clock to monitor threats, respond to incidents, and ensure your data remains protected.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Questions About Security?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Our team is here to answer any security questions you may have
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.href = 'mailto:security@loireply.com?subject=Security Inquiry'}
              className="px-10 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Contact Security Team
            </button>
            <button
              onClick={onCreateAccountClick}
              className="px-10 py-4 bg-transparent text-white border-2 border-white rounded-lg hover:bg-white/10 font-semibold text-lg transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm">&copy; 2025 LoiReply. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
