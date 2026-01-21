#!/bin/bash

# Quick test to verify Supabase connection

echo "🧪 Testing Supabase Connection..."
echo ""

# Load .env
export $(cat .env | grep -v '^#' | xargs)

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "❌ Missing environment variables in .env"
  exit 1
fi

if [[ "$NEXT_PUBLIC_SUPABASE_ANON_KEY" == *"PLACEHOLDER"* ]]; then
  echo "❌ PLACEHOLDER key detected"
  echo ""
  echo "Run this command to fix:"
  echo "  ./setup-supabase.sh"
  echo ""
  echo "Or manually get keys from:"
  echo "  https://supabase.com/dashboard/project/dcxnduxjczwzsxtitgjx/settings/api"
  exit 1
fi

# Test connection
RESPONSE=$(curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}")

if echo "$RESPONSE" | grep -q "Invalid"; then
  echo "❌ Connection failed"
  echo "Response: $RESPONSE"
  echo ""
  echo "Your API key may be incorrect. Please check:"
  echo "  https://supabase.com/dashboard/project/dcxnduxjczwzsxtitgjx/settings/api"
  exit 1
else
  echo "✅ Supabase connection successful!"
  echo ""
  echo "Project URL: $NEXT_PUBLIC_SUPABASE_URL"
  echo "API Key: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:20}..."
  echo ""
  echo "You're ready to start the server:"
  echo "  npm run dev"
fi
