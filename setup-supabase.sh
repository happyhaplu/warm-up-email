#!/bin/bash

# Script to help set up Supabase keys for Gmail Warmup Dashboard

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║         📧 Gmail Warmup - Supabase Setup Helper               ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This app requires valid Supabase API keys to run."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 STEP 1: Get Your Supabase Keys"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Open this URL in your browser:"
echo "   👉 https://supabase.com/dashboard/project/dcxnduxjczwzsxtitgjx/settings/api"
echo ""
echo "2. Find 'Project API keys' section"
echo ""
echo "3. Copy the following keys:"
echo "   • anon / public key (starts with eyJhbGci...)"
echo "   • service_role key (optional, for admin operations)"
echo ""
read -p "Press ENTER when you have the keys ready..."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  STEP 2: Enter Your Keys"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Paste your ANON KEY (anon/public): " ANON_KEY
echo ""
read -p "Paste your SERVICE ROLE KEY (optional, press ENTER to skip): " SERVICE_KEY

if [ -z "$ANON_KEY" ]; then
  echo "❌ Error: ANON KEY is required!"
  exit 1
fi

# Set default service key if not provided
if [ -z "$SERVICE_KEY" ]; then
  SERVICE_KEY="PLACEHOLDER-SERVICE-KEY"
  echo "⚠️  Skipping service role key (some features may be limited)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 STEP 3: Updating .env File"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Backup existing .env
if [ -f .env ]; then
  cp .env .env.backup
  echo "✅ Backed up existing .env to .env.backup"
fi

# Update .env with new keys
sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=\"$ANON_KEY\"|g" .env
sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=\"$SERVICE_KEY\"|g" .env

echo "✅ Updated .env with your Supabase keys"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 STEP 4: Testing Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test the connection
TEST_RESULT=$(curl -s "https://dcxnduxjczwzsxtitgjx.supabase.co/rest/v1/" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" 2>&1)

if echo "$TEST_RESULT" | grep -q "Invalid"; then
  echo "❌ Connection test failed!"
  echo "   Response: $TEST_RESULT"
  echo ""
  echo "   Please double-check your keys and try again."
  exit 1
else
  echo "✅ Connection successful!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 STEP 5: Setup Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Push database schema to Supabase? (y/n): " SETUP_DB

if [ "$SETUP_DB" = "y" ] || [ "$SETUP_DB" = "Y" ]; then
  echo "Generating Prisma client..."
  npx prisma generate
  
  echo "Pushing schema to Supabase..."
  npx prisma db push
  
  echo "✅ Database setup complete!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Your Gmail Warmup Dashboard is now configured!"
echo ""
echo "🚀 Start the server:"
echo "   npm run dev"
echo ""
echo "📱 Access at:"
echo "   http://localhost:3000"
echo ""
echo "You'll need to sign up with email/password on first visit."
echo ""
