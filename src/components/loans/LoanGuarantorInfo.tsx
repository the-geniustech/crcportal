import React, { useState } from 'react';
import { Users, User, Phone, Mail, Briefcase, MapPin, AlertCircle, CheckCircle, Search, X } from 'lucide-react';

interface Guarantor {
  id: string;
  type: 'member' | 'external';
  profileId?: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  occupation: string;
  address: string;
  memberSince?: string;
  savingsBalance?: number;
}

interface GroupMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  savingsBalance: number;
  avatar?: string;
}

interface LoanGuarantorInfoProps {
  guarantors: Guarantor[];
  onGuarantorsChange: (guarantors: Guarantor[]) => void;
  onContinue: () => void;
  onBack: () => void;
  loanAmount: number;
  groupMembers: GroupMember[];
}

const relationships = [
  'Family Member',
  'Friend',
  'Colleague',
  'Business Partner',
  'Neighbor',
  'Other'
];

export default function LoanGuarantorInfo({
  guarantors,
  onGuarantorsChange,
  onContinue,
  onBack,
  loanAmount,
  groupMembers
}: LoanGuarantorInfoProps) {
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGuarantorIndex, setActiveGuarantorIndex] = useState<number | null>(null);

  const requiredGuarantors = loanAmount >= 500000 ? 2 : 1;
  
  const addGuarantor = (type: 'member' | 'external') => {
    const newGuarantor: Guarantor = {
      id: `guarantor_${Date.now()}`,
      type,
      name: '',
      email: '',
      phone: '',
      relationship: '',
      occupation: '',
      address: ''
    };
    onGuarantorsChange([...guarantors, newGuarantor]);
  };

  const updateGuarantor = (index: number, field: keyof Guarantor, value: string) => {
    const updated = [...guarantors];
    updated[index] = { ...updated[index], [field]: value };
    onGuarantorsChange(updated);
  };

  const removeGuarantor = (index: number) => {
    onGuarantorsChange(guarantors.filter((_, i) => i !== index));
  };

  const selectMemberAsGuarantor = (member: GroupMember) => {
    if (activeGuarantorIndex !== null) {
      const updated = [...guarantors];
      updated[activeGuarantorIndex] = {
        ...updated[activeGuarantorIndex],
        profileId: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        memberSince: member.memberSince,
        savingsBalance: member.savingsBalance
      };
      onGuarantorsChange(updated);
    }
    setShowMemberSearch(false);
    setSearchQuery('');
    setActiveGuarantorIndex(null);
  };

  const openMemberSearch = (index: number) => {
    setActiveGuarantorIndex(index);
    setShowMemberSearch(true);
  };

  const filteredMembers = groupMembers.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isGuarantorComplete = (g: Guarantor) => {
    return g.name && g.email && g.phone && g.relationship && g.occupation && g.address;
  };

  const canContinue = guarantors.length >= requiredGuarantors && guarantors.every(isGuarantorComplete);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Guarantor Information</h3>
            <p className="text-sm text-gray-500">
              You need {requiredGuarantors} guarantor{requiredGuarantors > 1 ? 's' : ''} for a loan of ₦{loanAmount.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">{guarantors.filter(isGuarantorComplete).length}/{requiredGuarantors}</p>
            <p className="text-xs text-gray-500">Complete</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div 
            className="bg-indigo-500 h-2 rounded-full transition-all"
            style={{ width: `${(guarantors.filter(isGuarantorComplete).length / requiredGuarantors) * 100}%` }}
          />
        </div>
      </div>

      {/* Guarantor Requirements */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Guarantor Requirements</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Guarantors must be active members of your cooperative group (preferred)</li>
              <li>• External guarantors must provide valid identification</li>
              <li>• Guarantors agree to repay the loan if you default</li>
              <li>• Each guarantor will be contacted for verification</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Guarantor Cards */}
      <div className="space-y-4">
        {guarantors.map((guarantor, index) => (
          <div key={guarantor.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${guarantor.type === 'member' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  <User className={`w-5 h-5 ${guarantor.type === 'member' ? 'text-emerald-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Guarantor {index + 1}</h4>
                  <p className="text-xs text-gray-500">
                    {guarantor.type === 'member' ? 'Group Member' : 'External Guarantor'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isGuarantorComplete(guarantor) && (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                )}
                <button
                  onClick={() => removeGuarantor(index)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {guarantor.type === 'member' && (
                <button
                  onClick={() => openMemberSearch(index)}
                  className="w-full mb-4 p-3 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  {guarantor.name ? 'Change Member' : 'Search Group Members'}
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={guarantor.name}
                      onChange={(e) => updateGuarantor(index, 'name', e.target.value)}
                      placeholder="Enter full name"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      readOnly={guarantor.type === 'member' && !!guarantor.memberSince}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={guarantor.email}
                      onChange={(e) => updateGuarantor(index, 'email', e.target.value)}
                      placeholder="Enter email address"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      readOnly={guarantor.type === 'member' && !!guarantor.memberSince}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={guarantor.phone}
                      onChange={(e) => updateGuarantor(index, 'phone', e.target.value)}
                      placeholder="Enter phone number"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      readOnly={guarantor.type === 'member' && !!guarantor.memberSince}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={guarantor.relationship}
                    onChange={(e) => updateGuarantor(index, 'relationship', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Select relationship</option>
                    {relationships.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Occupation <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={guarantor.occupation}
                      onChange={(e) => updateGuarantor(index, 'occupation', e.target.value)}
                      placeholder="Enter occupation"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      value={guarantor.address}
                      onChange={(e) => updateGuarantor(index, 'address', e.target.value)}
                      placeholder="Enter full address"
                      rows={2}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {guarantor.type === 'member' && guarantor.memberSince && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-700">Member since: {guarantor.memberSince}</span>
                    <span className="font-medium text-emerald-700">
                      Savings: ₦{guarantor.savingsBalance?.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Guarantor Buttons */}
      {guarantors.length < 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => addGuarantor('member')}
            className="p-4 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Add Group Member as Guarantor
          </button>
          <button
            onClick={() => addGuarantor('external')}
            className="p-4 border-2 border-dashed border-amber-300 rounded-xl text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
          >
            <User className="w-5 h-5" />
            Add External Guarantor
          </button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`px-8 py-3 rounded-xl font-semibold transition-all ${
            canContinue
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Review
        </button>
      </div>

      {/* Member Search Modal */}
      {showMemberSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Select Group Member</h3>
                <button
                  onClick={() => {
                    setShowMemberSearch(false);
                    setSearchQuery('');
                    setActiveGuarantorIndex(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[50vh]">
              {filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No members found
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => selectMemberAsGuarantor(member)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        {member.avatar ? (
                          <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-lg font-semibold text-emerald-600">
                            {member.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{member.name}</h4>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-emerald-600">
                          ₦{member.savingsBalance.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Since {member.memberSince}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
