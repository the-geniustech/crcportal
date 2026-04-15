import React, { useState, useEffect, useRef, useMemo } from "react";
import SignupPoliciesModal from "@/components/auth/SignupPoliciesModal";
import {
  signUp,
  signIn,
  resetPassword,
  resetPasswordWithPhoneOtp,
  sendPhoneOTP,
  verifyPhoneOTP,
  verifyTwoFactorLogin,
  signInWithPhone,
  signInWithGoogle,
  checkGoogleOAuthAvailable,
  resendConfirmationEmail,
} from "@/lib/auth";
import { useGroupsQuery } from "@/hooks/groups/useGroupsQuery";
import { normalizeNigerianPhone } from "@/lib/phone";
import PhoneInput from "@/components/shared/PhoneInput";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup" | "forgot-password";
  onAuthSuccess?: () => void;
}

type AuthMethod = "email" | "phone";
type OTPStep = "input" | "verify";

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = "login",
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot-password">(
    initialMode,
  );
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [otpStep, setOtpStep] = useState<OTPStep>("input");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [pinId, setPinId] = useState<string | null>(null);
  const [googleAuthMessage, setGoogleAuthMessage] = useState<string | null>(
    null,
  );
  const [isGoogleAvailable, setIsGoogleAvailable] = useState<boolean | null>(
    null,
  );
  const [isCheckingGoogle, setIsCheckingGoogle] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [showSlowRequestHint, setShowSlowRequestHint] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<{
    id: string;
    groupNumber?: number;
    groupName?: string;
    location?: string | null;
    memberCount?: number;
    maxMembers?: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    otp: ["", "", "", "", "", ""],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyModalTab, setPolicyModalTab] = useState<"terms" | "privacy">("terms");

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const twoFactorInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const shouldFetchGroups = isOpen && mode === "signup";
  const groupsQuery = useGroupsQuery(
    {
      search: groupSearch.trim() || undefined,
      isOpen: true,
      limit: 8,
      sort: "groupNumber",
      order: "asc",
    },
    shouldFetchGroups,
  );
  const groupOptions = useMemo(
    () => groupsQuery.data?.groups ?? [],
    [groupsQuery.data],
  );

  // Check Google OAuth availability when modal opens
  // useEffect(() => {
  //   if (isOpen && isGoogleAvailable === null && !isCheckingGoogle) {
  //     setIsCheckingGoogle(true);
  //     checkGoogleOAuthAvailable()
  //       .then((available) => {
  //         setIsGoogleAvailable(available);
  //       })
  //       .catch(() => {
  //         setIsGoogleAvailable(false);
  //       })
  //       .finally(() => {
  //         setIsCheckingGoogle(false);
  //       });
  //   }
  // }, [isOpen, isGoogleAvailable, isCheckingGoogle]);

  useEffect(() => {
    setMode(initialMode);
    setErrors({});
    setSuccessMessage(null);
    setOtpStep("input");
    setPinId(null);
    setGoogleAuthMessage(null);
    setShowEmailConfirmation(false);
    setTwoFactorToken(null);
    setTwoFactorCode(["", "", "", "", "", ""]);
    setTwoFactorError(null);
    setGroupSearch("");
    setSelectedGroup(null);
    setShowSlowRequestHint(false);
    setAcceptedPolicies(false);
    setPolicyModalOpen(false);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (isSubmitting && mode === "login" && authMethod === "email") {
      setShowSlowRequestHint(false);
      const timer = setTimeout(() => setShowSlowRequestHint(true), 8000);
      return () => clearTimeout(timer);
    }
    setShowSlowRequestHint(false);
    return undefined;
  }, [isSubmitting, mode, authMethod]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  const showToast = (message: string, type: "success" | "error" | "info") => {
    const toast = document.createElement("div");
    const bgColor =
      type === "success"
        ? "bg-emerald-500"
        : type === "error"
          ? "bg-red-500"
          : "bg-blue-500";
    toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-4 rounded-xl shadow-lg z-[100] animate-slide-in max-w-sm`;
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <svg class="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${
            type === "success"
              ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
              : type === "error"
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
          }
        </svg>
        <span class="font-medium">${message}</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const normalizedPhone = normalizeNigerianPhone(formData.phone);
    const phoneRequired =
      authMethod === "phone" || (authMethod === "email" && mode === "signup");

    if (authMethod === "email") {
      if (mode === "signup") {
        if (!formData.fullName.trim())
          newErrors.fullName = "Full name is required";
        if (!formData.phone.trim()) {
          newErrors.phone = "Phone number is required";
        } else if (!normalizedPhone) {
          newErrors.phone =
            "Use +234 803 123 4567, 803 123 4567, or 0803 123 4567";
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }
        if (!acceptedPolicies) {
          newErrors.terms = "You must agree before creating an account";
        }
      }

      if (!formData.email.trim()) newErrors.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(formData.email))
        newErrors.email = "Invalid email format";

      if (mode !== "forgot-password") {
        if (!formData.password.trim())
          newErrors.password = "Password is required";
        else if (formData.password.length < 8)
          newErrors.password = "Password must be at least 8 characters";
      }
    } else {
      // Phone validation
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required";
      } else if (!normalizedPhone) {
        newErrors.phone =
          "Use +234 803 123 4567, 803 123 4567, or 0803 123 4567";
      }

      if (mode === "signup" && !formData.fullName.trim()) {
        newErrors.fullName = "Full name is required";
      }
      if (mode === "signup" && !acceptedPolicies) {
        newErrors.terms = "You must agree before creating an account";
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0 && phoneRequired && normalizedPhone) {
      if (normalizedPhone !== formData.phone) {
        setFormData((prev) => ({ ...prev, phone: normalizedPhone }));
      }
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});
    setShowEmailConfirmation(false);

    try {
      if (mode === "signup") {
        const normalizedPhone = normalizeNigerianPhone(formData.phone);
        if (!normalizedPhone) {
          setErrors({
            phone: "Use +234 803 123 4567, 803 123 4567, or 0803 123 4567",
          });
          setIsSubmitting(false);
          return;
        }
        const { user, session, error } = await signUp({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: normalizedPhone,
          groupId: selectedGroup?.id,
        });

        if (error) {
          setErrors({ submit: error.message });
          showToast(error.message, "error");
        } else if (user) {
          if (!session) {
            // Email confirmation required
            setShowEmailConfirmation(true);
            setConfirmationEmail(formData.email);
            setSuccessMessage(
              "Account created! Please check your email to verify your account before signing in.",
            );
            showToast(
              "Please check your email to verify your account.",
              "info",
            );
          } else {
            // Auto-confirmed (rare, depends on Supabase settings)
            showToast(
              "Account created successfully! Welcome to CRC Connect.",
              "success",
            );
            onClose();
            onAuthSuccess?.();
            resetForm();
          }
        }
      } else if (mode === "login") {
        const { user, error, twoFactorRequired, twoFactorToken: tfaToken } =
          await signIn({
            email: formData.email,
            password: formData.password,
          });

        if (twoFactorRequired && tfaToken) {
          setTwoFactorToken(tfaToken);
          setTwoFactorCode(["", "", "", "", "", ""]);
          setTwoFactorError(null);
          showToast("Enter your authenticator code to continue.", "info");
          return;
        }

        if (error) {
          console.log("Error!! ðŸ’¥: ", error);
          // Check if it's an email confirmation issue
          if (
            error.message.includes("Email not confirmed") ||
            error.message.includes("Email not verified") ||
            error.message.includes("verify your email")
          ) {
            setShowEmailConfirmation(true);
            setConfirmationEmail(formData.email);
            setErrors({ submit: error.message });
          } else {
            setErrors({ submit: error.message });
          }
          showToast(error.message, "error");
        } else if (user) {
          showToast(
            "Welcome back! You have successfully signed in.",
            "success",
          );
          onClose();
          onAuthSuccess?.();
          resetForm();
        }
      } else if (mode === "forgot-password") {
        const { error } = await resetPassword(formData.email);

        if (error) {
          setErrors({ submit: error.message });
          showToast(error.message, "error");
        } else {
          setSuccessMessage(
            "Password reset email sent! Check your inbox for the reset link.",
          );
          showToast("Password reset email sent! Check your inbox.", "success");
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrors({ submit: errorMessage });
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!confirmationEmail) return;

    setIsSubmitting(true);
    try {
      const { error } = await resendConfirmationEmail(confirmationEmail);
      if (error) {
        showToast(error.message, "error");
      } else {
        showToast(
          "Confirmation email resent! Please check your inbox.",
          "success",
        );
        setCountdown(60);
      }
    } catch (err) {
      showToast(
        "Failed to resend confirmation email. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const normalizedPhone = normalizeNigerianPhone(formData.phone);
      if (!normalizedPhone) {
        setErrors({
          phone: "Use +234 803 123 4567, 803 123 4567, or 0803 123 4567",
        });
        setIsSubmitting(false);
        return;
      }
      const result = await sendPhoneOTP(
        normalizedPhone,
        mode === "signup" ? formData.fullName : undefined,
        mode === "signup" ? selectedGroup?.id : undefined,
      );

      if (result.success && result.pinId) {
        setPinId(result.pinId);
        setOtpStep("verify");
        setCountdown(60);
        showToast("OTP sent to your phone!", "success");
      } else {
        setErrors({ submit: result.error || "Failed to send OTP" });
        showToast(result.error || "Failed to send OTP", "error");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send OTP";
      setErrors({ submit: errorMessage });
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPasswordResetOtp = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const normalizedPhone = normalizeNigerianPhone(formData.phone);
      if (!normalizedPhone) {
        setErrors({
          phone: "Use +234 803 123 4567, 803 123 4567, or 0803 123 4567",
        });
        setIsSubmitting(false);
        return;
      }
      const { error } = await resetPassword({ phone: normalizedPhone });

      if (error) {
        setErrors({ submit: error.message });
        showToast(error.message, "error");
      } else {
        setPinId(null);
        setOtpStep("verify");
        setCountdown(60);
        setSuccessMessage(
          "Reset code sent! Enter the code and set a new password.",
        );
        showToast("Reset code sent to your phone!", "success");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send reset code";
      setErrors({ submit: errorMessage });
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = formData.otp.join("");
    if (otpCode.length !== 6) {
      setErrors({ otp: "Please enter the complete 6-digit code" });
      return;
    }

    if (mode !== "forgot-password" && !pinId) {
      setErrors({ submit: "Session expired. Please request a new OTP." });
      return;
    }

    if (mode === "forgot-password") {
      const newErrors: Record<string, string> = {};
      if (!formData.password.trim()) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else {
        const hasUppercase = /[A-Z]/.test(formData.password);
        const hasLowercase = /[a-z]/.test(formData.password);
        const hasNumber = /[0-9]/.test(formData.password);
        if (!hasUppercase || !hasLowercase || !hasNumber) {
          newErrors.password =
            "Password must include uppercase, lowercase, and number";
        }
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (mode === "forgot-password") {
        const normalizedPhone = normalizeNigerianPhone(formData.phone);
        if (!normalizedPhone) {
          setErrors({
            phone: "Use +234 803 123 4567, 803 123 4567, or 0803 123 4567",
          });
          setIsSubmitting(false);
          return;
        }
        const { error } = await resetPasswordWithPhoneOtp(
          normalizedPhone,
          otpCode,
          formData.password,
          true,
        );

        if (error) {
          setErrors({ submit: error.message });
          showToast(error.message, "error");
        } else {
          showToast("Password reset successfully!", "success");
          onClose();
          onAuthSuccess?.();
          resetForm();
        }
      } else {
        const verifyResult = await verifyPhoneOTP(pinId, otpCode);

        if (
          verifyResult.twoFactorRequired &&
          verifyResult.twoFactorToken
        ) {
          setTwoFactorToken(verifyResult.twoFactorToken);
          setTwoFactorCode(["", "", "", "", "", ""]);
          setTwoFactorError(null);
          setFormData((prev) => ({
            ...prev,
            otp: ["", "", "", "", "", ""],
          }));
          showToast("Enter your authenticator code to continue.", "info");
          return;
        }

        if (verifyResult.success && verifyResult.verified) {
          // OTP verified and user authenticated - session is already set by verifyPhoneOTP
          const message = verifyResult.isNewUser
            ? "Account created successfully! Welcome to CRC Connect."
            : "Welcome back! You have successfully signed in.";
          showToast(message, "success");
          onClose();
          onAuthSuccess?.();
          resetForm();
        } else {
          setErrors({
            otp: verifyResult.error || "Invalid OTP. Please try again.",
          });
          showToast(verifyResult.error || "Invalid OTP", "error");
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Verification failed";
      setErrors({ submit: errorMessage });
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    if (mode === "forgot-password") {
      await handleSendPasswordResetOtp();
    } else {
      await handleSendOTP();
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setGoogleAuthMessage(null);
    setErrors({});

    try {
      const { error } = await signInWithGoogle();

      if (error) {
        setGoogleAuthMessage(error.message);
        showToast("Google Sign-In unavailable", "error");
      }
      // If no error, the user will be redirected to Google OAuth
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to initiate Google Sign-In";
      setGoogleAuthMessage(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setGoogleAuthMessage(null);
    setShowEmailConfirmation(false);
  };

  const handlePhoneValueChange = (nextValue: string) => {
    setFormData((prev) => ({ ...prev, phone: nextValue }));
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
    setGoogleAuthMessage(null);
    setShowEmailConfirmation(false);
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...formData.otp];
    newOtp[index] = value.slice(-1);
    setFormData((prev) => ({ ...prev, otp: newOtp }));

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (errors.otp) {
      setErrors((prev) => ({ ...prev, otp: "" }));
    }
  };

  const handleOTPKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !formData.otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newOtp = [...formData.otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setFormData((prev) => ({ ...prev, otp: newOtp }));

    const focusIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleTwoFactorChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...twoFactorCode];
    next[index] = value.slice(-1);
    setTwoFactorCode(next);

    if (value && index < 5) {
      twoFactorInputRefs.current[index + 1]?.focus();
    }

    if (twoFactorError) setTwoFactorError(null);
  };

  const handleTwoFactorKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !twoFactorCode[index] && index > 0) {
      twoFactorInputRefs.current[index - 1]?.focus();
    }
  };

  const handleTwoFactorPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const next = [...twoFactorCode];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setTwoFactorCode(next);
    const focusIndex = Math.min(pasted.length, 5);
    twoFactorInputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyTwoFactor = async () => {
    if (!twoFactorToken) return;
    const code = twoFactorCode.join("");
    if (code.length !== 6) {
      setTwoFactorError("Please enter the 6-digit code");
      return;
    }

    setIsSubmitting(true);
    setTwoFactorError(null);

    try {
      const { user, error } = await verifyTwoFactorLogin(twoFactorToken, code);
      if (error) {
        setTwoFactorError(error.message);
        showToast(error.message, "error");
        return;
      }

      if (user) {
        showToast(
          "Welcome back! You have successfully signed in.",
          "success",
        );
        onClose();
        onAuthSuccess?.();
        resetForm();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      setTwoFactorError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      otp: ["", "", "", "", "", ""],
    });
    setOtpStep("input");
    setPinId(null);
    setCountdown(0);
    setGoogleAuthMessage(null);
    setShowEmailConfirmation(false);
    setConfirmationEmail("");
    setTwoFactorToken(null);
    setTwoFactorCode(["", "", "", "", "", ""]);
    setTwoFactorError(null);
    setGroupSearch("");
    setSelectedGroup(null);
    setAcceptedPolicies(false);
  };

  const switchMode = (newMode: "login" | "signup" | "forgot-password") => {
    setMode(newMode);
    setErrors({});
    setSuccessMessage(null);
    setOtpStep("input");
    setPinId(null);
    setGoogleAuthMessage(null);
    setAcceptedPolicies(false);
    setShowEmailConfirmation(false);
    setTwoFactorToken(null);
    setTwoFactorCode(["", "", "", "", "", ""]);
    setTwoFactorError(null);
    setGroupSearch("");
    setSelectedGroup(null);
    setAcceptedPolicies(false);
  };

  const showGoogleButton = isGoogleAvailable === true;
  const normalizedPhoneDisplay =
    normalizeNigerianPhone(formData.phone) || formData.phone;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white shadow-2xl rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="top-4 right-4 z-10 absolute p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-8">
          {/* Logo */}
          <div className="flex justify-center items-center gap-2 mb-6">
            <div className="flex justify-center items-center bg-emerald-500 rounded-full w-10 h-10">
              <svg
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-xl">CRC Connect</span>
          </div>

          {/* Header */}
          <div className="mb-6 text-center">
            <h2 className="mb-2 font-bold text-gray-900 text-2xl">
              {mode === "login"
                ? "Welcome Back!"
                : mode === "signup"
                  ? "Create Account"
                  : "Reset Password"}
            </h2>
            <p className="text-gray-600">
              {mode === "login"
                ? "Sign in to access your account"
                : mode === "signup"
                  ? "Join thousands of Nigerians building wealth"
                  : authMethod === "phone"
                    ? "Enter your phone number to receive a reset code"
                    : "Enter your email to receive a reset link"}
            </p>
          </div>

          {/* Auth Method Tabs */}
          {otpStep === "input" && !showEmailConfirmation && (
              <div className="flex bg-gray-100 mb-6 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAuthMethod("email")}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                    authMethod === "email"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <div className="flex justify-center items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod("phone")}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                    authMethod === "phone"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <div className="flex justify-center items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    Phone
                  </div>
                </button>
              </div>
            )}

          {/* Email Confirmation Notice */}
          {showEmailConfirmation && (
            <div className="bg-blue-50 mb-6 p-4 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex flex-shrink-0 justify-center items-center bg-blue-100 rounded-full w-10 h-10">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-blue-900">
                    Check Your Email
                  </h3>
                  <p className="mb-3 text-blue-700 text-sm">
                    We sent a verification link to{" "}
                    <strong>{confirmationEmail}</strong>. Please click the link
                    to verify your email before signing in.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleResendConfirmation}
                      disabled={isSubmitting || countdown > 0}
                      className="disabled:opacity-50 font-medium text-blue-600 hover:text-blue-700 text-sm"
                    >
                      {countdown > 0
                        ? `Resend in ${countdown}s`
                        : "Resend Email"}
                    </button>
                    <span className="text-blue-300">|</span>
                    <button
                      onClick={() => {
                        setShowEmailConfirmation(false);
                        switchMode("login");
                      }}
                      className="font-medium text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Try Signing In
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && !showEmailConfirmation && (
            <div className="bg-emerald-50 mb-6 p-4 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {errors.submit && !showEmailConfirmation && (
            <div className="bg-red-50 mb-6 p-4 border border-red-200 rounded-xl text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Google Auth Message */}
          {googleAuthMessage && (
            <div className="flex items-start gap-3 bg-amber-50 mb-6 p-4 border border-amber-200 rounded-xl text-amber-700 text-sm">
              <svg
                className="flex-shrink-0 mt-0.5 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{googleAuthMessage}</span>
            </div>
          )}

          {/* Two-Factor Verification View */}
          {twoFactorToken ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex justify-center items-center bg-emerald-100 mx-auto mb-4 rounded-full w-16 h-16">
                  <svg
                    className="w-8 h-8 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                  Two-Factor Authentication
                </h3>
                <p className="text-gray-600 text-sm">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>

              <div
                className="flex justify-center gap-2"
                onPaste={handleTwoFactorPaste}
              >
                {twoFactorCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (twoFactorInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleTwoFactorChange(index, e.target.value)}
                    onKeyDown={(e) => handleTwoFactorKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 ${
                      twoFactorError ? "border-red-500" : "border-gray-200"
                    } focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all`}
                  />
                ))}
              </div>

              {twoFactorError && (
                <p className="text-red-500 text-sm text-center">
                  {twoFactorError}
                </p>
              )}

              <button
                onClick={handleVerifyTwoFactor}
                disabled={isSubmitting || twoFactorCode.join("").length !== 6}
                className="flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 shadow-emerald-500/30 shadow-lg py-4 rounded-xl w-full font-semibold text-white transition-all duration-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </button>

              <button
                onClick={() => {
                  setTwoFactorToken(null);
                  setTwoFactorCode(["", "", "", "", "", ""]);
                  setTwoFactorError(null);
                }}
                className="flex justify-center items-center gap-2 py-3 w-full font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          ) : authMethod === "phone" && otpStep === "verify" ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex justify-center items-center bg-emerald-100 mx-auto mb-4 rounded-full w-16 h-16">
                  <svg
                    className="w-8 h-8 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                  {mode === "forgot-password"
                    ? "Enter Reset Code"
                    : "Enter Verification Code"}
                </h3>
                <p className="text-gray-600 text-sm">
                  We sent a 6-digit code to
                  <br />
                  <span className="font-medium text-gray-900">
                    {normalizedPhoneDisplay}
                  </span>
                </p>
              </div>

              {/* OTP Input */}
              <div
                className="flex justify-center gap-2"
                onPaste={handleOTPPaste}
              >
                {formData.otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 ${
                      errors.otp ? "border-red-500" : "border-gray-200"
                    } focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all`}
                  />
                ))}
              </div>
              {errors.otp && (
                <p className="text-red-500 text-sm text-center">{errors.otp}</p>
              )}

              {mode === "forgot-password" && (
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        errors.password ? "border-red-500" : "border-gray-200"
                      } focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all`}
                      placeholder="Create a new password"
                    />
                    {errors.password && (
                      <p className="mt-1 text-red-500 text-sm">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        errors.confirmPassword
                          ? "border-red-500"
                          : "border-gray-200"
                      } focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all`}
                      placeholder="Confirm your new password"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-red-500 text-sm">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Verify Button */}
              <button
                onClick={handleVerifyOTP}
                disabled={
                  isSubmitting ||
                  formData.otp.join("").length !== 6 ||
                  (mode === "forgot-password" &&
                    (!formData.password || !formData.confirmPassword))
                }
                className="flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 shadow-emerald-500/30 shadow-lg py-4 rounded-xl w-full font-semibold text-white transition-all duration-300 disabled:cursor-not-allowed"
              >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="w-5 h-5 animate-spin"
                          fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Verifying...
                  </>
                ) : mode === "forgot-password" ? (
                  "Reset Password"
                ) : (
                  "Verify & Continue"
                )}
              </button>

              {/* Resend OTP */}
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  Didn't receive the code?{" "}
                  {countdown > 0 ? (
                    <span className="text-gray-400">
                      Resend in {countdown}s
                    </span>
                  ) : (
                    <button
                      onClick={handleResendOTP}
                      disabled={isSubmitting}
                      className="font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Resend OTP
                    </button>
                  )}
                </p>
              </div>

              {/* Back Button */}
              <button
                onClick={() => setOtpStep("input")}
                className="flex justify-center items-center gap-2 py-3 w-full font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Change phone number
              </button>
            </div>
          ) : !showEmailConfirmation ? (
            /* Main Form */
            <form
              onSubmit={
                authMethod === "email"
                  ? handleEmailSubmit
                  : (e) => {
                      e.preventDefault();
                      if (mode === "forgot-password") {
                        handleSendPasswordResetOtp();
                      } else {
                        handleSendOTP();
                      }
                    }
              }
              className="space-y-5"
            >
              {/* Full Name (signup only) */}
              {mode === "signup" && (
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.fullName ? "border-red-500" : "border-gray-200"} focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all`}
                    placeholder="John Doe"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-red-500 text-sm">
                      {errors.fullName}
                    </p>
                  )}
                </div>
              )}

              {/* Email Input (email method) */}
              {authMethod === "email" && (
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.email ? "border-red-500" : "border-gray-200"} focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all`}
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-red-500 text-sm">{errors.email}</p>
                  )}
                </div>
              )}

              {/* Phone Input */}
              {(authMethod === "phone" ||
                (authMethod === "email" && mode === "signup")) && (
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Phone Number
                  </label>
                  <PhoneInput
                    name="phone"
                    value={formData.phone}
                    onValueChange={handlePhoneValueChange}
                    showPrefix
                    prefixText="+234"
                    leftAdornment={
                      <svg className="w-5 h-5" viewBox="0 0 36 36" fill="none">
                        <rect width="36" height="36" rx="4" fill="#008751" />
                        <rect x="12" width="12" height="36" fill="white" />
                      </svg>
                    }
                    inputClassName={`w-full h-auto pr-4 py-3 rounded-xl border ${errors.phone ? "border-red-500" : "border-gray-200"} focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all`}
                    inputPaddingClassName="pl-24"
                    error={errors.phone}
                    helperClassName="mt-2"
                  />
                </div>
              )}

              {mode === "signup" && (
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Preferred Group <span className="text-gray-400">(Optional)</span>
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        placeholder="Search by group name, number, or location"
                      />
                      <svg
                        className="absolute left-4 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-4.35-4.35m1.6-4.65a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>

                    {selectedGroup && (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                        <div>
                          <p className="text-xs font-semibold text-emerald-600">
                            Selected Group
                          </p>
                          <p className="text-sm font-semibold text-emerald-900">
                            Group {selectedGroup.groupNumber ?? "—"}{" "}
                            {selectedGroup.groupName
                              ? `• ${selectedGroup.groupName}`
                              : ""}
                          </p>
                          {selectedGroup.location && (
                            <p className="text-xs text-emerald-700">
                              {selectedGroup.location}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedGroup(null)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    <div className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                      <div className="max-h-44 overflow-y-auto divide-y divide-gray-200">
                        {groupsQuery.isLoading && (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            Loading groups...
                          </div>
                        )}

                        {!groupsQuery.isLoading && groupOptions.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            No groups found. Try a different search.
                          </div>
                        )}

                        {groupOptions.map((group) => {
                          const isSelected = selectedGroup?.id === group._id;
                          const isFull =
                            typeof group.memberCount === "number" &&
                            typeof group.maxMembers === "number" &&
                            group.memberCount >= group.maxMembers;
                          return (
                            <button
                              key={group._id}
                              type="button"
                              disabled={isFull}
                              onClick={() =>
                                setSelectedGroup({
                                  id: group._id,
                                  groupNumber: group.groupNumber,
                                  groupName: group.groupName,
                                  location: group.location ?? null,
                                  memberCount: group.memberCount,
                                  maxMembers: group.maxMembers,
                                })
                              }
                              className={`w-full px-4 py-3 text-left transition-colors ${
                                isSelected
                                  ? "bg-emerald-100"
                                  : "hover:bg-white"
                              } ${isFull ? "opacity-60 cursor-not-allowed" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    Group {group.groupNumber}{" "}
                                    {group.groupName
                                      ? `• ${group.groupName}`
                                      : ""}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {group.location || "Location not set"}
                                  </p>
                                </div>
                                <div className="text-right text-xs text-gray-500">
                                  {isFull ? (
                                    <span className="font-semibold text-red-500">
                                      Full
                                    </span>
                                  ) : (
                                    <span>
                                      {typeof group.memberCount === "number"
                                        ? group.memberCount
                                        : "—"}
                                      /
                                      {typeof group.maxMembers === "number"
                                        ? group.maxMembers
                                        : "—"}{" "}
                                      members
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {groupsQuery.isError && (
                      <p className="text-xs text-red-500">
                        Unable to load groups right now. You can continue
                        without selecting one.
                      </p>
                    )}

                    <p className="text-xs text-gray-500">
                      We'll send a join request to the selected group after
                      signup.
                    </p>
                  </div>
                </div>
              )}

              {/* Password Fields (email method only) */}
              {authMethod === "email" && mode !== "forgot-password" && (
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.password ? "border-red-500" : "border-gray-200"} focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all`}
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="mt-1 text-red-500 text-sm">
                      {errors.password}
                    </p>
                  )}
                </div>
              )}

              {authMethod === "email" && mode === "signup" && (
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.confirmPassword ? "border-red-500" : "border-gray-200"} focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all`}
                    placeholder="••••••••"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-red-500 text-sm">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* Remember Me & Forgot Password (email login) */}
              {authMethod === "email" && mode === "login" && (
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="border-gray-300 rounded focus:ring-emerald-500 w-4 h-4 text-emerald-500"
                    />
                    <span className="text-gray-600 text-sm">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot-password")}
                    className="font-medium text-emerald-600 hover:text-emerald-700 text-sm"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Terms Agreement (signup) */}
              {mode === "signup" && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="signup-policy-consent"
                      className="mt-1 border-gray-300 rounded focus:ring-emerald-500 w-4 h-4 text-emerald-500"
                      checked={acceptedPolicies}
                      onChange={(e) => setAcceptedPolicies(e.target.checked)}
                    />
                    <div className="text-gray-600 text-sm">
                      <label
                        htmlFor="signup-policy-consent"
                        className="cursor-pointer"
                      >
                        I agree to the{" "}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setPolicyModalTab("terms");
                          setPolicyModalOpen(true);
                        }}
                        className="font-semibold text-emerald-600 hover:underline"
                      >
                        Terms of Service
                      </button>{" "}
                      and{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setPolicyModalTab("privacy");
                          setPolicyModalOpen(true);
                        }}
                        className="font-semibold text-emerald-600 hover:underline"
                      >
                        Privacy Policy
                      </button>
                    </div>
                  </div>
                  {errors.terms && (
                    <p className="text-xs text-red-500">{errors.terms}</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 shadow-emerald-500/30 shadow-lg py-4 rounded-xl w-full font-semibold text-white transition-all duration-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                        </svg>
                    {authMethod === "phone"
                      ? mode === "forgot-password"
                        ? "Sending reset code..."
                        : "Sending OTP..."
                      : mode === "login"
                        ? "Signing in..."
                        : mode === "signup"
                          ? "Creating account..."
                          : "Sending..."}
                  </>
                ) : authMethod === "phone" ? (
                  mode === "forgot-password" ? "Send Reset Code" : "Send OTP"
                ) : mode === "login" ? (
                  "Sign In"
                ) : mode === "signup" ? (
                  "Create Account"
                ) : (
                  "Send Reset Link"
                )}
              </button>
              {showSlowRequestHint && (
                <p className="mt-2 text-amber-600 text-xs">
                  This is taking longer than usual. The server may be waking up —
                  please keep this window open.
                </p>
              )}
            </form>
          ) : null}

          {/* Divider & Social Login */}
          {mode !== "forgot-password" &&
            otpStep === "input" &&
            !showEmailConfirmation && (
              <>
                {/* <div className="flex items-center gap-4 my-6">
                <div className="flex-1 bg-gray-200 h-px" />
                <span className="text-gray-500 text-sm">or</span>
                <div className="flex-1 bg-gray-200 h-px" />
              </div> */}

                {/* Google Sign In */}
                {/* {showGoogleButton ? (
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="flex justify-center items-center gap-3 hover:bg-gray-50 disabled:opacity-50 py-3 border border-gray-200 rounded-xl w-full font-medium text-gray-700 transition-colors disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with Google
                </button>
              ) : (
                <div className="group relative">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting || isCheckingGoogle}
                    className="flex justify-center items-center gap-3 hover:bg-gray-50 opacity-60 disabled:opacity-50 py-3 border border-gray-200 rounded-xl w-full font-medium text-gray-500 transition-colors cursor-not-allowed disabled:cursor-not-allowed"
                    title="Google Sign-In requires additional setup"
                  >
                    {isCheckingGoogle ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Continue with Google
                    <span className="ml-1 text-gray-400 text-xs">(Coming Soon)</span>
                  </button>

                  <div className="bottom-full left-1/2 absolute bg-gray-900 opacity-0 group-hover:opacity-100 mb-2 px-3 py-2 rounded-lg text-white text-xs whitespace-nowrap transition-opacity -translate-x-1/2 pointer-events-none">
                    Google Sign-In requires OAuth configuration
                    <div className="top-full left-1/2 absolute border-4 border-transparent border-t-gray-900 -translate-x-1/2"></div>
                  </div>
                </div>
              )} */}

                {/* {!showGoogleButton && (
                  <p className="mt-3 text-gray-400 text-xs text-center">
                    Use Email or Phone authentication for secure access
                  </p>
                )} */}
              </>
            )}

          {/* Toggle Mode */}
          {otpStep === "input" && !showEmailConfirmation && (
            <p className="mt-6 text-gray-600 text-center">
              {mode === "login" ? (
                <>
                  Don't have an account?
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="ml-1 font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Sign up
                  </button>
                </>
              ) : mode === "signup" ? (
                <>
                  Already have an account?
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="ml-1 font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Remember your password?
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="ml-1 font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      </div>
      <SignupPoliciesModal
        open={policyModalOpen}
        onOpenChange={setPolicyModalOpen}
        defaultTab={policyModalTab}
      />
    </div>
  );
};

export default AuthModal;







