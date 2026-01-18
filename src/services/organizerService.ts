import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User, OrganizerInfo } from '../types/tournament';
import { createConnectOnboardingLink } from './stripeService';

// Apply to become an organizer
export const applyAsOrganizer = async (
  userId: string,
  organizerData: {
    businessName: string;
    businessEmail: string;
    businessAddress?: string;
    taxId?: string;
    bankAccountDetails?: string;
  }
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    // Build organizer info object, only including fields that have values
    const organizerInfo: Partial<OrganizerInfo> = {
      businessName: organizerData.businessName,
      businessEmail: organizerData.businessEmail,
      applicationStatus: 'pending',
      appliedAt: serverTimestamp(),
    };

    // Only add optional fields if they have values
    if (organizerData.businessAddress && organizerData.businessAddress.trim()) {
      organizerInfo.businessAddress = organizerData.businessAddress;
    }
    if (organizerData.taxId && organizerData.taxId.trim()) {
      organizerInfo.taxId = organizerData.taxId;
    }
    if (organizerData.bankAccountDetails && organizerData.bankAccountDetails.trim()) {
      organizerInfo.bankAccountDetails = organizerData.bankAccountDetails;
    }

    await updateDoc(userRef, {
      isOrganizer: true,
      organizerInfo: organizerInfo as OrganizerInfo,
    });
  } catch (error) {
    console.error('Error applying as organizer:', error);
    throw error;
  }
};

// Get organizer info for a user
export const getOrganizerInfo = async (userId: string): Promise<OrganizerInfo | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data() as User;
    return userData.organizerInfo || null;
  } catch (error) {
    console.error('Error getting organizer info:', error);
    throw error;
  }
};

// Verify organizer (admin only)
export const verifyOrganizer = async (
  organizerId: string,
  adminId: string,
  stripeConnectAccountId?: string
): Promise<string | undefined> => {
  try {
    const userRef = doc(db, 'users', organizerId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Organizer not found');
    }

    const userData = userDoc.data() as User;
    if (!userData.organizerInfo) {
      throw new Error('Organizer info not found');
    }

    // If Stripe Connect account ID is provided, use it; otherwise create onboarding link
    let connectAccountId = stripeConnectAccountId;
    let onboardingUrl: string | undefined;

    if (!connectAccountId) {
      // Try to create Stripe Connect onboarding link
      // If backend API is not available, we'll skip this for now
      try {
        const result = await createConnectOnboardingLink(organizerId, userData.email);
        onboardingUrl = result.onboardingUrl || undefined;
        // Save the account ID to the organizer info if provided
        if (result.accountId) {
          connectAccountId = result.accountId;
        }
      } catch (error) {
        console.warn('Stripe Connect onboarding not available (backend API not set up). Organizer can complete setup later.');
        // Continue without onboarding URL - organizer can set up Stripe Connect later
      }
    }

    // Build updated organizer info, only including Stripe fields if they have values
    const updatedOrganizerInfo: Partial<OrganizerInfo> = {
      ...userData.organizerInfo,
      applicationStatus: 'approved',
      verifiedAt: serverTimestamp(),
      verifiedBy: adminId,
    };

    // Only add Stripe Connect fields if they have values
    if (connectAccountId) {
      updatedOrganizerInfo.stripeConnectAccountId = connectAccountId;
      updatedOrganizerInfo.stripeConnectOnboardingComplete = false; // Will be true after onboarding completes
    }

    await updateDoc(userRef, {
      isVerifiedOrganizer: true,
      organizerInfo: updatedOrganizerInfo as OrganizerInfo,
    });

    return onboardingUrl || undefined;
  } catch (error) {
    console.error('Error verifying organizer:', error);
    throw error;
  }
};

