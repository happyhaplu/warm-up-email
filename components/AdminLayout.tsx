import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth-context';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { user, initialized, isAdmin, logout, loading } = useAuth();
  const redirectedRef = useRef(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    await logout();
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'A';
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
    { href: '/admin/users', label: '👥 Users' },
    { href: '/admin/plans', label: '💎 Plans' },
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
                <Link href="/admin/dashboard" className="flex items-center">
                  <img 
                    src="https://raw.githubusercontent.com/happyhaplu/Outcraftly-assets/main/1764808676915.jpg" 
                    alt="Outcraftly Logo" 
                    className="h-8 w-auto bg-white rounded p-1"
                  />
                  <span className="ml-2 text-xl font-bold text-white">Warmup</span>
                  <span className="ml-2 text-sm font-medium text-blue-200">Admin</span>
                </Link>
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
            <div className="flex items-center">
              {user && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-3 focus:outline-none hover:bg-blue-500 rounded-lg px-3 py-2 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 text-sm font-semibold">
                        {getUserInitials()}
                      </div>
                      <span className="text-sm font-medium text-white hidden md:block">
                        {user.name || user.email?.split('@')[0]}
                      </span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-blue-100 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      {/* User Info Section */}
                      <div className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-base font-semibold">
                            {getUserInitials()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {user.name || 'Admin'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {user.email}
                            </p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                              Administrator
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-5 h-5 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
