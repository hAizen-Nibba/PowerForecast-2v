import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Badge from "@mui/material/Badge";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  Menu as MenuIcon,
  LightMode as SunIcon,
  DarkMode as MoonIcon,
  AutoAwesome as SparklesIcon,
  Bolt as BoltIcon,
  Logout as LogoutIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  NotificationsNone as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  HelpOutlined as HelpIcon,
  Settings as SettingsIcon,
  Shield as ShieldIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { checkSupabaseConnection } from "../../lib/supabaseClient";
import { NotificationPopover } from "./NotificationPopover";
import { getNotificationPermission, getNotificationLogs } from "../../lib/notificationService";
import { useTour } from "../../hooks/useTour";
import { ROUTE_TO_TOUR_PAGE } from "../tour/tourSteps";
import { useLanguage } from "../../context/LanguageContext";
import { MeralcoRatePopover } from "./MeralcoRatePopover";
import { RoomSwitcher } from "../rooms/RoomSwitcher";
import { useRoom } from "../../context/RoomContext";

interface HeaderProps {
  onOpenSidebar: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAiScanner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  isDark,
  onToggleTheme,
  onOpenAiScanner,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { startTour, openWelcomeModal, isActive: isTourActive } = useTour();
  const currentTourPage = ROUTE_TO_TOUR_PAGE[location.pathname] || (location.pathname === "/" ? "dashboard" : null);

  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();
  const { activeRoom } = useRoom();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ ok: boolean; latency?: number }>({ ok: true, latency: 45 });
  const notifPermission = getNotificationPermission();

  // Check Supabase connection health on mount and periodically
  useEffect(() => {
    let isMounted = true;
    const verifyConnection = async () => {
      const res = await checkSupabaseConnection();
      if (isMounted) {
        setDbStatus({ ok: res.ok, latency: res.latencyMs });
      }
    };
    verifyConnection();
    const interval = setInterval(verifyConnection, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Real-time Clock
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [unreadNotifCount, setUnreadNotifCount] = useState(() => {
    return getNotificationLogs().filter((l) => !l.read).length;
  });

  useEffect(() => {
    const handleUpdate = () => {
      setUnreadNotifCount(getNotificationLogs().filter((l) => !l.read).length);
    };
    window.addEventListener("powerforecast_notifications_updated", handleUpdate);
    return () => window.removeEventListener("powerforecast_notifications_updated", handleUpdate);
  }, []);

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case "/":
      case "/dashboard":
        return t("nav.dashboard", "Dashboard");
      case "/appliances":
        return t("nav.appliances", "Appliance Hub");
      case "/calendar":
        return t("nav.calendar", "Smart Calendar");
      case "/analytics":
        return t("nav.analytics", "Analytics");
      case "/forecasting":
        return t("nav.forecasting", "Forecasting");
      case "/calculator":
        return t("nav.calculator", "Bill Calculator");
      case "/settings":
        return t("header.settings", "Settings");
      case "/api-docs":
        return "API Documentation";
      default:
        return t("nav.dashboard", "Dashboard");
    }
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "#09090b" : "#ffffff",
        color: "text.primary",
        boxShadow: "none",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          minHeight: { xs: 54, sm: 58 },
          px: { xs: 2, sm: 2.5, md: 3 },
          gap: 1.5,
        }}
      >
        {/* Left: Mobile Menu Toggle, Breadcrumbs, DB Status, and Tariff */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
          {location.pathname === "/settings" ? (
            <Button
              component={Link}
              to="/dashboard"
              startIcon={<ArrowBackIcon />}
              size="small"
              variant="outlined"
              color="inherit"
              sx={{
                borderRadius: 1.25,
                fontWeight: 600,
                textTransform: "none",
                fontSize: "0.8125rem",
                mr: 0.5,
                borderColor: "divider",
              }}
            >
              {t("common.backToDashboard", "Back to Dashboard")}
            </Button>
          ) : (
            <IconButton
              color="inherit"
              edge="start"
              onClick={onOpenSidebar}
              sx={{ display: { lg: "none" }, p: 0.75 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Breadcrumb Path Indicator */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.75, mr: 0.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500, fontSize: "0.8125rem" }}>
              {activeRoom?.room_name || "Home Room"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.disabled", fontSize: "0.8125rem" }}>
              /
            </Typography>
            <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600, fontSize: "0.8125rem" }}>
              {getPageTitle(location.pathname)}
            </Typography>
          </Box>

          {/* Database Connection Status Chip */}
          <Tooltip title={dbStatus.ok ? `Supabase Connected (${dbStatus.latency || 0}ms)` : "Supabase Offline / Local Mode"}>
            <Chip
              data-tour="header-db-status"
              icon={
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: dbStatus.ok ? "success.main" : "error.main",
                    ml: "4px !important",
                  }}
                />
              }
              label={dbStatus.ok ? t("header.dbLive", "Synced") : t("header.localMode", "Offline")}
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: "0.6875rem",
                bgcolor: "action.hover",
                color: "text.secondary",
                border: "1px solid",
                borderColor: "divider",
                display: { xs: "none", sm: "inline-flex" },
                height: 24,
              }}
            />
          </Tooltip>

          {/* Meralco Generation Rate Badge & Hover Breakdown Popover */}
          <Box data-tour="header-rate-popover">
            <MeralcoRatePopover />
          </Box>

          {/* Active Room Code & Room Switcher */}
          <RoomSwitcher />
        </Box>

        {/* Center: Live Time / Date */}
        <Box sx={{ display: { xs: "none", xl: "flex" }, flexDirection: "column", alignItems: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em", lineHeight: 1.2 }}>
            {timeStr}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", mt: 0.25 }}>
            {dateStr}
          </Typography>
        </Box>

        {/* Right: AI Scanner CTA, Theme Switch, and User Profile */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {onOpenAiScanner && (
            <Button
              data-tour="header-ai-scanner"
              variant="outlined"
              size="small"
              onClick={onOpenAiScanner}
              startIcon={<SparklesIcon sx={{ fontSize: 16, color: "text.secondary" }} />}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                borderRadius: 1.25,
                borderColor: "divider",
                fontWeight: 600,
                color: "text.primary",
                py: 0.5,
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "text.secondary",
                },
              }}
            >
              AI Scanner
            </Button>
          )}

          {/* Guided Tour Replay Button */}
          {currentTourPage && (
            <Tooltip title="Page Tour & Tutorial [?]">
              <IconButton
                data-tour="header-tour-button"
                onClick={() => openWelcomeModal(currentTourPage || "dashboard")}
                color="inherit"
                size="small"
                disabled={isTourActive}
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.secondary",
                  p: 0.75,
                  borderRadius: 1.5,
                  "&:hover": {
                    bgcolor: "action.hover",
                    color: "text.primary",
                  },
                }}
              >
                <HelpIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Theme Mode Toggle Button */}
          <Tooltip title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}>
            <IconButton
              data-tour="header-theme-toggle"
              onClick={onToggleTheme}
              color="inherit"
              size="small"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                p: 0.75,
                borderRadius: 1.5,
                color: "text.secondary",
                "&:hover": {
                  bgcolor: "action.hover",
                  color: "text.primary",
                },
              }}
            >
              {isDark ? <SunIcon sx={{ color: "warning.main", fontSize: 18 }} /> : <MoonIcon sx={{ color: "text.primary", fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          {/* Smart Energy Notifications Bell */}
          <Tooltip title="Smart Energy Notifications">
            <IconButton
              data-tour="header-notifications"
              onClick={(e) => setNotifAnchorEl(e.currentTarget)}
              color="inherit"
              size="small"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                p: 0.75,
                borderRadius: 1.5,
                color: "text.secondary",
                "&:hover": {
                  bgcolor: "action.hover",
                  color: "text.primary",
                },
              }}
            >
              <Badge
                badgeContent={unreadNotifCount > 0 ? unreadNotifCount : undefined}
                variant={unreadNotifCount > 0 ? "standard" : "dot"}
                color={unreadNotifCount > 0 ? "error" : notifPermission === "granted" ? "success" : "warning"}
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: "0.625rem",
                    height: unreadNotifCount > 0 ? 16 : 6,
                    minWidth: unreadNotifCount > 0 ? 16 : 6,
                    px: unreadNotifCount > 0 ? 0.5 : 0,
                    fontWeight: 800,
                  },
                }}
              >
                {unreadNotifCount > 0 || notifPermission === "granted" ? (
                  <NotificationsActiveIcon sx={{ color: "text.primary", fontSize: 18 }} />
                ) : (
                  <NotificationsIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                )}
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Profile Pill & Menu */}
          <Box
            data-tour="header-profile"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: "3px 8px 3px 3px",
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
              cursor: "pointer",
              "&:hover": { bgcolor: "action.hover", borderColor: "text.secondary" },
              transition: "all 0.15s ease",
            }}
          >
            <Avatar
              src={identity?.avatar}
              sx={{ width: 26, height: 26, bgcolor: "primary.main", color: "primary.contrastText", fontSize: "0.75rem", fontWeight: 700 }}
            >
              {identity?.name?.charAt(0) || "U"}
            </Avatar>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: { xs: "none", sm: "block" },
              }}
            >
              {identity?.name || identity?.email?.split("@")[0] || "User"}
            </Typography>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 220,
                  p: 0.5,
                  borderRadius: 1.5,
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "#09090b" : "#ffffff",
                  color: "text.primary",
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                {identity?.name || "PowerForecast User"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
                {identity?.email || "Authenticated Account"}
              </Typography>
              <Chip
                icon={<ShieldIcon sx={{ fontSize: "12px !important", color: "warning.main !important" }} />}
                label={t("header.ownerBadge", "Household Owner")}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.625rem",
                  fontWeight: 600,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.12)" : "rgba(217, 119, 6, 0.1)",
                  color: "warning.main",
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.3)" : "rgba(217, 119, 6, 0.3)",
                }}
              />
            </Box>

            <Divider sx={{ my: 0.5 }} />

            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate("/settings");
              }}
              sx={{ gap: 1.25, fontSize: "0.8125rem", fontWeight: 500, borderRadius: 1, py: 0.75, color: "text.primary" }}
            >
              <SettingsIcon fontSize="small" sx={{ color: "text.secondary" }} />
              {t("header.settings", "Settings")}
            </MenuItem>

            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                setIsLogoutConfirmOpen(true);
              }}
              sx={{ gap: 1.25, color: "error.main", fontSize: "0.8125rem", fontWeight: 500, borderRadius: 1, py: 0.75 }}
            >
              <LogoutIcon fontSize="small" />
              {t("header.signOut", "Sign Out")}
            </MenuItem>
          </Menu>

          {/* Sign Out Confirmation Modal */}
          <Dialog
            open={isLogoutConfirmOpen}
            onClose={() => setIsLogoutConfirmOpen(false)}
            maxWidth="xs"
            fullWidth
            slotProps={{
              paper: {
                sx: {
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "#09090b" : "#ffffff",
                  color: "text.primary",
                  p: 1,
                },
              },
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1.25, color: "text.primary" }}>
              <LogoutIcon sx={{ color: "error.main" }} />
              {t("header.confirmSignOut", "Confirm Sign Out")}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("header.signOutPrompt", "Are you sure you want to sign out and end your active session on PowerForecast?")}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setIsLogoutConfirmOpen(false)} sx={{ fontWeight: 600 }}>
                {t("header.cancel", "Cancel")}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  logout();
                }}
                sx={{ fontWeight: 600, borderRadius: 1.5, px: 2 }}
              >
                {t("header.signOut", "Sign Out")}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Smart Notification Preferences Popover */}
          <NotificationPopover
            anchorEl={notifAnchorEl}
            onClose={() => setNotifAnchorEl(null)}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
