import React from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import { CheckCircleOutlined as CheckCircleIcon } from "@mui/icons-material";
import { useColorMode } from "../theme/AppTheme";

export const EmailVerifiedPage: React.FC = () => {
  const { mode } = useColorMode();
  const isDark = mode === "dark";

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
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 48, color: "#10b981" }} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Email Verified!
          </Typography>

          <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
            Thank you for verifying your email address. Your PowerForecast account is now active and ready to use.
          </Typography>

          <Button
            component={Link}
            to="/login"
            variant="contained"
            size="large"
            fullWidth
            sx={{
              py: 1.5,
              borderRadius: 2.5,
              fontWeight: 700,
              fontSize: "1.1rem",
            }}
          >
            Sign In Now
          </Button>
        </Card>
      </Container>
    </Box>
  );
};

export default EmailVerifiedPage;
