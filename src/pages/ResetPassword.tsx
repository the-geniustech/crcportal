import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useResetPasswordMutation } from '@/hooks/auth/useResetPasswordMutation';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const resetMutation = useResetPasswordMutation();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    // Backend reset link uses query param token: /reset-password?token=...
    const checkToken = async () => {
      setIsCheckingToken(true);

      try {
        const token = searchParams.get('token');

        if (!token) {
          setError('Invalid or expired reset link. Please request a new password reset.');
          setIsValidToken(false);
          return;
        }

        setIsValidToken(true);
      } catch (err) {
        console.error('Token check error:', err);
        setError('An error occurred while validating your reset link.');
        setIsValidToken(false);
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkToken();
  }, [searchParams]);

  const validatePassword = (): boolean => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    // Check for password strength
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validatePassword()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = searchParams.get('token') || '';
      await resetMutation.mutateAsync({ token, password });

      setSuccess(true);
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      console.error('Password update error:', err);
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestNewReset = () => {
    navigate('/');
    // The user can use the forgot password feature from the auth modal
  };

  // Loading state
  if (isCheckingToken) {
    return (
      <div className="flex justify-center items-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 min-h-screen">
        <div className="bg-white shadow-xl p-8 rounded-3xl w-full max-w-md text-center">
          <div className="flex justify-center items-center bg-emerald-100 mx-auto mb-6 rounded-full w-16 h-16">
            <svg className="w-8 h-8 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h2 className="mb-2 font-semibold text-gray-900 text-xl">Validating Reset Link</h2>
          <p className="text-gray-600">Please wait while we verify your password reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (isValidToken === false) {
    return (
      <div className="flex justify-center items-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 min-h-screen">
        <div className="bg-white shadow-xl p-8 rounded-3xl w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center items-center gap-2 mb-6">
            <div className="flex justify-center items-center bg-emerald-500 rounded-full w-10 h-10">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-xl">CRC Connect</span>
          </div>

          <div className="text-center">
            <div className="flex justify-center items-center bg-red-100 mx-auto mb-6 rounded-full w-16 h-16">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="mb-4 font-bold text-gray-900 text-2xl">Link Expired or Invalid</h2>
            
            <p className="mb-6 text-gray-600">
              {error || 'This password reset link has expired or is invalid. Please request a new one.'}
            </p>

            <button
              onClick={handleRequestNewReset}
              className="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 shadow-lg py-4 rounded-xl w-full font-semibold text-white transition-all duration-300"
            >
              Request New Reset Link
            </button>

            <p className="mt-6 text-gray-500 text-sm">
              Need help?{' '}
              <a href="mailto:support@crcconnect.ng" className="text-emerald-600 hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex justify-center items-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 min-h-screen">
        <div className="bg-white shadow-xl p-8 rounded-3xl w-full max-w-md text-center">
          {/* Logo */}
          <div className="flex justify-center items-center gap-2 mb-6">
            <div className="flex justify-center items-center bg-emerald-500 rounded-full w-10 h-10">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-xl">CRC Connect</span>
          </div>

          <div className="flex justify-center items-center bg-emerald-100 mx-auto mb-6 rounded-full w-16 h-16">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="mb-4 font-bold text-gray-900 text-2xl">Password Updated!</h2>
          
          <p className="mb-6 text-gray-600">
            Your password has been successfully updated. You will be redirected to your dashboard shortly.
          </p>

          <div className="flex justify-center items-center gap-2 text-emerald-600">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="font-medium">Redirecting...</span>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="flex justify-center items-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 min-h-screen">
      <div className="bg-white shadow-xl p-8 rounded-3xl w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center items-center gap-2 mb-6">
          <div className="flex justify-center items-center bg-emerald-500 rounded-full w-10 h-10">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-xl">CRC Connect</span>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center items-center bg-emerald-100 mx-auto mb-4 rounded-full w-16 h-16">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="mb-2 font-bold text-gray-900 text-2xl">Create New Password</h2>
          <p className="text-gray-600">
            Enter a strong password for your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 mb-6 p-4 border border-red-200 rounded-xl text-red-700 text-sm">
            <svg className="flex-shrink-0 mt-0.5 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2 font-medium text-gray-700 text-sm">
              New Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="px-4 py-3 pl-12 border border-gray-200 focus:border-emerald-500 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 w-full transition-all"
                placeholder="Enter new password"
                required
                minLength={8}
              />
              <svg className="top-1/2 left-4 absolute w-5 h-5 text-gray-400 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700 text-sm">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                className="px-4 py-3 pl-12 border border-gray-200 focus:border-emerald-500 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 w-full transition-all"
                placeholder="Confirm new password"
                required
                minLength={8}
              />
              <svg className="top-1/2 left-4 absolute w-5 h-5 text-gray-400 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 p-4 rounded-xl">
            <p className="mb-2 font-medium text-gray-700 text-sm">Password must contain:</p>
            <ul className="space-y-1 text-gray-600 text-sm">
              <li className="flex items-center gap-2">
                <svg className={`w-4 h-4 ${password.length >= 8 ? 'text-emerald-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                At least 8 characters
              </li>
              <li className="flex items-center gap-2">
                <svg className={`w-4 h-4 ${/[A-Z]/.test(password) ? 'text-emerald-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                One uppercase letter
              </li>
              <li className="flex items-center gap-2">
                <svg className={`w-4 h-4 ${/[a-z]/.test(password) ? 'text-emerald-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                One lowercase letter
              </li>
              <li className="flex items-center gap-2">
                <svg className={`w-4 h-4 ${/[0-9]/.test(password) ? 'text-emerald-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                One number
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !password || !confirmPassword}
            className="flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 shadow-emerald-500/30 shadow-lg py-4 rounded-xl w-full font-semibold text-white transition-all duration-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Updating Password...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Update Password
              </>
            )}
          </button>
        </form>

        {/* Back to Login */}
        <p className="mt-6 text-gray-600 text-center">
          Remember your password?{' '}
          <button
            onClick={() => navigate('/')}
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
