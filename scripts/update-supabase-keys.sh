#!/bin/bash

# Get Fresh Supabase API Keys
# Your current keys are expired/invalid and need to be updated

echo "=============================================="
echo "🔑 Getting Fresh Supabase API Keys"
echo "=============================================="
echo ""
echo "Your Supabase API keys have been rotated/expired."
echo "You MUST get fresh keys from your dashboard."
echo ""
echo "📍 Step 1: Open your Supabase project settings"
echo "   https://app.supabase.com/project/dcxnduxjczwzsxtitgjx/settings/api"
echo ""
echo "📍 Step 2: Copy the following values:"
echo ""
echo "   1. Project URL (should be):"
echo "      https://dcxnduxjczwzsxtitgjx.supabase.co"
echo ""
echo "   2. Project API keys → anon public"
echo "      (Long string starting with: eyJhbGci...)"
echo ""
echo "   3. Project API keys → service_role (secret)"
echo "      (Long string starting with: eyJhbGci...)"
echo ""
echo "=============================================="
echo ""

read -p "Paste your anon public key here: " ANON_KEY
echo ""
read -p "Paste your service_role key here: " SERVICE_KEY
echo ""

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_KEY" ]; then
  echo "❌ Keys cannot be empty!"
  exit 1
fi

# Validate key format
if [[ ! "$ANON_KEY" =~ ^eyJ ]]; then
  echo "❌ Invalid anon key format (should start with eyJ)"
  exit 1
fi

if [[ ! "$SERVICE_KEY" =~ ^eyJ ]]; then
  echo "❌ Invalid service_role key format (should start with eyJ)"
  exit 1
fi

echo "✅ Keys look valid!"
echo ""
echo "📝 Updating .env file..."

# Backup current .env
cp .env .env.backup.$(date +%s)

# Update .env with new keys
sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=\".*\"|NEXT_PUBLIC_SUPABASE_ANON_KEY=\"$ANON_KEY\"|g" .env
sed -i "s|SUPABASE_SERVICE_ROLE_KEY=\".*\"|SUPABASE_SERVICE_ROLE_KEY=\"$SERVICE_KEY\"|g" .env

echo "✅ .env updated!"
echo ""
echo "🧪 Testing connection..."

# Test the new keys
RESPONSE=$(curl -s -H "apikey: $ANON_KEY" "https://dcxnduxjczwzsxtitgjx.supabase.co/rest/v1/")

if echo "$RESPONSE" | grep -q "Invalid API key"; then
  echo "❌ Keys are still invalid!"
  echo "Please double-check you copied the CURRENT keys from the dashboard."
  exit 1
fi

echo "✅ Supabase connection successful!"
echo ""
echo "=============================================="
echo "✅ Setup Complete!"
echo "=============================================="
echo ""
echo "You can now login at: http://localhost:3000/login"
echo ""
echo "Next steps:"
echo "1. Restart your dev server: pnpm dev"
echo "2. Go to login page and create your account"
echo ""
