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

type AuthMode = "reauth" | "recovery";
type Step = "input" | "verify" | "success";

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
  const [authMode, setAuthMode] = useState<AuthMode>("reauth");

  // Inputs
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // OTP inputs (6 individual digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
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

  // ── Step 1: Initiate Password Change & Dispatch Confirmation Code ──
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

      // 1. Verify current password
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

      // 2. Dispatch OTP / confirmation code to user's email
      devLog.info("Auth", `Dispatching password change verification code to ${emailToUse}`);
      let mode: AuthMode = "reauth";

      try {
        const { error: reauthErr } = await supabaseClient.auth.reauthenticate();
        if (reauthErr) {
          devLog.warn("Auth", "reauthenticate() returned error, falling back to reset OTP:", reauthErr.message);
          const { error: resetErr } = await supabaseClient.auth.resetPasswordForEmail(emailToUse);
          if (resetErr) throw resetErr;
          mode = "recovery";
        } else {
          mode = "reauth";
        }
      } catch (innerErr: any) {
        devLog.info("Auth", "Using fallback OTP dispatch via resetPasswordForEmail", innerErr?.message);
        const { error: fallbackErr } = await supabaseClient.auth.resetPasswordForEmail(emailToUse);
        if (fallbackErr) throw fallbackErr;
        mode = "recovery";
      }

      setAuthMode(mode);
      setOtpDigits(["", "", "", "", "", ""]);
      setCooldown(60);
      setStep("verify");

      showInfo(
        language === "tl"
          ? `Ipinadala ang 6-digit na verification code sa ${maskEmail(emailToUse)}.`
          : `A 6-digit verification code was sent to ${maskEmail(emailToUse)}.`,
        language === "tl" ? "Ipinadala ang Code" : "Code Dispatched"
      );

      // Focus first OTP input after transition
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

  // ── OTP Digit Input Handlers ──
  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of full or partial code
    if (value.length > 1) {
      const cleanDigits = value.replace(/\D/g, "").slice(0, 6);
      if (cleanDigits.length > 0) {
        const updated = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          updated[i] = cleanDigits[i] || "";
        }
        setOtpDigits(updated);
        const nextIndex = Math.min(cleanDigits.length, 5);
        inputRefs.current[nextIndex]?.focus();
        return;
      }
    }

    // Single digit input
    const cleanChar = value.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = cleanChar;
    setOtpDigits(updated);

    if (cleanChar && index < 5) {
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
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    const digitsOnly = pastedData.replace(/\D/g, "").slice(0, 6);
    if (!digitsOnly) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = digitsOnly[i] || "";
    }
    setOtpDigits(updated);
    const targetIdx = Math.min(digitsOnly.length, 5);
    inputRefs.current[targetIdx]?.focus();
  };

  const fullCode = otpDigits.join("");
  const isCodeComplete = fullCode.length === 6;

  // ── Step 2: Confirm OTP & Commit Password Update ──
  const handleConfirmCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (fullCode.length !== 6) {
      setErrorMessage(
        language === "tl"
          ? "Pakilagay ang kumpletong 6-digit na confirmation code."
          : "Please enter the complete 6-digit confirmation code."
      );
      return;
    }

    setIsVerifyingCode(true);
    try {
      const emailToUse = resolvedEmail;
      devLog.info("Auth", `Verifying OTP [${fullCode}] in mode [${authMode}]...`);

      if (authMode === "reauth") {
        // Mode 1: Supabase reauthentication nonce
        const { error: updateErr } = await supabaseClient.auth.updateUser({
          password: newPassword.trim(),
          nonce: fullCode,
        });

        if (updateErr) {
          devLog.warn("Auth", "Reauth nonce update failed, trying OTP recovery fallback:", updateErr.message);
          // Fallback: verify OTP as recovery token
          const { error: otpErr } = await supabaseClient.auth.verifyOtp({
            email: emailToUse,
            token: fullCode,
            type: "recovery",
          });

          if (otpErr) throw otpErr;

          const { error: finalUpdateErr } = await supabaseClient.auth.updateUser({
            password: newPassword.trim(),
          });
          if (finalUpdateErr) throw finalUpdateErr;
        }
      } else {
        // Mode 2: Supabase recovery OTP verification
        const { error: otpErr } = await supabaseClient.auth.verifyOtp({
          email: emailToUse,
          token: fullCode,
          type: "recovery",
        });

        if (otpErr) throw otpErr;

        const { error: updateErr } = await supabaseClient.auth.updateUser({
          password: newPassword.trim(),
        });
        if (updateErr) throw updateErr;
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
      devLog.error("Auth", "Failed to confirm password update with code:", err);
      setErrorMessage(
        err?.message ||
          (language === "tl"
            ? "Maling verification code o nag-expire na ito. Pakisuri at subukan muli."
            : "Invalid or expired verification code. Please check your email and try again.")
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
      devLog.info("Auth", `Resending verification code to ${resolvedEmail}`);
      if (authMode === "reauth") {
        const { error } = await supabaseClient.auth.reauthenticate();
        if (error) {
          await supabaseClient.auth.resetPasswordForEmail(resolvedEmail);
        }
      } else {
        await supabaseClient.auth.resetPasswordForEmail(resolvedEmail);
      }

      setCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      showInfo(
        language === "tl"
          ? "Ipinadala muli ang bagong verification code sa iyong email."
          : "A new verification code has been dispatched to your email.",
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
    setOtpDigits(["", "", "", "", "", ""]);
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
                : "Step 2: Code Verification"
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
                ? `Para sa karagdagang proteksyon ng account, may ipapadalang 6-digit na verification code sa ${maskEmail(
                    resolvedEmail
                  )} bago ilapat ang pagbabago.`
                : `For account security, a 6-digit verification code will be sent to ${maskEmail(
                    resolvedEmail
                  )} before updating your credentials.`}
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

      {/* ── STEP 2: CODE VERIFICATION ── */}
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
              {language === "tl" ? "Ilagay ang Confirmation Code" : "Enter Confirmation Code"}
            </Typography>

            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420, mb: 1.5 }}>
              {language === "tl"
                ? "Ipinadala namin ang 6-digit na verification code sa iyong email:"
                : "We dispatched a 6-digit security code to your registered email address:"}
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

          {/* 6-box OTP digits */}
          <Box
            sx={{
              display: "flex",
              gap: { xs: 0.75, sm: 1.25 },
              justifyContent: "center",
              mb: 2.5,
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
                maxLength={6}
                value={digit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={isVerifyingCode}
                sx={{
                  width: { xs: 40, sm: 46 },
                  height: { xs: 46, sm: 52 },
                  fontSize: { xs: "1.25rem", sm: "1.4rem" },
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
                  : "Confirming & Updating..."
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
              : "Your master password has been securely updated with verified confirmation. Use your new password the next time you sign in to PowerForecast."}
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
