import { useRouter } from 'next/router';

export default function SetupRequired() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="https://raw.githubusercontent.com/happyhaplu/Outcraftly-assets/main/1764808676915.jpg" 
              alt="Outcraftly Logo" 
              className="h-12 w-auto"
            />
            <span className="ml-3 text-3xl font-bold text-gray-900">Warmup</span>
          </div>
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Supabase Setup Required
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            This application requires valid Supabase API keys to function.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              📝 Step 1: Get Your API Keys
            </h3>
            <p className="text-gray-600 mb-3">
              Visit your Supabase project dashboard:
            </p>
            <a
              href="https://supabase.com/dashboard/project/dcxnduxjczwzsxtitgjx/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Open Supabase Dashboard →
            </a>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              🔑 Step 2: Copy Your Keys
            </h3>
            <p className="text-gray-600 mb-2">From the API settings page, copy:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
              <li><strong>Project URL</strong> (already configured ✅)</li>
              <li><strong>anon public</strong> key - starts with <code className="bg-gray-100 px-1">eyJhbGci...</code></li>
              <li><strong>service_role</strong> key (optional)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ⚙️ Step 3: Update .env File
            </h3>
            <p className="text-gray-600 mb-3">
              Open <code className="bg-gray-100 px-2 py-1">.env</code> in your project root and replace the PLACEHOLDER values:
            </p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto text-sm">
{`# Update these lines in .env:
NEXT_PUBLIC_SUPABASE_ANON_KEY="paste-your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="paste-your-service-role-key-here"`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              🚀 Step 4: Restart Server
            </h3>
            <p className="text-gray-600 mb-3">
              After updating .env, restart your development server:
            </p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-md text-sm">
{`npm run dev`}
            </pre>
          </div>

          <div className="pt-4 border-t">
            <button
              onClick={() => router.reload()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              ✅ I've Updated .env - Reload Page
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Important:</strong> Keep your service_role key secret! Never commit .env to git.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
