import React from 'react';
import { Mail, ArrowLeft, Check, X, Users, Phone, GraduationCap, MessageSquare, Globe, HeadphonesIcon } from 'lucide-react';

interface PricingPageProps {
  onBackClick: () => void;
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
}

export function PricingPage({ onBackClick, onSignInClick, onCreateAccountClick }: PricingPageProps) {
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
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that fits your needs. Whether you're an individual professional or managing a team, we have the right solution for you.
          </p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-500 transition-all hover:shadow-xl">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Individual</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Perfect for solo professionals and consultants who want to automate their email workflow.
                </p>
                <div className="mb-6">
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Initial Investment</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-gray-900">$5,000</span>
                      <span className="text-gray-600">one-time</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Monthly Fee</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">$1,000</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onCreateAccountClick}
                  className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors shadow-md hover:shadow-lg"
                >
                  Get Started
                </button>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">What's Included:</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">One Linked Domain</div>
                      <div className="text-sm text-gray-600">Connect and manage one email domain</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">AI-Powered Autoresponder</div>
                      <div className="text-sm text-gray-600">Automatic email responses with custom prompts</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Email Draft Generation</div>
                      <div className="text-sm text-gray-600">AI generates drafts for your review</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Template Library</div>
                      <div className="text-sm text-gray-600">Create and save unlimited email templates</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Client CRM</div>
                      <div className="text-sm text-gray-600">Manage contacts and track interactions</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Google Calendar Integration</div>
                      <div className="text-sm text-gray-600">Seamless calendar sync and event management</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Reply Tracking</div>
                      <div className="text-sm text-gray-600">Monitor email responses and engagement</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Analytics Dashboard</div>
                      <div className="text-sm text-gray-600">Track email performance and metrics</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Group Support Calls</div>
                      <div className="text-sm text-gray-600">Join weekly group training and Q&A sessions</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Email Support</div>
                      <div className="text-sm text-gray-600">Get help via email within 24 hours</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Regular Updates</div>
                      <div className="text-sm text-gray-600">Access to all new features and improvements</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white relative overflow-hidden hover:shadow-2xl transition-all">
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">Teams</h3>
                </div>
                <p className="text-blue-100 mb-6">
                  For agencies and teams that need advanced features, multiple domains, and dedicated support.
                </p>
                <div className="mb-6">
                  <div className="text-sm text-blue-100 mb-2">Custom Pricing</div>
                  <div className="text-3xl font-bold mb-2">Contact Sales</div>
                  <div className="text-sm text-blue-100">Tailored to your team's needs</div>
                </div>
                <button
                  onClick={() => window.location.href = 'mailto:sales@loireply.com?subject=Team Plan Inquiry'}
                  className="w-full px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-lg transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  Contact Sales
                </button>
              </div>

              <div className="border-t border-white/20 pt-8">
                <h4 className="font-semibold mb-4 text-lg">Everything in Individual, plus:</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Multiple Linked Domains</div>
                      <div className="text-sm text-blue-100">Connect unlimited email domains for your team</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Team Member Management</div>
                      <div className="text-sm text-blue-100">Add unlimited team members with role-based access</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Shared Templates & Prompts</div>
                      <div className="text-sm text-blue-100">Collaborate with team-wide templates and AI prompts</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Centralized Client Database</div>
                      <div className="text-sm text-blue-100">Shared CRM across your entire team</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Advanced Analytics</div>
                      <div className="text-sm text-blue-100">Team performance metrics and detailed reporting</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Priority Processing</div>
                      <div className="text-sm text-blue-100">Faster email processing and response times</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-yellow-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Dedicated Training</div>
                      <div className="text-sm text-blue-100">Custom onboarding and training sessions for your team</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <HeadphonesIcon className="w-5 h-5 text-yellow-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">1-on-1 Dedicated Support</div>
                      <div className="text-sm text-blue-100">Direct access to your dedicated account manager</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Priority Feature Requests</div>
                      <div className="text-sm text-blue-100">Influence product roadmap with your feedback</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">SLA Guarantee</div>
                      <div className="text-sm text-blue-100">99.9% uptime guarantee with priority support</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Custom Integrations</div>
                      <div className="text-sm text-blue-100">Work with our team to build custom integrations</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">API Access</div>
                      <div className="text-sm text-blue-100">Full API access for custom workflows</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">What's included in the initial investment?</h3>
              <p className="text-gray-600">
                The initial investment covers complete system setup, custom configuration for your domain, initial training, and full access to all features. This one-time fee ensures your email automation is properly configured from day one.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Can I upgrade from Individual to Teams later?</h3>
              <p className="text-gray-600">
                Absolutely! You can upgrade to the Teams plan at any time. Contact our sales team, and we'll help you transition smoothly with no data loss.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">What's the difference between group calls and 1-on-1 support?</h3>
              <p className="text-gray-600">
                Individual plan members can join weekly group training sessions with other users to learn best practices and get questions answered. Teams plan members get dedicated 1-on-1 support with a personal account manager who knows your specific setup and can provide tailored guidance.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">How many team members can I add on the Teams plan?</h3>
              <p className="text-gray-600">
                The Teams plan supports unlimited team members. Pricing scales based on the number of domains, users, and support level needed. Contact sales for a custom quote.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Is there a free trial available?</h3>
              <p className="text-gray-600">
                We offer a demo and consultation to ensure LoiReply is the right fit for your needs before you commit. Contact us to schedule a personalized walkthrough of the platform.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">
                We accept all major credit cards, ACH transfers, and wire transfers. For Teams plans, we can also arrange custom billing terms and invoicing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Choose your plan and start automating your email workflow today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onCreateAccountClick}
              className="px-10 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Start with Individual Plan
            </button>
            <button
              onClick={() => window.location.href = 'mailto:sales@loireply.com?subject=Team Plan Inquiry'}
              className="px-10 py-4 bg-transparent text-white border-2 border-white rounded-lg hover:bg-white/10 font-semibold text-lg transition-colors"
            >
              Contact Sales
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
