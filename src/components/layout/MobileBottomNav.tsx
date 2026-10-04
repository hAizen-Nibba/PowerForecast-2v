import React from "react";
import { Link, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {
  Dashboard as DashboardIcon,
  Calculate as CalculatorIcon,
  Bolt as BoltIcon,
  CalendarMonth as CalendarIcon,
  BarChart as AnalyticsIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { useLanguage } from "../../context/LanguageContext";
import { tokens } from "../../theme/tokens";

interface MobileBottomNavProps {
  onOpenSidebar: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenSidebar }) => {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { label: t("nav.mobile.dashboard", "Dashboard"), icon: <DashboardIcon sx={{ fontSize: 18 }} />, path: "/dashboard" },
    { label: t("nav.mobile.calculator", "Calculator"), icon: <CalculatorIcon sx={{ fontSize: 18 }} />, path: "/calculator" },
    { label: t("nav.mobile.appliances", "Appliances"), icon: <BoltIcon sx={{ fontSize: 18 }} />, path: "/appliances" },
    { label: t("nav.mobile.calendar", "Calendar"), icon: <CalendarIcon sx={{ fontSize: 18 }} />, path: "/calendar" },
    { label: t("nav.mobile.analytics", "Analytics"), icon: <AnalyticsIcon sx={{ fontSize: 18 }} />, path: "/analytics" },
  ];

  const handleHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore if not supported
      }
    }
  };

  return (
    <Box
      component="nav"
      aria-label="Mobile Navigation Dock"
      sx={{
        display: { xs: "flex", lg: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? tokens.dark.surface
            : tokens.light.surface,
        borderTop: "1px solid",
        borderColor: (theme) =>
          theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 -1px 3px rgba(0, 0, 0, 0.4)"
            : "0 -1px 3px rgba(0, 0, 0, 0.05)",
        pb: "calc(env(safe-area-inset-bottom, 8px) + 2px)",
        pt: 0.5,
        px: 0.5,
        justifyContent: "space-between",
        alignItems: "center",
        boxSizing: "border-box",
      }}
    >
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.path || (item.path === "/dashboard" && location.pathname === "/");

        return (
          <Box
            key={item.path}
            component={Link}
            to={item.path}
            onClick={handleHaptic}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              minWidth: 0,
              py: 0.25,
              textDecoration: "none",
              color: isActive
                ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary)
                : (theme) => (theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted),
              position: "relative",
              borderRadius: 1.5,
              transition: "all 0.15s ease",
              "&:active": {
                transform: "scale(0.95)",
              },
            }}
          >
            {/* Active Top Bar Indicator */}
            {isActive && (
              <Box
                sx={{
                  position: "absolute",
                  top: -4,
                  width: 20,
                  height: 2,
                  borderRadius: "1px",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary),
                }}
              />
            )}

            <Box
              sx={{
                p: "4px",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: isActive
                  ? (theme) =>
                      theme.palette.mode === "dark"
                        ? tokens.dark.surfaceSubtle
                        : tokens.light.surfaceSubtle
                  : "transparent",
                transition: "background-color 0.15s ease",
              }}
            >
              {item.icon}
            </Box>

            <Typography
              variant="caption"
              sx={{
                fontSize: "clamp(0.525rem, 1.8vw, 0.625rem)",
                fontWeight: isActive ? 600 : 500,
                letterSpacing: "-0.01em",
                mt: 0.25,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
                textAlign: "center",
                display: "block",
              }}
            >
              {item.label}
            </Typography>
          </Box>
        );
      })}

      {/* Menu / Drawer Toggle */}
      <Box
        component="button"
        onClick={() => {
          handleHaptic();
          onOpenSidebar();
        }}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minWidth: 0,
          py: 0.25,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "text.secondary",
          borderRadius: 1.5,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:active": {
            transform: "scale(0.92)",
          },
        }}
        aria-label="Open Navigation Menu"
      >
        <Box sx={{ p: "3px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MenuIcon sx={{ fontSize: 18 }} />
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: "clamp(0.525rem, 1.8vw, 0.625rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            mt: 0.15,
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
            textAlign: "center",
            display: "block",
          }}
        >
          {t("nav.mobile.more", "More")}
        </Typography>
      </Box>
    </Box>
  );
};

export default MobileBottomNav;
