import React from 'react';
import { Mail, ArrowLeft, Sparkles, Gift, TrendingUp, Zap, Users, CheckCircle, Rocket, Star, Bell, Award, Clock, Shield } from 'lucide-react';

interface UpdatesPageProps {
  onBackClick: () => void;
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
}

export function UpdatesPage({ onBackClick, onSignInClick, onCreateAccountClick }: UpdatesPageProps) {
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
              <Rocket className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Continuous Innovation, No Extra Cost
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your subscription includes all updates, improvements, and new features. We're constantly evolving to provide you with the best email automation experience.
          </p>
        </div>
      </section>

      <section className="py-12 px-6 bg-blue-600">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-8 text-center">
            <Gift className="w-16 h-16 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">
              All Updates Included Forever
            </h2>
            <p className="text-xl text-blue-100 mb-6">
              No upgrade fees. No hidden costs. No surprises. Every feature we release is automatically available to you.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-white">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>New Features</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Security Patches</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Performance Improvements</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Bug Fixes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What You Get with Every Update</h2>
            <p className="text-lg text-gray-600">Continuous improvements across all aspects of the platform</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">New Features</h3>
              <p className="text-gray-600">
                Be the first to access new capabilities as we add them. From AI improvements to new integrations, you get it all automatically.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Security Updates</h3>
              <p className="text-gray-600">
                Stay protected with automatic security patches and updates. We constantly monitor and enhance security to keep your data safe.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Performance Enhancements</h3>
              <p className="text-gray-600">
                Experience faster processing, improved reliability, and better efficiency with regular performance optimizations.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Improvements</h3>
              <p className="text-gray-600">
                Benefit from continuous AI model updates and refinements. Your autoresponder gets smarter and more accurate over time.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">User Experience Updates</h3>
              <p className="text-gray-600">
                Enjoy interface improvements, new design elements, and enhanced usability based on user feedback and best practices.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Bug Fixes</h3>
              <p className="text-gray-600">
                We actively fix issues and resolve bugs to ensure a smooth, reliable experience. Updates are deployed seamlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Update Philosophy</h2>
            <p className="text-lg text-gray-600">How we approach product development and updates</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Regular Release Cycle</h3>
                  <p className="text-gray-600">
                    We follow a consistent release schedule with new updates and features rolled out regularly. You'll always have access to the latest improvements without any action required.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Customer-Driven Development</h3>
                  <p className="text-gray-600">
                    Your feedback shapes our roadmap. We listen to user requests and prioritize features that add the most value to your workflow.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Zero Downtime Updates</h3>
                  <p className="text-gray-600">
                    Updates are deployed seamlessly in the background. You'll never experience downtime or interruption to your email automation.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Quality First</h3>
                  <p className="text-gray-600">
                    Every update goes through rigorous testing before release. We ensure stability and reliability with each new feature.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What's Coming Next</h2>
            <p className="text-lg text-gray-600">A glimpse at our upcoming features and improvements</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Enhanced AI Models</h3>
              <p className="text-gray-700">
                Next-generation AI for even more accurate email responses and better context understanding.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-xl">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Advanced Integrations</h3>
              <p className="text-gray-700">
                Connect with more tools and platforms including Slack, Microsoft Teams, and custom webhooks.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-xl">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Advanced Analytics</h3>
              <p className="text-gray-700">
                Deeper insights into your email patterns, response rates, and communication effectiveness.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-xl">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Team Collaboration</h3>
              <p className="text-gray-700">
                Enhanced team features including shared workspaces, comment threads, and team analytics.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-xl">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Mobile App</h3>
              <p className="text-gray-700">
                Native iOS and Android apps for managing your email automation on the go.
              </p>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-8 rounded-xl">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Customization Options</h3>
              <p className="text-gray-700">
                More control over branding, custom domains, and personalized email signatures.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Update Guarantees
          </h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-6 bg-white rounded-lg shadow-sm">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">No Extra Charges</h3>
                <p className="text-gray-600">
                  Your monthly subscription covers all updates and new features. We'll never charge extra for upgrades or new capabilities.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-white rounded-lg shadow-sm">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Automatic Updates</h3>
                <p className="text-gray-600">
                  Updates are applied automatically without any action required from you. Simply enjoy the improvements as they arrive.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-white rounded-lg shadow-sm">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Backward Compatibility</h3>
                <p className="text-gray-600">
                  Updates never break existing functionality. Your templates, automations, and integrations continue to work seamlessly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-white rounded-lg shadow-sm">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Update Notifications</h3>
                <p className="text-gray-600">
                  Stay informed about new features and improvements with optional release notes and update summaries delivered to your inbox.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Start Getting Updates Today
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join LoiReply and get access to continuous improvements and new features at no extra cost
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onCreateAccountClick}
              className="px-10 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started
            </button>
            <button
              onClick={() => window.location.href = 'mailto:sales@loireply.com?subject=Product Updates Inquiry'}
              className="px-10 py-4 bg-transparent text-white border-2 border-white rounded-lg hover:bg-white/10 font-semibold text-lg transition-colors"
            >
              Learn More
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
