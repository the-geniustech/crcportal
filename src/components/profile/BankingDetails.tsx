import React, { useState } from 'react';
import { Building2, CreditCard, Plus, Trash2, Edit2, Check, X, Star } from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
}

interface BankingDetailsProps {
  accounts: BankAccount[];
  onAddAccount: (account: Omit<BankAccount, 'id'>) => void;
  onUpdateAccount: (id: string, account: Partial<BankAccount>) => void;
  onDeleteAccount: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

const nigerianBanks = [
  'Access Bank', 'Citibank', 'Ecobank', 'Fidelity Bank', 'First Bank of Nigeria',
  'First City Monument Bank (FCMB)', 'Globus Bank', 'Guaranty Trust Bank (GTBank)',
  'Heritage Bank', 'Keystone Bank', 'Polaris Bank', 'Providus Bank', 'Stanbic IBTC Bank',
  'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank', 'Titan Trust Bank',
  'Union Bank of Nigeria', 'United Bank for Africa (UBA)', 'Unity Bank', 'Wema Bank',
  'Zenith Bank', 'Jaiz Bank', 'TAJBank', 'Lotus Bank', 'Optimus Bank', 'Parallex Bank',
  'Kuda Bank', 'OPay', 'PalmPay', 'Moniepoint'
];

const BankingDetails: React.FC<BankingDetailsProps> = ({
  accounts,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onSetPrimary,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdateAccount(editingId, formData);
      setEditingId(null);
    } else {
      onAddAccount({ ...formData, isPrimary: accounts.length === 0 });
      setShowAddForm(false);
    }
    setFormData({ bankName: '', accountNumber: '', accountName: '' });
  };

  const handleEdit = (account: BankAccount) => {
    setEditingId(account.id);
    setFormData({
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ bankName: '', accountNumber: '', accountName: '' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Bank Accounts
          </h3>
          {!showAddForm && !editingId && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          )}
        </div>

        {/* Existing Accounts */}
        <div className="space-y-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`p-4 rounded-xl border ${
                account.isPrimary ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {editingId === account.id ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <select
                        value={formData.bankName}
                        onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        required
                      >
                        <option value="">Select Bank</option>
                        {nigerianBanks.map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        placeholder="0123456789"
                        required
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                      <input
                        type="text"
                        value={formData.accountName}
                        onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <CreditCard className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{account.bankName}</p>
                        {account.isPrimary && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{account.accountNumber}</p>
                      <p className="text-sm text-gray-500">{account.accountName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!account.isPrimary && (
                      <button
                        onClick={() => onSetPrimary(account.id)}
                        className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!account.isPrimary && (
                      <button
                        onClick={() => onDeleteAccount(account.id)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {accounts.length === 0 && !showAddForm && (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No bank accounts added yet</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-3 text-emerald-600 font-medium hover:underline"
              >
                Add your first account
              </button>
            </div>
          )}
        </div>

        {/* Add New Account Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Add New Bank Account</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <select
                  value={formData.bankName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select Bank</option>
                  {nigerianBanks.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="0123456789"
                  required
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Add Account
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Security Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>Security Notice:</strong> Your banking details are encrypted and securely stored. 
          We will only use this information for processing withdrawals you authorize.
        </p>
      </div>
    </div>
  );
};

export default BankingDetails;
