## 🔑 Get Your Supabase API Keys

**Your Supabase project is ready!** Now get your API keys:

### Step 1: Login to Supabase
Go to: https://supabase.com/dashboard/project/dcxnduxjczwzsxtitgjx/settings/api

### Step 2: Copy These Keys

1. **Project URL** (already set):
   ```
   https://dcxnduxjczwzsxtitgjx.supabase.co
   ```

2. **anon/public key** - Copy from "Project API keys" section
   - Look for `anon` `public` key
   - Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`

3. **service_role key** - Copy from "Project API keys" section  
   - Look for `service_role` `secret` key
   - Update `SUPABASE_SERVICE_ROLE_KEY` in `.env`
   - ⚠️ Keep this secret!

### Step 3: Update .env File

Replace the placeholder values in `.env` with your real keys.

### Step 4: Rebuild
```bash
npm run build && npm start
```

---

**Can't access Supabase dashboard?** Auth is already set to work without it for testing!
