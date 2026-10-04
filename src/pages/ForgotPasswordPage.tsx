import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Shield,
  Key,
} from "lucide-react";
import { supabaseClient, initializeUrlAuthSession, APP_VERSION } from "../lib/supabaseClient";
import { useColorMode } from "../theme/AppTheme";
import { devLog } from "../lib/devLogger";
import { SystemTestingBanner } from "../components/common/SystemTestingBanner";
import { Button, buttonVariants } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";
import { cn } from "../lib/utils";

const OTP_LENGTH = 8;

/**
 * Masks an email for privacy (e.g. user@powerforecast.ph -> u***@powerforecast.ph)
 */
function maskEmail(emailStr: string): string {
  if (!emailStr) return "your email";
  const parts = emailStr.split("@");
  if (parts.length !== 2) return emailStr;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}${"*".repeat(Math.min(local.length - 2, 4))}${last}@${domain}`;
}

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === "dark";

  // Step states: 'input' | 'verify_code' | 'update_new' | 'success'
  const [step, setStep] = useState<"input" | "verify_code" | "update_new" | "success">("input");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 8-digit OTP input states
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Check URL query parameters, double-hash recovery tokens, or Supabase PASSWORD_RECOVERY event
  useEffect(() => {
    let isMounted = true;

    const syncAuthSession = async () => {
      const urlHasTokens =
        window.location.href.includes("access_token=") ||
        window.location.href.includes("code=") ||
        window.location.href.includes("type=recovery") ||
        searchParams.get("mode") === "update" ||
        window.location.hash.includes("mode=update");

      if (urlHasTokens) {
        devLog.info("Auth", "Password recovery token or update mode detected in URL. Initializing session...");
        setIsLoading(true);
        const { hasSession } = await initializeUrlAuthSession();
        if (!isMounted) return;
        setIsLoading(false);

        if (hasSession) {
          devLog.info("Auth", "Supabase recovery session successfully validated.");
          setStep("update_new");
          setErrorMessage(null);
        } else if (searchParams.get("mode") === "update" || window.location.hash.includes("mode=update")) {
          setStep("update_new");
        }
      }
    };

    syncAuthSession();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      devLog.info("Auth", `onAuthStateChange event: ${event}`, { hasSession: Boolean(session) });
      if (
        event === "PASSWORD_RECOVERY" ||
        (event === "SIGNED_IN" && (searchParams.get("mode") === "update" || window.location.hash.includes("mode=update")))
      ) {
        devLog.info("Auth", "Supabase PASSWORD_RECOVERY or signed-in event received.");
        setStep("update_new");
        setErrorMessage(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [searchParams]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // ── Step 1: Send Password Reset Code via Supabase SMTP ──
  const handleSendResetEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    setIsLoading(true);
    try {
      devLog.info("Auth", `Dispatching 8-digit password reset OTP via Supabase SMTP to ${trimmedEmail}`);
      const { error } = await supabaseClient.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/#/forgot-password?mode=update`,
      });

      if (error) {
        throw error;
      }

      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setStep("verify_code");
      setResendCooldown(60);

      // Focus first OTP input slot after rendering
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      devLog.error("Auth", "Failed to dispatch reset code:", err);
      setErrorMessage(err?.message || "Failed to send password reset code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP Digit Input Handlers (8 slots) ──
  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of full or partial code
    if (value.length > 1) {
      const cleanDigits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (cleanDigits.length > 0) {
        const updated = [...otpDigits];
        for (let i = 0; i < OTP_LENGTH; i++) {
          updated[i] = cleanDigits[i] || "";
        }
        setOtpDigits(updated);
        const nextIndex = Math.min(cleanDigits.length, OTP_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
        return;
      }
    }

    // Single digit input
    const cleanChar = value.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = cleanChar;
    setOtpDigits(updated);

    if (cleanChar && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    const digitsOnly = pastedData.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digitsOnly) return;

    const updated = [...otpDigits];
    for (let i = 0; i < OTP_LENGTH; i++) {
      updated[i] = digitsOnly[i] || "";
    }
    setOtpDigits(updated);
    const targetIdx = Math.min(digitsOnly.length, OTP_LENGTH - 1);
    inputRefs.current[targetIdx]?.focus();
  };

  const fullCode = otpDigits.join("");
  const isCodeComplete = fullCode.length === OTP_LENGTH;
  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;

  // ── Step 2: Strictly Verify OTP Code & Update Password ──
  const handleVerifyOtpAndUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isCodeComplete) {
      setErrorMessage(`Please enter the complete ${OTP_LENGTH}-digit confirmation code from your email.`);
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage("Please enter and confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify and try again.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      devLog.info("Auth", `Strictly verifying ${OTP_LENGTH}-digit OTP [${fullCode}] for ${trimmedEmail}...`);

      // 1. Strict Verification via Supabase verifyOtp
      const { data: otpData, error: otpErr } = await supabaseClient.auth.verifyOtp({
        email: trimmedEmail,
        token: fullCode,
        type: "recovery",
      });

      if (otpErr || !otpData?.session) {
        devLog.error("Auth", "OTP verification rejected by Supabase:", otpErr);
        throw otpErr || new Error("Invalid or expired verification code. Please check your email and try again.");
      }

      devLog.info("Auth", "OTP verified successfully. Updating user password...");

      // 2. Apply new password
      const { error: updateErr } = await supabaseClient.auth.updateUser({
        password: newPassword.trim(),
      });

      if (updateErr) {
        throw updateErr;
      }

      devLog.info("Auth", "Password successfully updated via OTP verification!");
      setStep("success");
    } catch (err: any) {
      devLog.error("Auth", "Failed to verify OTP or update password:", err);
      setErrorMessage(err?.message || "Invalid or expired verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Direct Link Fallback: Update Password with Active Token Session ──
  const handleUpdatePasswordWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage("Please enter and confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify and try again.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      devLog.info("Auth", "Verifying active Supabase session before password update...");
      let { data: sessionData } = await supabaseClient.auth.getSession();

      if (!sessionData?.session) {
        devLog.warn("Auth", "No active session in memory, attempting to restore from URL tokens...");
        const recoveryResult = await initializeUrlAuthSession();
        if (recoveryResult.hasSession) {
          const refreshed = await supabaseClient.auth.getSession();
          sessionData = refreshed.data;
        }
      }

      if (!sessionData?.session) {
        throw new Error(
          "Your password reset link is invalid or has expired. Please enter the 8-digit verification code sent to your email or request a new one."
        );
      }

      devLog.info("Auth", "Updating user password via Supabase recovery session...");
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) {
        throw error;
      }

      devLog.info("Auth", "Password successfully updated via email token!");
      setStep("success");
    } catch (err: any) {
      devLog.error("Auth", "Failed to update password via email token:", err);
      const rawMsg = err?.message || "";
      if (rawMsg.toLowerCase().includes("auth session missing") || rawMsg.toLowerCase().includes("session")) {
        setErrorMessage(
          "Your password reset session has expired or is invalid. Please enter your email to receive a fresh verification code."
        );
      } else {
        setErrorMessage(rawMsg || "Failed to update password. The reset link may have expired.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pf-auth flex min-h-screen flex-col justify-between bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* 1. Sticky Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 px-4 backdrop-blur md:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-90"
          >
            <img src="/Assets/LOGO.png" alt="PowerForecast Logo" className="h-7 w-7 object-contain" />
            <span className="text-base font-bold tracking-tight sm:text-lg">PowerForecast</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleColorMode}
              aria-label={`Switch to ${isDark ? "Light" : "Dark"} mode`}
              className="text-muted-foreground hover:text-foreground"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Link
              to="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground hover:text-foreground")}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. System Testing Banner Strip */}
      <SystemTestingBanner variant="auth" />

      {/* 3. Centered Main Auth Card */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <Card className="w-full max-w-[500px] border-border bg-card/95 shadow-xl backdrop-blur-sm">
          {/* STEP 1: REQUEST RESET CODE */}
          {step === "input" && (
            <>
              <CardHeader className="space-y-2 pb-6 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/60 text-foreground shadow-xs">
                  <KeyRound className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Reset Your Password
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                  We'll send an 8-digit verification code to your registered email address
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold text-foreground">
                      Registered Email Address <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@powerforecast.ph"
                        className="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full font-semibold shadow-xs"
                    size="lg"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Dispatching 8-Digit Code...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Send className="h-4 w-4" />
                        <span>Send 8-Digit Verification Code</span>
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-border/60 pt-4 pb-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </CardFooter>
            </>
          )}

          {/* STEP 2: 8-DIGIT CODE VERIFICATION & SET NEW PASSWORD */}
          {step === "verify_code" && (
            <>
              <CardHeader className="space-y-2 pb-5 text-center">
                <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/60 text-foreground shadow-xs">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-muted text-foreground border border-border mx-auto mb-1">
                  <span>Step 2: 8-Digit Verification</span>
                </div>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Enter 8-Digit Confirmation Code
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                  We dispatched an 8-digit security code to your registered email address:
                </CardDescription>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold bg-muted/80 text-foreground border border-border/70 mx-auto">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{maskEmail(email)}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {errorMessage && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtpAndUpdatePassword} className="space-y-5">
                  {/* 8-Digit OTP Boxes */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-center block text-foreground">
                      Confirmation Code (8 Digits) <span className="text-destructive">*</span>
                    </label>
                    <div className="flex justify-center items-center gap-1 sm:gap-2">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (inputRefs.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={8}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          onPaste={handlePaste}
                          disabled={isLoading}
                          aria-label={`Digit ${idx + 1}`}
                          className="h-11 w-9 sm:h-12 sm:w-11 rounded-lg border border-input bg-background/50 text-center text-lg sm:text-xl font-extrabold font-mono text-foreground shadow-xs transition-all focus:border-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                        />
                      ))}
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="newPassword" className="text-xs font-semibold text-foreground">
                      New Password (min 6 characters) <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-10 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                      Confirm New Password <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(
                          "h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-10 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          !passwordsMatch && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {!passwordsMatch && (
                      <p className="text-[11px] font-medium text-destructive">Passwords do not match.</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !isCodeComplete || newPassword.length < 6 || !passwordsMatch}
                    className="w-full font-semibold shadow-xs"
                    size="lg"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Verifying Code & Updating Password...</span>
                      </span>
                    ) : (
                      <span>Confirm & Update Password</span>
                    )}
                  </Button>
                </form>

                {/* Resend Code and Back Options */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("input");
                      setErrorMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Edit Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendResetEmail()}
                    disabled={resendCooldown > 0 || isLoading}
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                    <span>{resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "Resend Code"}</span>
                  </button>
                </div>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-border/60 pt-3 pb-3 text-[11px] text-muted-foreground text-center">
                Prefer an email link instead? You can also click the direct confirmation link sent to your email.
              </CardFooter>
            </>
          )}

          {/* STEP 3: UPDATE NEW PASSWORD (FROM DIRECT LINK / TOKEN) */}
          {step === "update_new" && (
            <>
              <CardHeader className="space-y-2 pb-6 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/60 text-foreground shadow-xs">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Choose New Password
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                  Email verification successful. Enter your new password below.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePasswordWithToken} className="space-y-4">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="newPassword" className="text-xs font-semibold text-foreground">
                      New Password <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-10 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                      Confirm New Password <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(
                          "h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-10 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          !passwordsMatch && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {!passwordsMatch && (
                      <p className="text-[11px] font-medium text-destructive">Passwords do not match.</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !passwordsMatch || newPassword.length < 6}
                    className="w-full font-semibold shadow-xs"
                    size="lg"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Saving New Password...</span>
                      </span>
                    ) : (
                      <span>Set New Password</span>
                    )}
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-border/60 pt-4 pb-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </CardFooter>
            </>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "success" && (
            <>
              <CardHeader className="space-y-3 pb-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 animate-in zoom-in-75">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Password Reset Complete!
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground sm:text-sm leading-relaxed max-w-sm mx-auto">
                  Your account password has been successfully updated. You can now sign in with your new credentials.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <Button
                  size="lg"
                  className="w-full font-semibold shadow-xs"
                  onClick={() => navigate("/login")}
                >
                  <span>Continue to Sign In</span>
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-border/60 pt-4 pb-4 text-[11px] text-muted-foreground">
                PowerForecast Account Security
              </CardFooter>
            </>
          )}
        </Card>
      </main>

      {/* 4. Minimal Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PowerForecast • Version {APP_VERSION}
      </footer>
    </div>
  );
};

export default ForgotPasswordPage;
