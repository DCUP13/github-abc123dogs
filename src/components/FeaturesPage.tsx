import React from 'react';
import { Mail, ArrowLeft, Calendar, Users, Zap, TrendingUp, Clock, Shield, BarChart3, CheckCircle, MessageSquare, Target, Globe, Sparkles, Brain, FileText, Bell, Lock } from 'lucide-react';

interface FeaturesPageProps {
  onBackClick: () => void;
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
}

export function FeaturesPage({ onBackClick, onSignInClick, onCreateAccountClick }: FeaturesPageProps) {
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
            Powerful Features for Modern Email Management
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to automate, organize, and optimize your email communications in one comprehensive platform.
          </p>
        </div>
      </section>

      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">AI-Powered Automation</h2>
            <p className="text-lg text-gray-600">Let intelligent automation handle your repetitive email tasks</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Autoresponder</h3>
              <p className="text-gray-600">
                AI-powered automatic responses that understand context and tone. Set up custom rules for different types of emails and let the system handle routine communications while you focus on what matters.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Draft Generation</h3>
              <p className="text-gray-600">
                Automatically generate email drafts based on incoming messages. Review and send with one click, or customize as needed. Save hours on email composition with AI assistance.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Email Templates</h3>
              <p className="text-gray-600">
                Create, save, and reuse professional email templates. Rich text editor with drag-and-drop support, image handling, and export to PDF or DOCX. Perfect for standardized communications.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Custom Prompts</h3>
              <p className="text-gray-600">
                Define your own AI prompts to guide how emails are processed and responded to. Tailor the automation to match your business voice and requirements perfectly.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Reply Tracking</h3>
              <p className="text-gray-600">
                Track which emails have been replied to and which are still pending. Never miss a follow-up with automatic tracking of all your email conversations.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Notifications</h3>
              <p className="text-gray-600">
                Get notified about important emails only. Intelligent filtering ensures you're alerted to priority messages while routine communications are handled automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Client & Contact Management</h2>
            <p className="text-lg text-gray-600">Build and maintain strong relationships with powerful CRM tools</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Contact Organization</h3>
              <p className="text-gray-600">
                Centralize all your contacts with detailed profiles, interaction history, and custom notes. Search and filter to find anyone instantly.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Client Grading</h3>
              <p className="text-gray-600">
                Automatically grade and prioritize clients based on engagement, response patterns, and custom criteria. Focus your efforts where they matter most.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Interaction Analytics</h3>
              <p className="text-gray-600">
                Track every interaction with your clients. View complete communication history, response times, and engagement metrics in one place.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Domain Management</h3>
              <p className="text-gray-600">
                Manage multiple email domains from a single dashboard. Perfect for agencies and businesses handling multiple brands or client accounts.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Status Tracking</h3>
              <p className="text-gray-600">
                Track the status of every client relationship. Mark clients as active, pending, completed, or archived with custom status workflows.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Custom Notes</h3>
              <p className="text-gray-600">
                Add detailed notes to any client or contact. Keep track of preferences, important dates, and key information for personalized service.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Calendar & Scheduling</h2>
            <p className="text-lg text-gray-600">Seamlessly integrate your email with calendar management</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Google Calendar Sync</h3>
              <p className="text-gray-600">
                Two-way sync with Google Calendar. Create events from emails, see your schedule alongside your inbox, and never double-book again.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Event Management</h3>
              <p className="text-gray-600">
                Create, edit, and manage calendar events directly from your email dashboard. Add attendees, set reminders, and manage recurring events effortlessly.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Quick Scheduling</h3>
              <p className="text-gray-600">
                Schedule meetings and appointments with just a few clicks. Smart time suggestions based on your availability and preferences.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Security & Compliance</h2>
            <p className="text-lg text-gray-600">Enterprise-grade security to protect your communications</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">End-to-End Encryption</h3>
              <p className="text-gray-600">
                All your data is encrypted at rest and in transit. Industry-standard encryption protocols ensure your communications remain private.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Authentication</h3>
              <p className="text-gray-600">
                Multi-factor authentication and secure OAuth integration with email providers. Your account is protected with the latest security standards.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Privacy First</h3>
              <p className="text-gray-600">
                We never share or sell your data. Full GDPR and CCPA compliance. Your information belongs to you, and you have complete control over it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Email Workflow?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who have streamlined their communications with LoiReply
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onCreateAccountClick}
              className="px-10 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started
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

      <footer className="bg-gray-900 text-gray-400 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm">&copy; 2025 LoiReply. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
