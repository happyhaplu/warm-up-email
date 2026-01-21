import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth, authFetch } from '../../lib/auth-context';
import AdminLayout from '../../components/AdminLayout';

interface SendTemplate {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
}

interface ReplyTemplate {
  id: number;
  text: string;
  createdAt: string;
}

export default function AdminTemplates() {
  const router = useRouter();
  const { user, initialized } = useAuth();
  const redirectedRef = useRef(false);
  const [sendTemplates, setSendTemplates] = useState<SendTemplate[]>([]);
  const [replyTemplates, setReplyTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'send' | 'reply'>('send');

  // Form states
  const [newSendSubject, setNewSendSubject] = useState('');
  const [newSendBody, setNewSendBody] = useState('');
  const [newReplyText, setNewReplyText] = useState('');

  // Edit states
  const [editingSendId, setEditingSendId] = useState<number | null>(null);
  const [editSendSubject, setEditSendSubject] = useState('');
  const [editSendBody, setEditSendBody] = useState('');
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyText, setEditReplyText] = useState('');

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

    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, initialized]);

  const loadTemplates = async () => {
    try {
      setLoading(true);

      const [sendRes, replyRes] = await Promise.all([
        authFetch('/api/admin/send-templates'),
        authFetch('/api/admin/reply-templates'),
      ]);

      if (sendRes.ok) {
        const data = await sendRes.json();
        setSendTemplates(data);
      }

      if (replyRes.ok) {
        const data = await replyRes.json();
        setReplyTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSendTemplate = async () => {
    if (!newSendSubject.trim() || !newSendBody.trim()) {
      alert('Please fill in both subject and body');
      return;
    }

    try {
      const res = await authFetch('/api/admin/send-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newSendSubject,
          body: newSendBody,
        }),
      });

      if (res.ok) {
        setNewSendSubject('');
        setNewSendBody('');
        loadTemplates();
      } else {
        alert('Failed to add template');
      }
    } catch (error) {
      console.error('Error adding template:', error);
      alert('Failed to add template');
    }
  };

  const handleAddReplyTemplate = async () => {
    if (!newReplyText.trim()) {
      alert('Please enter template text');
      return;
    }

    try {
      const res = await authFetch('/api/admin/reply-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newReplyText }),
      });

      if (res.ok) {
        setNewReplyText('');
        loadTemplates();
      } else {
        alert('Failed to add template');
      }
    } catch (error) {
      console.error('Error adding template:', error);
      alert('Failed to add template');
    }
  };

  const handleUpdateSendTemplate = async () => {
    if (!editingSendId || !editSendSubject.trim() || !editSendBody.trim()) return;

    try {
      const res = await authFetch(`/api/admin/send-templates?id=${editingSendId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editSendSubject,
          body: editSendBody,
        }),
      });

      if (res.ok) {
        setEditingSendId(null);
        setEditSendSubject('');
        setEditSendBody('');
        loadTemplates();
      } else {
        alert('Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleUpdateReplyTemplate = async () => {
    if (!editingReplyId || !editReplyText.trim()) return;

    try {
      const res = await authFetch(`/api/admin/reply-templates?id=${editingReplyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editReplyText }),
      });

      if (res.ok) {
        setEditingReplyId(null);
        setEditReplyText('');
        loadTemplates();
      } else {
        alert('Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteSendTemplate = async (id: number) => {
    if (!confirm('Delete this template?')) return;

    try {
      const res = await authFetch(`/api/admin/send-templates?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadTemplates();
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleDeleteReplyTemplate = async (id: number) => {
    if (!confirm('Delete this template?')) return;

    try {
      const res = await authFetch(`/api/admin/reply-templates?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadTemplates();
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const startEditSend = (template: SendTemplate) => {
    setEditingSendId(template.id);
    setEditSendSubject(template.subject);
    setEditSendBody(template.body);
  };

  const startEditReply = (template: ReplyTemplate) => {
    setEditingReplyId(template.id);
    setEditReplyText(template.text);
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
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Template Management</h1>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('send')}
              className={`px-6 py-3 rounded-t-lg font-medium ${
                activeTab === 'send'
                  ? 'bg-white text-blue-600 border-t-2 border-blue-600'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              Send Templates ({sendTemplates.length})
            </button>
            <button
              onClick={() => setActiveTab('reply')}
              className={`px-6 py-3 rounded-t-lg font-medium ${
                activeTab === 'reply'
                  ? 'bg-white text-blue-600 border-t-2 border-blue-600'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              Reply Templates ({replyTemplates.length})
            </button>
          </div>

          {/* Send Templates */}
          {activeTab === 'send' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Send Templates</h2>
              <p className="text-gray-600 mb-6">
                These templates are used for the first email sent in warm-up sequences.
              </p>

              {/* Add Form */}
              <div className="mb-6 p-4 bg-gray-50 rounded">
                <h3 className="font-medium mb-3">Add New Template</h3>
                <input
                  type="text"
                  placeholder="Subject"
                  value={newSendSubject}
                  onChange={(e) => setNewSendSubject(e.target.value)}
                  className="w-full p-2 border rounded mb-2"
                />
                <textarea
                  placeholder="Email body..."
                  value={newSendBody}
                  onChange={(e) => setNewSendBody(e.target.value)}
                  rows={4}
                  className="w-full p-2 border rounded mb-2"
                />
                <button
                  onClick={handleAddSendTemplate}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add Template
                </button>
              </div>

              {/* Templates List */}
              <div className="space-y-4">
                {sendTemplates.map((template) => (
                  <div key={template.id} className="border rounded p-4">
                    {editingSendId === template.id ? (
                      <>
                        <input
                          type="text"
                          value={editSendSubject}
                          onChange={(e) => setEditSendSubject(e.target.value)}
                          className="w-full p-2 border rounded mb-2"
                        />
                        <textarea
                          value={editSendBody}
                          onChange={(e) => setEditSendBody(e.target.value)}
                          rows={4}
                          className="w-full p-2 border rounded mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateSendTemplate}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingSendId(null)}
                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{template.subject}</h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditSend(template)}
                              className="text-blue-500 hover:text-blue-700 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSendTemplate(template.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm whitespace-pre-wrap">{template.body}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          Added {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </div>
                ))}
                {sendTemplates.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No send templates yet</p>
                )}
              </div>
            </div>
          )}

          {/* Reply Templates */}
          {activeTab === 'reply' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Reply Templates</h2>
              <p className="text-gray-600 mb-6">
                These short templates are used for automatic replies in warm-up sequences.
              </p>

              {/* Add Form */}
              <div className="mb-6 p-4 bg-gray-50 rounded">
                <h3 className="font-medium mb-3">Add New Template</h3>
                <input
                  type="text"
                  placeholder="Reply text (e.g., 'Thanks!', 'Got it!')"
                  value={newReplyText}
                  onChange={(e) => setNewReplyText(e.target.value)}
                  className="w-full p-2 border rounded mb-2"
                />
                <button
                  onClick={handleAddReplyTemplate}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add Template
                </button>
              </div>

              {/* Templates List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {replyTemplates.map((template) => (
                  <div key={template.id} className="border rounded p-4">
                    {editingReplyId === template.id ? (
                      <>
                        <input
                          type="text"
                          value={editReplyText}
                          onChange={(e) => setEditReplyText(e.target.value)}
                          className="w-full p-2 border rounded mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateReplyTemplate}
                            className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingReplyId(null)}
                            className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <p className="font-medium">{template.text}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditReply(template)}
                              className="text-blue-500 hover:text-blue-700 text-sm"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteReplyTemplate(template.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </div>
                ))}
                {replyTemplates.length === 0 && (
                  <p className="text-gray-500 text-center py-8 col-span-full">
                    No reply templates yet
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
