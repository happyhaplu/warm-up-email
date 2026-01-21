import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth, authFetch } from '../../lib/auth-context';
import Layout from '../../components/Layout';

interface Mailbox {
  id: number;
  email: string;
  senderName: string;
  status: string;
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
}

interface Stats {
  totalSent: number;
  totalReplies: number;
  replyRate: number;
  failures: number;
}

interface ValidationError {
  field: string;
  message: string;
}

export default function UserDashboard() {
  const router = useRouter();
  const { user, logout, initialized } = useAuth();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMailbox, setShowAddMailbox] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [savingMailbox, setSavingMailbox] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [bulkImportResult, setBulkImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const redirectedRef = useRef(false);

  // Form states
  const [email, setEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [imapHost, setImapHost] = useState('imap.gmail.com');
  const [imapPort, setImapPort] = useState(993);
  const [dailyWarmupQuota, setDailyWarmupQuota] = useState(2);

  // Bulk import state
  const [csvData, setCsvData] = useState('');

  // Pagination and selection states
  const [selectedMailboxes, setSelectedMailboxes] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [showBulkQuotaEdit, setShowBulkQuotaEdit] = useState(false);
  const [bulkQuotaValue, setBulkQuotaValue] = useState(2);
  const [updatingQuota, setUpdatingQuota] = useState(false);

  // Check if user exists in localStorage as fallback
  const hasStoredUser = (): boolean => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('warmup_user');
    return !!stored;
  };

  // Redirect if not authenticated - only after initialization is complete
  useEffect(() => {
    // Wait for auth to be fully initialized
    if (!initialized) return;
    
    // Prevent multiple redirects
    if (redirectedRef.current) return;
    
    // Check both React state and localStorage
    if (!user && !hasStoredUser()) {
      redirectedRef.current = true;
      router.replace('/login');
      return;
    }
    
    if (user?.role === 'admin') {
      redirectedRef.current = true;
      router.replace('/admin/dashboard');
    }
  }, [user, initialized, router]);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      const [mailboxesRes, statsRes] = await Promise.all([
        authFetch('/api/user/mailboxes'),
        authFetch('/api/user/stats'),
      ]);

      if (mailboxesRes.ok) {
        const data = await mailboxesRes.json();
        setMailboxes(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data only once when user is authenticated
  useEffect(() => {
    if (user && initialized) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, initialized]);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePort = (port: number): boolean => {
    return port > 0 && port <= 65535;
  };

  const validateForm = (): boolean => {
    const errors: ValidationError[] = [];

    if (!email.trim()) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!validateEmail(email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!appPassword.trim()) {
      errors.push({ field: 'appPassword', message: 'App password is required' });
    } else if (appPassword.length < 8) {
      errors.push({ field: 'appPassword', message: 'App password must be at least 8 characters' });
    }

    if (!smtpHost.trim()) {
      errors.push({ field: 'smtpHost', message: 'SMTP host is required' });
    }

    if (!validatePort(smtpPort)) {
      errors.push({ field: 'smtpPort', message: 'SMTP port must be between 1 and 65535' });
    }

    if (!imapHost.trim()) {
      errors.push({ field: 'imapHost', message: 'IMAP host is required' });
    }

    if (!validatePort(imapPort)) {
      errors.push({ field: 'imapPort', message: 'IMAP port must be between 1 and 65535' });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const testConnection = async () => {
    if (!validateForm()) {
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMessage('Testing SMTP and IMAP connections...');

    try {
      const res = await authFetch('/api/user/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          email,
          appPassword,
          smtpHost,
          smtpPort,
          imapHost,
          imapPort,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setConnectionStatus('success');
        setConnectionMessage(data.message || 'Connection successful! SMTP and IMAP are working.');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(data.error || 'Connection failed. Please check your credentials.');
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage('Connection test failed. Please try again.');
    } finally {
      setTestingConnection(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setSenderName('');
    setAppPassword('');
    setSmtpHost('smtp.gmail.com');
    setSmtpPort(587);
    setImapHost('imap.gmail.com');
    setImapPort(993);
    setDailyWarmupQuota(2);
    setValidationErrors([]);
    setConnectionStatus('idle');
    setConnectionMessage('');
  };

  const handleAddMailbox = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSavingMailbox(true);
    setConnectionStatus('idle');
    setConnectionMessage('Validating credentials and testing connection...');

    try {
      const res = await authFetch('/api/user/mailboxes', {
        method: 'POST',
        body: JSON.stringify({
          email,
          senderName,
          appPassword,
          smtpHost,
          smtpPort,
          imapHost,
          imapPort,
          dailyWarmupQuota,
        }),
      });

      if (res.ok) {
        resetForm();
        setShowAddMailbox(false);
        loadData();
        alert('✅ Mailbox validated and connected successfully!');
      } else {
        const error = await res.json();
        setConnectionStatus('error');
        setConnectionMessage(error.error || 'Failed to connect mailbox');
        alert(`❌ Failed to connect mailbox: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding mailbox:', error);
      setConnectionStatus('error');
      setConnectionMessage('Failed to connect mailbox');
      alert('❌ Failed to connect mailbox');
    } finally {
      setSavingMailbox(false);
    }
  };

  const handleBulkImport = async () => {
    if (!csvData.trim()) {
      alert('Please paste CSV data');
      return;
    }

    setBulkImportResult(null);

    try {
      const res = await authFetch('/api/user/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          data: csvData,
          format: 'csv',
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setBulkImportResult({
          success: result.stats?.successful || 0,
          failed: result.stats?.failed || 0,
          errors: result.errors || [],
        });
        loadData();
        setCsvData('');
      } else {
        setBulkImportResult({
          success: 0,
          failed: 1,
          errors: [result.error || 'Import failed'],
        });
      }
    } catch (error) {
      setBulkImportResult({
        success: 0,
        failed: 1,
        errors: ['Import failed. Please try again.'],
      });
    }
  };

  const handleDeleteMailbox = async (id: number) => {
    if (!confirm('Are you sure you want to remove this mailbox?')) {
      return;
    }

    try {
      const res = await authFetch(`/api/user/mailboxes?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadData();
      } else {
        alert('Failed to remove mailbox');
      }
    } catch (error) {
      console.error('Error deleting mailbox:', error);
    }
  };

  // Selection functions
  const toggleSelectMailbox = (id: number) => {
    const newSelected = new Set(selectedMailboxes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMailboxes(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedMailboxes.size === paginatedMailboxes.length) {
      setSelectedMailboxes(new Set());
    } else {
      setSelectedMailboxes(new Set(paginatedMailboxes.map((m: any) => m.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMailboxes.size === 0) {
      alert('Please select mailboxes to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedMailboxes.size} selected mailbox(es)?`)) {
      return;
    }

    setDeletingBulk(true);
    try {
      const deletePromises = Array.from(selectedMailboxes).map(id =>
        authFetch(`/api/user/mailboxes?id=${id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      setSelectedMailboxes(new Set());
      loadData();
      alert(`Successfully deleted ${selectedMailboxes.size} mailbox(es)`);
    } catch (error) {
      console.error('Error deleting mailboxes:', error);
      alert('Failed to delete some mailboxes');
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleBulkQuotaUpdate = async () => {
    if (selectedMailboxes.size === 0) return;

    setUpdatingQuota(true);
    try {
      const updatePromises = Array.from(selectedMailboxes).map(id =>
        authFetch('/api/user/mailboxes', {
          method: 'PUT',
          body: JSON.stringify({ id, dailyWarmupQuota: bulkQuotaValue }),
        })
      );

      await Promise.all(updatePromises);
      setShowBulkQuotaEdit(false);
      setSelectedMailboxes(new Set());
      await loadData();
      alert(`✅ Updated quota to ${bulkQuotaValue} emails/day for ${selectedMailboxes.size} mailbox(es)`);
    } catch (error) {
      console.error('Error updating quota:', error);
      alert('❌ Failed to update quota for some mailboxes');
    } finally {
      setUpdatingQuota(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(mailboxes.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedMailboxes = mailboxes.slice(startIndex, endIndex);

  // Reset to first page when rows per page changes
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find((e: any) => e.field === field)?.message;
  };

  // Show loading while initializing auth or if no user yet
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📧 My Dashboard</h1>
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
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => router.push('/user/dashboard')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Overview
            </button>
            <button
              onClick={() => router.push('/user/logs')}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              My Logs
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm text-gray-600">Total Sent</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalSent}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm text-gray-600">Replies</p>
                    <p className="text-3xl font-bold text-green-600">{stats.totalReplies}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm text-gray-600">Reply Rate</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.replyRate}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm text-gray-600">Failures</p>
                    <p className="text-3xl font-bold text-red-600">{stats.failures}</p>
                  </div>
                </div>
              )}

              {/* Mailboxes */}
              <div className="bg-white rounded-lg shadow mb-8">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                  <h2 className="text-xl font-semibold">My Mailboxes</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowBulkImport(!showBulkImport);
                        setShowAddMailbox(false);
                        setBulkImportResult(null);
                      }}
                      className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                    >
                      {showBulkImport ? 'Cancel' : '📥 Bulk Import'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMailbox(!showAddMailbox);
                        setShowBulkImport(false);
                        resetForm();
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      {showAddMailbox ? 'Cancel' : '+ Add Mailbox'}
                    </button>
                  </div>
                </div>

                {/* Bulk Import Form */}
                {showBulkImport && (
                  <div className="px-6 py-4 bg-purple-50 border-b">
                    <h3 className="text-lg font-medium mb-4">Bulk Import Mailboxes</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Paste CSV data with columns: email, appPassword, senderName (optional), smtpHost, smtpPort, imapHost, imapPort
                    </p>
                    <div className="mb-4">
                      <textarea
                        value={csvData}
                        onChange={(e) => setCsvData(e.target.value)}
                        rows={6}
                        className="w-full p-3 border rounded font-mono text-sm"
                        placeholder={`email,appPassword,senderName,smtpHost,smtpPort,imapHost,imapPort
user1@gmail.com,xxxx xxxx xxxx xxxx,User One,smtp.gmail.com,587,imap.gmail.com,993
user2@gmail.com,yyyy yyyy yyyy yyyy,User Two,smtp.gmail.com,587,imap.gmail.com,993`}
                      />
                    </div>
                    <button
                      onClick={handleBulkImport}
                      className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Import Mailboxes
                    </button>

                    {bulkImportResult && (
                      <div className={`mt-4 p-4 rounded ${bulkImportResult.failed > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        <p className="font-medium">
                          Import Complete: {bulkImportResult.success} successful, {bulkImportResult.failed} failed
                        </p>
                        {bulkImportResult.errors.length > 0 && (
                          <ul className="mt-2 text-sm text-red-600">
                            {bulkImportResult.errors.map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Add Mailbox Form */}
                {showAddMailbox && (
                  <div className="px-6 py-4 bg-gray-50 border-b">
                    <form onSubmit={handleAddMailbox} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={`w-full p-2 border rounded ${getFieldError('email') ? 'border-red-500' : ''}`}
                            placeholder="your@email.com"
                          />
                          {getFieldError('email') && (
                            <p className="text-red-500 text-sm mt-1">{getFieldError('email')}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sender Name
                          </label>
                          <input
                            type="text"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="Your Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            App Password *
                          </label>
                          <input
                            type="password"
                            value={appPassword}
                            onChange={(e) => setAppPassword(e.target.value)}
                            required
                            className={`w-full p-2 border rounded ${getFieldError('appPassword') ? 'border-red-500' : ''}`}
                            placeholder="xxxx xxxx xxxx xxxx"
                          />
                          {getFieldError('appPassword') && (
                            <p className="text-red-500 text-sm mt-1">{getFieldError('appPassword')}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            For Gmail, use an App Password from your Google Account settings
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SMTP Host *
                          </label>
                          <input
                            type="text"
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            required
                            className={`w-full p-2 border rounded ${getFieldError('smtpHost') ? 'border-red-500' : ''}`}
                          />
                          {getFieldError('smtpHost') && (
                            <p className="text-red-500 text-sm mt-1">{getFieldError('smtpHost')}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SMTP Port *
                          </label>
                          <input
                            type="number"
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                            required
                            min="1"
                            max="65535"
                            className={`w-full p-2 border rounded ${getFieldError('smtpPort') ? 'border-red-500' : ''}`}
                          />
                          {getFieldError('smtpPort') && (
                            <p className="text-red-500 text-sm mt-1">{getFieldError('smtpPort')}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            IMAP Host *
                          </label>
                          <input
                            type="text"
                            value={imapHost}
                            onChange={(e) => setImapHost(e.target.value)}
                            required
                            className={`w-full p-2 border rounded ${getFieldError('imapHost') ? 'border-red-500' : ''}`}
                          />
                          {getFieldError('imapHost') && (
                            <p className="text-red-500 text-sm mt-1">{getFieldError('imapHost')}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            IMAP Port *
                          </label>
                          <input
                            type="number"
                            value={imapPort}
                            onChange={(e) => setImapPort(parseInt(e.target.value) || 993)}
                            required
                            min="1"
                            max="65535"
                            className={`w-full p-2 border rounded ${getFieldError('imapPort') ? 'border-red-500' : ''}`}
                          />
                          {getFieldError('imapPort') && (
                            <p className="text-red-500 text-sm mt-1">{getFieldError('imapPort')}</p>
                          )}
                        </div>
                      </div>

                      {/* Daily Warmup Quota */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Daily Warmup Quota (emails per day) *
                        </label>
                        <select
                          value={dailyWarmupQuota}
                          onChange={(e) => setDailyWarmupQuota(parseInt(e.target.value))}
                          className="w-full p-2 border rounded"
                        >
                          <option value={2}>2 emails/day</option>
                          <option value={3}>3 emails/day</option>
                          <option value={4}>4 emails/day</option>
                          <option value={5}>5 emails/day (Maximum)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Number of warmup emails this mailbox will automatically send per day
                        </p>
                      </div>

                      {/* Connection Test Status */}
                      {connectionMessage && (
                        <div className={`p-3 rounded ${
                          connectionStatus === 'success' ? 'bg-green-100 text-green-800' :
                          connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {connectionStatus === 'success' && '✅ '}
                          {connectionStatus === 'error' && '❌ '}
                          {connectionMessage}
                        </div>
                      )}

                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={testConnection}
                          disabled={testingConnection || savingMailbox}
                          className="px-6 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                        >
                          {testingConnection ? 'Testing...' : '🔌 Test Connection'}
                        </button>
                        <button
                          type="submit"
                          disabled={savingMailbox || testingConnection}
                          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingMailbox ? 'Validating & Connecting...' : 'Connect Mailbox'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Bulk Actions Bar */}
                {selectedMailboxes.size > 0 && (
                  <div className="px-6 py-3 bg-blue-50 border-b">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-blue-800">
                        {selectedMailboxes.size} mailbox(es) selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowBulkQuotaEdit(!showBulkQuotaEdit)}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          ✏️ Edit Quota
                        </button>
                        <button
                          onClick={handleBulkDelete}
                          disabled={deletingBulk}
                          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm"
                        >
                          {deletingBulk ? 'Deleting...' : '🗑️ Delete Selected'}
                        </button>
                      </div>
                    </div>
                    {showBulkQuotaEdit && (
                      <div className="flex items-center gap-3 p-3 bg-white rounded border border-blue-200">
                        <label className="text-sm font-medium text-gray-700">New Quota:</label>
                        <select
                          value={bulkQuotaValue}
                          onChange={(e) => setBulkQuotaValue(parseInt(e.target.value))}
                          className="px-3 py-1 border rounded text-sm"
                        >
                          <option value={2}>2 emails/day</option>
                          <option value={3}>3 emails/day</option>
                          <option value={4}>4 emails/day</option>
                          <option value={5}>5 emails/day</option>
                        </select>
                        <button
                          onClick={handleBulkQuotaUpdate}
                          disabled={updatingQuota}
                          className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
                        >
                          {updatingQuota ? 'Updating...' : '✓ Apply'}
                        </button>
                        <button
                          onClick={() => setShowBulkQuotaEdit(false)}
                          className="px-4 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={paginatedMailboxes.length > 0 && selectedMailboxes.size === paginatedMailboxes.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SMTP</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IMAP</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {mailboxes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            No mailboxes connected yet. Click "Add Mailbox" to get started.
                          </td>
                        </tr>
                      ) : paginatedMailboxes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            No mailboxes on this page.
                          </td>
                        </tr>
                      ) : (
                        paginatedMailboxes.map((mailbox) => (
                          <tr key={mailbox.id} className={selectedMailboxes.has(mailbox.id) ? 'bg-blue-50' : ''}>
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedMailboxes.has(mailbox.id)}
                                onChange={() => toggleSelectMailbox(mailbox.id)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">{mailbox.email}</td>
                            <td className="px-6 py-4 text-sm">{mailbox.senderName || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {mailbox.smtpHost}:{mailbox.smtpPort}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {mailbox.imapHost}:{mailbox.imapPort}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                Connected
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleDeleteMailbox(mailbox.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {mailboxes.length > 0 && (
                  <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-700">
                        Showing {startIndex + 1} to {Math.min(endIndex, mailboxes.length)} of {mailboxes.length} mailboxes
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-700">Rows per page:</label>
                        <select
                          value={rowsPerPage}
                          onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value))}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