// Reject organizer application
export const rejectOrganizer = async (
  organizerId: string,
  adminId: string,
  reason: string
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', organizerId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Organizer not found');
    }

    const userData = userDoc.data() as User;
    if (!userData.organizerInfo) {
      throw new Error('Organizer info not found');
    }

    const updatedOrganizerInfo: OrganizerInfo = {
      ...userData.organizerInfo,
      applicationStatus: 'rejected',
      verifiedAt: serverTimestamp(),
      verifiedBy: adminId,
      rejectionReason: reason,
    };

    await updateDoc(userRef, {
      organizerInfo: updatedOrganizerInfo,
    });
  } catch (error) {
    console.error('Error rejecting organizer:', error);
    throw error;
  }
};

// Get all pending organizer applications
export const getPendingOrganizers = async (): Promise<Array<User & { id: string }>> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('isOrganizer', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const organizers: Array<User & { id: string }> = [];

    querySnapshot.forEach((doc) => {
      const userData = doc.data() as User;
      if (userData.organizerInfo?.applicationStatus === 'pending') {
        organizers.push({
          ...userData,
          id: doc.id,
        });
      }
    });

    return organizers;
  } catch (error) {
    console.error('Error getting pending organizers:', error);
    throw error;
  }
};

// Get all verified organizers
export const getVerifiedOrganizers = async (): Promise<Array<User & { id: string }>> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('isVerifiedOrganizer', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const organizers: Array<User & { id: string }> = [];

    querySnapshot.forEach((doc) => {
      organizers.push({
        ...doc.data() as User,
        id: doc.id,
      });
    });

    return organizers;
  } catch (error) {
    console.error('Error getting verified organizers:', error);
    throw error;
  }
};

// Complete Stripe Connect onboarding
export const completeStripeOnboarding = async (
  organizerId: string,
  stripeConnectAccountId: string
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', organizerId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Organizer not found');
    }

    const userData = userDoc.data() as User;
    if (!userData.organizerInfo) {
      throw new Error('Organizer info not found');
    }

    const updatedOrganizerInfo: OrganizerInfo = {
      ...userData.organizerInfo,
      stripeConnectAccountId,
      stripeConnectOnboardingComplete: true,
    };

    await updateDoc(userRef, {
      organizerInfo: updatedOrganizerInfo,
    });
  } catch (error) {
    console.error('Error completing Stripe onboarding:', error);
    throw error;
  }
};

// Manually assign Stripe Connect account ID (admin only)
export const assignStripeAccount = async (
  organizerId: string,
  stripeConnectAccountId: string,
  adminId: string,
  skipValidation: boolean = false
): Promise<void> => {
  try {
    let onboardingComplete = false;
    
    // Try to verify the account exists in Stripe by checking its status
    // If validation fails, we can still assign the account ID (with a warning)
    if (!skipValidation) {
      try {
        const { checkStripeAccountStatus } = await import('./stripeService');
        const accountStatus = await checkStripeAccountStatus(stripeConnectAccountId);
        onboardingComplete = accountStatus.onboardingComplete;
      } catch (validationError: any) {
        console.warn('Could not validate Stripe account status, but proceeding with assignment:', validationError);
        // If validation fails, we'll still assign the account ID but mark onboarding as incomplete
        // This allows admins to manually assign accounts even if the Stripe API is temporarily unavailable
        onboardingComplete = false;
      }
    }
    
    // Update organizer info with the account ID and status
    const userRef = doc(db, 'users', organizerId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Organizer not found');
    }

    const userData = userDoc.data() as User;
    if (!userData.organizerInfo) {
      throw new Error('Organizer info not found');
    }

    const updatedOrganizerInfo: OrganizerInfo = {
      ...userData.organizerInfo,
      stripeConnectAccountId,
      stripeConnectOnboardingComplete: onboardingComplete,
    };

    // If organizer is not yet verified, we can still assign the Stripe account
    // but we won't automatically verify them
    const updateData: any = {
      organizerInfo: updatedOrganizerInfo,
    };

    await updateDoc(userRef, updateData);
  } catch (error) {
    console.error('Error assigning Stripe account:', error);
    throw error;
  }
};
