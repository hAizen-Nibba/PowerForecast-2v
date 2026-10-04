import React, { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import {
  Lock as LockIcon,
  Shield as ShieldIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
  Key as KeyIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Security as SecurityIcon,
  LockReset as LockResetIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import confetti from "canvas-confetti";
import { supabaseClient } from "../../lib/supabaseClient";
import { useToast } from "../common/ToastProvider";
import { useLanguage } from "../../context/LanguageContext";
import { devLog } from "../../lib/devLogger";

interface ChangePasswordCardProps {
  userEmail?: string;
}

type Step = "input" | "verify" | "success";

const OTP_LENGTH = 8;

/**
 * Masks an email for privacy (e.g. john.doe@gmail.com -> j***e@gmail.com)
 */
function maskEmail(email?: string): string {
  if (!email) return "your registered email";
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}${"*".repeat(Math.min(local.length - 2, 4))}${last}@${domain}`;
}

/**
 * Calculates simple password strength score (0-4)
 */
function calculatePasswordStrength(pass: string): {
  score: number;
  labelEn: string;
  labelTl: string;
  color: string;
  hasLength: boolean;
  hasMixedCase: boolean;
  hasNumberOrSpecial: boolean;
} {
  const hasLength = pass.length >= 6;
  const hasMixedCase = /[a-z]/.test(pass) && /[A-Z]/.test(pass);
  const hasNumberOrSpecial = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass);
  const hasLongLength = pass.length >= 8;

  let score = 0;
  if (pass.length > 0) score += 1;
  if (hasLength) score += 1;
  if (hasMixedCase) score += 1;
  if (hasNumberOrSpecial && hasLongLength) score += 1;

  if (score <= 1) {
    return { score: 1, labelEn: "Weak", labelTl: "Mahina", color: "#ef4444", hasLength, hasMixedCase, hasNumberOrSpecial };
  } else if (score === 2) {
    return { score: 2, labelEn: "Fair", labelTl: "Katamtaman", color: "#f59e0b", hasLength, hasMixedCase, hasNumberOrSpecial };
  } else if (score === 3) {
    return { score: 3, labelEn: "Good", labelTl: "Mabuti", color: "#06b6d4", hasLength, hasMixedCase, hasNumberOrSpecial };
  }
  return { score: 4, labelEn: "Strong", labelTl: "Matatag", color: "#10b981", hasLength, hasMixedCase, hasNumberOrSpecial };
}

export const ChangePasswordCard: React.FC<ChangePasswordCardProps> = ({ userEmail: propEmail }) => {
  const { language } = useLanguage();
  const { showSuccess, showInfo } = useToast();

  // Active user email state
  const [resolvedEmail, setResolvedEmail] = useState<string>(propEmail || "");

  useEffect(() => {
    if (!propEmail) {
      // Auto-detect from active Supabase session
      supabaseClient.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setResolvedEmail(data.user.email);
        }
      });
    }
  }, [propEmail]);

  // Step state
  const [step, setStep] = useState<Step>("input");

  // Inputs
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // OTP inputs (8 individual digits matching Supabase OTP length)
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const passwordsMatch = !confirmNewPassword || newPassword === confirmNewPassword;
  const strength = calculatePasswordStrength(newPassword);

  // ── Step 1: Initiate Password Change & Dispatch 8-Digit Confirmation Code ──
  const handleInitiateChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmNewPassword.trim();

    if (!trimmedCurrent || !trimmedNew || !trimmedConfirm) {
      setErrorMessage(
        language === "tl"
          ? "Pakipunan ang lahat ng field para sa pagpapalit ng password."
          : "Please fill in all password fields."
      );
      return;
    }

    if (trimmedNew.length < 6) {
      setErrorMessage(
        language === "tl"
          ? "Dapat ay may hindi bababa sa 6 na character ang bagong password."
          : "New password must be at least 6 characters long."
      );
      return;
    }

    if (trimmedNew === trimmedCurrent) {
      setErrorMessage(
        language === "tl"
          ? "Dapat ay magkaiba ang bagong password sa iyong kasalukuyang password."
          : "New password cannot be identical to your current password."
      );
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setErrorMessage(
        language === "tl"
          ? "Hindi nagtutugma ang bagong password at kumpirmasyon."
          : "New passwords do not match."
      );
      return;
    }

    // Determine target email
    let emailToUse = resolvedEmail;
    if (!emailToUse) {
      const { data } = await supabaseClient.auth.getUser();
      emailToUse = data?.user?.email || "";
      if (emailToUse) setResolvedEmail(emailToUse);
    }

    if (!emailToUse) {
      setErrorMessage(
        language === "tl"
          ? "Hindi mahanap ang aktibong email ng user."
          : "Could not detect active user email address."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      devLog.info("Auth", "Verifying current password before dispatching confirmation code...");

      // 1. Verify current password credentials
      const { error: authErr } = await supabaseClient.auth.signInWithPassword({
        email: emailToUse,
        password: trimmedCurrent,
      });

      if (authErr) {
        setErrorMessage(
          language === "tl"
            ? "Maling kasalukuyang password. Pakisuri at subukang muli."
            : "Current password is incorrect. Please verify and try again."
        );
        setIsSubmitting(false);
        return;
      }

      // 2. Dispatch 8-digit OTP recovery code directly via Supabase Auth
      devLog.info("Auth", `Dispatching 8-digit password recovery code to ${emailToUse}`);
      const { error: resetErr } = await supabaseClient.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: `${window.location.origin}/#/forgot-password?mode=update`,
      });
      if (resetErr) {
        throw resetErr;
      }

      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setCooldown(60);
      setStep("verify");

      showInfo(
        language === "tl"
          ? `Ipinadala ang 8-digit na verification code sa ${maskEmail(emailToUse)}.`
          : `An 8-digit verification code was sent to ${maskEmail(emailToUse)}.`,
        language === "tl" ? "Ipinadala ang Code" : "Code Dispatched"
      );

      // Focus first OTP input slot after transition
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      devLog.error("Auth", "Failed to initiate password verification:", err);
      setErrorMessage(
        err?.message ||
          (language === "tl"
            ? "Nabigong ipadala ang verification code. Pakisubukan muli mamaya."
            : "Failed to dispatch verification code. Please try again later.")
      );
    } finally {
      setIsSubmitting(false);
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

  // ── Step 2: Strictly Verify OTP Code with Supabase & Apply Password Update ──
  const handleConfirmCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (fullCode.length !== OTP_LENGTH) {
      setErrorMessage(
        language === "tl"
          ? `Pakilagay ang kumpletong ${OTP_LENGTH}-digit na confirmation code.`
          : `Please enter the complete ${OTP_LENGTH}-digit confirmation code.`
      );
      return;
    }

    setIsVerifyingCode(true);
    try {
      const emailToUse = resolvedEmail;
      devLog.info("Auth", `Strictly verifying OTP [${fullCode}] against Supabase...`);

      // 1. Strict Verification via Supabase verifyOtp
      // This MUST succeed. If the code is wrong, modified, or expired, verifyOtp WILL return an error.
      const { data: otpData, error: otpErr } = await supabaseClient.auth.verifyOtp({
        email: emailToUse,
        token: fullCode,
        type: "recovery",
      });

      if (otpErr || !otpData?.session) {
        devLog.error("Auth", "OTP verification rejected by Supabase:", otpErr);
        setErrorMessage(
          otpErr?.message ||
            (language === "tl"
              ? "Maling verification code o nag-expire na ito. Pakisuri ang iyong email at subukang muli."
              : "Invalid or expired verification code. Please check your email and try again.")
        );
        setIsVerifyingCode(false);
        // CRITICAL: Stop immediately! Do not update password if code is invalid!
        return;
      }

      devLog.info("Auth", "OTP verified successfully. Applying new password...");

      // 2. Only after strict verification succeeds, update user's password
      const { error: updateErr } = await supabaseClient.auth.updateUser({
        password: newPassword.trim(),
      });

      if (updateErr) {
        throw updateErr;
      }

      // Success celebration!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });

      showSuccess(
        language === "tl"
          ? "Matagumpay na pinalitan ang iyong password!"
          : "Password successfully updated!",
        language === "tl" ? "Na-update ang Password" : "Password Changed"
      );

      setStep("success");
    } catch (err: any) {
      devLog.error("Auth", "Failed to update password:", err);
      setErrorMessage(
        err?.message ||
          (language === "tl"
            ? "Maling verification code o nabigong palitan ang password."
            : "Invalid verification code or failed to update password.")
      );
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // ── Resend Code ──
  const handleResendCode = async () => {
    if (cooldown > 0 || isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      devLog.info("Auth", `Resending 8-digit verification code to ${resolvedEmail}`);
      const { error } = await supabaseClient.auth.resetPasswordForEmail(resolvedEmail, {
        redirectTo: `${window.location.origin}/#/forgot-password?mode=update`,
      });
      if (error) throw error;

      setCooldown(60);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      showInfo(
        language === "tl"
          ? "Ipinadala muli ang bagong verification code sa iyong email."
          : "A new 8-digit verification code has been dispatched to your email.",
        language === "tl" ? "Naipadala Muli" : "Code Resent"
      );
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      devLog.error("Auth", "Failed to resend code:", err);
      setErrorMessage(err?.message || "Failed to resend code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Fallback: Direct Email Link Dispatch ──
  const handleSendEmailLinkDirectly = async () => {
    if (isSendingLink) return;
    setErrorMessage(null);
    setIsSendingLink(true);

    try {
      devLog.info("Auth", `Sending direct reset link to ${resolvedEmail}`);
      const { error } = await supabaseClient.auth.resetPasswordForEmail(resolvedEmail, {
        redirectTo: `${window.location.origin}/#/forgot-password?mode=update`,
      });

      if (error) throw error;

      showSuccess(
        language === "tl"
          ? `Ipinadala ang direktang link sa pagpapalit ng password sa ${maskEmail(resolvedEmail)}.`
          : `A direct password confirmation link was emailed to ${maskEmail(resolvedEmail)}.`,
        language === "tl" ? "Naipadala ang Link" : "Link Sent"
      );
    } catch (err: any) {
      devLog.error("Auth", "Failed to send email link:", err);
      setErrorMessage(err?.message || "Failed to send direct email link.");
    } finally {
      setIsSendingLink(false);
    }
  };

  // Reset all fields back to initial step
  const handleResetToInput = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setErrorMessage(null);
    setStep("input");
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: 2,
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "rgba(248, 250, 252, 0.8)",
        border: "1px solid",
        borderColor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* ── CARD HEADER ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LockIcon sx={{ fontSize: 20, color: "primary.main" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {language === "tl" ? "Palitan ang Password" : "Change Login Password"}
          </Typography>
        </Box>
        <Chip
          icon={<ShieldIcon sx={{ fontSize: "14px !important" }} />}
          label={
            step === "verify"
              ? language === "tl"
                ? "Hakbang 2: Kumpirmasyon ng Code"
                : "Step 2: 8-Digit Verification"
              : step === "success"
              ? language === "tl"
                ? "Tapos Na"
                : "Verified"
              : language === "tl"
              ? "May Email Confirmation"
              : "Email Verified"
          }
          size="small"
          color={step === "success" ? "success" : "primary"}
          variant={step === "verify" ? "filled" : "outlined"}
          sx={{
            height: 24,
            fontSize: "0.7rem",
            fontWeight: 700,
          }}
        />
      </Box>

      {/* ── ERROR ALERT ── */}
      {errorMessage && (
        <Alert
          severity="error"
          onClose={() => setErrorMessage(null)}
          sx={{ mb: 2, borderRadius: 1.5, py: 0.5, fontSize: "0.85rem" }}
        >
          {errorMessage}
        </Alert>
      )}

      {/* ── STEP 1: PASSWORD FORM ── */}
      {step === "input" && (
        <Box component="form" onSubmit={handleInitiateChange}>
          {/* Security notice banner */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.25,
              p: 1.5,
              mb: 2.25,
              borderRadius: 1.5,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.06)",
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(13, 148, 136, 0.2)",
            }}
          >
            <SecurityIcon sx={{ fontSize: 18, color: "primary.main", mt: 0.2 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
              {language === "tl"
                ? `Para sa proteksyon ng iyong account, may ipapadalang 8-digit na verification code sa ${maskEmail(
                    resolvedEmail
                  )} bago opisyal na mapalitan ang iyong password.`
                : `For account security, an 8-digit verification code will be sent to ${maskEmail(
                    resolvedEmail
                  )} before updating your master password.`}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Current Password */}
            <TextField
              type={showCurrentPassword ? "text" : "password"}
              size="small"
              fullWidth
              autoComplete="current-password"
              label={language === "tl" ? "Kasalukuyang Password *" : "Current Password *"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={isSubmitting}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* New Password */}
            <Box>
              <TextField
                type={showNewPassword ? "text" : "password"}
                size="small"
                fullWidth
                autoComplete="new-password"
                label={language === "tl" ? "Bagong Password (min 6 chars) *" : "New Password (min 6 chars) *"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isSubmitting}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          tabIndex={-1}
                        >
                          {showNewPassword ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {/* Password strength bar */}
              {newPassword.length > 0 && (
                <Box sx={{ mt: 1, px: 0.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      {language === "tl" ? "Tibay ng Password:" : "Password Strength:"}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: strength.color, fontSize: "0.72rem" }}
                    >
                      {language === "tl" ? strength.labelTl : strength.labelEn}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(strength.score / 4) * 100}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "#e2e8f0"),
                      "& .MuiLinearProgress-bar": {
                        bgcolor: strength.color,
                        borderRadius: 2,
                      },
                    }}
                  />
                  {/* Subtle checklist */}
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 0.75 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {strength.hasLength ? (
                        <CheckIcon sx={{ fontSize: 13, color: "success.main" }} />
                      ) : (
                        <CloseIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.68rem",
                          color: strength.hasLength ? "text.primary" : "text.secondary",
                        }}
                      >
                        6+ {language === "tl" ? "letra" : "chars"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {strength.hasMixedCase ? (
                        <CheckIcon sx={{ fontSize: 13, color: "success.main" }} />
                      ) : (
                        <CloseIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.68rem",
                          color: strength.hasMixedCase ? "text.primary" : "text.secondary",
                        }}
                      >
                        {language === "tl" ? "May Aa/Zz" : "Upper & lower"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {strength.hasNumberOrSpecial ? (
                        <CheckIcon sx={{ fontSize: 13, color: "success.main" }} />
                      ) : (
                        <CloseIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.68rem",
                          color: strength.hasNumberOrSpecial ? "text.primary" : "text.secondary",
                        }}
                      >
                        {language === "tl" ? "May numero/simbolo" : "Number / symbol"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Confirm New Password */}
            <TextField
              type={showConfirmNewPassword ? "text" : "password"}
              size="small"
              fullWidth
              autoComplete="new-password"
              label={language === "tl" ? "Kumpirmahin ang Bagong Password *" : "Confirm New Password *"}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              error={!passwordsMatch}
              helperText={
                !passwordsMatch
                  ? language === "tl"
                    ? "Hindi nagtutugma ang mga password"
                    : "Passwords do not match"
                  : ""
              }
              required
              disabled={isSubmitting}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        tabIndex={-1}
                      >
                        {showConfirmNewPassword ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* Submit: Send Code */}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={
                isSubmitting ||
                !currentPassword ||
                newPassword.length < 6 ||
                !confirmNewPassword ||
                !passwordsMatch
              }
              startIcon={
                isSubmitting ? <CircularProgress size={16} color="inherit" /> : <KeyIcon />
              }
              sx={{
                mt: 1,
                fontWeight: 700,
                borderRadius: 1.25,
                py: 1,
                letterSpacing: 0.3,
              }}
            >
              {isSubmitting
                ? language === "tl"
                  ? "Pagsusuri at Pagpapadala ng Code..."
                  : "Verifying & Sending Code..."
                : language === "tl"
                ? "I-verify at Ipadala ang Confirmation Code"
                : "Verify & Send Confirmation Code"}
            </Button>
          </Box>
        </Box>
      )}

      {/* ── STEP 2: 8-DIGIT CODE VERIFICATION ── */}
      {step === "verify" && (
        <Box component="form" onSubmit={handleConfirmCode}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              mb: 2.5,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1.5,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.12)",
                color: "primary.main",
              }}
            >
              <EmailIcon sx={{ fontSize: 26 }} />
            </Box>

            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
              {language === "tl" ? "Ilagay ang 8-Digit Confirmation Code" : "Enter 8-Digit Confirmation Code"}
            </Typography>

            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420, mb: 1.5 }}>
              {language === "tl"
                ? "Ipinadala namin ang 8-digit na verification code sa iyong email:"
                : "We dispatched an 8-digit security code to your registered email address:"}
            </Typography>

            <Chip
              icon={<EmailIcon sx={{ fontSize: "16px !important" }} />}
              label={maskEmail(resolvedEmail)}
              size="small"
              sx={{
                fontWeight: 700,
                px: 1,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
              }}
            />
          </Box>

          {/* 8-box OTP digits */}
          <Box
            sx={{
              display: "flex",
              gap: { xs: 0.5, sm: 1 },
              justifyContent: "center",
              mb: 2.5,
              flexWrap: "nowrap",
            }}
          >
            {otpDigits.map((digit, idx) => (
              <Box
                key={idx}
                component="input"
                ref={(el: HTMLInputElement | null) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={digit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={isVerifyingCode}
                sx={{
                  width: { xs: 32, sm: 40, md: 44 },
                  height: { xs: 44, sm: 50 },
                  fontSize: { xs: "1.1rem", sm: "1.3rem" },
                  fontWeight: 800,
                  textAlign: "center",
                  borderRadius: 1.5,
                  border: "1.5px solid",
                  borderColor: digit
                    ? "primary.main"
                    : (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.16)"
                          : "rgba(0, 0, 0, 0.16)",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? digit
                        ? "rgba(0, 229, 201, 0.08)"
                        : "rgba(255, 255, 255, 0.04)"
                      : digit
                      ? "rgba(13, 148, 136, 0.05)"
                      : "#ffffff",
                  color: "text.primary",
                  fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace",
                  outline: "none",
                  transition: "all 0.15s ease",
                  "&:focus": {
                    borderColor: "primary.main",
                    boxShadow: (theme) =>
                      `0 0 0 3px ${
                        theme.palette.mode === "dark"
                          ? "rgba(0, 229, 201, 0.25)"
                          : "rgba(13, 148, 136, 0.2)"
                      }`,
                  },
                }}
              />
            ))}
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!isCodeComplete || isVerifyingCode}
              startIcon={
                isVerifyingCode ? <CircularProgress size={16} color="inherit" /> : <LockResetIcon />
              }
              sx={{
                fontWeight: 700,
                borderRadius: 1.25,
                py: 1,
              }}
            >
              {isVerifyingCode
                ? language === "tl"
                  ? "Kinukumpirma ang Password..."
                  : "Verifying Code & Updating Password..."
                : language === "tl"
                ? "Kumpirmahin at I-update ang Password"
                : "Confirm & Update Password"}
            </Button>

            {/* Resend & Back actions */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
                pt: 1,
              }}
            >
              <Button
                variant="text"
                size="small"
                startIcon={<ArrowBackIcon fontSize="small" />}
                onClick={() => setStep("input")}
                disabled={isVerifyingCode}
                sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.8rem" }}
              >
                {language === "tl" ? "Bumalik sa Pag-edit" : "Back to Edit"}
              </Button>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {cooldown > 0 ? (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    {language === "tl"
                      ? `Ipadala muli sa ${cooldown}s`
                      : `Resend code in ${cooldown}s`}
                  </Typography>
                ) : (
                  <Button
                    variant="text"
                    size="small"
                    startIcon={
                      isSubmitting ? (
                        <CircularProgress size={12} color="inherit" />
                      ) : (
                        <RefreshIcon fontSize="small" />
                      )
                    }
                    onClick={handleResendCode}
                    disabled={isSubmitting || isVerifyingCode}
                    sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                  >
                    {language === "tl" ? "Ipadala Muli ang Code" : "Resend Code"}
                  </Button>
                )}
              </Box>
            </Box>

            {/* Direct Email Link Fallback */}
            <Box
              sx={{
                pt: 1.5,
                borderTop: "1px dashed",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {language === "tl"
                  ? "Walang natanggap na code?"
                  : "Prefer an email link instead?"}
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={handleSendEmailLinkDirectly}
                disabled={isSendingLink || isVerifyingCode}
                startIcon={
                  isSendingLink ? (
                    <CircularProgress size={12} color="inherit" />
                  ) : (
                    <SendIcon sx={{ fontSize: 13 }} />
                  )
                }
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  p: 0.5,
                }}
              >
                {isSendingLink
                  ? language === "tl"
                    ? "Ipinapadala ang Link..."
                    : "Sending Link..."
                  : language === "tl"
                  ? "Ipadala ang Link sa Email"
                  : "Send Confirmation Link to Email"}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── STEP 3: SUCCESS CONFIRMATION ── */}
      {step === "success" && (
        <Box
          sx={{
            py: 2.5,
            px: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.18)" : "rgba(16, 185, 129, 0.12)",
              color: "success.main",
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 36 }} />
          </Box>

          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
            {language === "tl"
              ? "Matagumpay na Pinalitan ang Password!"
              : "Password Successfully Updated!"}
          </Typography>

          <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420, mb: 3 }}>
            {language === "tl"
              ? "Ang iyong login password ay opisyal nang na-update sa tulong ng email verification. Gamitin ang iyong bagong password sa susunod mong pag-log in."
              : "Your master password has been securely updated with verified email confirmation. Use your new password the next time you sign in to PowerForecast."}
          </Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={handleResetToInput}
            sx={{ fontWeight: 700, borderRadius: 1.25, px: 4, py: 1 }}
          >
            {language === "tl" ? "Tapos Na" : "Done"}
          </Button>
        </Box>
      )}
    </Paper>
  );
};
