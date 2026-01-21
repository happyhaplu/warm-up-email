import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          window.location.href = '/login';
          return;
        }

        if (session) {
          // Redirect to dashboard after successful authentication
          window.location.href = '/dashboard';
        } else {
          // No session, redirect to login
          window.location.href = '/login';
        }
      } catch (err) {
        console.error('Callback error:', err);
        window.location.href = '/login';
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Authenticating...</h2>
        <p className="mt-2 text-gray-600">Please wait while we log you in.</p>
      </div>
    </div>
  );
}
