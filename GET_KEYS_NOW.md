# Get Your Supabase API Keys

## Step 1: Visit Supabase Dashboard
https://supabase.com/dashboard/project/dcxnduxjczwzsxtitgjx/settings/api

## Step 2: Copy These Keys

1. **Project URL**: Already configured ✅
   ```
   https://dcxnduxjczwzsxtitgjx.supabase.co
   ```

2. **anon public key**: 
   - Look for "Project API keys" section
   - Copy the "anon" "public" key
   - It starts with `eyJhbGci...`

3. **service_role key** (optional for now):
   - Copy the "service_role" "secret" key  
   - Keep this private!

## Step 3: Update .env

Replace the PLACEHOLDER in `.env`:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY="paste-your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="paste-your-service-role-key-here"
```

## Step 4: Restart Server

```bash
npm run build
npm run dev
```

## Need Help?

If you can't access the dashboard, run:
```bash
./get-supabase-keys.sh
```
