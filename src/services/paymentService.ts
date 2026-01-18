import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Tournament, TournamentRegistration } from '../types/tournament';
import { processRefund, isRefundEligible } from './stripeService';
import { API_ENDPOINTS } from '../config/api';

// Create Stripe Checkout session for tournament entry fee
// All payments go to platform account - no Connect accounts needed
export const createCheckoutSession = async (
  tournamentId: string,
  teamId: string,
  amount: number,
  currency: string,
  organizerId: string
): Promise<string> => {
  try {
    const endpoint = API_ENDPOINTS.stripe.createCheckoutSession();
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tournamentId,
        teamId,
        entryFee: amount,
        organizerId,
        // No organizerStripeAccountId needed - using platform account
        successUrl: `${window.location.origin}/tournaments/${tournamentId}?payment=success`,
        cancelUrl: `${window.location.origin}/tournaments/${tournamentId}?payment=cancelled`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Log detailed error information to console for debugging
      console.group('🔴 Stripe Checkout Session Error');
      console.error('Status:', response.status, response.statusText);
      console.error('Error Message:', errorData.error);
      console.error('Error Details:', errorData.details);
      console.error('Error Type:', errorData.type);
      console.error('Error Code:', errorData.code);
      
      if (errorData.debug) {
        console.group('📊 Debug Information');
        console.error('Full Debug Object:', errorData.debug);
        console.error('Error Type:', errorData.debug.type);
        console.error('Error Code:', errorData.debug.code);
        console.error('Stripe Status Code:', errorData.debug.statusCode);
        console.error('Request ID:', errorData.debug.requestId);
        if (errorData.debug.raw) {
          console.error('Stripe Raw Error:', errorData.debug.raw);
        }
        if (errorData.debug.connectionInfo) {
          console.error('Connection Info:', errorData.debug.connectionInfo);
        }
        if (errorData.debug.connectionDetails) {
          console.error('Connection Details:', errorData.debug.connectionDetails);
        }
        if (errorData.debug.stack) {
          console.error('Stack Trace:', errorData.debug.stack);
        }
        console.groupEnd();
      }
      
      if (errorData.stripeError) {
        console.group('💳 Stripe Raw Error');
        console.error('Raw Stripe Error:', errorData.stripeError);
        console.groupEnd();
      }
      
      console.error('Full Error Response:', errorData);
      console.groupEnd();
      
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data.checkoutUrl;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Create tournament registration with payment
export const createTournamentRegistration = async (
  tournamentId: string,
  teamId: string,
  paymentIntentId: string,
  paymentAmount: number
): Promise<string> => {
  try {
    const registrationData: Omit<TournamentRegistration, 'id'> = {
      tournamentId,
      teamId,
      registeredAt: serverTimestamp(),
      paymentStatus: 'completed',
      paymentIntentId,
      paymentAmount,
      paymentCompletedAt: serverTimestamp(),
      entryFeePaid: true,
      verificationStatus: 'approved',
    };

    const registrationRef = await addDoc(
      collection(db, 'tournamentRegistrations'),
      registrationData
    );

    // Update tournament payment info
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (tournamentDoc.exists()) {
      const tournament = tournamentDoc.data() as Tournament;
      const currentTotal = tournament.paymentInfo?.totalCollected || 0;
      
      await updateDoc(tournamentRef, {
        'paymentInfo.totalCollected': currentTotal + paymentAmount,
        updatedAt: serverTimestamp(),
      });
    }

    return registrationRef.id;
  } catch (error) {
    console.error('Error creating tournament registration:', error);
    throw error;
  }
};

// Get tournament registration for a team
export const getTeamTournamentRegistration = async (
  tournamentId: string,
  teamId: string
): Promise<TournamentRegistration | null> => {
  try {
    const registrationsRef = collection(db, 'tournamentRegistrations');
    const q = query(
      registrationsRef,
      where('tournamentId', '==', tournamentId),
      where('teamId', '==', teamId)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const registrationDoc = querySnapshot.docs[0];
    return {
      id: registrationDoc.id,
      ...registrationDoc.data(),
    } as TournamentRegistration;
  } catch (error) {
    console.error('Error getting team registration:', error);
    throw error;
  }
};

// Verify payment session and complete registration
export const verifyPaymentAndRegister = async (
  sessionId: string
): Promise<{ success: boolean; message: string; tournamentId?: string; teamId?: string }> => {
  try {
    // Verify payment session with backend
    const verifyEndpoint = `${API_ENDPOINTS.stripe.createCheckoutSession().replace('/create-checkout-session', '/verify-payment-session')}?session_id=${sessionId}`;
    
    const verifyResponse = await fetch(verifyEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({ error: 'Verification failed' }));
      throw new Error(errorData.error || 'Failed to verify payment');
    }

    const verifyData = await verifyResponse.json();
    
    if (!verifyData.success || verifyData.session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    const { tournamentId, teamId } = verifyData.metadata || {};
    const paymentIntentId = verifyData.session.payment_intent;
    const paymentAmount = verifyData.session.amount;

    if (!tournamentId || !teamId) {
      throw new Error('Missing tournament or team information in payment');
    }

    // Check if already registered
    const existingRegistration = await getTeamTournamentRegistration(tournamentId, teamId);
    if (existingRegistration?.paymentStatus === 'completed') {
      return { 
        success: true, 
        message: 'Team already registered',
        tournamentId,
        teamId
      };
    }

    // Create or update registration record
    if (existingRegistration) {
      // Update existing registration
      const registrationRef = doc(db, 'tournamentRegistrations', existingRegistration.id);
      await updateDoc(registrationRef, {
        paymentStatus: 'completed',
        paymentIntentId,
        paymentAmount,
        paymentCompletedAt: serverTimestamp(),
        entryFeePaid: true,
        verificationStatus: 'approved',
      });
    } else {
      // Create new registration
      await createTournamentRegistration(tournamentId, teamId, paymentIntentId, paymentAmount);
    }

    // Add team to tournament if not already added
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (tournamentDoc.exists()) {
      const tournament = tournamentDoc.data() as Tournament;
      const currentTeams = tournament.teams || [];
      
      if (!currentTeams.includes(teamId)) {
        await updateDoc(tournamentRef, {
          teams: [...currentTeams, teamId],
          updatedAt: serverTimestamp(),
        });
      }
    }

    return { 
      success: true, 
      message: 'Payment verified and team registered successfully!',
      tournamentId,
      teamId
    };
  } catch (error) {
    console.error('Error verifying payment and registering:', error);
    throw error;
  }
};

// Check if team has paid for tournament
export const hasTeamPaidForTournament = async (
  tournamentId: string,
  teamId: string
): Promise<boolean> => {
  try {
    const registration = await getTeamTournamentRegistration(tournamentId, teamId);
    return registration?.paymentStatus === 'completed' && registration.entryFeePaid === true;
  } catch (error) {
    console.error('Error checking payment status:', error);
    return false;
  }
};

// Process refund for team registration
export const refundTeamRegistration = async (
  tournamentId: string,
  teamId: string,
  reason: string
): Promise<void> => {
  try {
    const registration = await getTeamTournamentRegistration(tournamentId, teamId);
    
    if (!registration) {
      throw new Error('Registration not found');
    }

    if (registration.paymentStatus !== 'completed') {
      throw new Error('No payment to refund');
    }

    if (!registration.paymentIntentId) {
      throw new Error('Payment intent ID not found');
    }

    // Check refund eligibility
    const tournamentDoc = await getDoc(doc(db, 'tournaments', tournamentId));
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }

    const tournament = tournamentDoc.data() as Tournament;
    const refundDeadline = tournament.paymentInfo?.refundDeadline;
    const startDate = tournament.schedule?.startDate;

    if (startDate) {
      const start = startDate instanceof Date ? startDate : startDate.toDate();
      if (!isRefundEligible(start, refundDeadline)) {
        throw new Error('Refund deadline has passed. Refunds are only available 14 days before tournament start.');
      }
    }

    // Process refund through Stripe
    const refundId = await processRefund(registration.paymentIntentId, registration.paymentAmount);

    // Update registration
    const registrationRef = doc(db, 'tournamentRegistrations', registration.id);
    await updateDoc(registrationRef, {
      paymentStatus: 'refunded',
      refundedAt: serverTimestamp(),
      refundAmount: registration.paymentAmount,
      refundReason: reason,
    });

    // Update tournament payment info
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const currentRefunds = tournament.paymentInfo?.refundsIssued || 0;
    const currentTotal = tournament.paymentInfo?.totalCollected || 0;
    
    await updateDoc(tournamentRef, {
      'paymentInfo.refundsIssued': currentRefunds + 1,
      'paymentInfo.totalCollected': Math.max(0, currentTotal - registration.paymentAmount),
      updatedAt: serverTimestamp(),
    });

    // Remove team from tournament
    await runTransaction(db, async (transaction) => {
      const tournamentDoc = await transaction.get(tournamentRef);
      if (!tournamentDoc.exists()) {
        throw new Error('Tournament not found');
      }

      const tournamentData = tournamentDoc.data() as Tournament;
      const updatedTeams = tournamentData.teams.filter(id => id !== teamId);
      const updatedWaitlist = tournamentData.waitlist.filter(id => id !== teamId);

      transaction.update(tournamentRef, {
        teams: updatedTeams,
        waitlist: updatedWaitlist,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
};

// Process refunds for all teams when tournament is cancelled
export const refundAllTournamentRegistrations = async (
  tournamentId: string
): Promise<{ success: number; failed: number }> => {
  try {
    const registrationsRef = collection(db, 'tournamentRegistrations');
    const q = query(
      registrationsRef,
      where('tournamentId', '==', tournamentId),
      where('paymentStatus', '==', 'completed')
    );
    
    const querySnapshot = await getDocs(q);
    let success = 0;
    let failed = 0;

    for (const registrationDoc of querySnapshot.docs) {
      const registration = {
        id: registrationDoc.id,
        ...registrationDoc.data(),
      } as TournamentRegistration;

      try {
        if (registration.paymentIntentId) {
          await processRefund(registration.paymentIntentId, registration.paymentAmount);
        }

        await updateDoc(doc(db, 'tournamentRegistrations', registration.id), {
          paymentStatus: 'refunded',
          refundedAt: serverTimestamp(),
          refundAmount: registration.paymentAmount,
          refundReason: 'Tournament cancelled',
        });

        success++;
      } catch (error) {
        console.error(`Failed to refund registration ${registration.id}:`, error);
        failed++;
      }
    }

    // Update tournament
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, {
      status: 'cancelled',
      'paymentInfo.refundsIssued': success,
      updatedAt: serverTimestamp(),
    });

    return { success, failed };
  } catch (error) {
    console.error('Error processing bulk refunds:', error);
    throw error;
  }
};
