import React from 'react';
import { Mail, ArrowLeft, Calendar, Users, Zap, TrendingUp, Clock, Shield, BarChart3, CheckCircle, MessageSquare, Target, Globe, Sparkles, Brain, FileText, Bell, Lock } from 'lucide-react';

interface FeaturesPageProps {
  onBackClick: () => void;
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
}

const omHeader = (onBackClick: () => void, onSignInClick: () => void, onCreateAccountClick: () => void) => {
  const nav = (event: string) => () => window.dispatchEvent(new CustomEvent(event));
  return (
  <header className="fixed top-0 left-0 right-0 bg-om-forest-deep/95 backdrop-blur-md border-b border-om-forest z-50">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onBackClick} className="flex items-center gap-2">
          <Mail className="w-7 h-7 text-om-gold" />
          <span className="text-xl font-display font-semibold text-om-parchment tracking-wide">LoiReply</span>
        </button>
      </div>
      <nav className="hidden md:flex items-center gap-8 text-xl text-om-tan">
        <button onClick={nav('navigate-to-features')} className="hover:text-om-parchment transition-colors">Features</button>
        <button onClick={nav('navigate-to-pricing')} className="hover:text-om-parchment transition-colors">Pricing</button>
        <button onClick={nav('navigate-to-about')} className="hover:text-om-parchment transition-colors">About</button>
        <button onClick={nav('navigate-to-security')} className="hover:text-om-parchment transition-colors">Security</button>
      </nav>
      <div className="flex items-center gap-3">
        <button onClick={onSignInClick} className="px-6 py-2.5 text-om-tan hover:text-om-parchment text-xl font-medium transition-colors">
          Sign In
        </button>
        <button onClick={onCreateAccountClick} className="px-6 py-2.5 border border-om-gold text-om-gold hover:bg-om-gold hover:text-om-forest-deep text-xl font-medium transition-colors rounded">
          Get Started
        </button>
      </div>
    </div>
  </header>
  );
};

