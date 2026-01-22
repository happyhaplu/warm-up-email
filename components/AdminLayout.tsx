import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth-context';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { user, initialized, isAdmin, logout, loading } = useAuth();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!initialized || redirectedRef.current) return;

    if (!user) {
      redirectedRef.current = true;
      router.replace('/login');
    } else if (!isAdmin) {
      redirectedRef.current = true;
      router.replace('/user/dashboard');
    }
  }, [user, initialized, isAdmin, router]);

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const adminNavItems = [
    { href: '/admin/dashboard', label: '📊 Overview' },
    { href: '/admin/mailboxes', label: '📬 Mailboxes' },
    { href: '/admin/templates', label: '📝 Templates' },
    { href: '/admin/warmup', label: '🔥 Warmup Control' },
    { href: '/admin/logs', label: '📋 Logs' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-white flex items-center">
                  👑 Admin Panel
                </h1>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {adminNavItems.map((item) => {
                  const isActive = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-800 text-white'
                          : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <span className="text-sm text-blue-100">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            📧 Gmail Warmup Tool - Admin Dashboard
          </p>
        </div>
      </footer>
    </div>
  );
}
