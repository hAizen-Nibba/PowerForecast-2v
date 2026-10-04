import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import {
  LockReset as LockResetIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import confetti from "canvas-confetti";
import { supabaseClient } from "../../lib/supabaseClient";
import { useToast } from "./ToastProvider";
import { useLanguage } from "../../context/LanguageContext";
import { devLog } from "../../lib/devLogger";

/**
 * Calculates password strength (0-4)
 */
function calculateStrength(pass: string): {
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

/**
 * Global modal that pops up whenever a user arrives via an email password reset link
 * (detected via PASSWORD_RECOVERY auth event or URL type=recovery token).
 */
export const PasswordRecoveryModal: React.FC = () => {
  const { language } = useLanguage();
  const { showSuccess } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Listen to Supabase auth events & URL parameters for password recovery
  useEffect(() => {
    const checkRecoveryContext = () => {
      const href = window.location.href;
      const isRecoveryInUrl =
        href.includes("type=recovery") ||
        href.includes("mode=update") ||
        href.includes("action=reset-password");

      if (isRecoveryInUrl) {
        devLog.info("Auth", "PasswordRecoveryModal detected recovery token in URL:", href);
        setIsOpen(true);
        supabaseClient.auth.getUser().then(({ data }) => {
          if (data?.user?.email) setUserEmail(data.user.email);
        });
      }
    };

    checkRecoveryContext();

    // Listen to Supabase onAuthStateChange for PASSWORD_RECOVERY
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      devLog.info("Auth", `PasswordRecoveryModal auth event: ${event}`);
      if (event === "PASSWORD_RECOVERY") {
        setIsOpen(true);
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        } else {
          const { data } = await supabaseClient.auth.getUser();
          if (data?.user?.email) setUserEmail(data.user.email);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const strength = calculateStrength(newPassword);
  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;

  const handleClose = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    // Clean URL query and hash parameters to prevent reopening
    try {
      const cleanUrl = window.location.href
        .replace(/[?&]mode=update/, "")
        .replace(/[?&]action=reset-password/, "")
        .replace(/#type=recovery[^&]*/, "")
        .replace(/[#&?]access_token=[^&]*/, "")
        .replace(/[#&?]type=recovery[^&]*/, "");
      window.history.replaceState(null, "", cleanUrl);
    } catch {
      // Ignore URL cleanup errors
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew || !trimmedConfirm) {
      setErrorMessage(
        language === "tl"
          ? "Pakipunan ang lahat ng field para sa bagong password."
          : "Please enter and confirm your new password."
      );
      return;
    }

    if (trimmedNew.length < 6) {
      setErrorMessage(
        language === "tl"
          ? "Dapat ay may hindi bababa sa 6 na character ang bagong password."
          : "Password must be at least 6 characters long."
      );
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setErrorMessage(
        language === "tl"
          ? "Hindi nagtutugma ang mga password. Pakisuri at subukang muli."
          : "Passwords do not match. Please verify and try again."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      devLog.info("Auth", "Updating user password via PasswordRecoveryModal...");
      const { error } = await supabaseClient.auth.updateUser({
        password: trimmedNew,
      });

      if (error) throw error;

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });

      showSuccess(
        language === "tl"
          ? "Matagumpay na pinalitan ang iyong password!"
          : "Your password has been successfully updated!",
        language === "tl" ? "Na-update ang Password" : "Password Changed"
      );

      setIsSuccess(true);
    } catch (err: any) {
      devLog.error("Auth", "Failed to update password in PasswordRecoveryModal:", err);
      setErrorMessage(
        err?.message ||
          (language === "tl"
            ? "Nabigong i-update ang password. Maaaring nag-expire na ang link."
            : "Failed to update password. The recovery session may have expired.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2.5,
            p: 1,
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)",
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.12)",
                color: "primary.main",
              }}
            >
              <LockResetIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {language === "tl" ? "Bagong Password" : "Set New Password"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {language === "tl" ? "Email Link Verification" : "Email Link Verified"}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={handleClose} disabled={isSubmitting}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 1, pb: 2 }}>
        {isSuccess ? (
          <Box sx={{ py: 3, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <CheckCircleIcon sx={{ fontSize: 52, color: "success.main", mb: 1.5 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              {language === "tl" ? "Matagumpay na Na-update!" : "Password Updated!"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 3, maxWidth: 320 }}>
              {language === "tl"
                ? "Ligtas nang na-update ang password ng iyong account. Maaari mo na itong gamitin sa susunod mong pag-login."
                : "Your password has been successfully updated. You can now use your new password across all devices."}
            </Typography>
            <Button variant="contained" color="primary" fullWidth onClick={handleClose} sx={{ fontWeight: 700, py: 1 }}>
              {language === "tl" ? "Magpatuloy sa Dashboard" : "Continue to Dashboard"}
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleUpdatePassword} id="password-recovery-form">
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, lineHeight: 1.5 }}>
              {language === "tl"
                ? "Pumasok ka gamit ang link sa email. Mangyaring ilagay ang iyong bagong password sa ibaba."
                : "You authenticated via an email password reset link. Please enter your new password below to finalize updating your account."}
            </Typography>

            {userEmail && (
              <Box sx={{ mb: 2 }}>
                <Chip
                  icon={<EmailIcon sx={{ fontSize: "15px !important" }} />}
                  label={userEmail}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                />
              </Box>
            )}

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5, py: 0.5, fontSize: "0.85rem" }}>
                {errorMessage}
              </Alert>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                            {showNewPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                {/* Password strength meter */}
                {newPassword.length > 0 && (
                  <Box sx={{ mt: 1, px: 0.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                        {language === "tl" ? "Tibay ng Password:" : "Password Strength:"}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: strength.color, fontSize: "0.72rem" }}>
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
                        "& .MuiLinearProgress-bar": { bgcolor: strength.color, borderRadius: 2 },
                      }}
                    />
                  </Box>
                )}
              </Box>

              {/* Confirm New Password */}
              <TextField
                type={showConfirmPassword ? "text" : "password"}
                size="small"
                fullWidth
                autoComplete="new-password"
                label={language === "tl" ? "Kumpirmahin ang Bagong Password *" : "Confirm New Password *"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={!passwordsMatch}
                helperText={!passwordsMatch ? (language === "tl" ? "Hindi nagtutugma" : "Passwords do not match") : ""}
                required
                disabled={isSubmitting}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      {!isSuccess && (
        <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0, gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={handleClose} disabled={isSubmitting} sx={{ fontWeight: 600 }}>
            {language === "tl" ? "Kanselahin" : "Cancel"}
          </Button>
          <Button
            type="submit"
            form="password-recovery-form"
            variant="contained"
            color="primary"
            disabled={isSubmitting || newPassword.length < 6 || !confirmPassword || !passwordsMatch}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            sx={{ fontWeight: 700, flex: 1 }}
          >
            {isSubmitting
              ? language === "tl"
                ? "Ina-update..."
                : "Updating..."
              : language === "tl"
              ? "I-save ang Bagong Password"
              : "Update Password"}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
