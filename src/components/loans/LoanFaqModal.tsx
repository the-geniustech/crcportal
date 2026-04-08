import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { HelpCircle, MessageSquareText } from "lucide-react";
import { goToContactSupport } from "@/lib/support";

const faqs = [
  {
    question: "Who can apply for a CRC loan?",
    answer:
      "Active members in good standing who meet contribution and attendance requirements can apply. Your eligibility depends on your contribution history and group policies.",
  },
  {
    question: "How much can I borrow?",
    answer:
      "Your limit is tied to your contribution history, loan type, and group capacity. The platform shows your maximum eligible amount during application.",
  },
  {
    question: "How is interest calculated?",
    answer:
      "Interest rates are defined by the loan facility and approved by the committee. The total repayable is calculated upfront based on the selected term.",
  },
  {
    question: "When are repayments due?",
    answer:
      "Repayments follow the schedule in your loan terms. Ensure contributions and repayments are kept current to avoid penalties.",
  },
  {
    question: "Can repayments be deducted automatically?",
    answer:
      "Yes. Repayments may be deducted from your savings account or another approved payment method based on your authorization.",
  },
  {
    question: "Do I need guarantors?",
    answer:
      "Guarantor requirements depend on loan size and policy. The application flow will indicate if one or more guarantors are required.",
  },
  {
    question: "What happens if I miss a payment?",
    answer:
      "Missed payments can attract penalties, affect your credit standing, and may require guarantor follow-up. Contact support early if you need help.",
  },
  {
    question: "Can I repay early?",
    answer:
      "Early repayment is allowed subject to policy. If you intend to repay early, notify your coordinator for guidance on any applicable adjustments.",
  },
  {
    question: "How long does approval take?",
    answer:
      "Applications are reviewed by the committee. Most decisions are communicated within a few business days, depending on verification and fund availability.",
  },
  {
    question: "What documents are required?",
    answer:
      "Required documents vary by loan type and amount. The application checklist will show exactly what to upload before submission.",
  },
  {
    question: "How is my personal data used?",
    answer:
      "Your information is kept confidential and used only to manage CRC activities. It is not shared with third parties without consent, except where required by law.",
  },
  {
    question: "Who manages the pooled funds?",
    answer:
      "Contributions are managed by the CRC executive committee and disbursed according to the operational guidelines and approved requests.",
  },
  {
    question: "How are disputes resolved?",
    answer:
      "Disputes are handled through amicable discussion first. If needed, a designated arbitration process is used to reach a resolution.",
  },
  {
    question: "Can the loan terms change over time?",
    answer:
      "CRC may update terms and policies. Members are notified of significant changes before they take effect.",
  },
  {
    question: "What happens if membership is terminated?",
    answer:
      "Members can exit at any time, and CRC may terminate membership for breaches or persistent non-compliance. Specific procedures apply to settlement and asset distribution.",
  },
];

type LoanFaqModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LoanFaqModal: React.FC<LoanFaqModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-white">
                Loan FAQ
              </DialogTitle>
              <DialogDescription className="text-blue-100">
                Quick answers to the most common loan term questions.
              </DialogDescription>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <p className="font-semibold text-gray-900">{faq.question}</p>
                <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
              </div>
            ))}

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                  <MessageSquareText className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-indigo-900">
                    Need help with a specific scenario?
                  </p>
                  <p className="text-sm text-indigo-800">
                    Contact support and we will walk you through your options.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-white p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => goToContactSupport()}
          >
            Contact Support
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanFaqModal;

