import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import {
  confirmEmailChange,
  confirmPhoneChange,
  requestEmailChange,
  requestPhoneChange,
} from "@/lib/auth";
import { normalizeNigerianPhone } from "@/lib/phone";
import PhoneInput from "@/components/shared/PhoneInput";
import { Mail, Phone, ShieldCheck } from "lucide-react";

type ContactMode = "email" | "phone";

interface ContactChangeDialogProps {
  open: boolean;
  mode: ContactMode;
  currentValue?: string | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!domain) return value;
  if (!local) return `***@${domain}`;
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const masked =
    local[0] + "*".repeat(Math.max(1, local.length - 2)) + local[local.length - 1];
  return `${masked}@${domain}`;
}

function maskPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length <= 4) return trimmed;
  const visible = digits.slice(-4);
  const masked = "*".repeat(Math.max(0, digits.length - 4)) + visible;
  return `${hasPlus ? "+" : ""}${masked}`;
}

const ContactChangeDialog: React.FC<ContactChangeDialogProps> = ({
  open,
  mode,
  currentValue,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"input" | "verify">("input");
  const [value, setValue] = useState("");
  const [pendingValue, setPendingValue] = useState("");
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const isEmail = mode === "email";
  const title = isEmail ? "Change Email Address" : "Change Phone Number";
  const description = isEmail
    ? "We'll send a verification code to your new email address."
    : "We'll send a verification code to your new phone number.";
  const label = isEmail ? "New Email Address" : "New Phone Number";
  const placeholder = isEmail ? "name@example.com" : "+234 801 234 5678";

  const Icon = useMemo(() => (isEmail ? Mail : Phone), [isEmail]);

  useEffect(() => {
    if (open) {
      setStep("input");
      setValue("");
      setPendingValue("");
      setOtp("");
      setIsSending(false);
      setIsVerifying(false);
      setResendSeconds(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [open, resendSeconds]);

  const handleRequestCode = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast({
        title: "Missing details",
        description: `Please enter a valid ${isEmail ? "email" : "phone"} value.`,
        variant: "destructive",
      });
      return;
    }

    let normalizedValue = trimmed;
    if (!isEmail) {
      const normalized = normalizeNigerianPhone(trimmed);
      if (!normalized) {
        toast({
          title: "Invalid phone number",
          description:
            "Use +234 803 123 4567, 803 123 4567, or 0803 123 4567.",
          variant: "destructive",
        });
        return;
      }
      normalizedValue = normalized;
    }

    setIsSending(true);
    const result = isEmail
      ? await requestEmailChange(normalizedValue)
      : await requestPhoneChange(normalizedValue);
    setIsSending(false);

    if (result.error) {
      toast({
        title: "Request failed",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    setPendingValue(normalizedValue);
    setValue(normalizedValue);
    setStep("verify");
    setOtp("");
    setResendSeconds(RESEND_COOLDOWN_SECONDS);

    toast({
      title: "Verification code sent",
      description: isEmail
        ? "Check your new email for the 6-digit code."
        : "Check your phone for the 6-digit code.",
    });
  };

  const handleVerify = async () => {
    if (otp.trim().length < 6) {
      toast({
        title: "Incomplete code",
        description: "Enter the 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    let targetValue = pendingValue || value.trim();
    if (!isEmail) {
      const normalized = normalizeNigerianPhone(targetValue);
      if (!normalized) {
        toast({
          title: "Invalid phone number",
          description:
            "Use +234 803 123 4567, 803 123 4567, or 0803 123 4567.",
          variant: "destructive",
        });
        return;
      }
      targetValue = normalized;
    }
    const result = isEmail
      ? await confirmEmailChange(targetValue, otp.trim())
      : await confirmPhoneChange(targetValue, otp.trim());
    setIsVerifying(false);

    if (result.error) {
      toast({
        title: "Verification failed",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Contact updated",
      description: isEmail
        ? "Your email address has been updated."
        : "Your phone number has been updated.",
    });

    onOpenChange(false);
    onSuccess?.();
  };

  const handleResend = async () => {
    let targetValue = pendingValue || value.trim();
    if (!targetValue) return;
    if (!isEmail) {
      const normalized = normalizeNigerianPhone(targetValue);
      if (!normalized) {
        toast({
          title: "Invalid phone number",
          description:
            "Use +234 803 123 4567, 803 123 4567, or 0803 123 4567.",
          variant: "destructive",
        });
        return;
      }
      targetValue = normalized;
      setValue(normalized);
      setPendingValue(normalized);
    }
    setIsSending(true);
    const result = isEmail
      ? await requestEmailChange(targetValue)
      : await requestPhoneChange(targetValue);
    setIsSending(false);

    if (result.error) {
      toast({
        title: "Resend failed",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    setResendSeconds(RESEND_COOLDOWN_SECONDS);
    toast({
      title: "Code resent",
      description: "A new verification code has been sent.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl">
              <Icon className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Current:{" "}
              <span className="font-semibold">
                {currentValue
                  ? isEmail
                    ? maskEmail(currentValue)
                    : maskPhone(currentValue)
                  : "Not set"}
              </span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {label}
              </label>
              {isEmail ? (
                <Input
                  type="email"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              ) : (
                <PhoneInput
                  value={value}
                  onValueChange={setValue}
                  placeholder={placeholder}
                  inputClassName="h-10"
                />
              )}
            </div>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              We sent a verification code to{" "}
              <span className="font-semibold">
                {isEmail ? maskEmail(pendingValue) : maskPhone(pendingValue)}
              </span>
              .
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-3">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResend}
              disabled={isSending || resendSeconds > 0}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              {isSending
                ? "Resending..."
                : resendSeconds > 0
                ? `Resend in ${String(Math.floor(resendSeconds / 60)).padStart(2, "0")}:${String(
                    resendSeconds % 60,
                  ).padStart(2, "0")}`
                : "Resend code"}
            </button>
          </div>
        )}

        <DialogFooter className="pt-2">
          {step === "verify" && (
            <Button
              variant="outline"
              type="button"
              onClick={() => setStep("input")}
              disabled={isVerifying}
            >
              Edit {isEmail ? "Email" : "Phone"}
            </Button>
          )}
          <Button
            type="button"
            onClick={step === "input" ? handleRequestCode : handleVerify}
            disabled={isSending || isVerifying}
            className="gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            {step === "input"
              ? isSending
                ? "Sending..."
                : "Send Code"
              : isVerifying
              ? "Verifying..."
              : "Confirm Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactChangeDialog;
