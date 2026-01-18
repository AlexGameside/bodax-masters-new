import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Building2, 
  Mail, 
  MapPin, 
  CreditCard, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { applyAsOrganizer, getOrganizerInfo } from '../services/organizerService';
import type { OrganizerInfo } from '../types/tournament';

const OrganizerApplication = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [existingApplication, setExistingApplication] = useState<OrganizerInfo | null>(null);
  
  const [formData, setFormData] = useState({
    businessName: '',
    businessEmail: '',
    businessAddress: '',
    taxId: '',
    bankAccountDetails: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkApplicationStatus = async () => {
      // Wait a moment for auth to initialize
      if (!currentUser) {
        // Don't redirect immediately - let the route handle it
        setCheckingStatus(false);
        return;
      }

      try {
        const organizerInfo = await getOrganizerInfo(currentUser.id);
        if (organizerInfo) {
          setExistingApplication(organizerInfo);
        }
      } catch (error) {
        console.error('Error checking application status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkApplicationStatus();
  }, [currentUser]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.businessEmail.trim()) {
      newErrors.businessEmail = 'Business email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail)) {
      newErrors.businessEmail = 'Please enter a valid email address';
    }

    if (!formData.bankAccountDetails.trim()) {
      newErrors.bankAccountDetails = 'Bank account details (IBAN) are required for payouts';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error('Please log in to apply');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      await applyAsOrganizer(currentUser.id, {
        businessName: formData.businessName,
        businessEmail: formData.businessEmail,
        businessAddress: formData.businessAddress,
        taxId: formData.taxId,
        bankAccountDetails: formData.bankAccountDetails,
      });

      toast.success('Application submitted successfully! We will review it and get back to you soon.');
      navigate('/profile');
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  // Show existing application status
  if (existingApplication) {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'approved':
          return 'text-green-400 bg-green-900/30 border-green-500';
        case 'rejected':
          return 'text-red-400 bg-red-900/30 border-red-500';
        case 'pending':
          return 'text-yellow-400 bg-yellow-900/30 border-yellow-500';
        default:
          return 'text-gray-400 bg-gray-900/30 border-gray-500';
      }
    };

    return (
      <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden py-12 px-4">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,76,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(0,178,255,0.08),transparent_35%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
        
        <div className="max-w-2xl mx-auto relative z-10">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center text-gray-400 hover:text-red-500 mb-6 font-mono uppercase tracking-widest text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </button>

          <div className="bg-[#0a0a0a] border border-gray-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold font-bodax tracking-wide uppercase">Organizer Application</h1>
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(existingApplication.applicationStatus)}`}>
                {existingApplication.applicationStatus.charAt(0).toUpperCase() + existingApplication.applicationStatus.slice(1)}
              </span>
            </div>

            {existingApplication.applicationStatus === 'pending' && (
              <div className="bg-yellow-900/20 border border-yellow-800 p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
                  <p className="text-yellow-200 font-mono text-sm">
                    Your application is under review. We'll notify you once it's been processed.
                  </p>
                </div>
              </div>
            )}

            {existingApplication.applicationStatus === 'approved' && (
              <div className="bg-green-900/20 border border-green-800 p-4 mb-6">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                  <p className="text-green-200 font-mono text-sm">
                    Your application has been approved! You can now create tournaments with entry fees.
                  </p>
                </div>
              </div>
            )}

            {existingApplication.applicationStatus === 'rejected' && existingApplication.rejectionReason && (
              <div className="bg-red-900/20 border border-red-800 p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-red-200 font-medium mb-1 font-mono">Application Rejected</p>
                    <p className="text-red-300 text-sm font-mono">{existingApplication.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1 font-mono uppercase tracking-wider">Business Name</label>
                <p className="text-white font-mono">{existingApplication.businessName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1 font-mono uppercase tracking-wider">Business Email</label>
                <p className="text-white font-mono">{existingApplication.businessEmail}</p>
              </div>

              {existingApplication.businessAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1 font-mono uppercase tracking-wider">Business Address</label>
                  <p className="text-white font-mono">{existingApplication.businessAddress}</p>
                </div>
              )}

              {existingApplication.taxId && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1 font-mono uppercase tracking-wider">Tax ID</label>
                  <p className="text-white font-mono">{existingApplication.taxId}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1 font-mono uppercase tracking-wider">Applied At</label>
                <p className="text-white font-mono">
                  {existingApplication.appliedAt instanceof Date
                    ? existingApplication.appliedAt.toLocaleDateString()
                    : new Date(existingApplication.appliedAt?.toDate?.() || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden py-12 px-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,76,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(0,178,255,0.08),transparent_35%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
      
      <div className="max-w-2xl mx-auto relative z-10">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center text-gray-400 hover:text-red-500 mb-6 font-mono uppercase tracking-widest text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </button>

        <div className="bg-[#0a0a0a] border border-gray-800 p-8">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.35em] text-red-500 font-mono mb-4">Become an Organizer</p>
            <h1 className="text-4xl sm:text-5xl font-bold font-bodax tracking-wider text-white mb-4">
              Tournament Organizer
            </h1>
            <p className="text-gray-300 font-mono text-sm">
              Apply to host paid tournaments on Bodax. Once verified, you can set entry fees and receive payouts directly.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-400 mb-2 font-mono uppercase tracking-wider">
                <Building2 className="w-4 h-4 inline mr-2" />
                Business Name *
              </label>
              <input
                type="text"
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-4 py-3 bg-[#050505] border border-gray-800 text-white font-mono focus:ring-2 focus:ring-red-500 focus:border-red-800 transition-all"
                placeholder="Your organization or business name"
                required
              />
              {errors.businessName && (
                <p className="mt-1 text-sm text-red-400 font-mono">{errors.businessName}</p>
              )}
            </div>

            <div>
              <label htmlFor="businessEmail" className="block text-sm font-medium text-gray-400 mb-2 font-mono uppercase tracking-wider">
                <Mail className="w-4 h-4 inline mr-2" />
                Business Email *
              </label>
              <input
                type="email"
                id="businessEmail"
                value={formData.businessEmail}
                onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                className="w-full px-4 py-3 bg-[#050505] border border-gray-800 text-white font-mono focus:ring-2 focus:ring-red-500 focus:border-red-800 transition-all"
                placeholder="business@example.com"
                required
              />
              {errors.businessEmail && (
                <p className="mt-1 text-sm text-red-400 font-mono">{errors.businessEmail}</p>
              )}
            </div>

            <div>
              <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-400 mb-2 font-mono uppercase tracking-wider">
                <MapPin className="w-4 h-4 inline mr-2" />
                Business Address (Optional)
              </label>
              <input
                type="text"
                id="businessAddress"
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                className="w-full px-4 py-3 bg-[#050505] border border-gray-800 text-white font-mono focus:ring-2 focus:ring-red-500 focus:border-red-800 transition-all"
                placeholder="Street, City, Country"
              />
            </div>

            <div>
              <label htmlFor="taxId" className="block text-sm font-medium text-gray-400 mb-2 font-mono uppercase tracking-wider">
                <FileText className="w-4 h-4 inline mr-2" />
                Tax ID / VAT Number (Optional)
              </label>
              <input
                type="text"
                id="taxId"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full px-4 py-3 bg-[#050505] border border-gray-800 text-white font-mono focus:ring-2 focus:ring-red-500 focus:border-red-800 transition-all"
                placeholder="DE123456789"
              />
            </div>

            <div>
              <label htmlFor="bankAccountDetails" className="block text-sm font-medium text-gray-400 mb-2 font-mono uppercase tracking-wider">
                <CreditCard className="w-4 h-4 inline mr-2" />
                Bank Account Details (IBAN) *
              </label>
              <input
                type="text"
                id="bankAccountDetails"
                value={formData.bankAccountDetails}
                onChange={(e) => setFormData({ ...formData, bankAccountDetails: e.target.value })}
                className="w-full px-4 py-3 bg-[#050505] border border-gray-800 text-white font-mono focus:ring-2 focus:ring-red-500 focus:border-red-800 transition-all"
                placeholder="DE89 3704 0044 0532 0130 00"
                required
              />
              <p className="mt-1 text-sm text-gray-400 font-mono">
                This is where we'll send your tournament payouts. You'll complete Stripe Connect setup after approval.
              </p>
              {errors.bankAccountDetails && (
                <p className="mt-1 text-sm text-red-400 font-mono">{errors.bankAccountDetails}</p>
              )}
            </div>

            <div className="bg-red-900/20 border border-red-800 p-4">
              <p className="text-sm text-red-200 font-mono">
                <strong className="text-red-400">Note:</strong> After submitting your application, our team will review it manually. 
                Once approved, you'll be able to link your Stripe account and start hosting paid tournaments.
              </p>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="px-8 py-3 bg-transparent hover:bg-white/5 text-white font-bodax text-sm uppercase tracking-wider transition-all duration-300 border border-gray-700 hover:border-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bodax text-sm uppercase tracking-wider transition-all duration-300 border border-red-800 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrganizerApplication;
