#!/bin/bash

# K1 Gym Fitness Center - Web Deployment Script

echo "Building K1 Gym app for web..."

# Install dependencies
npm install

# Export for web
npx expo export --platform web

# Create dist directory if it doesn't exist
mkdir -p dist

# Check if build was successful
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    echo "✅ Web build successful! Files are in dist/"
    echo ""
    echo "📦 Next steps:"
    echo "1. Deploy to Vercel: npx vercel --prod"
    echo "2. Deploy to Netlify: netlify deploy --prod --dir=dist"
    echo "3. Or use: eas deploy --platform web"
else
    echo "❌ Web build may have failed or dist is empty"
    echo "Trying alternative build method..."
    npx expo prebuild --platform web
fi
