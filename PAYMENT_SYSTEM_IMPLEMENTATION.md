# Payment System Implementation Guide

## Overview
This document outlines the payment system implementation for Bodax tournament organizers.

## Completed Components

1. ✅ **Type Definitions** - Added organizer and payment types
2. ✅ **Stripe Service** - Basic Stripe integration service
3. ✅ **Organizer Service** - Organizer application and verification
4. ✅ **Organizer Application Form** - `/organizer/apply` page
5. ✅ **Admin Organizer Management** - Admin panel for verifying organizers
6. ✅ **Tournament Creation Updates** - Support for organizer entry fees

## Remaining Implementation

### 1. Backend API Endpoints (Required)
Create the following API endpoints (can use Firebase Cloud Functions or separate backend):

- `POST /api/stripe/create-connect-onboarding` - Create Stripe Connect onboarding link
- `POST /api/stripe/create-payment-intent` - Create payment intent for team registration
- `POST /api/stripe/process-payout` - Process payout to organizer
- `POST /api/stripe/process-refund` - Process refund for team
- `POST /api/stripe/webhook` - Handle Stripe webhooks

### 2. Payment Checkout Flow
- Create `PaymentCheckout.tsx` component
- Integrate with Stripe Elements for card input
- Update team registration to redirect to payment if entry fee required

### 3. Team Registration Updates
- Update `registerTeamForTournament` to check payment status
- Only allow registration after successful payment
- Create tournament registration record with payment info

### 4. Automatic Payout System
- Trigger payout when tournament registration closes
- Calculate total collected fees
- Transfer to organizer's Stripe Connect account
- Update tournament payment status

### 5. Refund System
- Check refund eligibility (14 days before tournament start)
- Process refunds when tournament cancelled
- Update registration and tournament payment status

### 6. Firestore Security Rules
- Add rules for organizer data
- Add rules for payment/registration data
- Ensure only authorized users can access payment info

### 7. Environment Variables
Add to `.env`:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Key Files to Update

1. `src/pages/TeamRegistration.tsx` - Add payment check
2. `src/services/tournamentService.ts` - Update registration logic
3. `src/App.tsx` - Add route for `/organizer/apply`
4. `firestore.rules` - Add payment/organizer rules

## Testing Checklist

- [ ] Organizer can apply and get verified
- [ ] Verified organizer can create tournament with entry fee
- [ ] Team can see entry fee when registering
- [ ] Payment checkout works correctly
- [ ] Team slot is locked only after payment
- [ ] Payout triggers when registration closes
- [ ] Refunds work within 14-day window
- [ ] Full refunds on tournament cancellation
