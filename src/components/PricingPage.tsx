import React from 'react';
import { Mail, ArrowLeft, Check, Users, Phone, GraduationCap, MessageSquare, Headphones as HeadphonesIcon } from 'lucide-react';

interface PricingPageProps {
  onBackClick: () => void;
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
}

export function PricingPage({ onBackClick, onSignInClick, onCreateAccountClick }: PricingPageProps) {
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
          <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-4">Investment</p>
          <h1 className="text-5xl lg:text-6xl font-display font-semibold text-om-forest-deep mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-om-mahogany max-w-3xl mx-auto" style={{ fontFamily: "'EB Garamond', serif" }}>
            Choose the plan that fits your needs. Whether you're an individual professional or managing a team, we have the right solution for you.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">

            {/* Individual */}
            <div className="bg-om-cream border border-om-tan rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-om-parchment border border-om-tan rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-om-forest" />
                  </div>
                  <h3 className="text-2xl font-display font-semibold text-om-forest-deep">Individual</h3>
                </div>
                <p className="text-om-mahogany mb-6 text-[15px]" style={{ fontFamily: "'EB Garamond', serif" }}>
                  Perfect for solo professionals and consultants who want to automate their email workflow.
                </p>
                <div className="mb-6 p-4 bg-om-parchment border border-om-tan rounded-lg">
                  <p className="text-xs text-om-brown uppercase tracking-widest mb-3">Starting at</p>
                  <div className="mb-2">
                    <span className="text-3xl font-display font-semibold text-om-forest-deep">$5,000</span>
                    <span className="text-sm text-om-brown ml-2">initial investment</span>
                  </div>
                  <div>
                    <span className="text-2xl font-display font-semibold text-om-forest-deep">$1,000<span className="text-base">/mo</span></span>
                    <span className="text-sm text-om-brown ml-2">monthly service fee</span>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = 'mailto:sales@loireply.com?subject=Individual Plan Inquiry'}
                  className="w-full px-8 py-3.5 bg-om-forest text-om-cream hover:bg-om-forest-dark font-medium transition-colors rounded flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Contact Sales
                </button>
              </div>

              <div className="border-t border-om-tan pt-7">
                <h4 className="font-display font-semibold text-om-forest-deep mb-5 text-sm tracking-wide uppercase">What's Included</h4>
                <ul className="space-y-4">
                  {[
                    ['One Linked Domain', 'Connect and manage one email domain'],
                    ['AI-Powered Autoresponder', 'Automatic email responses with custom prompts'],
                    ['Email Draft Generation', 'AI generates drafts for your review'],
                    ['Template Library', 'Create and save unlimited email templates'],
                    ['Client CRM', 'Manage contacts and track interactions'],
                    ['Google Calendar Integration', 'Seamless calendar sync and event management'],
                    ['Reply Tracking', 'Monitor email responses and engagement'],
                    ['Analytics Dashboard', 'Track email performance and metrics'],
                    ['Group Support Calls', 'Join weekly group training and Q&A sessions'],
                    ['Email Support', 'Get help via email within 24 hours'],
                    ['Regular Updates', 'Access to all new features and improvements'],
                  ].map(([title, sub]) => (
                    <li key={title} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-om-forest mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-om-forest-deep text-sm">{title}</div>
                        <div className="text-xs text-om-brown">{sub}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Teams */}
            <div className="bg-om-forest-deep rounded-xl p-8 text-om-parchment relative overflow-hidden hover:shadow-2xl transition-shadow">
              <div className="absolute top-4 right-4 bg-om-gold/20 border border-om-gold/40 px-3 py-1 rounded text-xs font-medium text-om-gold tracking-wide">
                Most Popular
              </div>

              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-om-forest border border-om-forest-dark rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-om-gold" />
                  </div>
                  <h3 className="text-2xl font-display font-semibold">Teams</h3>
                </div>
                <p className="text-om-tan mb-6 text-[15px]" style={{ fontFamily: "'EB Garamond', serif" }}>
                  For agencies and teams that need advanced features, multiple domains, and dedicated support.
                </p>
                <div className="mb-6 p-4 bg-om-forest border border-om-forest-dark rounded-lg">
                  <p className="text-xs text-om-tan uppercase tracking-widest mb-3">Custom Pricing</p>
                  <div className="text-3xl font-display font-semibold text-om-gold mb-1">Contact Sales</div>
                  <div className="text-xs text-om-tan">Tailored to your team's needs</div>
                </div>
                <button
                  onClick={() => window.location.href = 'mailto:sales@loireply.com?subject=Team Plan Inquiry'}
                  className="w-full px-8 py-3.5 bg-om-gold text-om-forest-deep hover:bg-om-gold-dark font-medium transition-colors rounded flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Contact Sales
                </button>
              </div>

              <div className="border-t border-om-forest pt-7">
                <h4 className="font-display font-semibold text-om-gold mb-5 text-sm tracking-wide uppercase">Everything in Individual, plus:</h4>
                <ul className="space-y-4">
                  {[
                    [Check,            'text-om-gold',   'Multiple Linked Domains',      'Connect unlimited email domains for your team'],
                    [Check,            'text-om-gold',   'Team Member Management',        'Add unlimited team members with role-based access'],
                    [Check,            'text-om-gold',   'Shared Templates & Prompts',    'Collaborate with team-wide templates and AI prompts'],
                    [Check,            'text-om-gold',   'Centralized Client Database',   'Shared CRM across your entire team'],
                    [Check,            'text-om-gold',   'Advanced Analytics',            'Team performance metrics and detailed reporting'],
                    [Check,            'text-om-gold',   'Priority Processing',           'Faster email processing and response times'],
                    [GraduationCap,    'text-om-gold',   'Dedicated Training',            'Custom onboarding and training sessions for your team'],
                    [HeadphonesIcon,   'text-om-gold',   '1-on-1 Dedicated Support',      'Direct access to your dedicated account manager'],
                    [Check,            'text-om-gold',   'Priority Feature Requests',     'Influence product roadmap with your feedback'],
                    [Check,            'text-om-gold',   'SLA Guarantee',                 '99.9% uptime guarantee with priority support'],
                    [Check,            'text-om-gold',   'Custom Integrations',           'Work with our team to build custom integrations'],
                    [Check,            'text-om-gold',   'API Access',                    'Full API access for custom workflows'],
                  ].map(([Icon, ic, title, sub]: any) => (
                    <li key={title} className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 ${ic} mt-0.5 flex-shrink-0`} />
                      <div>
                        <div className="font-medium text-om-parchment text-sm">{title}</div>
                        <div className="text-xs text-om-tan">{sub}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-om-parchment">
        <div className="max-w-4xl mx-auto">
          <p className="text-om-gold text-xs font-medium tracking-widest uppercase mb-3 text-center">FAQ</p>
          <h2 className="text-3xl font-display font-semibold text-om-forest-deep text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              ["What's included in the initial investment?", "The initial investment covers complete system setup, custom configuration for your domain, initial training, and full access to all features. This one-time fee ensures your email automation is properly configured from day one."],
              ["Can I upgrade from Individual to Teams later?", "Absolutely! You can upgrade to the Teams plan at any time. Contact our sales team, and we'll help you transition smoothly with no data loss."],
              ["What's the difference between group calls and 1-on-1 support?", "Individual plan members can join weekly group training sessions with other users to learn best practices and get questions answered. Teams plan members get dedicated 1-on-1 support with a personal account manager who knows your specific setup."],
              ["How many team members can I add on the Teams plan?", "The Teams plan supports unlimited team members. Pricing scales based on the number of domains, users, and support level needed. Contact sales for a custom quote."],
              ["Can I get a demo before purchasing?", "Yes! We offer a demo and consultation to ensure LoiReply is the right fit for your needs before you commit. Contact us to schedule a personalised walkthrough of the platform."],
              ["What payment methods do you accept?", "We accept all major credit cards, ACH transfers, and wire transfers. For Teams plans, we can also arrange custom billing terms and invoicing."],
            ].map(([q, a]) => (
              <div key={q} className="bg-om-cream border border-om-tan rounded-lg p-6">
                <h3 className="font-display font-semibold text-om-forest-deep mb-2 text-[15px]">{q}</h3>
                <p className="text-om-mahogany text-[15px]" style={{ fontFamily: "'EB Garamond', serif" }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-om-forest">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-display font-semibold text-om-cream mb-5">Ready to Get Started?</h2>
          <p className="text-om-tan text-lg mb-10" style={{ fontFamily: "'EB Garamond', serif" }}>
            Choose your plan and start automating your email workflow today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => window.location.href = 'mailto:sales@loireply.com?subject=Individual Plan Inquiry'} className="px-9 py-3.5 bg-om-gold text-om-forest-deep hover:bg-om-gold-dark font-medium transition-colors rounded">
              Contact Sales — Individual
            </button>
            <button onClick={() => window.location.href = 'mailto:sales@loireply.com?subject=Team Plan Inquiry'} className="px-9 py-3.5 border border-om-cream/40 text-om-cream hover:bg-om-cream/10 font-medium transition-colors rounded">
              Contact Sales — Teams
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
