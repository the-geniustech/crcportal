import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Printer,
  Share2,
  CheckCircle,
  Building2,
  Calendar,
  CreditCard,
  Hash,
  Mail,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEmailTransactionReceiptMutation } from "@/hooks/finance/useEmailTransactionReceiptMutation";
import { downloadMyTransactionReceiptPdf } from "@/lib/finance";

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  type:
    | "deposit"
    | "loan_repayment"
    | "group_contribution"
    | "withdrawal"
    | "interest";
  status: "success" | "pending" | "failed";
  description: string;
  date: string;
  channel?: string;
  groupName?: string;
  loanName?: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const typeLabels = {
  deposit: "Savings Deposit",
  loan_repayment: "Loan Repayment",
  group_contribution: "Group Contribution",
  withdrawal: "Withdrawal",
  interest: "Interest",
};

export default function ReceiptModal({
  isOpen,
  onClose,
  transaction,
}: ReceiptModalProps) {
  const { toast } = useToast();
  const emailReceiptMutation = useEmailTransactionReceiptMutation();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const isGeneratingPdf = emailReceiptMutation.isPending || isDownloading;

  if (!transaction) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendEmail = async () => {
    const emails = email
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const invalid = emails.filter(
      (value) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    );

    if (emails.length === 0 || invalid.length > 0) {
      toast({
        title: "Invalid Email",
        description:
          invalid.length > 0
            ? `Invalid email(s): ${invalid.join(", ")}`
            : "Please enter at least one valid email.",
        variant: "destructive",
      });
      return;
    }

    try {
      await emailReceiptMutation.mutateAsync({
        transactionId: transaction.id,
        emails,
      });

      toast({
        title: "Receipt Sent!",
        description: `Payment receipt sent to ${emails.length} recipient${emails.length > 1 ? "s" : ""}.`,
      });
      setShowEmailInput(false);
      setEmail("");
    } catch (error: unknown) {
      console.error("Error sending receipt email:", error);
      toast({
        title: "Failed to Send",
        description:
          (error as Error).message ||
          "Could not send receipt email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const blob = await downloadMyTransactionReceiptPdf(transaction.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Champions-Revolving-Contributions-Receipt-${transaction.reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Receipt Downloaded",
        description: "Your receipt has been downloaded successfully.",
      });
    } catch (error: unknown) {
      console.error("Error downloading receipt:", error);
      toast({
        title: "Download Failed",
        description:
          (error as Error).message ||
          "Could not download receipt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${transaction.reference}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
              .logo { font-size: 24px; font-weight: bold; color: #10b981; }
              .subtitle { color: #666; font-size: 14px; }
              .success-badge { background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; }
              .amount { font-size: 32px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
              .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-row:last-child { border-bottom: none; }
              .label { color: #6b7280; }
              .value { font-weight: 500; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CRC</div>
              <div class="subtitle">Champions Revolving Contributions</div>
              <div class="success-badge">✓ Payment Successful</div>
            </div>

            <div class="amount">₦${transaction.amount.toLocaleString()}</div>

            <div class="details">
              <div class="detail-row">
                <span class="label">Reference</span>
                <span class="value">${transaction.reference}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date & Time</span>
                <span class="value">${formatDate(transaction.date)}</span>
              </div>
              <div class="detail-row">
                <span class="label">Payment Type</span>
                <span class="value">${typeLabels[transaction.type]}</span>
              </div>
              <div class="detail-row">
                <span class="label">Description</span>
                <span class="value">${transaction.description}</span>
              </div>
              ${
                transaction.groupName
                  ? `
              <div class="detail-row">
                <span class="label">Group</span>
                <span class="value">${transaction.groupName}</span>
              </div>
              `
                  : ""
              }
              ${
                transaction.loanName
                  ? `
              <div class="detail-row">
                <span class="label">Loan</span>
                <span class="value">${transaction.loanName}</span>
              </div>
              `
                  : ""
              }
              ${
                transaction.channel
                  ? `
              <div class="detail-row">
                <span class="label">Payment Channel</span>
                <span class="value">${transaction.channel.replace("_", " ").toUpperCase()}</span>
              </div>
              `
                  : ""
              }
            </div>

            <div class="footer">
              <p>Thank you for your payment!</p>
              <p>Ogun Baptist Conference Secretariat</p>
              <p>Olabisi Onabanjo Way, Idi Aba, Abeokuta, Ogun State</p>
              <p>Phone: 08060707575 | Email: olayoyinoyeniyi@gmail.com</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "CRC Payment Receipt",
      text: `Payment Receipt - ₦${transaction.amount.toLocaleString()} - ${transaction.reference}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(
        `CRC Payment Receipt\nAmount: ₦${transaction.amount.toLocaleString()}\nReference: ${transaction.reference}\nDate: ${formatDate(transaction.date)}`,
      );
      toast({
        title: "Copied to Clipboard",
        description: "Receipt details have been copied to your clipboard.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Payment Receipt</DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="space-y-6 py-4">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="flex justify-center items-center bg-emerald-100 mx-auto rounded-full w-16 h-16">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <p className="font-medium text-emerald-600 text-sm">
              Payment Successful
            </p>
          </div>

          {/* Amount */}
          <div className="text-center">
            <p className="font-bold text-gray-900 text-4xl">
              ₦{transaction.amount.toLocaleString()}
            </p>
            <p className="mt-1 text-gray-500">{typeLabels[transaction.type]}</p>
          </div>

          {/* Details */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-600">
                <Hash className="w-4 h-4" />
                <span className="text-sm">Reference</span>
              </div>
              <span className="font-medium text-gray-900 text-sm">
                {transaction.reference}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Date & Time</span>
              </div>
              <span className="font-medium text-gray-900 text-sm">
                {formatDate(transaction.date)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-600">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm">Payment Type</span>
              </div>
              <span className="font-medium text-gray-900 text-sm">
                {typeLabels[transaction.type]}
              </span>
            </div>

            {transaction.channel && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm">Channel</span>
                </div>
                <span className="font-medium text-gray-900 text-sm capitalize">
                  {transaction.channel.replace("_", " ")}
                </span>
              </div>
            )}

            {transaction.groupName && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Group</span>
                <span className="font-medium text-purple-600 text-sm">
                  {transaction.groupName}
                </span>
              </div>
            )}

            {transaction.loanName && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Loan</span>
                <span className="font-medium text-blue-600 text-sm">
                  {transaction.loanName}
                </span>
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-gray-600 text-sm">Description</p>
              <p className="mt-1 font-medium text-gray-900 text-sm">
                {transaction.description}
              </p>
            </div>
          </div>

          {/* Email Receipt Section */}
          {showEmailInput ? (
            <div className="space-y-3 bg-emerald-50 p-4 rounded-lg">
              <Label
                htmlFor="email"
                className="font-medium text-gray-700 text-sm"
              >
                Send receipt to email
              </Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter email(s) separated by commas"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  disabled={isGeneratingPdf}
                />
                <Button
                  onClick={handleSendEmail}
                  disabled={isGeneratingPdf}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEmailInput(false);
                  setEmail("");
                }}
                className="text-gray-500"
                disabled={isGeneratingPdf}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowEmailInput(true)}
              className="gap-2 hover:bg-emerald-50 border-emerald-200 w-full text-emerald-700"
            >
              <Mail className="w-4 h-4" />
              Email Receipt
            </Button>
          )}

          {isGeneratingPdf && (
            <div className="flex justify-center items-center gap-2 text-gray-500 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>PDF is generating...</span>
            </div>
          )}

          {/* Organization Info */}
          <div className="space-y-1 text-gray-500 text-xs text-center">
            <p className="font-medium">Champions Revolving Contributions</p>
            <p>Ogun Baptist Conference Secretariat</p>
            <p>Olabisi Onabanjo Way, Idi Aba, Abeokuta</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex-1 gap-2"
              disabled={isDownloading}
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex-1 gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex-1 gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
