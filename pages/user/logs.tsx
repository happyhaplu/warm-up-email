import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth, authFetch } from '../../lib/auth-context';
import Layout from '../../components/Layout';

interface Log {
  id: number;
  timestamp: string;
  sender: string;
  recipient: string;
  subject: string;
  status: string;
  notes: string;
}

export default function UserLogs() {
  const router = useRouter();
  const { user, initialized, logout } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);
  const [selectedLogs, setSelectedLogs] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!initialized || redirectedRef.current) return;
    if (!user) {
      redirectedRef.current = true;
      router.replace('/login');
    }
  }, [user, initialized, router]);

  const loadLogs = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Fetch ALL logs - no limit
      const res = await authFetch('/api/user/logs?limit=10000');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        console.log(`✅ Loaded ${data.length} logs`);
      } else {
        console.error('Failed to fetch logs:', await res.text());
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load logs only once when user is authenticated
  useEffect(() => {
    if (user && initialized) {
      loadLogs();
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadLogs, 30000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, initialized]);

  const toggleSelectAll = () => {
    if (selectedLogs.size === paginatedLogs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(paginatedLogs.map(log => log.id)));
    }
  };

  const toggleLogSelection = (logId: number) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedLogs.size === 0) {
      alert('Please select logs to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedLogs.size} log(s)?`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await authFetch('/api/user/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logIds: Array.from(selectedLogs) }),
      });

      if (res.ok) {
        await loadLogs();
        setSelectedLogs(new Set());
        alert(`✅ Successfully deleted ${selectedLogs.size} log(s)`);
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete logs');
      }
    } catch (error: any) {
      console.error('Error deleting logs:', error);
      alert(`❌ ${error.message || 'Failed to delete logs'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      // Convert to CSV format
      const csvRows = [];
      
      // Header row
      csvRows.push('Timestamp,Sender,Recipient,Subject,Status,Notes');
      
      // Data rows
      filteredLogs.forEach(log => {
        const row = [
          formatDate(log.timestamp),
          log.sender,
          log.recipient,
          `"${log.subject.replace(/"/g, '""')}"`, // Escape quotes in subject
          log.status,
          `"${(log.notes || '').replace(/"/g, '""')}"` // Escape quotes in notes
        ].join(',');
        csvRows.push(row);
      });
      
      // Add summary at the end
      csvRows.push('');
      csvRows.push('SUMMARY');
      csvRows.push(`Generated At,${new Date().toISOString()}`);
      csvRows.push(`Date Range,${dateRange}`);
      csvRows.push(`Filter,${filter}`);
      csvRows.push(`Total Logs,${filteredLogs.length}`);
      csvRows.push(`Sent,${filteredLogs.filter(l => l.status === 'SENT').length}`);
      csvRows.push(`Replied,${filteredLogs.filter(l => l.status === 'REPLIED').length}`);
      csvRows.push(`Received,${filteredLogs.filter(l => l.status === 'RECEIVED').length}`);
      csvRows.push(`Failed,${filteredLogs.filter(l => l.status === 'FAILED').length}`);
      
      const csvContent = csvRows.join('\n');
      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const exportFileDefaultName = `warmup-logs-report-${new Date().toISOString().split('T')[0]}.csv`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      // Save metadata to database
      const reportData = {
        generatedAt: new Date().toISOString(),
        dateRange,
        filter,
        totalLogs: filteredLogs.length,
        stats: {
          sent: filteredLogs.filter(l => l.status === 'SENT').length,
          replied: filteredLogs.filter(l => l.status === 'REPLIED').length,
          received: filteredLogs.filter(l => l.status === 'RECEIVED').length,
          failed: filteredLogs.filter(l => l.status === 'FAILED').length,
        },
      };

      await authFetch('/api/user/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });

      alert(`✅ CSV report generated successfully!\n${filteredLogs.length} logs exported`);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('❌ Failed to generate report');
    } finally {
      setGeneratingReport(false);
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
      case 'RECEIVED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter logs by date range
  const getDateRangeFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return (log: Log) => new Date(log.timestamp) >= today;
      
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return (log: Log) => new Date(log.timestamp) >= weekAgo;
      
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return (log: Log) => new Date(log.timestamp) >= monthStart;
      
      case '90days':
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return (log: Log) => new Date(log.timestamp) >= ninetyDaysAgo;
      
      default:
        return () => true;
    }
  };

  const filteredLogs = logs.filter(log => {
    // Filter by status
    const statusMatch = filter === 'all' || log.status === filter;
    
    // Filter by date range
    const dateFilter = getDateRangeFilter();
    const dateMatch = dateFilter(log);
    
    return statusMatch && dateMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = Math.min(startIndex + logsPerPage, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, dateRange, logsPerPage]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (!initialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📋 My Logs</h1>
              <p className="text-gray-600 mt-1">
                View your email warm-up activity ({logs.length} total logs)
                {loading && <span className="ml-2 text-blue-600">🔄 Refreshing...</span>}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadLogs}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport || filteredLogs.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generatingReport ? '⏳ Generating...' : '📊 Generate CSV Report'}
              </button>
              {selectedLogs.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {deleting ? '⏳ Deleting...' : `🗑️ Delete (${selectedLogs.size})`}
                </button>
              )}
              <button
                onClick={() => router.push('/user/dashboard')}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Date Range
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'Last 7 Days' },
                    { value: 'month', label: 'This Month' },
                    { value: '90days', label: 'Last 90 Days' }
                  ].map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setDateRange(range.value)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        dateRange === range.value
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📊 Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'SENT', 'REPLIED', 'RECEIVED', 'FAILED'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        filter === status
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? 'All' : status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Summary - Based on Filtered Data */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{filteredLogs.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {dateRange === 'all' ? 'All time' : dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'Last 7 days' : dateRange === 'month' ? 'This month' : 'Last 90 days'}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredLogs.filter(l => l.status === 'SENT').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {filteredLogs.length > 0 ? Math.round((filteredLogs.filter(l => l.status === 'SENT').length / filteredLogs.length) * 100) : 0}%
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Received</p>
              <p className="text-2xl font-bold text-purple-600">
                {filteredLogs.filter(l => l.status === 'RECEIVED').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {filteredLogs.length > 0 ? Math.round((filteredLogs.filter(l => l.status === 'RECEIVED').length / filteredLogs.length) * 100) : 0}%
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Replied</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredLogs.filter(l => l.status === 'REPLIED').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {filteredLogs.length > 0 ? Math.round((filteredLogs.filter(l => l.status === 'REPLIED').length / filteredLogs.length) * 100) : 0}%
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredLogs.filter(l => l.status === 'FAILED').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {filteredLogs.length > 0 ? Math.round((filteredLogs.filter(l => l.status === 'FAILED').length / filteredLogs.length) * 100) : 0}%
              </p>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="bg-white rounded-lg shadow p-4 mb-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Logs per page:</span>
              {[10, 20, 50, 100].map(size => (
                <button
                  key={size}
                  onClick={() => setLogsPerPage(size)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    logsPerPage === size
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({startIndex + 1}-{endIndex} of {filteredLogs.length})
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Warning when approaching limit */}
          {logs.length >= 500 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    You have {logs.length} logs. Consider deleting old logs to maintain performance. 
                    Use the checkbox below to select and delete logs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Logs Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading logs...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedLogs.size === paginatedLogs.length && paginatedLogs.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Sender
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Recipient
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
                    {paginatedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No logs found
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedLogs.has(log.id)}
                              onChange={() => toggleLogSelection(log.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(log.timestamp)}
                          </td>
                          <td className="px-6 py-4 text-sm">{log.sender}</td>
                          <td className="px-6 py-4 text-sm">{log.recipient}</td>
                          <td className="px-6 py-4 text-sm max-w-xs truncate" title={log.subject}>
                            {log.subject}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.notes || ''}>
                            {log.notes || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {paginatedLogs.length > 0 && (
                <div className="px-6 py-4 border-t text-sm text-gray-500 flex justify-between items-center">
                  <span>Showing {startIndex + 1}-{endIndex} of {filteredLogs.length} filtered logs (Total: {logs.length})</span>
                  <span className="text-xs text-gray-400">Auto-refresh every 30 seconds</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
