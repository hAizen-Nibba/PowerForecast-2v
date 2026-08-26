import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import {
  MailOutlined as MailIcon,
  CheckCircleOutlined as CheckCircleIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useColorMode } from "../theme/AppTheme";
import { supabaseClient } from "../lib/supabaseClient";

/** Shared channel name for cross-tab verification communication */
const AUTH_CHANNEL = "powerforecast-auth";

export const VerifyEmailPage: React.FC = () => {
  const { mode } = useColorMode();
  const isDark = mode === "dark";
  const location = useLocation();

  // Extract email from query parameter (e.g. /verify-email?email=user%40example.com)
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get("email") || "your email address";

  const [isVerified, setIsVerified] = useState(false);

  const handleVerified = useCallback(() => {
    setIsVerified(true);
    // Automatically redirect to /login after a brief moment to show success UI
    setTimeout(() => {
      window.location.hash = "#/login";
    }, 2000);
  }, []);

  useEffect(() => {
    // ── 1. Supabase onAuthStateChange listener (same-tab redirect fallback) ──
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === "SIGNED_IN" ||
          event === "USER_UPDATED" ||
          session?.user?.email_confirmed_at
        ) {
          handleVerified();
        }
      }
    );

    // ── 2. Auto-poll every 5 seconds (session-based detection) ──
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        if (data?.session?.user?.email_confirmed_at) {
          handleVerified();
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);

    // ── 3. BroadcastChannel listener (cross-tab communication) ──
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === "VERIFICATION_SUCCESS") {
          handleVerified();
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    // ── 4. localStorage event fallback (cross-tab, older browsers) ──
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === "powerforecast_verification_signal") {
        try {
          const payload = JSON.parse(event.newValue || "{}");
          if (payload.verified) {
            handleVerified();
          }
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      authListener.subscription.unsubscribe();
      clearInterval(pollInterval);
      channel?.close();
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [handleVerified]);

  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleResend = async () => {
    if (!email || email === "your email address") return;

    setIsResending(true);
    setResendStatus(null);

    try {
      const { error } = await supabaseClient.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/#/verified`,
        },
      });

      if (error) {
        setResendStatus({ type: "error", message: error.message });
      } else {
        setResendStatus({ type: "success", message: "Verification email resent successfully! Please check your inbox." });
      }
    } catch (err: any) {
      setResendStatus({ type: "error", message: "Failed to resend email. Please try again later." });
    } finally {
      setIsResending(false);
    }
  };

  // ── Verified state: shown after cross-tab signal is received ──
  if (isVerified) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          bgcolor: isDark ? "#080720" : "#f4f6fb",
          color: "text.primary",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Container maxWidth="sm">
          <Card
            sx={{
              p: { xs: 4, sm: 6 },
              borderRadius: 4,
              textAlign: "center",
              boxShadow: isDark
                ? "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(99, 102, 241, 0.15)"
                : "0 20px 60px rgba(99, 102, 241, 0.12)",
              border: "1px solid",
              borderColor: isDark ? "rgba(99, 102, 241, 0.25)" : "rgba(226, 232, 240, 0.8)",
              bgcolor: isDark ? "rgba(13, 12, 45, 0.92)" : "rgba(255, 255, 255, 0.96)",
              backdropFilter: "blur(16px)",
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "rgba(16, 185, 129, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
                animation: "pulse 1.5s ease-in-out",
                "@keyframes pulse": {
                  "0%": { transform: "scale(0.8)", opacity: 0 },
                  "50%": { transform: "scale(1.1)" },
                  "100%": { transform: "scale(1)", opacity: 1 },
                },
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 48, color: "#10b981" }} />
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              Email Verified!
            </Typography>

            <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
              Your PowerForecast account is now active. Redirecting you to sign in...
            </Typography>

            <CircularProgress size={24} sx={{ color: "#10b981" }} />
          </Card>
        </Container>
      </Box>
    );
  }

  // ── Pending state: waiting for verification ──
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: isDark ? "#080720" : "#f4f6fb",
        color: "text.primary",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: 4,
            textAlign: "center",
            boxShadow: isDark
              ? "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(99, 102, 241, 0.15)"
              : "0 20px 60px rgba(99, 102, 241, 0.12)",
            border: "1px solid",
            borderColor: isDark ? "rgba(99, 102, 241, 0.25)" : "rgba(226, 232, 240, 0.8)",
            bgcolor: isDark ? "rgba(13, 12, 45, 0.92)" : "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(16px)",
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
            }}
          >
            <MailIcon sx={{ fontSize: 40, color: "#4f46e5" }} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Verify Your Email
          </Typography>

          <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
            We've sent a verification link to <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{email}</Box>.
            Please check your inbox and click the link to activate your account.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: 4 }}>
            <CircularProgress size={20} thickness={5} sx={{ color: "text.secondary" }} />
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Waiting for verification...
            </Typography>
          </Box>

          {resendStatus && (
            <Alert severity={resendStatus.type} sx={{ mb: 3, borderRadius: 2, textAlign: "left" }}>
              {resendStatus.message}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={isResending ? <CircularProgress size={20} /> : <RefreshIcon />}
              onClick={handleResend}
              disabled={isResending || email === "your email address"}
              sx={{
                py: 1.25,
                borderRadius: 2.5,
                fontWeight: 600,
              }}
            >
              {isResending ? "Resending..." : "Resend Verification Email"}
            </Button>

            <Button
              component={Link}
              to="/login"
              variant="text"
              size="small"
              sx={{ color: "text.secondary" }}
            >
              Back to Sign In
            </Button>
          </Box>
        </Card>
      </Container>
    </Box>
  );
};

export default VerifyEmailPage;
