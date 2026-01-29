import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth, authFetch } from '../../lib/auth-context';
import AdminLayout from '../../components/AdminLayout';

interface WarmupStats {
  mailboxes: number;
  sendTemplates: number;
  replyTemplates: number;
  logsToday: number;
}

export default function WarmupControl() {
  const router = useRouter();
  const { user, initialized } = useAuth();
  const redirectedRef = useRef(false);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [stats, setStats] = useState<WarmupStats>({ mailboxes: 0, sendTemplates: 0, replyTemplates: 0, logsToday: 0 });

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

    checkStatus();
    loadStats();

    // Auto-refresh status every 10 seconds
    const statusInterval = setInterval(() => {
      checkStatus();
      loadStats();
    }, 10000);

    return () => clearInterval(statusInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, initialized]);

  const checkStatus = async () => {
    try {
      const res = await authFetch('/api/warmup/status');
      if (res.ok) {
        const data = await res.json();
        setIsRunning(data.running);
        setLastRun(data.lastRunTime || data.lastRun || null);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Get admin stats
      const res = await authFetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats({
          mailboxes: data.totalAccounts || 0,
          sendTemplates: data.sendTemplates || 0,
          replyTemplates: data.replyTemplates || 0,
          logsToday: data.logsToday || 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleStart = async () => {
    if (!confirm('Start warmup with automatic random delays (3-15 minutes between sends)?')) {
      return;
    }

    try {
      setLoading(true);
      const res = await authFetch('/api/warmup/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoReply: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsRunning(true);
        alert('Warmup started successfully!');
        await checkStatus();
        await loadStats();
      } else {
        const error = await res.json();
        alert(`Failed to start: ${error.error}`);
      }
    } catch (error) {
      console.error('Error starting warmup:', error);
      alert('Failed to start warmup');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!confirm('Stop warmup service?')) {
      return;
    }

    try {
      setLoading(true);
      const res = await authFetch('/api/warmup/trigger', {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        setIsRunning(false);
        alert('Warmup stopped successfully!');
        await checkStatus();
        await loadStats();
      } else {
        const error = await res.json();
        alert(`Failed to stop: ${error.error}`);
      }
    } catch (error) {
      console.error('Error stopping warmup:', error);
      alert('Failed to stop warmup');
    } finally {
      setLoading(false);
    }
  };

  const handleManualTrigger = async () => {
    if (!confirm('Run a single warmup cycle now?')) return;

    try {
      setLoading(true);
      const res = await authFetch('/api/warmup/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoReply: true }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Warmup cycle complete!\nSent: ${data.sent || 0}\nReplied: ${data.replied || 0}`);
        loadStats();
      } else {
        const error = await res.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error running warmup:', error);
      alert('Failed to run warmup cycle');
    } finally {
      setLoading(false);
    }
  };

  // Check if requirements are met
  const canStart = stats.mailboxes >= 2 && stats.sendTemplates >= 1 && stats.replyTemplates >= 1;

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
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Warmup Control</h1>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Requirements Check */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded ${stats.mailboxes >= 2 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-medium ${stats.mailboxes >= 2 ? 'text-green-700' : 'text-red-700'}`}>
                  {stats.mailboxes >= 2 ? '✓' : '✗'} Mailboxes
                </p>
                <p className="text-sm text-gray-600">{stats.mailboxes} / 2 required</p>
              </div>
              <div className={`p-4 rounded ${stats.sendTemplates >= 1 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-medium ${stats.sendTemplates >= 1 ? 'text-green-700' : 'text-red-700'}`}>
                  {stats.sendTemplates >= 1 ? '✓' : '✗'} Send Templates
                </p>
                <p className="text-sm text-gray-600">{stats.sendTemplates} / 1 required</p>
              </div>
              <div className={`p-4 rounded ${stats.replyTemplates >= 1 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-medium ${stats.replyTemplates >= 1 ? 'text-green-700' : 'text-red-700'}`}>
                  {stats.replyTemplates >= 1 ? '✓' : '✗'} Reply Templates
                </p>
                <p className="text-sm text-gray-600">{stats.replyTemplates} / 1 required</p>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Service Status</h2>
                <p className="text-gray-600 mt-1">Control the warmup automation engine</p>
                {lastRun && (
                  <p className="text-sm text-gray-500 mt-1">
                    Last run: {new Date(lastRun).toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    isRunning
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {isRunning ? '● Running' : '○ Stopped'}
                </span>
              </div>
            </div>

            {!isRunning && (
              <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">🎲 Automatic Random Delays</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p className="flex items-center gap-2">
                    <span className="font-medium">📧 Between Sends:</span>
                    <span className="bg-blue-100 px-2 py-1 rounded">3-15 minutes (random)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium">💬 Reply Delays:</span>
                    <span className="bg-blue-100 px-2 py-1 rounded">5-240 minutes (random)</span>
                  </p>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  ℹ️ Random delays mimic natural human behavior and prevent pattern detection
                </p>
              </div>
            )}

            <div className="flex gap-4 flex-wrap">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  disabled={loading || !canStart}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  title={!canStart ? 'Missing requirements' : 'Start warmup'}
                >
                  {loading ? 'Starting...' : '▶ Start Warmup'}
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  disabled={loading}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Stopping...' : '■ Stop Warmup'}
                </button>
              )}
              <button
                onClick={handleManualTrigger}
                disabled={loading || !canStart}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Running...' : '⚡ Run Single Cycle'}
              </button>
              <button
                onClick={() => { checkStatus(); loadStats(); }}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                🔄 Refresh Status
              </button>
            </div>
            
            {!canStart && (
              <p className="mt-4 text-red-600 text-sm">
                ⚠️ Cannot start: Please ensure all requirements are met (at least 2 mailboxes, 1 send template, 1 reply template)
              </p>
            )}
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-lg shadow p-8">
            <h3 className="text-xl font-semibold mb-4">How Warmup Works</h3>
            <ol className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">1.</span>
                <span>Select random sender and recipient from mailbox pool</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">2.</span>
                <span>Pick random SendTemplate (subject + body with randomized variations)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">3.</span>
                <span>Send email via SMTP with random content variations</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">4.</span>
                <span>Wait 30 seconds for email delivery</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">5.</span>
                <span>Recipient checks inbox via IMAP for new emails</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">6.</span>
                <span>Auto-reply with random ReplyTemplate after <strong>5-240 minutes delay</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">7.</span>
                <span>Log all activity to database with timestamps</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">8.</span>
                <span>Wait <strong>3-15 minutes (random)</strong> before next cycle</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600">9.</span>
                <span>Repeat while service is running - each cycle with random timing</span>
              </li>
            </ol>

            <div className="mt-6 p-4 bg-green-50 rounded border border-green-200">
              <p className="text-sm font-semibold text-green-800 mb-2">
                ✨ Randomization Features
              </p>
              <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                <li><strong>Send delays:</strong> 3-15 minutes random gaps between emails</li>
                <li><strong>Reply delays:</strong> 5-240 minutes random gaps before replying</li>
                <li><strong>Content variation:</strong> Random greetings, closings, emojis</li>
                <li><strong>Subject variation:</strong> Random "Re:", punctuation changes</li>
                <li><strong>Send order:</strong> Shuffled mailbox selection each cycle</li>
              </ul>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Important:</strong> Make sure you have:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-yellow-800">
                <li>At least 2 connected mailboxes in the pool</li>
                <li>At least 1 SendTemplate created</li>
                <li>At least 1 ReplyTemplate created</li>
                <li>Valid SMTP/IMAP credentials for all mailboxes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
