import React from 'react';
import { Mail, Calendar, Users, Zap, TrendingUp, Clock, Shield, BarChart3, CheckCircle, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
  onPrivacyClick: () => void;
  onTermsClick: () => void;
  onCookieClick: () => void;
}

export function LandingPage({ onSignInClick, onCreateAccountClick, onPrivacyClick, onTermsClick, onCookieClick }: LandingPageProps) {
  const onFeaturesClick = () => window.dispatchEvent(new CustomEvent('navigate-to-features'));
  const onPricingClick  = () => window.dispatchEvent(new CustomEvent('navigate-to-pricing'));
  const onSecurityClick = () => window.dispatchEvent(new CustomEvent('navigate-to-security'));
  const onUpdatesClick  = () => window.dispatchEvent(new CustomEvent('navigate-to-updates'));
  const onAboutClick    = () => window.dispatchEvent(new CustomEvent('navigate-to-about'));

  return (
    <div className="min-h-screen bg-om-cream font-body">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-om-forest-deep/95 backdrop-blur-md border-b border-om-forest z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-7 h-7 text-om-gold" />
            <span className="text-xl font-display font-semibold text-om-parchment tracking-wide">LoiReply</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-om-tan">
            <button onClick={onFeaturesClick} className="hover:text-om-parchment transition-colors">Features</button>
            <button onClick={onPricingClick}  className="hover:text-om-parchment transition-colors">Pricing</button>
            <button onClick={onAboutClick}    className="hover:text-om-parchment transition-colors">About</button>
            <button onClick={onSecurityClick} className="hover:text-om-parchment transition-colors">Security</button>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={onSignInClick}
              className="px-5 py-2 text-om-tan hover:text-om-parchment text-sm font-medium transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onCreateAccountClick}
              className="px-5 py-2 border border-om-gold text-om-gold hover:bg-om-gold hover:text-om-forest-deep text-sm font-medium transition-colors rounded"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-om-gold text-sm font-medium tracking-widest uppercase mb-4">AI-Powered Email Automation</p>
              <h1 className="text-5xl lg:text-6xl font-display font-semibold text-om-forest-deep leading-tight mb-6">
                Transform Your Email Management
              </h1>
              <p className="text-xl text-om-mahogany mb-10 leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>
                Automate responses, manage clients, and sync your calendar. Save hours every day with AI-powered email automation that learns from your business.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onCreateAccountClick}
                  className="px-8 py-3.5 bg-om-forest text-om-cream hover:bg-om-forest-dark font-medium transition-colors rounded flex items-center justify-center gap-2 shadow-sm"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onSignInClick}
                  className="px-8 py-3.5 border border-om-tan text-om-mahogany hover:border-om-brown hover:text-om-forest-deep font-medium transition-colors rounded"
                >
                  Sign In
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-om-parchment border border-om-tan rounded-xl p-8 shadow-lg">
                <p className="text-xs font-medium text-om-brown uppercase tracking-widest mb-5">Platform Preview</p>
                <div className="space-y-4">
                  {[
                    { icon: Mail,     label: 'Automated Responses', sub: 'AI handles 85% of inquiries',    bg: 'bg-om-cream',     ic: 'text-om-gold' },
                    { icon: Calendar, label: 'Calendar Sync',        sub: 'Never miss an appointment',      bg: 'bg-om-cream',     ic: 'text-om-forest' },
                    { icon: Users,    label: 'CRM Integration',      sub: 'Track every interaction',        bg: 'bg-om-cream',     ic: 'text-om-mahogany' },
                  ].map(({ icon: Icon, label, sub, bg, ic }) => (
                    <div key={label} className={`${bg} border border-om-tan rounded-lg p-4 flex items-center gap-4`}>
                      <div className="w-10 h-10 bg-om-parchment rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className={`w-5 h-5 ${ic}`} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-om-forest-deep">{label}</div>
                        <div className="text-sm text-om-brown">{sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 bg-om-parchment px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-3">Capabilities</p>
            <h2 className="text-4xl font-display font-semibold text-om-forest-deep mb-4">
              Everything You Need to Scale
            </h2>
            <p className="text-lg text-om-mahogany max-w-2xl mx-auto" style={{ fontFamily: "'EB Garamond', serif" }}>
              Powerful features that save time and increase productivity
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap,      title: 'AI-Powered Automation',   body: 'Let AI handle routine emails with customizable templates and smart responses that match your tone.',                        ic: 'text-om-gold' },
              { icon: Calendar, title: 'Google Calendar Sync',     body: 'Seamlessly sync your schedule, manage appointments, and never double-book again.',                                         ic: 'text-om-forest' },
              { icon: Users,    title: 'Client Management',        body: 'Track all client interactions, manage contacts, and keep detailed notes in one place.',                                    ic: 'text-om-mahogany' },
              { icon: Clock,    title: 'Time Savings',             body: 'Save 15+ hours per week by automating repetitive email tasks and responses.',                                              ic: 'text-om-gold-dark' },
              { icon: Shield,   title: 'Enterprise Security',      body: 'Bank-level encryption, row-level security, and complete data isolation for your peace of mind.',                          ic: 'text-om-forest' },
              { icon: BarChart3,title: 'Analytics Dashboard',      body: 'Track email performance, response rates, and client engagement with detailed analytics.',                                  ic: 'text-om-mahogany' },
            ].map(({ icon: Icon, title, body, ic }) => (
              <div key={title} className="bg-om-cream border border-om-tan rounded-lg p-7 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-om-parchment border border-om-tan rounded-lg flex items-center justify-center mb-5">
                  <Icon className={`w-6 h-6 ${ic}`} />
                </div>
                <h3 className="text-lg font-display font-semibold text-om-forest-deep mb-2">{title}</h3>
                <p className="text-om-mahogany leading-relaxed text-[15px]" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business results */}
      <section className="py-20 px-6 bg-om-cream">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-3">Results</p>
            <h2 className="text-4xl font-display font-semibold text-om-forest-deep mb-4">
              Transform Your Business Results
            </h2>
            <p className="text-lg text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>
              See what's possible when you automate your email workflow
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div className="space-y-8">
              {[
                { title: '85% Faster Response Time',   body: 'Respond to clients instantly with AI-generated responses, ensuring no lead goes cold.' },
                { title: '3× More Leads Converted',    body: 'Never miss a follow-up. Automated reminders and smart categorisation keep you on top of every opportunity.' },
                { title: '15+ Hours Saved Weekly',     body: 'Focus on high-value activities while automation handles routine tasks and email management.' },
                { title: 'Zero Missed Appointments',   body: 'Calendar sync and automated reminders ensure you\'re always prepared and on time.' },
              ].map(({ title, body }) => (
                <div key={title} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-om-parchment border border-om-tan rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-om-forest" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-om-forest-deep mb-1">{title}</h3>
                    <p className="text-om-mahogany text-[15px]" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-om-forest-deep rounded-xl p-12 text-om-parchment shadow-xl">
              <div className="space-y-8">
                {[
                  { stat: '15+', label: 'Hours Saved Per Week' },
                  { stat: '85%', label: 'Faster Response Time' },
                  { stat: '3×',  label: 'Lead Conversion Rate' },
                ].map(({ stat, label }) => (
                  <div key={label}>
                    <div className="text-5xl font-display font-semibold text-om-gold mb-1">{stat}</div>
                    <div className="text-om-tan text-base tracking-wide">{label}</div>
                  </div>
                ))}
                <div className="pt-6 border-t border-om-forest">
                  <TrendingUp className="w-8 h-8 mb-3 text-om-gold" />
                  <p className="text-om-tan text-base leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>
                    Join professionals who have transformed their business with LoiReply
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-om-forest px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-display font-semibold text-om-cream mb-5">
            Ready to Transform Your Business?
          </h2>
          <p className="text-om-tan text-lg mb-10" style={{ fontFamily: "'EB Garamond', serif" }}>
            Start automating your emails today and see results in minutes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onCreateAccountClick}
              className="px-10 py-3.5 bg-om-gold text-om-forest-deep hover:bg-om-gold-dark font-medium transition-colors rounded flex items-center justify-center gap-2 shadow-sm"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onSignInClick}
              className="px-10 py-3.5 border border-om-cream/40 text-om-cream hover:bg-om-cream/10 font-medium transition-colors rounded"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
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
                  { label: 'Features', onClick: onFeaturesClick },
                  { label: 'Pricing',  onClick: onPricingClick },
                  { label: 'Security', onClick: onSecurityClick },
                  { label: 'Updates',  onClick: onUpdatesClick },
                ],
              },
              {
                heading: 'Company',
                links: [
                  { label: 'About',   onClick: onAboutClick },
                  { label: 'Contact', href: 'mailto:support@loireply.com?subject=Contact LoiReply Support' },
                ],
              },
              {
                heading: 'Legal',
                links: [
                  { label: 'Privacy Policy',    onClick: onPrivacyClick },
                  { label: 'Terms of Service',  onClick: onTermsClick },
                  { label: 'Cookie Policy',     onClick: onCookieClick },
                ],
              },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <h4 className="font-display text-om-gold text-sm tracking-widest uppercase mb-4">{heading}</h4>
                <ul className="space-y-2 text-sm">
                  {links.map(({ label, onClick, href }: any) => (
                    <li key={label}>
                      {href ? (
                        <a href={href} className="hover:text-om-parchment transition-colors">{label}</a>
                      ) : (
                        <button onClick={onClick} className="hover:text-om-parchment transition-colors">{label}</button>
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
