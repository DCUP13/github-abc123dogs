import React from 'react';
import { Mail, ArrowLeft, Shield, Lock, Key, Server, Eye, FileCheck, UserCheck, AlertTriangle, CheckCircle, Database, Cloud, Fingerprint } from 'lucide-react';

interface SecurityPageProps {
  onBackClick: () => void;
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
}

export function SecurityPage({ onBackClick, onSignInClick, onCreateAccountClick }: SecurityPageProps) {
  return (
    <div className="min-h-screen bg-om-cream font-body">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-om-forest-deep/95 backdrop-blur-md border-b border-om-forest z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBackClick} className="flex items-center gap-2 text-om-tan hover:text-om-parchment transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-om-gold" />
              <span className="font-display font-semibold text-om-parchment tracking-wide">LoiReply</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onSignInClick} className="px-5 py-2 text-om-tan hover:text-om-parchment text-sm font-medium transition-colors">Sign In</button>
            <button onClick={onCreateAccountClick} className="px-5 py-2 border border-om-gold text-om-gold hover:bg-om-gold hover:text-om-forest-deep text-sm font-medium transition-colors rounded">Get Started</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-36 pb-14 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-om-parchment border border-om-tan rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-om-forest" />
            </div>
          </div>
          <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-4">Trust & Safety</p>
          <h1 className="text-5xl lg:text-6xl font-display font-semibold text-om-forest-deep mb-6">
            Security First, Always
          </h1>
          <p className="text-xl text-om-mahogany max-w-3xl mx-auto" style={{ fontFamily: "'EB Garamond', serif" }}>
            Your data security and privacy are our top priorities. We employ industry-leading security measures to protect your communications and sensitive information.
          </p>
        </div>
      </section>

      {/* Encryption */}
      <section className="py-16 px-6 bg-om-parchment">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-2">Encryption</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-2">Data Encryption & Protection</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>Multiple layers of encryption to keep your data secure</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Lock,      title: 'End-to-End Encryption',     body: 'All email data is encrypted using AES-256 encryption both at rest and in transit. Your communications remain private and secure at all times.' },
              { icon: Key,       title: 'Secure Key Management',     body: 'Advanced key management systems ensure your encryption keys are stored securely and never exposed. Keys are rotated regularly for maximum security.' },
              { icon: Database,  title: 'Encrypted Database Storage', body: 'All data stored in our databases is encrypted at rest. Multiple layers of security protect your information from unauthorized access.' },
              { icon: Server,    title: 'TLS/SSL Protocols',          body: 'Industry-standard TLS 1.3 encryption protects all data in transit. All connections to our servers use the latest security protocols.' },
              { icon: Cloud,     title: 'Secure Cloud Infrastructure', body: 'Hosted on secure, SOC 2 Type II certified cloud infrastructure with advanced DDoS protection and network security.' },
              { icon: FileCheck, title: 'Secure Backups',             body: 'Automated encrypted backups ensure your data is never lost. All backups are stored securely with the same encryption standards.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-om-cream border border-om-tan rounded-lg p-7 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-om-parchment border border-om-tan rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-om-forest" />
                </div>
                <h3 className="text-lg font-display font-semibold text-om-forest-deep mb-2">{title}</h3>
                <p className="text-om-mahogany text-base leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auth */}
      <section className="py-16 px-6 bg-om-cream">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-2">Access</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-2">Access Control & Authentication</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>Advanced authentication to protect your account</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Fingerprint,   title: 'Multi-Factor Authentication',  body: 'Optional two-factor authentication adds an extra layer of security to your account, ensuring only you can access your data.' },
              { icon: UserCheck,     title: 'OAuth Integration',             body: 'Secure OAuth 2.0 integration with Google and other providers. We never store your email provider passwords.' },
              { icon: Key,           title: 'Role-Based Access Control',     body: 'Team plans feature granular permissions and role-based access control, ensuring team members only see what they need.' },
              { icon: Eye,           title: 'Session Management',            body: 'Automatic session timeouts and secure session handling prevent unauthorized access. You can revoke sessions from any device.' },
              { icon: AlertTriangle, title: 'Login Monitoring',              body: 'Track all login attempts and receive alerts for suspicious activity. Review your account access history at any time.' },
              { icon: Lock,          title: 'Password Security',             body: 'Passwords are hashed using bcrypt with strong salting. We enforce strong password requirements and never store passwords in plain text.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-om-parchment border border-om-tan rounded-lg p-7 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-om-cream border border-om-tan rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-om-gold" />
                </div>
                <h3 className="text-lg font-display font-semibold text-om-forest-deep mb-2">{title}</h3>
                <p className="text-om-mahogany text-base leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-16 px-6 bg-om-parchment">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-2">Compliance</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-2">Compliance & Privacy</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>Meeting the highest standards for data protection</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: CheckCircle, title: 'GDPR Compliant',     body: 'Fully compliant with the General Data Protection Regulation. You have complete control over your data with the right to access, modify, or delete it at any time.' },
              { icon: CheckCircle, title: 'CCPA Compliant',     body: 'In compliance with the California Consumer Privacy Act. We never sell your data, and you can request deletion of your information at any time.' },
              { icon: Eye,         title: 'Privacy by Design',  body: 'Privacy is built into every feature. We collect only the data necessary to provide our services and never share it with third parties.' },
              { icon: Lock,        title: 'Data Ownership',     body: 'You own your data, period. We\'re merely custodians. Export your data at any time in standard formats, with no lock-in.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-om-cream border border-om-tan rounded-lg p-7 flex items-start gap-5">
                <div className="w-11 h-11 bg-om-parchment border border-om-tan rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-om-forest" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-om-forest-deep mb-2">{title}</h3>
                  <p className="text-om-mahogany text-base leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitments */}
      <section className="py-16 px-6 bg-om-cream">
        <div className="max-w-4xl mx-auto">
          <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-3 text-center">Commitments</p>
          <h2 className="text-3xl font-display font-semibold text-om-forest-deep text-center mb-10">
            Our Security Commitments
          </h2>
          <div className="space-y-4">
            {[
              ['We never sell your data',              'Your information is yours. We will never sell, rent, or share your data with third parties for marketing purposes.'],
              ['Transparent security practices',       'We maintain transparency about our security practices and notify users promptly of any security incidents.'],
              ['Continuous security improvements',     'Security is not a one-time effort. We continuously monitor, test, and improve our security measures to stay ahead of threats.'],
              ['Dedicated security team',              'Our security team works around the clock to monitor threats, respond to incidents, and ensure your data remains protected.'],
            ].map(([title, body]) => (
              <div key={title} className="flex items-start gap-4 p-6 bg-om-parchment border border-om-tan rounded-lg">
                <CheckCircle className="w-5 h-5 text-om-forest mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-display font-semibold text-om-forest-deep mb-1">{title}</h3>
                  <p className="text-om-mahogany text-base" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-om-forest">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-display font-semibold text-om-cream mb-5">Questions About Security?</h2>
          <p className="text-om-tan text-lg mb-10" style={{ fontFamily: "'EB Garamond', serif" }}>
            Our team is here to answer any security questions you may have
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => window.location.href = 'mailto:security@loireply.com?subject=Security Inquiry'} className="px-10 py-3.5 bg-om-gold text-om-forest-deep hover:bg-om-gold-dark font-medium transition-colors rounded">
              Contact Security Team
            </button>
            <button onClick={onCreateAccountClick} className="px-10 py-3.5 border border-om-cream/40 text-om-cream hover:bg-om-cream/10 font-medium transition-colors rounded">
              Get Started
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-om-forest-deep text-om-brown py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-om-gold" />
                <span className="font-display font-semibold text-om-parchment tracking-wide">LoiReply</span>
              </div>
              <p className="text-base leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>
                Transform your email management with AI-powered automation
              </p>
            </div>
            {[
              {
                heading: 'Product',
                links: [
                  { label: 'Features', event: 'navigate-to-features' },
                  { label: 'Pricing',  event: 'navigate-to-pricing' },
                  { label: 'Security', event: 'navigate-to-security' },
                  { label: 'Updates',  event: 'navigate-to-updates' },
                ],
              },
              {
                heading: 'Company',
                links: [
                  { label: 'About',   event: 'navigate-to-about' },
                  { label: 'Contact', href: 'mailto:support@loireply.com?subject=Contact LoiReply Support' },
                ],
              },
              {
                heading: 'Legal',
                links: [
                  { label: 'Privacy Policy',   href: '#' },
                  { label: 'Terms of Service', href: '#' },
                  { label: 'Cookie Policy',    href: '#' },
                ],
              },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <h4 className="font-display text-om-gold text-sm tracking-widest uppercase mb-4">{heading}</h4>
                <ul className="space-y-2 text-sm">
                  {links.map(({ label, event, href }: any) => (
                    <li key={label}>
                      {href ? (
                        <a href={href} className="hover:text-om-parchment transition-colors">{label}</a>
                      ) : (
                        <button onClick={() => window.dispatchEvent(new CustomEvent(event))} className="hover:text-om-parchment transition-colors">{label}</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-om-forest pt-8 text-center text-xs text-om-brown/70">
            <p>&copy; 2025 LoiReply. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
