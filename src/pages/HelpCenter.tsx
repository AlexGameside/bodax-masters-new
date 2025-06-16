import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Search, Book, Users, Trophy, Settings, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const HelpCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqData: FAQItem[] = [
    // Account & Registration
    {
      question: "How do I create an account?",
      answer: "Click the 'Login' button in the top navigation, then select 'Create Account'. Fill in your details including username, email, Riot ID, and Discord username. You'll receive a confirmation email to verify your account.",
      category: "account"
    },
    {
      question: "I forgot my password. How can I reset it?",
      answer: "On the login page, click 'Forgot Password' and enter your email address. You'll receive a password reset link via email. Make sure to check your spam folder if you don't see the email.",
      category: "account"
    },
    {
      question: "Can I change my username after registration?",
      answer: "Currently, usernames cannot be changed after registration. Please choose your username carefully as it will be displayed to other users and in tournament brackets.",
      category: "account"
    },
    {
      question: "What information is required for registration?",
      answer: "You need to provide: a unique username, valid email address, Riot ID (in the format Username#Tag), and Discord username. All fields are required for tournament participation.",
      category: "account"
    },

    // Teams
    {
      question: "How do I create a team?",
      answer: "Navigate to 'Team Management' in your dashboard and click 'Create Team'. Enter your team name, tag, and description. You'll automatically become the team owner and can invite other players.",
      category: "teams"
    },
    {
      question: "How many players can be in a team?",
      answer: "Teams can have up to 10 members, but only 5 players can participate in matches. You can have substitutes and additional team members for flexibility.",
      category: "teams"
    },
    {
      question: "How do I invite players to my team?",
      answer: "In your team management page, click 'Invite Player' and enter their username or email. They'll receive an invitation that they can accept or decline.",
      category: "teams"
    },
    {
      question: "Can I leave a team?",
      answer: "Yes, you can leave a team at any time unless you're the owner. Team owners must transfer ownership before leaving. Leaving a team will remove you from any active tournaments.",
      category: "teams"
    },

    // Tournaments
    {
      question: "How do I register for a tournament?",
      answer: "First, ensure your team is complete with at least 5 members. Navigate to the tournament page and click 'Register Team'. Your team captain will need to confirm the registration.",
      category: "tournaments"
    },
    {
      question: "What are the tournament rules?",
      answer: "Tournament rules include: following Valorant's Terms of Service, maintaining fair play, no use of cheats or unauthorized software, respecting other players and officials, and accepting tournament decisions as final.",
      category: "tournaments"
    },
    {
      question: "Can I change my team after registering for a tournament?",
      answer: "Team changes after registration are subject to tournament rules and admin approval. Contact tournament organizers for any necessary changes.",
      category: "tournaments"
    },
    {
      question: "How are prizes distributed?",
      answer: "Prizes are awarded to winning teams as specified in tournament details. Prize distribution is the responsibility of team captains. We are not responsible for internal team prize distribution.",
      category: "tournaments"
    },

    // Technical Support
    {
      question: "I can't log into my account. What should I do?",
      answer: "First, check that your email and password are correct. If you're still having issues, try resetting your password or contact our support team at support@bodax.dev.",
      category: "technical"
    },
    {
      question: "The website is loading slowly. What can I do?",
      answer: "Try refreshing the page, clearing your browser cache, or using a different browser. If the issue persists, it might be a temporary server issue - please try again later.",
      category: "technical"
    },
    {
      question: "I'm having trouble with the match system. Help!",
      answer: "If you're experiencing issues with matches, check that all team members are online and ready. Contact tournament administrators immediately if there are technical problems.",
      category: "technical"
    },
    {
      question: "How do I report a bug or technical issue?",
      answer: "Use our contact form or email support@bodax.dev with detailed information about the issue, including your browser, device, and steps to reproduce the problem.",
      category: "technical"
    },

    // Privacy & Security
    {
      question: "How is my personal information protected?",
      answer: "We implement industry-standard security measures including encryption, secure data transmission, and access controls. Your data is never sold to third parties. See our Privacy Policy for details.",
      category: "privacy"
    },
    {
      question: "Can I delete my account and data?",
      answer: "Yes, you can request account deletion by contacting our support team. We'll delete your personal data within 30 days, though some tournament data may be retained for historical records.",
      category: "privacy"
    },
    {
      question: "What data do you collect about me?",
      answer: "We collect: account information (username, email), game identifiers (Riot ID, Discord), tournament participation data, and technical information (IP, browser type). See our Privacy Policy for full details.",
      category: "privacy"
    },
    {
      question: "How do you handle data breaches?",
      answer: "In case of a data breach, we notify affected users within 72 hours and take immediate steps to mitigate risks. We also report breaches to relevant authorities as required by law.",
      category: "privacy"
    }
  ];

  const categories = [
    { id: 'all', name: 'All Questions', icon: Book },
    { id: 'account', name: 'Account & Registration', icon: Users },
    { id: 'teams', name: 'Teams', icon: Users },
    { id: 'tournaments', name: 'Tournaments', icon: Trophy },
    { id: 'technical', name: 'Technical Support', icon: Settings },
    { id: 'privacy', name: 'Privacy & Security', icon: Shield }
  ];

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container-modern py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-primary-400 hover:text-primary-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-white mb-4">Help Center</h1>
          <p className="text-gray-400">Find answers to common questions and get support</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                    selectedCategory === category.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((faq, index) => (
                <div key={index} className="bg-gray-800 rounded-lg border border-gray-700">
                  <button
                    onClick={() => toggleExpanded(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-750 transition-colors"
                  >
                    <h3 className="text-white font-medium pr-4">{faq.question}</h3>
                    {expandedItems.has(index) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {expandedItems.has(index) && (
                    <div className="px-6 pb-4">
                      <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Book className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
                <p className="text-gray-400 mb-6">Try adjusting your search terms or browse by category</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-12 text-center">
          <div className="bg-gray-800 rounded-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Still need help?</h2>
            <p className="text-gray-300 mb-6">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Contact Support
              </Link>
              <a
                href="mailto:support@bodax.dev"
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Email Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter; 