import React from 'react';
import { Mail, Heart, Users, Zap, Shield, Target, Award, MessageCircle, Clock, TrendingUp, Sparkles } from 'lucide-react';

interface AboutPageProps {
  onBackClick: () => void;
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
}

export function AboutPage({ onBackClick, onSignInClick, onCreateAccountClick }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-om-cream font-body">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-om-forest-deep/95 backdrop-blur-md border-b border-om-forest z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBackClick} className="flex items-center gap-2">
              <Mail className="w-7 h-7 text-om-gold" />
              <span className="text-xl font-display font-semibold text-om-parchment tracking-wide">LoiReply</span>
            </button>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-xl text-om-tan">
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-features'))} className="hover:text-om-parchment transition-colors">Features</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-pricing'))} className="hover:text-om-parchment transition-colors">Pricing</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-about'))} className="hover:text-om-parchment transition-colors">About</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-security'))} className="hover:text-om-parchment transition-colors">Security</button>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={onSignInClick} className="px-6 py-2.5 text-om-tan hover:text-om-parchment text-xl font-medium transition-colors">Sign In</button>
            <button onClick={onCreateAccountClick} className="px-6 py-2.5 border border-om-gold text-om-gold hover:bg-om-gold hover:text-om-forest-deep text-xl font-medium transition-colors rounded">Get Started</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-36 pb-14 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-om-parchment border border-om-tan rounded-xl flex items-center justify-center">
              <Heart className="w-8 h-8 text-om-gold" />
            </div>
          </div>
          <p className="text-om-gold text-sm font-medium tracking-widest uppercase mb-4">Our Story</p>
          <h1 className="text-5xl lg:text-6xl font-display font-semibold text-om-forest-deep mb-6">
            Transforming Communities,<br />One Email at a Time
          </h1>
          <p className="text-xl text-om-mahogany max-w-3xl mx-auto" style={{ fontFamily: "'EB Garamond', serif" }}>
            At LoiReply, we believe that every email matters and every person deserves a prompt, thoughtful response. We're on a mission to ensure no one gets left behind.
          </p>
        </div>
      </section>

      {/* Mantra */}
      <section className="py-14 px-6 bg-om-forest-deep">
        <div className="max-w-4xl mx-auto">
          <div className="border border-om-forest rounded-xl p-10 text-center">
            <p className="text-sm text-om-gold font-medium tracking-widest uppercase mb-4">Our Mantra</p>
            <h2 className="text-3xl font-display font-semibold text-om-parchment mb-4">
              "No One Left Behind, No Email Unanswered"
            </h2>
            <p className="text-om-tan text-lg" style={{ fontFamily: "'EB Garamond', serif" }}>
              We're committed to helping you maintain your reputation by ensuring every email receives the attention it deserves, delivered with speed and care.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 px-6 bg-om-cream">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <p className="text-om-gold text-sm font-medium tracking-widest uppercase mb-3">Principles</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-3">Our Core Values</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>The principles that guide everything we do</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Heart,         title: 'Community First',         body: 'We believe in the power of community transformation. Every business, every organisation, every individual deserves tools that help them connect meaningfully with their audience.' },
              { icon: Users,         title: 'No One Left Behind',       body: 'Every person who reaches out to you matters. We\'re committed to ensuring that no email goes unanswered and no opportunity is missed due to slow response times.' },
              { icon: Clock,         title: 'Prompt Responses Matter',  body: 'In today\'s fast-paced world, timing is everything. We help you respond quickly and professionally, showing your contacts that you value their time and communication.' },
              { icon: Shield,        title: 'Reputation Protection',    body: 'Your reputation is built on consistent, reliable communication. We help you maintain and enhance your professional standing by ensuring every interaction reflects your commitment to excellence.' },
              { icon: MessageCircle, title: 'Quality Communication',    body: 'Speed without quality is empty. Our AI ensures that every automated response maintains the thoughtfulness and professionalism your contacts expect from you.' },
              { icon: Sparkles,      title: 'Continuous Innovation',    body: 'We\'re constantly improving and evolving our platform to serve you better. Your success drives our innovation, and your feedback shapes our future.' },
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

      {/* Mission */}
      <section className="py-16 px-6 bg-om-parchment">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center">
            <p className="text-om-gold text-sm font-medium tracking-widest uppercase mb-3">Purpose</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-3">Our Mission</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>Why we do what we do</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="bg-om-cream border border-om-tan p-10 rounded-xl">
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 bg-om-parchment border border-om-tan rounded-xl flex items-center justify-center flex-shrink-0">
                  <Target className="w-7 h-7 text-om-forest" />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-semibold text-om-forest-deep mb-4">
                    Empowering Every Voice to Be Heard
                  </h3>
                  <div className="space-y-4 text-om-mahogany text-base leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>
                    <p>We started LoiReply because we saw too many businesses struggling to keep up with their email communications. Important messages were getting lost, opportunities were slipping away, and relationships were suffering due to delayed responses.</p>
                    <p>We believe that in our connected world, every email represents a person reaching out, a question seeking an answer, or an opportunity waiting to be seized. Our mission is to ensure that no email goes unanswered and no connection is lost due to time constraints or overwhelm.</p>
                    <p>By combining cutting-edge AI technology with a deep respect for human connection, we're helping individuals and teams transform how they communicate. We're not just automating responses—we're preserving relationships, protecting reputations, and enabling communities to thrive.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why prompt responses matter */}
      <section className="py-16 px-6 bg-om-cream">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <p className="text-om-gold text-sm font-medium tracking-widest uppercase mb-3">Impact</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-3">Why Prompt Responses Matter</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>The impact of timely communication</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              { icon: TrendingUp, ic: 'text-om-forest', bg: 'bg-om-parchment', title: 'Build Trust and Credibility',  body: 'Quick responses show that you\'re attentive, professional, and value the other person\'s time. This builds trust and strengthens your reputation as someone reliable and responsive.' },
              { icon: Zap,        ic: 'text-om-gold',   bg: 'bg-om-parchment', title: 'Capture Opportunities',       body: 'In business, timing is everything. A delayed response can mean a lost sale, a missed partnership, or a client choosing a competitor. Prompt replies keep opportunities alive.' },
              { icon: Heart,      ic: 'text-om-mahogany',bg: 'bg-om-parchment',title: 'Show You Care',               body: 'Every person who emails you deserves acknowledgment. Quick responses demonstrate respect and show that you genuinely care about the people you serve.' },
              { icon: Award,      ic: 'text-om-gold-dark',bg: 'bg-om-parchment',title: 'Protect Your Reputation',   body: 'Your reputation is built on consistency. Regular, timely communication establishes you as someone who can be counted on, enhancing your professional standing.' },
            ].map(({ icon: Icon, ic, bg, title, body }) => (
              <div key={title} className={`${bg} border border-om-tan p-8 rounded-xl`}>
                <div className="w-11 h-11 bg-om-cream border border-om-tan rounded-lg flex items-center justify-center mb-4">
                  <Icon className={`w-5 h-5 ${ic}`} />
                </div>
                <h3 className="text-lg font-display font-semibold text-om-forest-deep mb-3">{title}</h3>
                <p className="text-om-mahogany text-base leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment */}
      <section className="py-16 px-6 bg-om-parchment">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center">
            <p className="text-om-gold text-sm font-medium tracking-widest uppercase mb-3">Promise</p>
            <h2 className="text-3xl font-display font-semibold text-om-forest-deep mb-3">Our Commitment to You</h2>
            <p className="text-om-mahogany" style={{ fontFamily: "'EB Garamond', serif" }}>What you can expect from LoiReply</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {[
              { icon: Users,  title: 'We Listen to You',     body: 'Your feedback shapes our product. We\'re committed to building features that truly serve your needs.' },
              { icon: Shield, title: 'We Protect Your Data', body: 'Your trust is sacred. We employ the highest security standards to keep your information safe.' },
              { icon: Zap,    title: 'We Keep Improving',    body: 'Our platform evolves with your needs. Regular updates and new features at no extra cost.' },
              { icon: Heart,  title: 'We\'re Here for You',  body: 'When you need help, we\'re ready. Our support team is dedicated to your success.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-om-cream border border-om-tan rounded-lg p-6 flex items-start gap-4">
                <div className="w-10 h-10 bg-om-parchment border border-om-tan rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-om-forest" />
                </div>
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
          <h2 className="text-4xl font-display font-semibold text-om-cream mb-5">Join Our Community</h2>
          <p className="text-om-tan text-lg mb-10" style={{ fontFamily: "'EB Garamond', serif" }}>
            Be part of a movement that values every connection and ensures no one gets left behind
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={onCreateAccountClick} className="px-10 py-3.5 bg-om-gold text-om-forest-deep hover:bg-om-gold-dark font-medium transition-colors rounded">
              Get Started Today
            </button>
            <button onClick={() => window.location.href = 'mailto:support@loireply.com?subject=Contact LoiReply Support'} className="px-10 py-3.5 border border-om-cream/40 text-om-cream hover:bg-om-cream/10 font-medium transition-colors rounded">
              Contact Us
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
                <ul className="space-y-2 text-base">
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
