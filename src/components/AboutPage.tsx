import React from 'react';
import { Mail, ArrowLeft, Heart, Users, Zap, Shield, Target, Award, MessageCircle, Clock, TrendingUp, Sparkles } from 'lucide-react';

interface AboutPageProps {
  onBackClick: () => void;
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
}

export function AboutPage({ onBackClick, onSignInClick, onCreateAccountClick }: AboutPageProps) {
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
              <Heart className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Transforming Communities, One Email at a Time
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            At LoiReply, we believe that every email matters and every person deserves a prompt, thoughtful response. We're on a mission to ensure no one gets left behind.
          </p>
        </div>
      </section>

      <section className="py-12 px-6 bg-blue-600">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Our Mantra
            </h2>
            <p className="text-2xl text-white font-semibold mb-6">
              "No One Left Behind, No Email Unanswered"
            </p>
            <p className="text-lg text-blue-100">
              We're committed to helping you maintain your reputation by ensuring every email receives the attention it deserves, delivered with speed and care.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-lg text-gray-600">The principles that guide everything we do</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Community First</h3>
              <p className="text-gray-600">
                We believe in the power of community transformation. Every business, every organization, every individual deserves tools that help them connect meaningfully with their audience.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No One Left Behind</h3>
              <p className="text-gray-600">
                Every person who reaches out to you matters. We're committed to ensuring that no email goes unanswered and no opportunity is missed due to slow response times.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Prompt Responses Matter</h3>
              <p className="text-gray-600">
                In today's fast-paced world, timing is everything. We help you respond quickly and professionally, showing your contacts that you value their time and communication.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Reputation Protection</h3>
              <p className="text-gray-600">
                Your reputation is built on consistent, reliable communication. We help you maintain and enhance your professional standing by ensuring every interaction reflects your commitment to excellence.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Quality Communication</h3>
              <p className="text-gray-600">
                Speed without quality is empty. Our AI ensures that every automated response maintains the thoughtfulness and professionalism your contacts expect from you.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Continuous Innovation</h3>
              <p className="text-gray-600">
                We're constantly improving and evolving our platform to serve you better. Your success drives our innovation, and your feedback shapes our future.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-lg text-gray-600">Why we do what we do</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-10 rounded-2xl shadow-sm">
              <div className="flex items-start gap-6 mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Empowering Every Voice to Be Heard
                  </h3>
                  <p className="text-lg text-gray-600 mb-4">
                    We started LoiReply because we saw too many businesses struggling to keep up with their email communications. Important messages were getting lost, opportunities were slipping away, and relationships were suffering due to delayed responses.
                  </p>
                  <p className="text-lg text-gray-600 mb-4">
                    We believe that in our connected world, every email represents a person reaching out, a question seeking an answer, or an opportunity waiting to be seized. Our mission is to ensure that no email goes unanswered and no connection is lost due to time constraints or overwhelm.
                  </p>
                  <p className="text-lg text-gray-600">
                    By combining cutting-edge AI technology with a deep respect for human connection, we're helping individuals and teams transform how they communicate. We're not just automating responses—we're preserving relationships, protecting reputations, and enabling communities to thrive.
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Prompt Responses Matter</h2>
            <p className="text-lg text-gray-600">The impact of timely communication</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Build Trust and Credibility</h3>
              <p className="text-gray-700">
                Quick responses show that you're attentive, professional, and value the other person's time. This builds trust and strengthens your reputation as someone reliable and responsive.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-xl">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Capture Opportunities</h3>
              <p className="text-gray-700">
                In business, timing is everything. A delayed response can mean a lost sale, a missed partnership, or a client choosing a competitor. Prompt replies keep opportunities alive.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-xl">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Show You Care</h3>
              <p className="text-gray-700">
                Every person who emails you deserves acknowledgment. Quick responses demonstrate respect and show that you genuinely care about the people you serve.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-xl">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Protect Your Reputation</h3>
              <p className="text-gray-700">
                Your reputation is built on consistency. Regular, timely communication establishes you as someone who can be counted on, enhancing your professional standing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Commitment to You</h2>
            <p className="text-lg text-gray-600">What you can expect from LoiReply</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">We Listen to You</h3>
                  <p className="text-gray-600 text-sm">
                    Your feedback shapes our product. We're committed to building features that truly serve your needs.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">We Protect Your Data</h3>
                  <p className="text-gray-600 text-sm">
                    Your trust is sacred. We employ the highest security standards to keep your information safe.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">We Keep Improving</h3>
                  <p className="text-gray-600 text-sm">
                    Our platform evolves with your needs. Regular updates and new features at no extra cost.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">We're Here for You</h3>
                  <p className="text-gray-600 text-sm">
                    When you need help, we're ready. Our support team is dedicated to your success.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Join Our Community
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Be part of a movement that values every connection and ensures no one gets left behind
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onCreateAccountClick}
              className="px-10 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started Today
            </button>
            <button
              onClick={() => window.location.href = 'mailto:support@loireply.com?subject=Contact LoiReply Support'}
              className="px-10 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white border-2 border-orange-400 rounded-lg hover:from-orange-600 hover:to-red-700 hover:shadow-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105"
            >
              Contact Us
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
