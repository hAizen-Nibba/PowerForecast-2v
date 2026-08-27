import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import { CheckCircleOutlined as CheckCircleIcon } from "@mui/icons-material";
import { useColorMode } from "../theme/AppTheme";
import { supabaseClient } from "../lib/supabaseClient";

/** Shared channel name for cross-tab verification communication */
const AUTH_CHANNEL = "powerforecast-auth";

export const EmailVerifiedPage: React.FC = () => {
  const { mode } = useColorMode();
  const isDark = mode === "dark";
  const navigate = useNavigate();
  const [tabCloseFailed, setTabCloseFailed] = useState(false);

  useEffect(() => {
    // Broadcast verification success to the original (waiting) tab
    // using both BroadcastChannel and localStorage event as fallback.
    try {
      const channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.postMessage({ type: "VERIFICATION_SUCCESS", timestamp: Date.now() });
      // Close after a brief delay so the message dispatches
      setTimeout(() => channel.close(), 500);
    } catch {
      // BroadcastChannel not supported — fall through to localStorage
    }

    // localStorage event fallback (fires in other tabs when storage changes)
    try {
      localStorage.setItem(
        "powerforecast_verification_signal",
        JSON.stringify({ verified: true, timestamp: Date.now() })
      );
    } catch {
      // Ignore localStorage errors
    }

    // Attempt to auto-close this tab after a short delay
    // Browsers only allow window.close() on tabs opened via window.open()
    const closeTimer = setTimeout(() => {
      window.close();
      // If we're still here after 300ms, the browser blocked the close
      setTimeout(() => setTabCloseFailed(true), 300);
    }, 1000);

    return () => clearTimeout(closeTimer);
  }, []);

  const handleManualLogin = async () => {
    await supabaseClient.auth.signOut();
    navigate("/login");
  };

  // While attempting to auto-close, show a brief "closing" state
  if (!tabCloseFailed) {
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
              borderRadius: 1.5,
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
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 48, color: "#10b981" }} />
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              Email Verified!
            </Typography>

            <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
              Your account has been verified. Returning you to the app...
            </Typography>

            <CircularProgress size={24} sx={{ color: "#10b981" }} />
          </Card>
        </Container>
      </Box>
    );
  }

  // Fallback UI — browser blocked window.close()
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
            borderRadius: 1.5,
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
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 48, color: "#10b981" }} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Email Verified!
          </Typography>

          <Typography variant="body1" sx={{ color: "text.secondary", mb: 1 }}>
            Thank you for verifying your email address. Your PowerForecast account is now active and ready to use.
          </Typography>

          <Typography variant="body2" sx={{ color: "text.secondary", mb: 4, fontStyle: "italic" }}>
            You can safely close this tab and return to the original window.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              component={Link}
              to="/dashboard"
              variant="contained"
              size="large"
              fullWidth
              sx={{
                py: 1.5,
                borderRadius: 1,
                fontWeight: 700,
                fontSize: "1.1rem",
              }}
            >
              Proceed to Dashboard
            </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={handleManualLogin}
              sx={{
                py: 1.5,
                borderRadius: 1,
                fontWeight: 700,
                fontSize: "1.1rem",
              }}
            >
              Login Manually
            </Button>
          </Box>
        </Card>
      </Container>
    </Box>
  );
};

export default EmailVerifiedPage;
