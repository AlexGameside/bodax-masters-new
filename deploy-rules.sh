#!/bin/bash

echo "🚀 Deploying Firestore Rules for Testing..."

# Deploy only the Firestore rules
echo "📝 Deploying Firestore rules..."
firebase deploy --only firestore:rules

echo "✅ Firestore rules deployed successfully!"
echo "⚠️  WARNING: These rules allow ALL operations for testing purposes!"
echo "🔒 Remember to update rules for production use!"

# Optional: Deploy indexes as well
echo ""
read -p "Do you want to deploy Firestore indexes as well? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Deploying Firestore indexes..."
    firebase deploy --only firestore:indexes
    echo "✅ Firestore indexes deployed successfully!"
fi

echo ""
echo "🎯 Your Firestore is now open for testing!"
echo "🌐 Visit: https://console.firebase.google.com/project/bodax-masters/firestore" 