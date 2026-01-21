import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth, authFetch } from '../../lib/auth-context';
import AdminLayout from '../../components/AdminLayout';

interface Stats {
  totalMailboxes: number;
  totalUsers: number;
  totalSent: number;
  totalReplies: number;
  replyRate: number;
  failures: number;
}

interface Mailbox {
  id: number;
  email: string;
  senderName: string;
  userId: string;
  userEmail: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, initialized, logout, isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadData = useCallback(async () => {
    if (!user || !isAdmin) return;

    try {
      setLoading(true);

      const [statsRes, mailboxesRes] = await Promise.all([
        authFetch('/api/admin/stats'),
        authFetch('/api/admin/mailboxes'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (mailboxesRes.ok) {
        const mailboxesData = await mailboxesRes.json();
        setMailboxes(mailboxesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  // Load data only once when user is authenticated
  useEffect(() => {
    if (user && isAdmin && initialized) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, initialized]);

  if (!initialized || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🛠️ Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {user.email}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>

          {/* Navigation */}
          <div className="flex gap-4 mb-8 flex-wrap">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Overview
            </button>
            <button
              onClick={() => router.push('/admin/mailboxes')}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              Mailbox Pool
            </button>
            <button
              onClick={() => router.push('/admin/templates')}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              Templates
            </button>
            <button
              onClick={() => router.push('/admin/warmup')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              🚀 Warmup Control
            </button>
            <button
              onClick={() => router.push('/admin/logs')}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              Global Logs
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm text-gray-600">Total Mailboxes</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalMailboxes}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-green-600">{stats.totalUsers}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm text-gray-600">Total Sent</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalSent}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm text-gray-600">Total Replies</p>
                    <p className="text-3xl font-bold text-indigo-600">{stats.totalReplies}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm text-gray-600">Reply Rate</p>
                    <p className="text-3xl font-bold text-teal-600">{stats.replyRate}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm text-gray-600">Failures</p>
                    <p className="text-3xl font-bold text-red-600">{stats.failures}</p>
                  </div>
                </div>
              )}

              {/* Recent Mailboxes */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                  <h2 className="text-xl font-semibold">All Mailboxes ({mailboxes.length})</h2>
                  <button
                    onClick={() => router.push('/admin/mailboxes')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Manage Pool →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Connected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {mailboxes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                            No mailboxes connected yet
                          </td>
                        </tr>
                      ) : (
                        mailboxes.slice(0, 10).map((mailbox) => (
                          <tr key={mailbox.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium">{mailbox.email}</td>
                            <td className="px-6 py-4 text-sm">{mailbox.senderName || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{mailbox.userEmail || 'Pool'}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(mailbox.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {mailboxes.length > 10 && (
                  <div className="px-6 py-4 border-t text-center">
                    <button
                      onClick={() => router.push('/admin/mailboxes')}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View all {mailboxes.length} mailboxes
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
