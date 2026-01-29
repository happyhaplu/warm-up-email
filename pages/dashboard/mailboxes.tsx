import Layout from '../../components/Layout';
import { useEffect, useState, FormEvent, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth, authFetch } from '../../lib/auth-context';

interface Account {
  id: number;
  email: string;
  senderName?: string;
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
  createdAt: string;
  warmupEnabled?: boolean;
  warmupMaxDaily?: number;
  warmupStartCount?: number;
  warmupIncreaseBy?: number;
  warmupStartDate?: string;
  sentToday?: number;
  dailyQuota?: number;
}

export default function Mailboxes() {
  const router = useRouter();
  const { user, initialized } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const redirectedRef = useRef(false);

  // Pagination and selection states
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Bulk import states
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [bulkImportResult, setBulkImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  
  // Bulk warmup edit states
  const [showBulkWarmupModal, setShowBulkWarmupModal] = useState(false);
  const [bulkEditSettings, setBulkEditSettings] = useState({
    warmupEnabled: true,
    warmupStartCount: 3,
    warmupIncreaseBy: 3,
    warmupMaxDaily: 20,
    warmupReplyRate: 35,
  });
  const [updatingBulkSettings, setUpdatingBulkSettings] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    senderName: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    appPassword: '',
    dailyWarmupQuota: 2,
  });

  useEffect(() => {
    if (!initialized || redirectedRef.current) return;
    if (!user) {
      redirectedRef.current = true;
      router.replace('/login');
      return;
    }
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, initialized]);

  const fetchAccounts = async () => {
    try {
      const res = await authFetch('/api/accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? '/api/accounts' : '/api/accounts';
      const method = editingId ? 'PUT' : 'POST';
      const payload = editingId ? { ...formData, id: editingId } : formData;

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save account');

      resetForm();
      fetchAccounts();
      alert(editingId ? 'Account updated!' : 'Account added!');
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Failed to save account');
    }
  };

  const handleEdit = (account: Account) => {
    setFormData({
      email: account.email,
      senderName: account.senderName || '',
      smtpHost: account.smtpHost,
      smtpPort: account.smtpPort,
      imapHost: account.imapHost,
      imapPort: account.imapPort,
      appPassword: '',
      dailyWarmupQuota: 2,
    });
    setEditingId(account.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this mailbox?')) return;
    
    try {
      await authFetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
      setAccounts(accounts.filter(a => a.id !== id));
      alert('Account deleted');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    }
  };

  // Selection functions
  const toggleSelectAccount = (id: number) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAccounts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedAccounts.size === paginatedAccounts.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(paginatedAccounts.map((a: any) => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAccounts.size === 0) {
      alert('Please select mailboxes to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedAccounts.size} selected mailbox(es)?`)) {
      return;
    }

    setDeletingBulk(true);
    try {
      const deletePromises = Array.from(selectedAccounts).map(id =>
        authFetch(`/api/accounts?id=${id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      setSelectedAccounts(new Set());
      fetchAccounts();
      alert(`Successfully deleted ${selectedAccounts.size} mailbox(es)`);
    } catch (error) {
      console.error('Error deleting mailboxes:', error);
      alert('Failed to delete some mailboxes');
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleBulkWarmupUpdate = async () => {
    if (selectedAccounts.size === 0) return;

    setUpdatingBulkSettings(true);
    try {
      const res = await authFetch('/api/user/mailboxes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailboxIds: Array.from(selectedAccounts),
          ...bulkEditSettings,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update settings');
      }

      const result = await res.json();
      setShowBulkWarmupModal(false);
      setSelectedAccounts(new Set());
      fetchAccounts();
      alert(`✅ Successfully updated warmup settings for ${result.updated} mailbox(es)`);
    } catch (error: any) {
      console.error('Error updating settings:', error);
      alert(`❌ ${error.message || 'Failed to update settings'}`);
    } finally {
      setUpdatingBulkSettings(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(accounts.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedAccounts = accounts.slice(startIndex, endIndex);

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await authFetch('/api/accounts/bulk-import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      alert(result.message);
      fetchAccounts();
    } catch (error: any) {
      console.error('Import error:', error);
      alert(error.message || 'Failed to import accounts');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleBulkImportPaste = async () => {
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
        fetchAccounts();
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

  const resetForm = () => {
    setFormData({
      email: '',
      senderName: '',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      appPassword: '',
      dailyWarmupQuota: 2,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (!initialized || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mailboxes</h1>
            <p className="mt-2 text-sm text-gray-600">Manage Gmail accounts for warmup</p>
          </div>
          <div className="flex gap-2">
            <label className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={importing}
              />
              {importing ? 'Importing...' : '📁 File Import'}
            </label>
            <button
              onClick={() => {
                setShowBulkImport(!showBulkImport);
                setBulkImportResult(null);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              {showBulkImport ? 'Cancel Import' : '📋 Paste CSV'}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : '+ Add Mailbox'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 bg-white shadow sm:rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">
              {editingId ? 'Edit Mailbox' : 'Add New Mailbox'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    value={formData.senderName}
                    onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={formData.smtpHost}
                    onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={formData.smtpPort}
                    onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    IMAP Host
                  </label>
                  <input
                    type="text"
                    value={formData.imapHost}
                    onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    IMAP Port
                  </label>
                  <input
                    type="number"
                    value={formData.imapPort}
                    onChange={(e) => setFormData({ ...formData, imapPort: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    App Password * {editingId && '(leave empty to keep current)'}
                  </label>
                  <input
                    type="password"
                    required={!editingId}
                    value={formData.appPassword}
                    onChange={(e) => setFormData({ ...formData, appPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Daily Warmup Quota
                  </label>
                  <select
                    value={formData.dailyWarmupQuota}
                    onChange={(e) => setFormData({ ...formData, dailyWarmupQuota: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  >
                    <option value={2}>2 emails/day</option>
                    <option value={3}>3 emails/day</option>
                    <option value={4}>4 emails/day</option>
                    <option value={5}>5 emails/day</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Automatic warmup emails per day</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Add'} Mailbox
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bulk Import with CSV Paste */}
        {showBulkImport && (
          <div className="mb-6 bg-white shadow sm:rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Bulk Import Mailboxes (CSV Paste)</h2>
            <p className="text-sm text-gray-600 mb-4">
              Paste CSV data with columns: email, appPassword, senderName (optional), smtpHost, smtpPort, imapHost, imapPort, dailyWarmupQuota (optional, 2-5)
            </p>
            <div className="mb-4">
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                rows={8}
                className="w-full p-3 border rounded font-mono text-sm"
                placeholder={`email,appPassword,senderName,smtpHost,smtpPort,imapHost,imapPort,dailyWarmupQuota
user1@gmail.com,xxxx xxxx xxxx xxxx,John Doe,smtp.gmail.com,587,imap.gmail.com,993,3
user2@gmail.com,yyyy yyyy yyyy yyyy,Jane Smith,smtp.gmail.com,587,imap.gmail.com,993,5`}
              />
            </div>
            <button
              onClick={handleBulkImportPaste}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
                    {bulkImportResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                    {bulkImportResult.errors.length > 10 && (
                      <li className="mt-2 font-medium">... and {bulkImportResult.errors.length - 10} more errors</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {/* Bulk Actions Bar */}
          {selectedAccounts.size > 0 && (
            <div className="px-6 py-3 bg-blue-50 border-b">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  {selectedAccounts.size} mailbox(es) selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBulkWarmupModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    ⚙️ Edit Warmup Settings
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
            </div>
          )}

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={paginatedAccounts.length > 0 && selectedAccounts.size === paginatedAccounts.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Quota</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Today</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No mailboxes yet. Add one above or use bulk import.
                  </td>
                </tr>
              ) : paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No mailboxes on this page.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((account) => (
                  <tr key={account.id} className={selectedAccounts.has(account.id) ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedAccounts.has(account.id)}
                        onChange={() => toggleSelectAccount(account.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.senderName || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.warmupEnabled ? (
                        <span className="font-medium">
                          Limit: {account.warmupMaxDaily || 0}/day
                        </span>
                      ) : (
                        <span className="text-gray-400">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {account.warmupEnabled ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            (account.sentToday || 0) >= (account.warmupMaxDaily || 0)
                              ? 'text-red-600'
                              : (account.sentToday || 0) >= (account.warmupMaxDaily || 0) * 0.8
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}>
                            {account.sentToday || 0}/{account.warmupMaxDaily || 0}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({Math.max(0, (account.warmupMaxDaily || 0) - (account.sentToday || 0))} left)
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(account)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {accounts.length > 0 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Info Display */}
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, accounts.length)}</span> of{' '}
                  <span className="font-medium">{accounts.length}</span> mailbox(es)
                </div>

                {/* Rows Per Page */}
                <div className="flex items-center gap-2">
                  <label htmlFor="rows-per-page" className="text-sm text-gray-700">
                    Rows per page:
                  </label>
                  <select
                    id="rows-per-page"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-md">
          <h3 className="text-sm font-medium text-blue-900 mb-2">📋 Bulk Import Format</h3>
          <p className="text-xs text-blue-700 mb-2">CSV or Excel file with columns:</p>
          <code className="text-xs bg-white px-2 py-1 rounded block">
            email, senderName, smtpHost, smtpPort, imapHost, imapPort, appPassword
          </code>
          <p className="text-xs text-blue-700 mt-2">
            * email and appPassword are required. Other fields will use defaults if not provided.
          </p>
        </div>

        {/* Bulk Warmup Settings Modal */}
        {showBulkWarmupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Bulk Edit Warmup Settings
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Update warmup settings for {selectedAccounts.size} selected mailbox(es)
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enable Warmup
                  </label>
                  <select
                    value={bulkEditSettings.warmupEnabled ? 'true' : 'false'}
                    onChange={(e) => setBulkEditSettings({
                      ...bulkEditSettings,
                      warmupEnabled: e.target.value === 'true'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">✓ Enabled</option>
                    <option value="false">✗ Disabled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start with emails/day (Recommended: 3)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={bulkEditSettings.warmupStartCount}
                    onChange={(e) => setBulkEditSettings({
                      ...bulkEditSettings,
                      warmupStartCount: parseInt(e.target.value) || 1
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3"
                  />
                  <p className="text-xs text-gray-500 mt-1">How many emails to send on day 1</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Increase by (Recommended: 3)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={bulkEditSettings.warmupIncreaseBy}
                    onChange={(e) => setBulkEditSettings({
                      ...bulkEditSettings,
                      warmupIncreaseBy: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3"
                  />
                  <p className="text-xs text-gray-500 mt-1">Daily email increase amount</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum emails/day (Recommended: 20)
                  </label>
                  <input
                    type="number"
                    min="-1"
                    max="1000"
                    value={bulkEditSettings.warmupMaxDaily}
                    onChange={(e) => setBulkEditSettings({
                      ...bulkEditSettings,
                      warmupMaxDaily: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="20"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set to 0 or -1 for unlimited</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reply rate % (Recommended: 35%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={bulkEditSettings.warmupReplyRate}
                    onChange={(e) => setBulkEditSettings({
                      ...bulkEditSettings,
                      warmupReplyRate: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="35"
                  />
                  <p className="text-xs text-gray-500 mt-1">Percentage of emails that get replies (0-100%)</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleBulkWarmupUpdate}
                  disabled={updatingBulkSettings}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {updatingBulkSettings ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  onClick={() => setShowBulkWarmupModal(false)}
                  disabled={updatingBulkSettings}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
