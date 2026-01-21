import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth, authFetch } from '../../lib/auth-context';
import AdminLayout from '../../components/AdminLayout';

interface Mailbox {
  id: number;
  email: string;
  senderName: string;
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
  userId: string;
  userEmail: string;
  createdAt: string;
}

export default function AdminMailboxes() {
  const router = useRouter();
  const { user, initialized, logout, isAdmin } = useAuth();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [bulkImportResult, setBulkImportResult] = useState<{ 
    success: number; 
    failed: number; 
    errors: string[] 
  } | null>(null);
  const redirectedRef = useRef(false);

  // Pagination and selection states
  const [selectedMailboxes, setSelectedMailboxes] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [showBulkQuotaEdit, setShowBulkQuotaEdit] = useState(false);
  const [bulkQuotaValue, setBulkQuotaValue] = useState(2);
  const [updatingQuota, setUpdatingQuota] = useState(false);

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

  const loadMailboxes = useCallback(async () => {
    if (!user || !isAdmin) return;

    try {
      setLoading(true);
      const res = await authFetch('/api/admin/mailboxes');
      if (res.ok) {
        const data = await res.json();
        setMailboxes(data);
      }
    } catch (error) {
      console.error('Error loading mailboxes:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

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
      setSelectedMailboxes(new Set(paginatedMailboxes.map(m => m.id)));
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
        authFetch(`/api/admin/mailboxes?id=${id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      setSelectedMailboxes(new Set());
      loadMailboxes();
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
        authFetch('/api/admin/mailboxes', {
          method: 'PUT',
          body: JSON.stringify({ id, dailyWarmupQuota: bulkQuotaValue }),
        })
      );

      await Promise.all(updatePromises);
      setShowBulkQuotaEdit(false);
      setSelectedMailboxes(new Set());
      loadMailboxes();
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

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  // Load mailboxes only once when user is authenticated
  useEffect(() => {
    if (user && isAdmin && initialized) {
      loadMailboxes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, initialized]);

  const handleBulkImport = async () => {
    if (!csvData.trim()) {
      alert('Please paste CSV data');
      return;
    }

    setBulkImportResult(null);

    try {
      const res = await authFetch('/api/admin/bulk-import', {
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
        loadMailboxes();
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
    if (!confirm('Are you sure you want to delete this mailbox?')) {
      return;
    }

    try {
      const res = await authFetch(`/api/admin/mailboxes?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadMailboxes();
      } else {
        alert('Failed to delete mailbox');
      }
    } catch (error) {
      console.error('Error deleting mailbox:', error);
    }
  };

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
              <h1 className="text-3xl font-bold text-gray-900">📬 Mailbox Pool</h1>
              <p className="text-gray-600 mt-1">Manage all mailboxes in the warm-up pool</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
              >
                ← Dashboard
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Bulk Import Section */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Mailbox Management</h2>
              <button
                onClick={() => {
                  setShowBulkImport(!showBulkImport);
                  setBulkImportResult(null);
                }}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                {showBulkImport ? 'Cancel' : '📥 Bulk Import to Pool'}
              </button>
            </div>

            {showBulkImport && (
              <div className="px-6 py-4 bg-purple-50 border-b">
                <h3 className="text-lg font-medium mb-4">Bulk Import Mailboxes to Pool</h3>
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
                  onClick={handleBulkImport}
                  className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Import to Pool
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

            {/* Stats */}
            <div className="px-6 py-4 bg-gray-50 flex gap-8">
              <div>
                <span className="text-gray-600">Total Mailboxes:</span>
                <span className="ml-2 font-bold text-blue-600">{mailboxes.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Pool (No Owner):</span>
                <span className="ml-2 font-bold text-green-600">
                  {mailboxes.filter(m => !m.userEmail).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">User Owned:</span>
                <span className="ml-2 font-bold text-purple-600">
                  {mailboxes.filter(m => m.userEmail).length}
                </span>
              </div>
            </div>
          </div>

          {/* Mailboxes Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mailboxes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          No mailboxes in pool. Use Bulk Import to add mailboxes.
                        </td>
                      </tr>
                    ) : paginatedMailboxes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          No mailboxes on this page.
                        </td>
                      </tr>
                    ) : (
                      paginatedMailboxes.map((mailbox) => (
                        <tr key={mailbox.id} className={`hover:bg-gray-50 ${selectedMailboxes.has(mailbox.id) ? 'bg-blue-50' : ''}`}>
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
                          <td className="px-6 py-4 text-sm">
                            {mailbox.userEmail ? (
                              <span className="text-gray-600">{mailbox.userEmail}</span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Pool</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(mailbox.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDeleteMailbox(mailbox.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
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
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
