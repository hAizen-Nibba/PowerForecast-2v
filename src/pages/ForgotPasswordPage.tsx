import React, { useState } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import {
  Bolt as BoltIcon,
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
  LightMode as SunIcon,
  DarkMode as MoonIcon,
  CheckCircleOutlined as SuccessIcon,
} from "@mui/icons-material";
import { supabaseClient } from "../lib/supabaseClient";
import { useColorMode } from "../theme/AppTheme";

export const ForgotPasswordPage: React.FC = () => {
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === "dark";

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/#/login`,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage("Password reset instructions have been sent to your email address.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to request password reset.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
        p: 2,
      }}
    >
      {/* Background Decorative Glow */}
      <Box
        sx={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, rgba(108, 122, 224, 0.15) 0%, rgba(9, 9, 56, 0) 70%)"
            : "radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(244, 245, 252, 0) 70%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Top Navigation / Theme Toggle */}
      <Box
        sx={{
          position: "absolute",
          top: 24,
          right: 24,
          zIndex: 10,
        }}
      >
        <Tooltip title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          <IconButton onClick={toggleColorMode} color="inherit">
            {isDark ? <SunIcon sx={{ color: "#ffd54f" }} /> : <MoonIcon sx={{ color: "primary.main" }} />}
          </IconButton>
        </Tooltip>
      </Box>

      <Container maxWidth="xs" sx={{ position: "relative", zIndex: 1 }}>
        <Card
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            boxShadow: isDark
              ? "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(108, 122, 224, 0.2)"
              : "0 20px 60px rgba(99, 102, 241, 0.15)",
            border: "1px solid",
            borderColor: "rgba(108, 122, 224, 0.25)",
            bgcolor: isDark ? "rgba(15, 14, 58, 0.85)" : "#ffffff",
          }}
        >
          {/* Brand Header */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(99, 102, 241, 0.4)",
                mb: 2,
              }}
            >
              <BoltIcon sx={{ color: "#ffd54f", fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
              Reset Password
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Enter your email and we'll send a recovery link
            </Typography>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}

          {successMessage ? (
            <Box sx={{ textAlign: "center", py: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <SuccessIcon sx={{ color: "success.main", fontSize: 48 }} />
              <Alert severity="success" sx={{ width: "100%", borderRadius: 2 }}>
                {successMessage}
              </Alert>
              <Button
                component={Link}
                to="/login"
                variant="contained"
                fullWidth
                sx={{ mt: 1, py: 1.2, borderRadius: 2.5, fontWeight: 700 }}
              >
                Back to Sign In
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@powerforecast.ph"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isLoading}
                sx={{ py: 1.25, borderRadius: 2.5, fontWeight: 800 }}
              >
                {isLoading ? "Sending Link..." : "Send Reset Link"}
              </Button>

              <Box sx={{ textAlign: "center", mt: 1 }}>
                <Typography
                  component={Link}
                  to="/login"
                  variant="body2"
                  sx={{
                    color: "primary.main",
                    textDecoration: "none",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <ArrowBackIcon fontSize="small" /> Back to Sign In
                </Typography>
              </Box>
            </Box>
          )}
        </Card>
      </Container>
    </Box>
  );
};
