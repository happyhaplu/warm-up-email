import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth, authFetch } from '../../lib/auth-context';
import Layout from '../../components/Layout';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  plan: {
    id: number;
    displayName: string;
    description: string | null;
    mailboxLimit: number;
    dailyEmailLimit: number;
    monthlyEmailLimit: number;
    features: string | null;
  } | null;
}

interface UsageStats {
  mailboxCount: number;
  dailyEmailsSent: number;
  monthlyEmailsSent: number;
}

export default function UserAccount() {
  const router = useRouter();
  const { user, logout, initialized } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
  }, [initialized, user, router]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUsage();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await authFetch('/api/user/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      setProfile(data);
      setName(data.name || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      alert('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      const response = await authFetch('/api/user/usage');
      if (!response.ok) throw new Error('Failed to fetch usage');
      const data = await response.json();
      setUsage(data);
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      alert('Name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) throw new Error('Failed to update name');

      const data = await response.json();
      setProfile(data);
      setEditing(false);
      alert('✅ Name updated successfully');
    } catch (error) {
      console.error('Error updating name:', error);
      alert('❌ Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  if (!initialized || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Failed to load profile</p>
        </div>
      </Layout>
    );
  }

  const getProgressColor = (current: number, limit: number) => {
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressBarColor = (current: number, limit: number) => {
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 75) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Account</h1>

        {/* Profile Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
          
          <div className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Name (editable) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              {editing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your name"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setName(profile.name || '');
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name || 'Not set'}
                    disabled
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  />
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Account Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                profile.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {profile.status.toUpperCase()}
              </span>
            </div>

            {/* Member Since */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
              <input
                type="text"
                value={new Date(profile.createdAt).toLocaleDateString()}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Current Plan */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>
          
          {profile.plan ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-blue-600">{profile.plan.displayName}</h3>
                  {profile.plan.description && (
                    <p className="text-gray-600 mt-1">{profile.plan.description}</p>
                  )}
                </div>
              </div>

              {/* Features */}
              {profile.plan.features && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Features:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {JSON.parse(profile.plan.features).map((feature: string, index: number) => (
                      <li key={index} className="text-gray-600 text-sm">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Professional Quota Usage Cards */}
              {usage && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Quota Usage & Limits</h4>
                    <button
                      onClick={fetchUsage}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Mailboxes Quota Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-600">📫 Mailboxes</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          (usage.mailboxCount / profile.plan.mailboxLimit) * 100 >= 90 
                            ? 'bg-red-100 text-red-700'
                            : (usage.mailboxCount / profile.plan.mailboxLimit) * 100 >= 75
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {Math.round((usage.mailboxCount / profile.plan.mailboxLimit) * 100)}%
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-3xl font-bold text-gray-900">{usage.mailboxCount}</span>
                          <span className="text-sm text-gray-500">of {profile.plan.mailboxLimit}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {profile.plan.mailboxLimit - usage.mailboxCount} remaining
                        </p>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            (usage.mailboxCount / profile.plan.mailboxLimit) * 100 >= 90 
                              ? 'bg-red-500'
                              : (usage.mailboxCount / profile.plan.mailboxLimit) * 100 >= 75
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((usage.mailboxCount / profile.plan.mailboxLimit) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Daily Emails Quota Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-600">📧 Daily Emails</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          (usage.dailyEmailsSent / profile.plan.dailyEmailLimit) * 100 >= 90 
                            ? 'bg-red-100 text-red-700'
                            : (usage.dailyEmailsSent / profile.plan.dailyEmailLimit) * 100 >= 75
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {Math.round((usage.dailyEmailsSent / profile.plan.dailyEmailLimit) * 100)}%
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-3xl font-bold text-gray-900">{usage.dailyEmailsSent}</span>
                          <span className="text-sm text-gray-500">of {profile.plan.dailyEmailLimit}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {profile.plan.dailyEmailLimit - usage.dailyEmailsSent} left today
                        </p>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            (usage.dailyEmailsSent / profile.plan.dailyEmailLimit) * 100 >= 90 
                              ? 'bg-red-500'
                              : (usage.dailyEmailsSent / profile.plan.dailyEmailLimit) * 100 >= 75
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((usage.dailyEmailsSent / profile.plan.dailyEmailLimit) * 100, 100)}%` }}
                        ></div>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-2">
                        Resets daily at midnight
                      </p>
                    </div>

                    {/* Monthly Emails Quota Card */}
                    <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-600">📅 Monthly Emails</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          (usage.monthlyEmailsSent / profile.plan.monthlyEmailLimit) * 100 >= 90 
                            ? 'bg-red-100 text-red-700'
                            : (usage.monthlyEmailsSent / profile.plan.monthlyEmailLimit) * 100 >= 75
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {Math.round((usage.monthlyEmailsSent / profile.plan.monthlyEmailLimit) * 100)}%
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-3xl font-bold text-gray-900">{usage.monthlyEmailsSent}</span>
                          <span className="text-sm text-gray-500">of {profile.plan.monthlyEmailLimit}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {profile.plan.monthlyEmailLimit - usage.monthlyEmailsSent} left this month
                        </p>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            (usage.monthlyEmailsSent / profile.plan.monthlyEmailLimit) * 100 >= 90 
                              ? 'bg-red-500'
                              : (usage.monthlyEmailsSent / profile.plan.monthlyEmailLimit) * 100 >= 75
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((usage.monthlyEmailsSent / profile.plan.monthlyEmailLimit) * 100, 100)}%` }}
                        ></div>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-2">
                        Resets on the 1st of each month
                      </p>
                    </div>
                  </div>

                  {/* Quota Warnings */}
                  {((usage.mailboxCount / profile.plan.mailboxLimit) * 100 >= 90 ||
                    (usage.dailyEmailsSent / profile.plan.dailyEmailLimit) * 100 >= 90 ||
                    (usage.monthlyEmailsSent / profile.plan.monthlyEmailLimit) * 100 >= 90) && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div className="flex-1">
                          <h5 className="font-semibold text-red-800 mb-1">Quota Limit Warning</h5>
                          <p className="text-sm text-red-700">
                            You're approaching or have exceeded your plan limits. 
                            {(usage.dailyEmailsSent / profile.plan.dailyEmailLimit) * 100 >= 100 && 
                              ' Daily email limit reached - sending paused until tomorrow.'}
                            {(usage.monthlyEmailsSent / profile.plan.monthlyEmailLimit) * 100 >= 100 && 
                              ' Monthly email limit reached - consider upgrading your plan.'}
                            {(usage.mailboxCount / profile.plan.mailboxLimit) * 100 >= 100 && 
                              ' Mailbox limit reached - remove some mailboxes or upgrade your plan.'}
                          </p>
                          <button className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline">
                            Upgrade Plan →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No plan assigned</p>
              <p className="text-sm text-gray-500 mt-2">Please contact support to get a plan</p>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white shadow rounded-lg p-6 border-2 border-red-200">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
          <p className="text-gray-600 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to request account deletion? This action cannot be undone.')) {
                alert('Please contact support to delete your account.');
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Request Account Deletion
          </button>
        </div>
      </div>
    </Layout>
  );
}
