import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { authFetch } from '../../lib/auth-context';

interface Plan {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  mailboxLimit: number;
  dailyEmailLimit: number;
  monthlyEmailLimit: number;
  price: number;
  features: string[];
  isActive: boolean;
  userCount: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    mailboxLimit: 0,
    dailyEmailLimit: 0,
    monthlyEmailLimit: 0,
    price: 0,
    features: '',
    isActive: true,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/admin/plans');

      if (!response.ok) throw new Error('Failed to fetch plans');
      
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      console.error('Error fetching plans:', error);
      alert('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description || '',
      mailboxLimit: plan.mailboxLimit,
      dailyEmailLimit: plan.dailyEmailLimit,
      monthlyEmailLimit: plan.monthlyEmailLimit,
      price: plan.price,
      features: plan.features.join('\n'),
      isActive: plan.isActive,
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      displayName: '',
      description: '',
      mailboxLimit: 0,
      dailyEmailLimit: 0,
      monthlyEmailLimit: 0,
      price: 0,
      features: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const featuresArray = formData.features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f);

      const payload = {
        ...formData,
        features: featuresArray,
        id: editingPlan?.id,
      };

      const response = await authFetch('/api/admin/plans', {
        method: editingPlan ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save plan');
      }

      alert(`Plan ${editingPlan ? 'updated' : 'created'} successfully!`);
      setShowModal(false);
      fetchPlans();
    } catch (error: any) {
      console.error('Error saving plan:', error);
      alert(error.message || 'Failed to save plan');
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (plan.userCount > 0) {
      alert(`Cannot delete plan. ${plan.userCount} user(s) are currently on this plan.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${plan.displayName}" plan?`)) {
      return;
    }

    try {
      const response = await authFetch('/api/admin/plans', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: plan.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete plan');
      }

      alert('Plan deleted successfully!');
      fetchPlans();
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      alert(error.message || 'Failed to delete plan');
    }
  };

  const formatLimit = (value: number) => {
    if (value === -1 || value === 999999) return 'Unlimited';
    return value.toLocaleString();
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Plan Management</h1>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + Create Plan
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading plans...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-6 ${
                  !plan.isActive ? 'bg-gray-100 opacity-60' : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{plan.displayName}</h3>
                    <p className="text-sm text-gray-500">{plan.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      ${plan.price}
                    </div>
                    <div className="text-xs text-gray-500">/month</div>
                  </div>
                </div>

                {plan.description && (
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Mailboxes:</span>
                    <span className="font-semibold">{formatLimit(plan.mailboxLimit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Daily Emails:</span>
                    <span className="font-semibold">{formatLimit(plan.dailyEmailLimit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monthly Emails:</span>
                    <span className="font-semibold">{formatLimit(plan.monthlyEmailLimit)}</span>
                  </div>
                </div>

                {plan.features.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Features:</div>
                    <ul className="space-y-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start">
                          <span className="mr-2">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4 border-t space-y-2">
                  <div className="text-xs text-gray-500">
                    {plan.userCount} user{plan.userCount !== 1 ? 's' : ''} on this plan
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="flex-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      disabled={plan.userCount > 0}
                      className={`flex-1 px-3 py-1 text-sm rounded ${
                        plan.userCount > 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                      }`}
                    >
                      Delete
                    </button>
                  </div>
                  {!plan.isActive && (
                    <div className="text-xs text-orange-600 font-semibold">INACTIVE</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Internal Name (Slug)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!!editingPlan}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., starter"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {editingPlan ? 'Cannot be changed' : 'Lowercase, no spaces'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) =>
                        setFormData({ ...formData, displayName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., Starter Plan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded"
                    rows={2}
                    placeholder="Brief description of the plan"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Mailbox Limit *
                    </label>
                    <input
                      type="number"
                      value={formData.mailboxLimit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mailboxLimit: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., 5 (-1 for unlimited)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Daily Email Limit *
                    </label>
                    <input
                      type="number"
                      value={formData.dailyEmailLimit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dailyEmailLimit: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., 50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Monthly Email Limit
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyEmailLimit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monthlyEmailLimit: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., 7500 (-1 for unlimited)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Price (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., 29.99"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Features (one per line)
                  </label>
                  <textarea
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    className="w-full px-3 py-2 border rounded font-mono text-sm"
                    rows={6}
                    placeholder="Email warmup automation&#10;Priority support&#10;Advanced analytics"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">
                    Active (visible to users)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
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
