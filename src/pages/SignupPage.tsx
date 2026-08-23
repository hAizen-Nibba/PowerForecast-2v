import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "@refinedev/core";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Home as HomeIcon,
  HelpOutlined as QuestionIcon,
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  LightMode as SunIcon,
  DarkMode as MoonIcon,
} from "@mui/icons-material";
import { useColorMode } from "../theme/AppTheme";

const SECURITY_QUESTION_PRESETS = [
  "What is your primary household electricity meter number?",
  "What is the name of your first pet?",
  "What city were you born in?",
  "What was the brand of your first major electrical appliance?",
  "What is your favorite childhood street name?",
];

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: register, isLoading } = useRegister();
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === "dark";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTION_PRESETS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [householdType, setHouseholdType] = useState("Residential (Meralco 230V)");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify and try again.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (!securityAnswer.trim()) {
      setErrorMessage("Please provide an answer for the security question.");
      return;
    }

    register(
      {
        name,
        email,
        password,
        householdType,
        securityQuestion,
        securityAnswer,
      },
      {
        onSuccess: () => navigate("/dashboard"),
        onError: (err: any) => setErrorMessage(err?.message || "Registration failed. Please try again."),
      }
    );
  };

  const passwordsMatch = !confirmPassword || password === confirmPassword;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: isDark ? "#080720" : "#f4f6fb",
        color: "text.primary",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Ambient Top Lightbulb Artwork */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: { xs: "100%", sm: 550, md: 680 },
          height: { xs: 260, sm: 340, md: 400 },
          backgroundImage: `url(${isDark ? "/Assets/Dark.png" : "/Assets/Light%20.png"})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "top center",
          pointerEvents: "none",
          zIndex: 0,
          opacity: isDark ? 0.85 : 0.95,
          filter: isDark ? "drop-shadow(0 10px 30px rgba(0,0,0,0.8))" : "drop-shadow(0 10px 30px rgba(99,102,241,0.2))",
        }}
      />

      {/* Header */}
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          p: 2,
          px: { xs: 2, sm: 4 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
          backdropFilter: "blur(8px)",
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
              borderRadius: 2,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 8px rgba(99, 102, 241, 0.4))",
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            PowerForecast
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title={`Switch to ${isDark ? "Light" : "Dark"} mode`}>
            <IconButton onClick={toggleColorMode} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              {isDark ? <SunIcon sx={{ color: "#ffd54f", fontSize: 18 }} /> : <MoonIcon sx={{ color: "#4f46e5", fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
          <Button component={Link} to="/login" size="small" variant="text">
            Sign In
          </Button>
        </Box>
      </Box>

      {/* Main Container */}
      <Container
        maxWidth="sm"
        sx={{
          position: "relative",
          zIndex: 1,
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: { xs: 4, sm: 6 },
          mt: { xs: 2, sm: 4 },
        }}
      >
        <Card
          sx={{
            width: "100%",
            p: { xs: 3, sm: 4.5 },
            borderRadius: 3.5,
            boxShadow: isDark
              ? "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(99, 102, 241, 0.15)"
              : "0 20px 60px rgba(99, 102, 241, 0.12)",
            border: "1px solid",
            borderColor: isDark ? "rgba(99, 102, 241, 0.25)" : "rgba(226, 232, 240, 0.8)",
            bgcolor: isDark ? "rgba(13, 12, 45, 0.9)" : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(16px)",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              component="img"
              src="/Assets/LOGO.png"
              alt="PowerForecast Logo"
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                objectFit: "contain",
                filter: "drop-shadow(0 4px 16px rgba(99, 102, 241, 0.5))",
                mb: 1.5,
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
              Create Account
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Start tracking and optimizing your household energy profile
            </Typography>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Full Name / Household Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Santos Residence"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Email Address"
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

            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Confirm Password"
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

            <TextField
              select
              label="Security Question (for Password Recovery)"
              required
              fullWidth
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <QuestionIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                },
              }}
            >
              {SECURITY_QUESTION_PRESETS.map((q) => (
                <MenuItem key={q} value={q}>
                  {q}
                </MenuItem>
              ))}
            </TextField>

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
              select
              label="Household & Tariff Type"
              fullWidth
              value={householdType}
              onChange={(e) => setHouseholdType(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <HomeIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                },
              }}
            >
              <MenuItem value="Residential (Meralco 230V)">Residential (Meralco 230V Single-Phase)</MenuItem>
              <MenuItem value="Small Commercial (Meralco)">Small Commercial / Business (General Power)</MenuItem>
              <MenuItem value="Solar Net-Metering Setup">Solar Net-Metering Household (Bidirectional)</MenuItem>
            </TextField>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading || !passwordsMatch}
              sx={{ py: 1.25, borderRadius: 2.5, mt: 1, fontWeight: 700 }}
            >
              {isLoading ? "Creating account..." : "Complete Registration"}
            </Button>
          </Box>

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Already registered?{" "}
              <Typography
                component={Link}
                to="/login"
                variant="body2"
                sx={{ color: "primary.main", fontWeight: 700, textDecoration: "none" }}
              >
                Sign in here
              </Typography>
            </Typography>
          </Box>
        </Card>
      </Container>
    </Box>
  );
};

export default SignupPage;
