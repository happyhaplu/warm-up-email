import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';
import Layout from '../components/Layout';
import { GetServerSideProps } from 'next';

interface Recipient {
  id: number;
  email: string;
  createdAt: string;
}

export default function Recipients() {
  const router = useRouter();
  const { user, loading: authLoading, initialized } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ email: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Protect route - admin only
  useEffect(() => {
    if (!initialized) return;
    
    if (!user || user.role !== 'admin') {
      router.replace('/user/dashboard');
    }
  }, [user, initialized, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRecipients();
    }
  }, [user]);

  const fetchRecipients = async () => {
    try {
      const res = await fetch('/api/recipients');
      const data = await res.json();
      setRecipients(data);
    } catch (error) {
      alert('Failed to fetch recipients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      alert('Please enter an email address');
      return;
    }

    try {
      const url = '/api/recipients';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId 
        ? { id: editingId, email: formData.email }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setFormData({ email: '' });
        setEditingId(null);
        fetchRecipients();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save recipient');
      }
    } catch (error) {
      alert('Failed to save recipient');
    }
  };

  const handleEdit = (recipient: Recipient) => {
    setFormData({ email: recipient.email });
    setEditingId(recipient.id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recipient?')) return;

    try {
      const res = await fetch(`/api/recipients?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRecipients();
      }
    } catch (error) {
      alert('Failed to delete recipient');
    }
  };

  const cancelEdit = () => {
    setFormData({ email: '' });
    setEditingId(null);
  };

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Recipients</h1>

        {/* Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Recipient' : 'Add New Recipient'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="recipient@example.com"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {editingId ? 'Update Recipient' : 'Add Recipient'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Recipients List</h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : recipients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No recipients yet. Add one above!</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
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
                  {recipients.map((recipient) => (
                    <tr key={recipient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {recipient.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(recipient.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button
                          onClick={() => handleEdit(recipient)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(recipient.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
