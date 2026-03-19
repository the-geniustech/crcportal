import React, { useState } from 'react';
import { X, Mail, UserPlus, Send, Copy, Check, Link2 } from 'lucide-react';

interface MemberInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  groupId: string;
  onInvite: (emails: string[], message: string) => void;
}

const MemberInviteModal: React.FC<MemberInviteModalProps> = ({
  isOpen,
  onClose,
  groupName,
  groupId,
  onInvite,
}) => {
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState(`You've been invited to join ${groupName} on our Cooperative Society platform. Join us to save together and achieve your financial goals!`);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const inviteLink = `${window.location.origin}/join/${groupId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    const emailList = emails
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    await new Promise(resolve => setTimeout(resolve, 1000));
    onInvite(emailList, message);
    setSending(false);
    setEmails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Invite Members</h2>
              <p className="text-sm text-gray-500">{groupName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Share Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share Invite Link
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                <Link2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 truncate">{inviteLink}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-sm text-gray-500">or invite by email</span>
            </div>
          </div>

          {/* Email Addresses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Addresses
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Enter email addresses (one per line or comma-separated)"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple emails with commas or new lines
            </p>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!emails.trim() || sending}
              className="flex-1 px-4 py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Invitations
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberInviteModal;
