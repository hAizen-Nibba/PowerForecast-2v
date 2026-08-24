import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { MailOutlined as MailIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import { useColorMode } from "../theme/AppTheme";
import { supabaseClient } from "../lib/supabaseClient";

export const VerifyEmailPage: React.FC = () => {
  const { mode } = useColorMode();
  const isDark = mode === "dark";
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "your email address";
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes (e.g. from a different tab completing verification)
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" || session) {
          navigate("/verified");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleResend = async () => {
    if (!email || email === "your email address") return;

    setIsResending(true);
    setResendStatus(null);

    try {
      const { error } = await supabaseClient.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/#/verified`
        }
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