import React, { useState, useEffect } from 'react';
import { Building2, CheckCircle, XCircle, Clock, ExternalLink, Mail, MapPin, CreditCard, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  getPendingOrganizers, 
  getVerifiedOrganizers, 
  verifyOrganizer, 
  rejectOrganizer
} from '../services/organizerService';
import type { User, OrganizerInfo } from '../types/tournament';

interface OrganizerManagementProps {
  currentUser: User;
}

const OrganizerManagement: React.FC<OrganizerManagementProps> = ({ currentUser }) => {
  const [pendingOrganizers, setPendingOrganizers] = useState<Array<User & { id: string }>>([]);
  const [verifiedOrganizers, setVerifiedOrganizers] = useState<Array<User & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');

  useEffect(() => {
    loadOrganizers();
  }, []);

  const loadOrganizers = async () => {
    try {
      setLoading(true);
      const [pending, verified] = await Promise.all([
        getPendingOrganizers(),
        getVerifiedOrganizers(),
      ]);
      setPendingOrganizers(pending);
      setVerifiedOrganizers(verified);
    } catch (error) {
      console.error('Error loading organizers:', error);
      toast.error('Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (organizerId: string) => {
    if (!currentUser.isAdmin) {
      toast.error('Only admins can verify organizers');
      return;
    }

    try {
      setVerifying(organizerId);
      await verifyOrganizer(organizerId, currentUser.id);
      toast.success('Organizer verified successfully!');
      await loadOrganizers();
    } catch (error: any) {
      console.error('Error verifying organizer:', error);
      toast.error(error.message || 'Failed to verify organizer');
    } finally {
      setVerifying(null);
    }
  };

  const handleReject = async (organizerId: string) => {
    if (!currentUser.isAdmin) {
      toast.error('Only admins can reject organizers');
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setRejecting(organizerId);
      await rejectOrganizer(organizerId, currentUser.id, rejectionReason);
      toast.success('Organizer application rejected');
      setRejectionReason('');
      setSelectedOrganizer(null);
      await loadOrganizers();
    } catch (error: any) {
      console.error('Error rejecting organizer:', error);
      toast.error(error.message || 'Failed to reject organizer');
    } finally {
      setRejecting(organizerId);
    }
  };


  const formatDate = (date: Date | any): string => {
    if (!date) return 'N/A';
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium transition-colors font-mono uppercase tracking-wider text-sm ${
            activeTab === 'pending'
              ? 'text-red-500 border-b-2 border-red-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Pending ({pendingOrganizers.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('verified')}
          className={`px-4 py-2 font-medium transition-colors font-mono uppercase tracking-wider text-sm ${
            activeTab === 'verified'
              ? 'text-red-500 border-b-2 border-red-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Verified ({verifiedOrganizers.length})</span>
          </div>
        </button>
      </div>

      {/* Pending Organizers */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingOrganizers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No pending organizer applications</p>
            </div>
          ) : (
            pendingOrganizers.map((organizer) => {
              const organizerInfo = organizer.organizerInfo!;
              return (
                <div
                  key={organizer.id}
                  className="bg-[#0a0a0a] rounded-lg p-6 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white font-bodax">{organizer.username}</h3>
                      <p className="text-sm text-gray-400 font-mono">{organizer.email}</p>
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        Applied: {formatDate(organizerInfo.appliedAt)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-900/20 text-yellow-400 rounded-full text-xs font-medium font-mono uppercase tracking-wider border border-yellow-800">
                      Pending Review
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-300">Business Name</p>
                        <p className="text-white">{organizerInfo.businessName}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-300">Business Email</p>
                        <p className="text-white">{organizerInfo.businessEmail}</p>
                      </div>
                    </div>

                    {organizerInfo.businessAddress && (
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-300">Address</p>
                          <p className="text-white">{organizerInfo.businessAddress}</p>
                        </div>
                      </div>
                    )}

                    {organizerInfo.taxId && (
                      <div className="flex items-start space-x-3">
                        <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-300">Tax ID</p>
                          <p className="text-white">{organizerInfo.taxId}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-300">Bank Details</p>
                        <p className="text-white font-mono text-sm">
                          {organizerInfo.bankAccountDetails}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleVerify(organizer.id)}
                      disabled={verifying === organizer.id}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bodax text-sm uppercase tracking-wider transition-all duration-300 border border-green-800 hover:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifying === organizer.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedOrganizer(organizer.id)}
                      disabled={rejecting === organizer.id}
                      className="flex items-center space-x-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bodax text-sm uppercase tracking-wider transition-all duration-300 border border-red-800 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>

                  {/* Rejection Modal */}
                  {selectedOrganizer === organizer.id && (
                    <div className="mt-4 p-4 bg-[#050505] rounded-lg border border-gray-800">
                      <label className="block text-sm font-medium text-gray-400 mb-2 font-mono uppercase tracking-wider">
                        Rejection Reason *
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-800 text-white font-mono focus:ring-2 focus:ring-red-500 focus:border-red-800 transition-all"
                        rows={3}
                        placeholder="Please provide a reason for rejection..."
                      />
                      <div className="flex space-x-3 mt-3">
                        <button
                          onClick={() => handleReject(organizer.id)}
                          disabled={!rejectionReason.trim() || rejecting === organizer.id}
                          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bodax text-sm uppercase tracking-wider transition-all duration-300 border border-red-800 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {rejecting === organizer.id ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrganizer(null);
                            setRejectionReason('');
                          }}
                          className="px-6 py-2 bg-transparent hover:bg-white/5 text-white font-bodax text-sm uppercase tracking-wider transition-all duration-300 border border-gray-700 hover:border-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Verified Organizers */}
      {activeTab === 'verified' && (
        <div className="space-y-4">
          {verifiedOrganizers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No verified organizers</p>
            </div>
          ) : (
            verifiedOrganizers.map((organizer) => {
              const organizerInfo = organizer.organizerInfo!;
              return (
                <div
                  key={organizer.id}
                  className="bg-[#0a0a0a] rounded-lg p-6 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white font-bodax">{organizer.username}</h3>
                      <p className="text-sm text-gray-400 font-mono">{organizer.email}</p>
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        Verified: {formatDate(organizerInfo.verifiedAt)}
                        {organizerInfo.verifiedBy && ` by Admin`}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-900/20 text-green-400 rounded-full text-xs font-medium font-mono uppercase tracking-wider border border-green-800">
                      Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-300">Business Name</p>
                        <p className="text-white">{organizerInfo.businessName}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-300">Business Email</p>
                        <p className="text-white">{organizerInfo.businessEmail}</p>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizerManagement;
