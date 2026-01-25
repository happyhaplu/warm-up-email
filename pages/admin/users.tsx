import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth, authFetch } from '../../lib/auth-context';
import AdminLayout from '../../components/AdminLayout';

interface Plan {
  id: number;
  name: string;
  displayName: string;
  mailboxLimit: number;
  dailyEmailLimit: number;
  monthlyEmailLimit: number;
  price: number;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  planId: number | null;
  plan: Plan | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  mailboxCount: number;
  dailyEmailsSent?: number;
  monthlyEmailsSent?: number;
}

export default function AdminUsers() {
  const router = useRouter();
  const { user, initialized, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    planId: null as number | null,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const redirectedRef = useRef(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

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

  useEffect(() => {
    if (user && isAdmin) {
      loadUsers();
      loadPlans();
    }
  }, [user, isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const res = await authFetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email,
      role: user.role,
      planId: user.planId,
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          ...formData,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update user');
      }

      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
      alert('✅ User updated successfully');
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(`❌ ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`⚠️ Are you sure you want to delete user "${userEmail}"?\n\nThis will also delete all their mailboxes and cannot be undone!`)) {
      return;
    }

    setDeleting(prev => new Set([...prev, userId]));
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      const result = await res.json();
      loadUsers();
      alert(`✅ User deleted successfully\n${result.mailboxesDeleted} mailbox(es) removed`);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(`❌ ${error.message}`);
    } finally {
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string, userEmail: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'suspended' ? 'suspend' : 'reactivate';

    if (!confirm(`Are you sure you want to ${action} user "${userEmail}"?`)) {
      return;
    }

    setToggling(prev => new Set([...prev, userId]));
    try {
      const res = await authFetch('/api/admin/users/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update status');
      }

      loadUsers();
      alert(`✅ User ${action}d successfully`);
    } catch (error: any) {
      console.error('Error toggling status:', error);
      alert(`❌ ${error.message}`);
    } finally {
      setToggling(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Pagination
  const totalPages = Math.ceil(users.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedUsers = users.slice(startIndex, endIndex);

  const getRoleBadge = (role: string) => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-800' 
      : 'bg-blue-100 text-blue-800';
  };

  const getPlanBadge = (plan: Plan | null) => {
    if (!plan) return 'bg-gray-100 text-gray-800';
    
    const badges: { [key: string]: string } = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-green-100 text-green-800',
      professional: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800',
    };
    return badges[plan.name.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatLimit = (value: number) => {
    if (value === -1 || value === 999999) return '∞';
    return value.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      deleted: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || badges.active;
  };

  if (!initialized || !user || !isAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and manage user accounts, roles, and access
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan & Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr key={u.id} className={u.status === 'suspended' ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {u.name || 'No name'}
                              </div>
                              <div className="text-sm text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadge(u.role)}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div>
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlanBadge(u.plan)}`}>
                                {u.plan?.displayName || 'No Plan'}
                              </span>
                            </div>
                            {u.plan && (
                              <div className="text-xs text-gray-500 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span>📬 {u.mailboxCount}/{formatLimit(u.plan.mailboxLimit)}</span>
                                  {u.plan.mailboxLimit !== -1 && (
                                    <div className="flex-1 max-w-[100px] bg-gray-200 rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full ${
                                          u.mailboxCount >= u.plan.mailboxLimit
                                            ? 'bg-red-500'
                                            : 'bg-blue-500'
                                        }`}
                                        style={{
                                          width: `${Math.min((u.mailboxCount / u.plan.mailboxLimit) * 100, 100)}%`,
                                        }}
                                      ></div>
                                    </div>
                                  )}
                                </div>
                                <div>📧 Daily: {formatLimit(u.plan.dailyEmailLimit)}</div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(u.status)}`}>
                            {u.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(u)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u.id, u.status, u.email)}
                              disabled={toggling.has(u.id) || u.id === user.id}
                              className={`${
                                u.status === 'active' 
                                  ? 'text-orange-600 hover:text-orange-900' 
                                  : 'text-green-600 hover:text-green-900'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {toggling.has(u.id) 
                                ? '...' 
                                : u.status === 'active' 
                                  ? 'Suspend' 
                                  : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(u.id, u.email)}
                              disabled={deleting.has(u.id) || u.id === user.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deleting.has(u.id) ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {users.length > 0 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, users.length)}</span> of{' '}
                    <span className="font-medium">{users.length}</span> user(s)
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Rows per page:</label>
                    <select
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
              </div>
            )}
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Edit User
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="User's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan
                  </label>
                  <select
                    value={formData.planId || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      planId: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.displayName} - {plan.mailboxLimit === -1 ? '∞' : plan.mailboxLimit} mailboxes, ${plan.price}/mo
                      </option>
                    ))}
                  </select>
                  {editingUser?.plan && (
                    <p className="mt-1 text-xs text-gray-500">
                      Current: {editingUser.plan.displayName} ({editingUser.mailboxCount}/{editingUser.plan.mailboxLimit === -1 ? '∞' : editingUser.plan.mailboxLimit} mailboxes)
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
