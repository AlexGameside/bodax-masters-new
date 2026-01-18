# Organizer Guide - How to Create Tournaments with Entry Fees

## Step 1: Apply to Become an Organizer

1. Log in to your Bodax account
2. Click on your profile in the top right
3. Select "BECOME ORGANIZER" from the dropdown
4. Fill out the organizer application form:
   - Business Name
   - Business Email
   - Business Address (optional)
   - Tax ID (optional)
   - Bank Account Details (IBAN) - **Required for payouts**
5. Submit your application
6. Wait for admin approval (usually within 24-48 hours)

## Step 2: Complete Stripe Connect Setup

Once your application is approved:

1. Go to your **Organizer Dashboard** (click "ORGANIZER DASHBOARD" in profile dropdown)
2. You'll see a yellow banner prompting you to complete Stripe Connect setup
3. Click "Complete Setup" or "Setup Payments"
4. You'll be redirected to Stripe's secure onboarding page
5. Complete the Stripe Connect Express onboarding:
   - Provide business information
   - Add bank account details (if not already provided)
   - Complete identity verification
6. Once complete, you'll be redirected back to Bodax

## Step 3: Create a Tournament with Entry Fee

1. From your **Organizer Dashboard**, click "Create Tournament"
   - Or navigate to: `/admin/tournaments/create`
2. Fill out the tournament details:
   - Tournament Name
   - Description
   - Format (Single/Double Elimination, Swiss System)
   - Schedule (Start/End dates)
   - Prize Pool (optional)
3. **Set Entry Fee** (in the "Registration & Prize Pool" section):
   - Enter the participation fee per team in EUR
   - The system will automatically calculate:
     - Platform fee (5%): Shown below the input
     - Your payout (95%): Shown below the input
   - Example: €50 entry fee = €2.50 platform fee, €47.50 your payout
4. Set other requirements:
   - Max teams
   - Team composition
   - Registration deadline
5. Click "Create Tournament"
6. Your tournament is now live and teams can register!

## Step 4: Teams Register and Pay

1. Teams will see your tournament in the tournament list
2. When they try to register, they'll be prompted to pay the entry fee
3. Teams complete payment via Stripe Checkout
4. Once payment is successful, their slot is automatically locked
5. You can see registered teams in the tournament management page

## Step 5: Receive Payout

1. When tournament registration closes, the payout is automatically processed
2. Funds are transferred to your Stripe Connect account
3. You'll receive the payout amount (95% of total collected fees)
4. Check your payout status in the tournament details

## Important Notes

### Entry Fees
- Entry fees are **per team**, not per player
- Minimum entry fee: €1.00
- Currency: EUR only (for now)
- Platform fee: 5% (automatically deducted)
- Your payout: 95% of collected fees

### Refunds
- Teams can request refunds up to **14 days before tournament start**
- If tournament is cancelled, all teams get full refunds automatically
- Refunds are processed by the platform

### Payouts
- Payouts are processed automatically when registration closes
- Funds are held by Stripe until registration ends
- You'll receive payouts to your connected bank account
- Payout timing depends on Stripe's processing (usually instant)

### Stripe Connect
- You must complete Stripe Connect onboarding before creating paid tournaments
- This is a one-time setup process
- Your bank account details are securely stored by Stripe
- You can update payment details in your Stripe Dashboard

## Troubleshooting

**Can't create tournament with entry fee?**
- Make sure you're verified as an organizer
- Complete Stripe Connect setup first
- Check that your Stripe account is active

**Payout not received?**
- Check tournament registration has closed
- Verify your Stripe Connect account is fully set up
- Check payout status in tournament details
- Contact support if payout status shows "failed"

**Teams can't pay?**
- Verify Stripe publishable key is configured
- Check backend API endpoints are implemented
- Ensure tournament is in "registration-open" status

## Support

If you need help:
1. Check this guide first
2. Review the API_ENDPOINTS.md for backend setup
3. Contact support through the platform
