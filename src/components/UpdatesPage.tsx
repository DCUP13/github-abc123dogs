import React from 'react';
import { Mail, ArrowLeft, Sparkles, Gift, TrendingUp, Zap, Users, CheckCircle, Rocket, Star, Bell, Award, Clock, Shield } from 'lucide-react';

interface UpdatesPageProps {
  onBackClick: () => void;
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
}

export function UpdatesPage({ onBackClick, onSignInClick, onCreateAccountClick }: UpdatesPageProps) {
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
              <Rocket className="w-8 h-8 text-om-gold" />
            </div>
          </div>
          <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-4">Always Improving</p>
          <h1 className="text-5xl lg:text-6xl font-display font-semibold text-om-forest-deep mb-6">
            Continuous Innovation, No Extra Cost
          </h1>
          <p className="text-xl text-om-mahogany max-w-3xl mx-auto" style={{ fontFamily: "'EB Garamond', serif" }}>
            Your subscription includes all updates, improvements, and new features. We're constantly evolving to provide you with the best email automation experience.
          </p>
        </div>
      </section>

      {/* All Updates Included banner */}
      <section className="py-14 px-6 bg-om-forest-deep">
        <div className="max-w-4xl mx-auto">
          <div className="border border-om-forest rounded-xl p-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-om-forest border border-om-forest-dark rounded-lg flex items-center justify-center">
                <Gift className="w-6 h-6 text-om-gold" />
              </div>
            </div>
            <h2 className="text-3xl font-display font-semibold text-om-parchment mb-4">
              All Updates Included Forever
            </h2>
            <p className="text-om-tan text-lg mb-7" style={{ fontFamily: "'EB Garamond', serif" }}>
              No upgrade fees. No hidden costs. No surprises. Every feature we release is automatically available to you.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-om-tan text-sm">
              {['New Features', 'Security Patches', 'Performance Improvements', 'Bug Fixes'].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-om-gold" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-16 px-6 bg-om-cream">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-2">Included</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-2">What You Get with Every Update</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>Continuous improvements across all aspects of the platform</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Sparkles,    title: 'New Features',             body: 'Be the first to access new capabilities as we add them. From AI improvements to new integrations, you get it all automatically.' },
              { icon: Shield,      title: 'Security Updates',         body: 'Stay protected with automatic security patches and updates. We constantly monitor and enhance security to keep your data safe.' },
              { icon: Zap,         title: 'Performance Enhancements', body: 'Experience faster processing, improved reliability, and better efficiency with regular performance optimisations.' },
              { icon: TrendingUp,  title: 'AI Improvements',          body: 'Benefit from continuous AI model updates and refinements. Your autoresponder gets smarter and more accurate over time.' },
              { icon: Users,       title: 'User Experience Updates',  body: 'Enjoy interface improvements, new design elements, and enhanced usability based on user feedback and best practices.' },
              { icon: CheckCircle, title: 'Bug Fixes',                body: 'We actively fix issues and resolve bugs to ensure a smooth, reliable experience. Updates are deployed seamlessly.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-om-parchment border border-om-tan rounded-lg p-7 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-om-cream border border-om-tan rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-om-gold" />
                </div>
                <h3 className="text-lg font-display font-semibold text-om-forest-deep mb-2">{title}</h3>
                <p className="text-om-mahogany text-[15px] leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Update Philosophy */}
      <section className="py-16 px-6 bg-om-parchment">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-3">Approach</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-3">Our Update Philosophy</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>How we approach product development and updates</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Bell,  title: 'Regular Release Cycle',       body: 'We follow a consistent release schedule with new updates and features rolled out regularly. You\'ll always have access to the latest improvements without any action required.' },
              { icon: Users, title: 'Customer-Driven Development', body: 'Your feedback shapes our roadmap. We listen to user requests and prioritise features that add the most value to your workflow.' },
              { icon: Clock, title: 'Zero Downtime Updates',       body: 'Updates are deployed seamlessly in the background. You\'ll never experience downtime or interruption to your email automation.' },
              { icon: Star,  title: 'Quality First',               body: 'Every update goes through rigorous testing before release. We ensure stability and reliability with each new feature.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-om-cream border border-om-tan rounded-lg p-7 flex items-start gap-5">
                <div className="w-11 h-11 bg-om-parchment border border-om-tan rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-om-forest" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-om-forest-deep mb-2">{title}</h3>
                  <p className="text-om-mahogany text-[15px] leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's coming */}
      <section className="py-16 px-6 bg-om-cream">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-3">Roadmap</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-3">What's Coming Next</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>A glimpse at our upcoming features and improvements</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Sparkles,   title: 'Enhanced AI Models',       body: 'Next-generation AI for even more accurate email responses and better context understanding.' },
              { icon: Zap,        title: 'Advanced Integrations',    body: 'Connect with more tools and platforms including Slack, Microsoft Teams, and custom webhooks.' },
              { icon: TrendingUp, title: 'Advanced Analytics',       body: 'Deeper insights into your email patterns, response rates, and communication effectiveness.' },
              { icon: Users,      title: 'Team Collaboration',       body: 'Enhanced team features including shared workspaces, comment threads, and team analytics.' },
              { icon: Rocket,     title: 'Mobile App',               body: 'Native iOS and Android apps for managing your email automation on the go.' },
              { icon: Award,      title: 'Customisation Options',    body: 'More control over branding, custom domains, and personalised email signatures.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-om-parchment border border-om-tan rounded-lg p-7 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-om-forest border border-om-forest-dark rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-om-gold" />
                </div>
                <h3 className="text-lg font-display font-semibold text-om-forest-deep mb-2">{title}</h3>
                <p className="text-om-mahogany text-[15px] leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section className="py-16 px-6 bg-om-parchment">
        <div className="max-w-4xl mx-auto">
          <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-3 text-center">Guarantees</p>
          <h2 className="text-3xl font-display font-semibold text-om-forest-deep text-center mb-10">Update Guarantees</h2>
          <div className="space-y-4">
            {[
              ['No Extra Charges',       'Your monthly subscription covers all updates and new features. We\'ll never charge extra for upgrades or new capabilities.'],
              ['Automatic Updates',      'Updates are applied automatically without any action required from you. Simply enjoy the improvements as they arrive.'],
              ['Backward Compatibility', 'Updates never break existing functionality. Your templates, automations, and integrations continue to work seamlessly.'],
              ['Update Notifications',   'Stay informed about new features and improvements with optional release notes and update summaries delivered to your inbox.'],
            ].map(([title, body]) => (
              <div key={title} className="flex items-start gap-4 p-6 bg-om-cream border border-om-tan rounded-lg">
                <CheckCircle className="w-5 h-5 text-om-forest mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-display font-semibold text-om-forest-deep mb-1">{title}</h3>
                  <p className="text-om-mahogany text-[15px]" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-om-forest">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-display font-semibold text-om-cream mb-5">Start Getting Updates Today</h2>
          <p className="text-om-tan text-lg mb-10" style={{ fontFamily: "'EB Garamond', serif" }}>
            Join LoiReply and get access to continuous improvements and new features at no extra cost
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={onCreateAccountClick} className="px-10 py-3.5 bg-om-gold text-om-forest-deep hover:bg-om-gold-dark font-medium transition-colors rounded">
              Get Started
            </button>
            <button onClick={() => window.location.href = 'mailto:sales@loireply.com?subject=Product Updates Inquiry'} className="px-10 py-3.5 border border-om-cream/40 text-om-cream hover:bg-om-cream/10 font-medium transition-colors rounded">
              Learn More
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-om-forest-deep text-om-brown py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-xs">
          <p>&copy; 2025 LoiReply. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
