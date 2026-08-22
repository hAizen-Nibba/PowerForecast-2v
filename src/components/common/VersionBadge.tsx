import React, { useEffect, useState } from "react";
import { APP_VERSION, checkSupabaseConnection, SUPABASE_URL } from "../../lib/supabaseClient";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Fade from "@mui/material/Fade";
import {
  Storage as DatabaseIcon,
  VerifiedUser as ShieldIcon,
  Wifi as WifiIcon,
  AutoAwesome as SparklesIcon,
  CheckCircle as CheckCircleIcon,
  WarningAmber as AlertIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

export const VersionBadge: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<{
    checked: boolean;
    connected: boolean;
    message: string;
  }>({
    checked: false,
    connected: false,
    message: "Initializing...",
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    checkSupabaseConnection().then((res) => {
      if (isMounted) {
        setDbStatus({
          checked: true,
          connected: res.ok,
          message: res.message,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1400,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1,
        userSelect: "none",
        "@media print": { display: "none" },
      }}
    >
      {/* Expanded status card */}
      <Fade in={isOpen}>
        <Paper
          elevation={8}
          sx={{
            display: isOpen ? "block" : "none",
            p: 2,
            width: 290,
            borderRadius: 2.5,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(9, 11, 36, 0.96)" : "rgba(255, 255, 255, 0.98)",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.35)" : "rgba(99, 102, 241, 0.25)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <SparklesIcon sx={{ fontSize: 16, color: "warning.main" }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.light" }}>
                PowerForecast MUI
              </Typography>
            </Box>
            <Chip
              label={APP_VERSION}
              size="small"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "0.6875rem",
                bgcolor: "rgba(234, 179, 8, 0.15)",
                color: "#eab308",
                border: "1px solid rgba(234, 179, 8, 0.3)",
              }}
            />
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, my: 1.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Template / UI:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Material UI v6 Templates
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Database:
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <DatabaseIcon sx={{ fontSize: 14, color: "success.main" }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: "success.main" }}>
                  Supabase Cloud
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Live Connection:
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {dbStatus.connected ? (
                  <>
                    <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "success.main" }}>
                      Connected
                    </Typography>
                  </>
                ) : (
                  <>
                    <AlertIcon sx={{ fontSize: 14, color: "warning.main" }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "warning.main" }}>
                      Hybrid / Local
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <ShieldIcon sx={{ fontSize: 14, color: "success.light" }} />
              <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "success.light" }}>
                Auto-sync active
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={() => setIsOpen(false)}
              sx={{ minWidth: "auto", p: "2px 6px", fontSize: "0.6875rem" }}
            >
              Close
            </Button>
          </Box>
        </Paper>
      </Fade>

      {/* Persistent Bottom-Right Tag */}
      <Box
        component="button"
        onClick={() => setIsOpen((prev) => !prev)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: 9999,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(10, 12, 44, 0.92)" : "rgba(255, 255, 255, 0.95)",
          color: "text.primary",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.45)" : "rgba(99, 102, 241, 0.3)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
          backdropFilter: "blur(12px)",
          cursor: "pointer",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            borderColor: "primary.main",
            transform: "translateY(-1px)",
            boxShadow: "0 6px 20px rgba(99, 102, 241, 0.25)",
          },
        }}
        title="Click to view version & database connection telemetry"
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: dbStatus.connected ? "success.main" : "info.main",
            boxShadow: (theme) =>
              `0 0 8px ${dbStatus.connected ? theme.palette.success.main : theme.palette.info.main}`,
          }}
        />

        <Typography
          variant="caption"
          sx={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "-0.01em",
          }}
        >
          {APP_VERSION}
        </Typography>

        <Chip
          icon={<WifiIcon sx={{ fontSize: "12px !important", color: "success.main" }} />}
          label="MUI"
          size="small"
          sx={{
            height: 18,
            fontSize: "0.625rem",
            fontWeight: 700,
            bgcolor: "rgba(99, 102, 241, 0.15)",
            color: "primary.light",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            "& .MuiChip-icon": { ml: "4px" },
          }}
        />
      </Box>
    </Box>
  );
};

export default VersionBadge;