const omFooter = (onPrivacyClick?: () => void, onTermsClick?: () => void, onCookieClick?: () => void) => {
  const nav = (event: string) => () => window.dispatchEvent(new CustomEvent(event));
  return (
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
                { label: 'Features', onClick: nav('navigate-to-features') },
                { label: 'Pricing',  onClick: nav('navigate-to-pricing') },
                { label: 'Security', onClick: nav('navigate-to-security') },
                { label: 'Updates',  onClick: nav('navigate-to-updates') },
              ],
            },
            {
              heading: 'Company',
              links: [
                { label: 'About',   onClick: nav('navigate-to-about') },
                { label: 'Contact', href: 'mailto:support@loireply.com?subject=Contact LoiReply Support' },
              ],
            },
            {
              heading: 'Legal',
              links: [
                { label: 'Privacy Policy',   onClick: onPrivacyClick },
                { label: 'Terms of Service', onClick: onTermsClick },
                { label: 'Cookie Policy',    onClick: onCookieClick },
              ],
            },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="font-display text-om-gold text-sm tracking-widest uppercase mb-4">{heading}</h4>
              <ul className="space-y-2 text-base">
                {links.map(({ label, onClick, href }: any) => (
                  <li key={label}>
                    {href ? (
                      <a href={href} className="hover:text-om-parchment transition-colors">{label}</a>
                    ) : onClick ? (
                      <button onClick={onClick} className="hover:text-om-parchment transition-colors">{label}</button>
                    ) : (
                      <span className="opacity-50">{label}</span>
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
  );
};

export function FeaturesPage({ onBackClick, onSignInClick, onCreateAccountClick }: FeaturesPageProps) {
  return (
    <div className="min-h-screen bg-om-cream font-body">
      {omHeader(onBackClick, onSignInClick, onCreateAccountClick)}

      {/* Hero */}
      <section className="pt-36 pb-14 px-6">
        <div className="max-w-7xl mx-auto text-center mb-4">
          <p className="text-om-gold text-sm font-medium tracking-widest uppercase mb-4">Platform Overview</p>
          <h1 className="text-5xl lg:text-6xl font-display font-semibold text-om-forest-deep mb-6">
            Powerful Features for Modern Email Management
          </h1>
          <p className="text-xl text-om-mahogany max-w-3xl mx-auto" style={{ fontFamily: "'EB Garamond', serif" }}>
            Everything you need to automate, organise, and optimise your email communications in one comprehensive platform.
          </p>
        </div>
      </section>

      {/* AI Automation */}
      <section className="py-16 px-6 bg-om-parchment">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-om-gold text-sm font-medium tracking-widest uppercase mb-2">Automation</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-2">AI-Powered Automation</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>Let intelligent automation handle your repetitive email tasks</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain,       title: 'Smart Autoresponder', body: 'AI-powered automatic responses that understand context and tone. Set up custom rules for different types of emails and let the system handle routine communications while you focus on what matters.' },
              { icon: Sparkles,    title: 'Draft Generation',    body: 'Automatically generate email drafts based on incoming messages. Review and send with one click, or customise as needed. Save hours on email composition with AI assistance.' },
              { icon: FileText,    title: 'Email Templates',     body: 'Create, save, and reuse professional email templates. Rich text editor with drag-and-drop support, image handling, and export to PDF or DOCX. Perfect for standardised communications.' },
              { icon: Target,      title: 'Custom Prompts',      body: 'Define your own AI prompts to guide how emails are processed and responded to. Tailor the automation to match your business voice and requirements perfectly.' },
              { icon: MessageSquare, title: 'Reply Tracking',   body: 'Track which emails have been replied to and which are still pending. Never miss a follow-up with automatic tracking of all your email conversations.' },
              { icon: Bell,        title: 'Smart Notifications', body: 'Get notified about important emails only. Intelligent filtering ensures you\'re alerted to priority messages while routine communications are handled automatically.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-om-cream border border-om-tan rounded-lg p-7 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-om-parchment border border-om-tan rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-om-gold" />
                </div>
                <h3 className="text-lg font-display font-semibold text-om-forest-deep mb-2">{title}</h3>
                <p className="text-om-mahogany text-base leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CRM */}
      <section className="py-16 px-6 bg-om-cream">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-om-gold text-sm font-medium tracking-widest uppercase mb-2">Relationships</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-2">Client & Contact Management</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>Build and maintain strong relationships with powerful CRM tools</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users,      title: 'Contact Organisation',  body: 'Centralise all your contacts with detailed profiles, interaction history, and custom notes. Search and filter to find anyone instantly.' },
              { icon: TrendingUp, title: 'Client Grading',        body: 'Automatically grade and prioritise clients based on engagement, response patterns, and custom criteria. Focus your efforts where they matter most.' },
              { icon: BarChart3,  title: 'Interaction Analytics',  body: 'Track every interaction with your clients. View complete communication history, response times, and engagement metrics in one place.' },
              { icon: Globe,      title: 'Domain Management',     body: 'Manage multiple email domains from a single dashboard. Perfect for agencies and businesses handling multiple brands or client accounts.' },
              { icon: CheckCircle,title: 'Status Tracking',       body: 'Track the status of every client relationship. Mark clients as active, pending, completed, or archived with custom status workflows.' },
              { icon: FileText,   title: 'Custom Notes',          body: 'Add detailed notes to any client or contact. Keep track of preferences, important dates, and key information for personalised service.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-om-parchment border border-om-tan rounded-lg p-7 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-om-cream border border-om-tan rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-om-forest" />
                </div>
                <h3 className="text-lg font-display font-semibold text-om-forest-deep mb-2">{title}</h3>
                <p className="text-om-mahogany text-base leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calendar */}
      <section className="py-16 px-6 bg-om-parchment">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-om-gold text-sm font-medium tracking-widest uppercase mb-2">Scheduling</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-2">Calendar & Scheduling</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>Seamlessly integrate your email with calendar management</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Calendar, title: 'Google Calendar Sync', body: 'Two-way sync with Google Calendar. Create events from emails, see your schedule alongside your inbox, and never double-book again.' },
              { icon: Clock,    title: 'Event Management',     body: 'Create, edit, and manage calendar events directly from your email dashboard. Add attendees, set reminders, and manage recurring events effortlessly.' },
              { icon: Zap,      title: 'Quick Scheduling',     body: 'Schedule meetings and appointments with just a few clicks. Smart time suggestions based on your availability and preferences.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-om-cream border border-om-tan rounded-lg p-7 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-om-parchment border border-om-tan rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-om-mahogany" />
                </div>
                <h3 className="text-lg font-display font-semibold text-om-forest-deep mb-2">{title}</h3>
                <p className="text-om-mahogany text-base leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-16 px-6 bg-om-cream">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-om-gold text-sm font-medium tracking-widest uppercase mb-2">Protection</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-2">Security & Compliance</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>Enterprise-grade security to protect your communications</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield,      title: 'End-to-End Encryption',  body: 'All your data is encrypted at rest and in transit. Industry-standard encryption protocols ensure your communications remain private.' },
              { icon: Lock,        title: 'Secure Authentication',  body: 'Multi-factor authentication and secure OAuth integration with email providers. Your account is protected with the latest security standards.' },
              { icon: CheckCircle, title: 'Privacy First',          body: 'We never share or sell your data. Full GDPR and CCPA compliance. Your information belongs to you, and you have complete control over it.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-om-parchment border border-om-tan rounded-lg p-7 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-om-cream border border-om-tan rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-om-forest" />
                </div>
                <h3 className="text-lg font-display font-semibold text-om-forest-deep mb-2">{title}</h3>
                <p className="text-om-mahogany text-base leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-om-forest">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-display font-semibold text-om-cream mb-5">
            Ready to Transform Your Email Workflow?
          </h2>
          <p className="text-om-tan text-lg mb-10" style={{ fontFamily: "'EB Garamond', serif" }}>
            Join professionals who have streamlined their communications with LoiReply
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={onCreateAccountClick} className="px-10 py-3.5 bg-om-gold text-om-forest-deep hover:bg-om-gold-dark font-medium transition-colors rounded">
              Get Started
            </button>
            <button onClick={onSignInClick} className="px-10 py-3.5 border border-om-cream/40 text-om-cream hover:bg-om-cream/10 font-medium transition-colors rounded">
              Sign In
            </button>
          </div>
        </div>
      </section>

      {omFooter()}
    </div>
  );
}
