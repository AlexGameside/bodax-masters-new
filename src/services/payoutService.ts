import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { processOrganizerPayout } from './stripeService';
import type { Tournament } from '../types/tournament';

// Process payout to organizer when registration closes
export const processTournamentPayout = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      throw new Error('Tournament not found');
    }

    const tournament = tournamentDoc.data() as Tournament;

    if (!tournament.paymentInfo || !tournament.organizerId) {
      throw new Error('Tournament does not have payment information or organizer');
    }

    if (tournament.paymentInfo.payoutStatus !== 'pending') {
      throw new Error('Payout has already been processed');
    }

    // Get organizer's Stripe Connect account ID
    const organizerRef = doc(db, 'users', tournament.organizerId);
    const organizerDoc = await getDoc(organizerRef);
    
    if (!organizerDoc.exists()) {
      throw new Error('Organizer not found');
    }

    const organizer = organizerDoc.data();
    const stripeConnectAccountId = organizer.organizerInfo?.stripeConnectAccountId;

    if (!stripeConnectAccountId) {
      throw new Error('Organizer has not completed Stripe Connect setup');
    }

    // Calculate total payout amount (95% of total collected)
    const totalCollected = tournament.paymentInfo.totalCollected || 0;
    const payoutAmount = tournament.paymentInfo.organizerPayoutAmount * (totalCollected / tournament.paymentInfo.entryFee);

    if (payoutAmount <= 0) {
      throw new Error('No funds to payout');
    }

    // Process payout through Stripe
    const transferId = await processOrganizerPayout(
      tournamentId,
      stripeConnectAccountId,
      payoutAmount
    );

    // Update tournament payment info
    await updateDoc(tournamentRef, {
      'paymentInfo.payoutStatus': 'completed',
      'paymentInfo.payoutCompletedAt': serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return;
  } catch (error) {
    console.error('Error processing payout:', error);
    throw error;
  }
};

// Auto-trigger payout when registration closes
export const onRegistrationClosed = async (tournamentId: string): Promise<void> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (!tournamentDoc.exists()) {
      return;
    }

    const tournament = tournamentDoc.data() as Tournament;

    // Only process payout if tournament has payment info and registration just closed
    if (tournament.paymentInfo && tournament.paymentInfo.entryFee > 0) {
      // Wait a bit for Stripe to release funds (usually instant but can take a moment)
      setTimeout(async () => {
        try {
          await processTournamentPayout(tournamentId);
        } catch (error) {
          console.error('Error in delayed payout:', error);
          // Mark as processing so it can be retried manually
          await updateDoc(tournamentRef, {
            'paymentInfo.payoutStatus': 'processing',
            updatedAt: serverTimestamp(),
          });
        }
      }, 5000); // 5 second delay
    }
  } catch (error) {
    console.error('Error in onRegistrationClosed:', error);
  }
};
