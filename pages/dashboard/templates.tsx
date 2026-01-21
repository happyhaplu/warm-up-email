import Layout from '../../components/Layout';
import { useEffect, useState, FormEvent, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth, authFetch } from '../../lib/auth-context';

interface Template {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
}

export default function Templates() {
  const router = useRouter();
  const { user, initialized } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [formData, setFormData] = useState({ subject: '', body: '' });
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!initialized || redirectedRef.current) return;
    if (!user) {
      redirectedRef.current = true;
      router.replace('/login');
      return;
    }
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, initialized]);

  const fetchTemplates = async () => {
    try {
      const res = await authFetch('/api/templates');
      const data = await res.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const payload = editingId ? { ...formData, id: editingId } : formData;
      const res = await authFetch('/api/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      resetForm();
      fetchTemplates();
      alert(editingId ? 'Updated!' : 'Added!');
    } catch (error) {
      alert('Failed to save');
    }
  };

  const handleEdit = (template: Template) => {
    setFormData({ subject: template.subject, body: template.body });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete?')) return;
    try {
      await authFetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await authFetch('/api/templates/bulk-import', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      alert(result.message);
      fetchTemplates();
    } catch (error: any) {
      alert(error.message || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const resetForm = () => {
    setFormData({ subject: '', body: '' });
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
            <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
            <p className="mt-2 text-sm text-gray-600">Manage email templates for warmup</p>
          </div>
          <div className="flex gap-2">
            <label className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" disabled={importing} />
              {importing ? 'Importing...' : '📁 Bulk Import'}
            </label>
            <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
              {showForm ? 'Cancel' : '+ Add Template'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 bg-white shadow sm:rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">{editingId ? 'Edit Template' : 'Add New Template'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject *</label>
                <input type="text" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Body *</label>
                <textarea required value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} rows={6} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">{editingId ? 'Update' : 'Add'} Template</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Body Preview</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : templates.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No templates yet. Add one above or use bulk import.</td></tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{template.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{template.body.substring(0, 100)}{template.body.length > 100 ? '...' : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(template.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(template)} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                      <button onClick={() => handleDelete(template.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-md">
          <h3 className="text-sm font-medium text-blue-900 mb-2">📋 Bulk Import Format</h3>
          <p className="text-xs text-blue-700 mb-2">CSV or Excel file with columns:</p>
          <code className="text-xs bg-white px-2 py-1 rounded block">subject, body</code>
          <p className="text-xs text-blue-700 mt-2">* Both columns are required.</p>
        </div>
      </div>
    </Layout>
  );
}
