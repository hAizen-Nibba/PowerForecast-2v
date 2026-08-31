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

interface MobileBottomNavProps {
  onOpenSidebar: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenSidebar }) => {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { label: t("nav.dashboard", "Dashboard"), icon: <DashboardIcon sx={{ fontSize: 20 }} />, path: "/dashboard" },
    { label: t("nav.calculator", "Calculator"), icon: <CalculatorIcon sx={{ fontSize: 20 }} />, path: "/calculator" },
    { label: t("nav.appliances", "Appliances"), icon: <BoltIcon sx={{ fontSize: 20 }} />, path: "/appliances" },
    { label: t("nav.calendar", "Calendar"), icon: <CalendarIcon sx={{ fontSize: 20 }} />, path: "/calendar" },
    { label: t("nav.analytics", "Analytics"), icon: <AnalyticsIcon sx={{ fontSize: 20 }} />, path: "/analytics" },
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
            ? "rgba(20, 22, 26, 0.92)"
            : "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid",
        borderColor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 -4px 20px rgba(0, 0, 0, 0.4)"
            : "0 -2px 16px rgba(0, 0, 0, 0.06)",
        pb: "env(safe-area-inset-bottom, 8px)",
        pt: 0.75,
        px: 1,
        justifyContent: "space-around",
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
              py: 0.5,
              textDecoration: "none",
              color: isActive
                ? (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488")
                : "text.secondary",
              position: "relative",
              borderRadius: 1.5,
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:active": {
                transform: "scale(0.92)",
              },
            }}
          >
            {/* Active Top Glow Pill */}
            {isActive && (
              <Box
                sx={{
                  position: "absolute",
                  top: -6,
                  width: 24,
                  height: 3,
                  borderRadius: "0 0 4px 4px",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                  boxShadow: (theme) =>
                    theme.palette.mode === "dark" ? "0 0 10px #00e5c9" : "0 0 6px rgba(13, 148, 136, 0.5)",
                }}
              />
            )}

            <Box
              sx={{
                p: 0.5,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: isActive
                  ? (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(0, 229, 201, 0.12)"
                        : "rgba(13, 148, 136, 0.1)"
                  : "transparent",
                transition: "background-color 0.2s ease",
              }}
            >
              {item.icon}
            </Box>

            <Typography
              variant="caption"
              sx={{
                fontSize: "0.625rem",
                fontWeight: isActive ? 800 : 500,
                letterSpacing: "-0.01em",
                mt: 0.25,
                lineHeight: 1,
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
          py: 0.5,
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
        <Box sx={{ p: 0.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MenuIcon sx={{ fontSize: 20 }} />
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.625rem",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            mt: 0.25,
            lineHeight: 1,
          }}
        >
          {t("nav.more", "More")}
        </Typography>
      </Box>
    </Box>
  );
};

export default MobileBottomNav;
