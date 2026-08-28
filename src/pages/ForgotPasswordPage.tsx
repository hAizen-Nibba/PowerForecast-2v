import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Email as EmailIcon,
  Lock as LockIcon,
  HelpOutlined as QuestionIcon,
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
  LightMode as SunIcon,
  DarkMode as MoonIcon,
  CheckCircleOutlined as SuccessIcon,
  ShieldOutlined as ShieldIcon,
} from "@mui/icons-material";
import { supabaseClient } from "../lib/supabaseClient";
import { useColorMode } from "../theme/AppTheme";
import { devLog } from "../lib/devLogger";

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === "dark";

  // Multi-step states: 'email' | 'question' | 'success'
  const [step, setStep] = useState<"email" | "question" | "success">("email");
  const [email, setEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Find Account & Retrieve Security Question
  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Check local security directory
      const secDirectory = JSON.parse(localStorage.getItem("powerforecast_sec_dir") || "{}");
      let foundQuestion = secDirectory[trimmedEmail]?.question;
      let foundAnswer = secDirectory[trimmedEmail]?.answer;

      // 2. If not found in local cache, check Supabase accounts table
      if (!foundQuestion) {
        try {
          const { data: profile } = await supabaseClient
            .from("accounts")
            .select("*")
            .eq("email", trimmedEmail)
            .maybeSingle();

          if (profile?.security_question) {
            foundQuestion = profile.security_question;
            foundAnswer = profile.security_answer;
          }
        } catch (dbErr) {
          devLog.warn("Auth", "Could not query accounts table for security question", dbErr);
        }
      }

      if (!foundQuestion) {
        setErrorMessage("Security question is not configured for this account. Please contact support.");
        return;
      }

      setSecurityQuestion(foundQuestion);
      setExpectedAnswer(foundAnswer || "");
      setStep("question");
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to locate account. Please verify your email.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Answer and Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!securityAnswer.trim()) {
      setErrorMessage("Please answer the security question.");
      return;
    }

    // Verify security answer match
    const normalizedInput = securityAnswer.trim().toLowerCase();
    const normalizedTarget = expectedAnswer.trim().toLowerCase();

    if (expectedAnswer && normalizedInput !== normalizedTarget) {
      setErrorMessage("Security answer does not match our records. Please try again.");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage("Please fill in your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword.trim() });
      if (error) {
        throw error;
      }

      devLog.info("Auth", `Password successfully reset for ${email} via Security Question.`);
      setStep("success");
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: isDark ? "#17191d" : "#f4f6f8",
        color: "text.primary",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          position: "relative",
          zIndex: 10,
          p: 2,
          px: { xs: 2, sm: 4 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
          backdropFilter: "blur(12px)",
          bgcolor: isDark ? "rgba(8, 7, 32, 0.7)" : "rgba(244, 246, 251, 0.7)",
        }}
      >
        <Box component={Link} to="/" sx={{ display: "flex", alignItems: "center", gap: 1.5, textDecoration: "none", color: "inherit" }}>
          <Box
            component="img"
            src="/Assets/LOGO.png"
            alt="PowerForecast Logo"
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 8px rgba(0, 229, 201, 0.4))",
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            PowerForecast
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title={`Switch to ${isDark ? "Light" : "Dark"} mode`}>
            <IconButton onClick={toggleColorMode} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              {isDark ? <SunIcon sx={{ color: "#ffd54f", fontSize: 18 }} /> : <MoonIcon sx={{ color: "primary.main", fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
          <Button component={Link} to="/login" size="small" variant="text">
            Sign In
          </Button>
        </Box>
      </Box>

      {/* Background Hanging Bulb (Left) */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: { md: "6%", lg: "12%", xl: "16%" },
          display: { xs: "none", md: "block" },
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {/* Ambient Radial Glow */}
        <Box
          sx={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { md: 450, lg: 550 },
            height: { md: 450, lg: 550 },
            borderRadius: "50%",
            background: isDark
              ? "radial-gradient(circle, rgba(0, 229, 201, 0.2) 0%, rgba(23, 25, 29, 0) 70%)"
              : "radial-gradient(circle, rgba(255, 213, 79, 0.4) 0%, rgba(244, 246, 251, 0) 70%)",
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />

        <Box
          component="img"
          src={isDark ? "/Assets/Off.png" : "/Assets/On.png"}
          alt="PowerForecast Energy Bulb"
          sx={{
            height: { md: "calc(100vh - 100px)", lg: "calc(100vh - 110px)" },
            maxHeight: { md: 640, lg: 750 },
            width: "auto",
            objectFit: "contain",
            display: "block",
            filter: isDark
              ? "drop-shadow(0 25px 45px rgba(0, 0, 0, 0.95))"
              : "drop-shadow(0 25px 60px rgba(255, 213, 79, 0.6))",
          }}
        />
      </Box>

      {/* Main Container: Bento Card positioned on the right */}
      <Container
        maxWidth="lg"
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: { xs: "center", md: "flex-end" },
          py: { xs: 4, sm: 6 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Card
          sx={{
            width: "100%",
            maxWidth: 480,
            p: { xs: 3, sm: 4.5 },
            borderRadius: 1.5,
            boxShadow: isDark
              ? "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 229, 201, 0.1)"
              : "0 20px 60px rgba(0, 158, 136, 0.1)",
            border: "1px solid",
            borderColor: isDark ? "rgba(0, 229, 201, 0.25)" : "rgba(226, 232, 240, 0.8)",
            bgcolor: isDark ? "rgba(32, 35, 40, 0.95)" : "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Brand Header */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              component="img"
              src="/Assets/LOGO.png"
              alt="PowerForecast Logo"
              sx={{
                width: 52,
                height: 52,
                borderRadius: 1.25,
                objectFit: "contain",
                filter: "drop-shadow(0 4px 16px rgba(0, 229, 201, 0.4))",
                mb: 1.5,
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
              {step === "success" ? "Password Reset Complete" : "Reset Password"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {step === "email" && "Enter your email to retrieve your security challenge"}
              {step === "question" && "Answer your registered security question to set a new password"}
              {step === "success" && "Your account password has been safely updated"}
            </Typography>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 1 }}>
              {errorMessage}
            </Alert>
          )}

          {/* STEP 1: Enter Email */}
          {step === "email" && (
            <Box component="form" onSubmit={handleFindAccount} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <TextField
                label="Registered Email Address"
                type="email"
                required
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
                sx={{ py: 1.25, borderRadius: 1, fontWeight: 800 }}
              >
                {isLoading ? "Searching Account..." : "Continue to Security Question"}
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

          {/* STEP 2: Answer Security Question & Enter New Password */}
          {step === "question" && (
            <Box component="form" onSubmit={handleResetPassword} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1.25,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(0, 158, 136, 0.06)",
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(0, 158, 136, 0.2)",
                }}
              >
                <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 800, textTransform: "uppercase" }}>
                  Registered Security Question
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {securityQuestion}
                </Typography>
              </Box>

              <TextField
                label="Security Answer"
                type={showSecurityAnswer ? "text" : "password"}
                required
                fullWidth
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Enter your security answer"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowSecurityAnswer(!showSecurityAnswer)}
                          edge="end"
                        >
                          {showSecurityAnswer ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                required
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                label="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
                required
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={!passwordsMatch}
                helperText={!passwordsMatch ? "Passwords do not match" : ""}
                placeholder="••••••••"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
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
                disabled={isLoading || !passwordsMatch}
                sx={{ py: 1.25, borderRadius: 1, fontWeight: 800, mt: 0.5 }}
              >
                {isLoading ? "Updating Password..." : "Confirm & Reset Password"}
              </Button>

              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                <Button size="small" onClick={() => setStep("email")} startIcon={<ArrowBackIcon />}>
                  Change Email
                </Button>
                <Button component={Link} to="/login" size="small">
                  Back to Sign In
                </Button>
              </Box>
            </Box>
          )}

          {/* STEP 3: Success State */}
          {step === "success" && (
            <Box sx={{ textAlign: "center", py: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <SuccessIcon sx={{ color: "success.main", fontSize: 56 }} />
              <Alert severity="success" sx={{ width: "100%", borderRadius: 1 }}>
                Your password has been successfully reset. You may now sign in with your new credentials.
              </Alert>
              <Button
                component={Link}
                to="/login"
                variant="contained"
                fullWidth
                sx={{ mt: 2, py: 1.2, borderRadius: 1, fontWeight: 700 }}
              >
                Sign In Now
              </Button>
            </Box>
          )}
        </Card>
      </Container>
    </Box>
  );
};

export default ForgotPasswordPage;
