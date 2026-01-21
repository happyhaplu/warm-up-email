import { useState, useEffect } from 'react';

export default function DebugAuth() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cookies, setCookies] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user || null);
        setCookies(document.cookie);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleTestLogin = async () => {
    const email = prompt('Enter email:');
    const password = prompt('Enter password:');
    
    if (!email || !password) return;

    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert('Login failed: ' + error.message);
      } else {
        alert('Login successful! Redirecting...');
        window.location.href = '/dashboard';
      }
    } catch (error) {
      alert('Error: ' + error);
    }
  };

  const handleLogout = async () => {
    const { supabase } = await import('../lib/supabase');
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleClearCookies = () => {
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Auth Debug Panel</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          <div className="mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${session ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {session ? '✅ Authenticated' : '❌ Not Authenticated'}
            </span>
          </div>

          {user && (
            <div className="bg-gray-50 p-4 rounded">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={handleTestLogin}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Test Login
            </button>
            {session && (
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            )}
            <button
              onClick={handleClearCookies}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Clear Cookies
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Full Session Data</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(session, null, 2) || 'No session data'}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Cookies</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-sm">
            {cookies || 'No cookies'}
          </pre>
        </div>
      </div>
    </div>
  );
}
