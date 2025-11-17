import React from 'react';
import { Mail, Calendar, Users, Zap, TrendingUp, Clock, Shield, BarChart3, CheckCircle, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
  onPrivacyClick: () => void;
  onTermsClick: () => void;
}

export function LandingPage({ onSignInClick, onCreateAccountClick, onPrivacyClick, onTermsClick }: LandingPageProps) {
  const onFeaturesClick = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-features'));
  };

  const onPricingClick = () => {
    window.dispatchEvent(new CustomEvent('navigate-to-pricing'));
  };
  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">LoiReply</span>
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

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Transform Your Email Management
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Automate responses, manage clients, and sync your calendar. Save hours every day with AI-powered email automation that learns from your business.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onCreateAccountClick}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={onSignInClick}
                  className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-300 rounded-lg hover:border-gray-400 font-semibold text-lg transition-colors"
                >
                  Sign In
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-2xl">
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 shadow-md flex items-center gap-4 transform hover:scale-105 transition-transform">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Automated Responses</div>
                      <div className="text-xs text-gray-500">AI handles 85% of inquiries</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-md flex items-center gap-4 transform hover:scale-105 transition-transform">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Calendar Sync</div>
                      <div className="text-xs text-gray-500">Never miss an appointment</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-md flex items-center gap-4 transform hover:scale-105 transition-transform">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">CRM Integration</div>
                      <div className="text-xs text-gray-500">Track every interaction</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Scale Your Business
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features that save time and increase productivity
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Automation</h3>
              <p className="text-gray-600 leading-relaxed">
                Let AI handle routine emails with customizable templates and smart responses that match your tone.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Calendar className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Google Calendar Sync</h3>
              <p className="text-gray-600 leading-relaxed">
                Seamlessly sync your schedule, manage appointments, and never double-book again.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Client Management</h3>
              <p className="text-gray-600 leading-relaxed">
                Track all client interactions, manage contacts, and keep detailed notes in one place.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Time Savings</h3>
              <p className="text-gray-600 leading-relaxed">
                Save 15+ hours per week by automating repetitive email tasks and responses.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Enterprise Security</h3>
              <p className="text-gray-600 leading-relaxed">
                Bank-level encryption, row-level security, and complete data isolation for your peace of mind.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Analytics Dashboard</h3>
              <p className="text-gray-600 leading-relaxed">
                Track email performance, response rates, and client engagement with detailed analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Transform Your Business Results
            </h2>
            <p className="text-xl text-gray-600">
              See what's possible when you automate your email workflow
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">85% Faster Response Time</h3>
                    <p className="text-gray-600">
                      Respond to clients instantly with AI-generated responses, ensuring no lead goes cold.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">3x More Leads Converted</h3>
                    <p className="text-gray-600">
                      Never miss a follow-up. Automated reminders and smart categorization keep you on top of every opportunity.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">15+ Hours Saved Weekly</h3>
                    <p className="text-gray-600">
                      Focus on high-value activities while automation handles routine tasks and email management.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Zero Missed Appointments</h3>
                    <p className="text-gray-600">
                      Calendar sync and automated reminders ensure you're always prepared and on time.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-12 text-white shadow-2xl">
              <div className="space-y-8">
                <div>
                  <div className="text-6xl font-bold mb-2">15+</div>
                  <div className="text-xl opacity-90">Hours Saved Per Week</div>
                </div>
                <div>
                  <div className="text-6xl font-bold mb-2">85%</div>
                  <div className="text-xl opacity-90">Faster Response Time</div>
                </div>
                <div>
                  <div className="text-6xl font-bold mb-2">3x</div>
                  <div className="text-xl opacity-90">Lead Conversion Rate</div>
                </div>
                <div className="pt-6 border-t border-white/20">
                  <TrendingUp className="w-12 h-12 mb-4 opacity-80" />
                  <p className="text-lg opacity-90">
                    Join thousands of professionals who have transformed their business with LoiReply
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Start automating your emails today and see results in minutes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onCreateAccountClick}
              className="px-10 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-semibold text-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onSignInClick}
              className="px-10 py-4 bg-transparent text-white border-2 border-white rounded-lg hover:bg-white/10 font-semibold text-lg transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-6 h-6 text-blue-500" />
                <span className="text-xl font-bold text-white">LoiReply</span>
              </div>
              <p className="text-sm">
                Transform your email management with AI-powered automation
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={onFeaturesClick} className="hover:text-white transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={onPricingClick} className="hover:text-white transition-colors">
                    Pricing
                  </button>
                </li>
                <li>Security</li>
                <li>Updates</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={onPrivacyClick} className="hover:text-white transition-colors">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button onClick={onTermsClick} className="hover:text-white transition-colors">
                    Terms of Service
                  </button>
                </li>
                <li>Cookie Policy</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2025 LoiReply. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
