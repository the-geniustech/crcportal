import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import {
  X,
  Users,
  Search,
  UserPlus,
  Shield,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Phone,
  Mail,
} from "lucide-react";

interface GroupMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  savingsBalance: number;
}

interface GuarantorRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanAmount: number;
  loanApplicationId: string;
  groupMembers: GroupMember[];
  onGuarantorAdded: (guarantor: unknown) => void;
}

export default function GuarantorRequestModal({
  isOpen,
  onClose,
  loanAmount,
  loanApplicationId,
  groupMembers,
  onGuarantorAdded,
}: GuarantorRequestModalProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(
    null,
  );
  const [requestMessage, setRequestMessage] = useState("");
  const [liabilityPercentage, setLiabilityPercentage] = useState(50);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendSMS, setSendSMS] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const filteredMembers = groupMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const liabilityAmount = (loanAmount * liabilityPercentage) / 100;

  const handleSubmitRequest = async () => {
    if (!selectedMember) {
      toast({
        title: "Select a Member",
        description: "Please select a group member to request as guarantor",
        variant: "destructive",
      });
      return;
    }

    if (!acceptedTerms) {
      toast({
        title: "Accept Terms",
        description: "Please acknowledge the guarantor liability terms",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create guarantor request in database
      const { data: guarantorData, error: guarantorError } = await supabase
        .from("loan_guarantors")
        .insert({
          loan_application_id: loanApplicationId,
          guarantor_user_id: selectedMember.id,
          guarantor_name: selectedMember.name,
          guarantor_email: selectedMember.email,
          guarantor_phone: selectedMember.phone,
          liability_percentage: liabilityPercentage,
          request_message: requestMessage || null,
          status: "pending",
        })
        .select()
        .single();

      if (guarantorError) throw guarantorError;

      // Send SMS notification if enabled
      if (sendSMS && selectedMember.phone) {
        try {
          await supabase.functions.invoke("send-sms", {
            body: {
              action: "guarantor_request",
              to: selectedMember.phone,
              name: selectedMember.name,
              requester_name: "Fellow Member", // Would be actual user name
              amount: loanAmount,
            },
          });
        } catch (smsError) {
          console.error("SMS notification failed:", smsError);
        }
      }

      // Create notification record
      await supabase.from("guarantor_notifications").insert({
        guarantor_id: guarantorData.id,
        notification_type: "request",
        message: `You have been requested to be a guarantor for a loan of ₦${loanAmount.toLocaleString()}`,
        sent_via: [sendSMS ? "sms" : null, sendEmail ? "email" : null].filter(
          Boolean,
        ),
      });

      toast({
        title: "Request Sent",
        description: `Guarantor request sent to ${selectedMember.name}`,
      });

      onGuarantorAdded({
        id: guarantorData.id,
        type: "member",
        name: selectedMember.name,
        email: selectedMember.email,
        phone: selectedMember.phone,
        status: "pending",
        liabilityPercentage,
        liabilityAmount,
      });

      // Reset form
      setSelectedMember(null);
      setRequestMessage("");
      setAcceptedTerms(false);
      onClose();
    } catch (error: unknown) {
      console.error("Error sending guarantor request:", error);
      toast({
        title: "Request Failed",
        description:
          (error as Error).message || "Failed to send guarantor request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-emerald-100 rounded-full w-10 h-10">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-xl">
                Request Guarantor
              </h2>
              <p className="text-gray-500 text-sm">
                Select a group member to guarantee your loan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-gray-100 p-2 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
          {/* Loan Info */}
          <div className="bg-emerald-50 mb-6 p-4 border border-emerald-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-emerald-700 text-sm">Loan Amount</p>
                <p className="font-bold text-emerald-800 text-2xl">
                  ₦{loanAmount.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-emerald-700 text-sm">
                  Guarantor Liability ({liabilityPercentage}%)
                </p>
                <p className="font-bold text-emerald-800 text-xl">
                  ₦{liabilityAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Search Members */}
          <div className="mb-6">
            <Label>Search Group Members</Label>
            <div className="relative mt-2">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Member Selection */}
          <div className="mb-6">
            <Label>Select Member</Label>
            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <p className="py-4 text-gray-500 text-center">
                  No members found
                </p>
              ) : (
                filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedMember?.id === member.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            selectedMember?.id === member.id
                              ? "bg-emerald-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <Users
                            className={`h-5 w-5 ${
                              selectedMember?.id === member.id
                                ? "text-white"
                                : "text-gray-600"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.name}
                          </p>
                          <p className="text-gray-500 text-sm">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 text-sm">
                          ₦{member.savingsBalance.toLocaleString()}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Member since {member.memberSince}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Liability Percentage */}
          <div className="mb-6">
            <Label>Liability Percentage</Label>
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map((percentage) => (
                <button
                  key={percentage}
                  onClick={() => setLiabilityPercentage(percentage)}
                  className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                    liabilityPercentage === percentage
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {percentage}%
                </button>
              ))}
            </div>
            <p className="mt-2 text-gray-500 text-sm">
              The guarantor will be liable for ₦
              {liabilityAmount.toLocaleString()} if you default
            </p>
          </div>

          {/* Request Message */}
          <div className="mb-6">
            <Label>Personal Message (Optional)</Label>
            <Textarea
              placeholder="Add a personal message to your guarantor request..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Notification Options */}
          <div className="mb-6">
            <Label>Notification Method</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={sendSMS}
                  onCheckedChange={(checked) => setSendSMS(checked as boolean)}
                />
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-sm">SMS</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={sendEmail}
                  onCheckedChange={(checked) =>
                    setSendEmail(checked as boolean)
                  }
                />
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Email</span>
              </label>
            </div>
          </div>

          {/* Liability Terms */}
          <div className="bg-amber-50 mb-6 p-4 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">
                  Guarantor Liability Terms
                </p>
                <ul className="space-y-1 mt-2 text-amber-700 text-sm list-disc list-inside">
                  <li>
                    The guarantor agrees to repay {liabilityPercentage}% of the
                    loan if you default
                  </li>
                  <li>Guarantor will be notified of any missed payments</li>
                  <li>
                    Guarantor's savings may be used to cover defaulted payments
                  </li>
                  <li>
                    Guarantor can revoke their guarantee before loan
                    disbursement
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Accept Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={acceptedTerms}
              onCheckedChange={(checked) =>
                setAcceptedTerms(checked as boolean)
              }
              className="mt-1"
            />
            <span className="text-gray-700 text-sm">
              I acknowledge that I have read and understood the guarantor
              liability terms, and I confirm that the selected member will be
              notified of this request.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 bg-gray-50 p-6 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmitRequest}
            disabled={!selectedMember || !acceptedTerms || isSubmitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Sending Request...
              </>
            ) : (
              <>
                <Shield className="mr-2 w-4 h-4" />
                Send Guarantor Request
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
