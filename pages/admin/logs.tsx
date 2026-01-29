import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth, authFetch } from '../../lib/auth-context';
import AdminLayout from '../../components/AdminLayout';

interface Log {
  id: number;
  timestamp: string;
  sender: string;
  recipient: string;
  subject: string;
  status: string;
  notes: string;
  userEmail?: string;
}

export default function AdminLogs() {
  const router = useRouter();
  const { user, initialized } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [clearing, setClearing] = useState(false);
  const [cleanupInfo, setCleanupInfo] = useState<{ oldLogs: number; totalLogs: number } | null>(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!initialized || redirectedRef.current) return;
    
    if (!user) {
      redirectedRef.current = true;
      router.replace('/login');
      return;
    }
    
    if (user.role !== 'admin') {
      redirectedRef.current = true;
      router.replace('/user/dashboard');
      return;
    }

    loadLogs();
    loadCleanupInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, initialized]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      const res = await authFetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCleanupInfo = async () => {
    try {
      const res = await authFetch('/api/admin/cleanup-logs');
      if (res.ok) {
        const data = await res.json();
        setCleanupInfo(data);
      }
    } catch (error) {
      console.error('Error loading cleanup info:', error);
    }
  };

  const handleCleanupOldLogs = async () => {
    if (!cleanupInfo || cleanupInfo.oldLogs === 0) {
      alert('ℹ️ No logs older than 30 days found.');
      return;
    }

    if (!confirm(`⚠️ Delete ${cleanupInfo.oldLogs} log(s) older than 30 days?\n\nThis will keep:\n✅ Recent logs (last 30 days)\n✅ All account data\n✅ Monthly reports\n✅ Quota tracking\n\nClick OK to proceed.`)) {
      return;
    }

    try {
      setClearing(true);
      const res = await authFetch('/api/admin/cleanup-logs', {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ ${data.message}`);
        loadLogs();
        loadCleanupInfo();
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.error || 'Failed to cleanup logs'}`);
      }
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      alert('❌ Failed to cleanup logs. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'REPLIED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDateFilter = (date: string): boolean => {
    const logDate = new Date(date);
    const now = new Date();
    
    switch (dateRange) {
      case 'today':
        return logDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return logDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return logDate >= monthAgo;
      default:
        return true;
    }
  };

  const filteredLogs = logs.filter((log) => {
    // Status filter
    if (filter !== 'all' && log.status !== filter) return false;
    
    // Date filter
    if (!getDateFilter(log.timestamp)) return false;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.sender.toLowerCase().includes(term) ||
        log.recipient.toLowerCase().includes(term) ||
        log.subject.toLowerCase().includes(term) ||
        (log.notes && log.notes.toLowerCase().includes(term))
      );
    }
    
    return true;
  });

  // Stats
  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'SENT').length,
    replied: logs.filter(l => l.status === 'REPLIED').length,
    failed: logs.filter(l => l.status === 'FAILED').length,
  };

  if (!initialized || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Global Logs</h1>
              <p className="text-sm text-gray-500 mt-1">
                🧹 Auto-cleanup: Logs older than 30 days are deleted daily
              </p>
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Note: Logs are needed for reports, quota tracking, and statistics
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Cleanup Info Banner */}
          {cleanupInfo && cleanupInfo.oldLogs > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>0 days can be cleaned up (keeps monthly reports)
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>{cleanupInfo.oldLogs}</strong> log(s) older than 3 days can be cleaned up
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCleanupOldLogs}
                  disabled={clearing}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 text-sm"
                >
                  {clearing ? 'Cleaning...' : '🗑️ Cleanup Old Logs'}
                </button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">Total Logs</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-blue-50 rounded-lg shadow p-4">
              <p className="text-blue-600 text-sm">Sent</p>
              <p className="text-2xl font-bold text-blue-700">{stats.sent}</p>
            </div>
            <div className="bg-green-50 rounded-lg shadow p-4">
              <p className="text-green-600 text-sm">Replied</p>
              <p className="text-2xl font-bold text-green-700">{stats.replied}</p>
            </div>
            <div className="bg-red-50 rounded-lg shadow p-4">
              <p className="text-red-600 text-sm">Failed</p>
              <p className="text-2xl font-bold text-red-700">{stats.failed}</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by email, subject, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              {/* Date Range */}
              <div>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="p-2 border rounded"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
              
              {/* Refresh */}
              <button
                onClick={loadLogs}
                disabled={clearing}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded ${
                  filter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
                }`}
              >
                All ({logs.length})
              </button>
              <button
                onClick={() => setFilter('SENT')}
                className={`px-4 py-2 rounded ${
                  filter === 'SENT' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Sent ({logs.filter((l) => l.status === 'SENT').length})
              </button>
              <button
                onClick={() => setFilter('REPLIED')}
                className={`px-4 py-2 rounded ${
                  filter === 'REPLIED' ? 'bg-green-500 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Replied ({logs.filter((l) => l.status === 'REPLIED').length})
              </button>
              <button
                onClick={() => setFilter('FAILED')}
                className={`px-4 py-2 rounded ${
                  filter === 'FAILED' ? 'bg-red-500 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Failed ({logs.filter((l) => l.status === 'FAILED').length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading logs...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        From
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No logs found
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm">{log.sender}</td>
                          <td className="px-6 py-4 text-sm">{log.recipient}</td>
                          <td className="px-6 py-4 text-sm">{log.subject}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{log.notes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
