import React, { useState } from "react";
import { X, Mail, UserPlus, Send, Copy, Check, Link2 } from "lucide-react";

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
  const [emails, setEmails] = useState("");
  const [message, setMessage] = useState(
    `You've been invited to join ${groupName} on our Contributions Society platform. Join us to save together and achieve your financial goals!`,
  );
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
      .map((email) => email.trim())
      .filter((email) => email && email.includes("@"));

    await new Promise((resolve) => setTimeout(resolve, 1000));
    onInvite(emailList, message);
    setSending(false);
    setEmails("");
    onClose();
  };

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white shadow-xl rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="top-0 sticky flex justify-between items-center bg-white px-6 py-4 border-gray-200 border-b">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-emerald-100 rounded-lg w-10 h-10">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">
                Invite Members
              </h2>
              <p className="text-gray-500 text-sm">{groupName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Share Link */}
          <div>
            <label className="block mb-2 font-medium text-gray-700 text-sm">
              Share Invite Link
            </label>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 bg-gray-50 px-4 py-2.5 border border-gray-200 rounded-lg">
                <Link2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 text-sm truncate">
                  {inviteLink}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
                  copied
                    ? "bg-green-100 text-green-700"
                    : "bg-emerald-500 text-white hover:bg-emerald-600"
                }`}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="border-gray-200 border-t w-full"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-gray-500 text-sm">
                or invite by email
              </span>
            </div>
          </div>

          {/* Email Addresses */}
          <div>
            <label className="block mb-2 font-medium text-gray-700 text-sm">
              <Mail className="inline mr-1 w-4 h-4" />
              Email Addresses
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Enter email addresses (one per line or comma-separated)"
              rows={4}
              className="px-4 py-3 border border-gray-300 focus:border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full resize-none"
            />
            <p className="mt-1 text-gray-500 text-xs">
              Separate multiple emails with commas or new lines
            </p>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block mb-2 font-medium text-gray-700 text-sm">
              Personal Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="px-4 py-3 border border-gray-300 focus:border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 hover:bg-gray-50 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!emails.trim() || sending}
              className="flex flex-1 justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 px-4 py-2.5 rounded-lg font-medium text-white transition-colors disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />
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
