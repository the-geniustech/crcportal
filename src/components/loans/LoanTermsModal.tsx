import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileText, AlertCircle } from "lucide-react";

const rules = [
  {
    title: "Membership Eligibility",
    body: "Open to all individuals who agree to abide by these terms. Applicants must provide accurate personal and financial information.",
  },
  {
    title: "Contributions",
    body: "Members agree to make regular contributions as per their chosen plan. Failure to meet contribution deadlines may result in penalties or temporary suspension of benefits.",
  },
  {
    title: "Fund Management",
    body: "All contributions are pooled and managed by the CRC executive committee. Funds are used for the benefit of members as outlined in the CRC operational guidelines.",
  },
  {
    title: "Withdrawals and Loans",
    body: "Procedures for requesting withdrawals, loans, or other financial benefits are detailed in the CRC financial policy, available upon request. All requests are subject to approval by the committee.",
  },
  {
    title: "Data Privacy",
    body: "Personal information provided by members will be kept confidential and used solely for the purpose of managing CRC activities. It will not be shared with third parties without explicit consent, except where required by law.",
  },
  {
    title: "Dispute Resolution",
    body: "Any disputes arising from membership or financial matters will be resolved through amicable discussion and, if necessary, through a designated arbitration process agreed upon by both parties.",
  },
  {
    title: "Amendments",
    body: "CRC reserves the right to amend these rules and regulations at any time. Members will be notified of any significant changes.",
  },
  {
    title: "Code of Conduct",
    body: "Members are expected to conduct themselves with integrity and respect towards other members and the organization.",
  },
  {
    title: "Termination of Membership",
    body: "Membership can be terminated by a member at any time, or by CRC for breach of these rules or non-compliance with contribution requirements. Specific procedures apply to asset distribution upon termination.",
  },
];

type LoanTermsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LoanTermsModal: React.FC<LoanTermsModalProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-white">
                Loan Terms and Conditions
              </DialogTitle>
              <DialogDescription className="text-emerald-100">
                Rules and regulations. Please read carefully.
              </DialogDescription>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-6">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900">
                    Rules and Regulations
                  </p>
                  <p className="text-sm text-emerald-800">
                    This document outlines the rules and regulations for
                    membership in Champions Revolving Contributions (CRC).
                  </p>
                </div>
              </div>
            </div>

            <ol className="space-y-4">
              {rules.map((rule, index) => (
                <li
                  key={rule.title}
                  className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {rule.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">{rule.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <p className="text-sm text-amber-900">
                  By proceeding with registration, you acknowledge that you
                  have read, understood, and agree to be bound by these rules
                  and regulations.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-white p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onOpenChange(false)}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanTermsModal;
