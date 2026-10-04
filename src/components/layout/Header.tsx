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
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Badge from "@mui/material/Badge";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  NotificationsNone as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  HelpOutlined as HelpIcon,
  Settings as SettingsIcon,
  Shield as ShieldIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  MeetingRoom as RoomIcon,
  Check as CheckIcon,
  ContentCopy as CopyIcon,
  Group as GroupIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { NotificationPopover } from "./NotificationPopover";
import { getNotificationPermission, getNotificationLogs } from "../../lib/notificationService";
import { useTour } from "../../hooks/useTour";
import { ROUTE_TO_TOUR_PAGE } from "../tour/tourSteps";
import { useLanguage } from "../../context/LanguageContext";
import { MeralcoRatePopover } from "./MeralcoRatePopover";
import { useRoom } from "../../context/RoomContext";
import { useToast } from "../common/ToastProvider";

interface HeaderProps {
  onOpenSidebar: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onOpenAiScanner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { openWelcomeModal, isActive: isTourActive } = useTour();
  const currentTourPage = ROUTE_TO_TOUR_PAGE[location.pathname] || (location.pathname === "/" ? "dashboard" : null);

  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();
  const { rooms, activeRoom, switchRoom, openJoinModal } = useRoom();
  const { showSuccess } = useToast();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const notifPermission = getNotificationPermission();

  const handleCopyCode = (e: React.MouseEvent, code?: string) => {
    e.stopPropagation();
    if (code) {
      navigator.clipboard.writeText(code);
      showSuccess(`Room code ${code} copied to clipboard!`, "Copied");
    }
  };

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
        borderRadius: 0,
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          height: 60,
          minHeight: "60px !important",
          boxSizing: "border-box",
          px: { xs: 2, sm: 2.5, md: 3 },
          gap: 1.5,
        }}
      >
        {/* Left: Mobile Toggle / Back, Page Title / Room Breadcrumb, and Tariff */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
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

          {/* Breadcrumb Path: Page Title FIRST (Larger & Bolder) / Room Name SECOND */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.75, mr: 0.5 }}>
            <Typography
              variant="subtitle1"
              sx={{
                color: "text.primary",
                fontWeight: 700,
                fontSize: { xs: "0.95rem", sm: "1.05rem", md: "1.1rem" },
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              {getPageTitle(location.pathname)}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.disabled", fontSize: "0.85rem", mx: 0.25 }}>
              /
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontWeight: 500,
                fontSize: "0.8125rem",
              }}
            >
              {activeRoom?.room_name || "Home Room"}
            </Typography>
          </Box>

          {/* Meralco Generation Rate Badge & Hover Breakdown Popover */}
          <Box data-tour="header-rate-popover">
            <MeralcoRatePopover />
          </Box>
        </Box>

        {/* Right: Guided Tour, Notifications, and User Profile with Embedded Rooms/Household Dropdown */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                    width: unreadNotifCount > 0 ? "auto" : 6,
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

          {/* User Profile Pill & Dropdown Menu */}
          <Box
            data-tour="header-profile"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: "4px 8px 4px 4px",
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
              sx={{
                width: 26,
                height: 26,
                borderRadius: 1,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
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

          {/* Profile Menu with Embedded Rooms & Household Dropdown Above Settings */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 260,
                  maxWidth: 320,
                  p: 0.5,
                  borderRadius: 1.5,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "#09090b" : "#ffffff",
                  color: "text.primary",
                },
              },
            }}
          >
            {/* 1. User Profile Details */}
            <Box sx={{ px: 2, py: 1.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                {identity?.name || "PowerForecast User"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
                {identity?.email || "Authenticated Account"}
              </Typography>
              <Chip
                icon={<ShieldIcon sx={{ fontSize: "12px !important", color: "warning.main !important" }} />}
                label={activeRoom?.is_owner ? t("header.ownerBadge", "Household Owner") : (activeRoom?.role === "admin" ? "Household Admin" : "Household Viewer")}
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

            {/* 2. Rooms and Household Section (Under Profile, Above Settings) */}
            <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 800,
                  color: "text.disabled",
                  letterSpacing: "0.08em",
                  fontSize: "0.625rem",
                  display: "block",
                }}
              >
                Rooms & Household
              </Typography>
            </Box>

            {rooms.map((r) => {
              const isCurrent = r.room_id === activeRoom?.room_id;
              const isItemAdmin = r.is_owner || r.role === "admin";
              return (
                <MenuItem
                  key={r.room_id}
                  onClick={() => {
                    switchRoom(r.room_id);
                    setAnchorEl(null);
                  }}
                  selected={isCurrent}
                  sx={{
                    borderRadius: 1,
                    my: 0.25,
                    mx: 0.5,
                    py: 0.75,
                    px: 1.5,
                    bgcolor: isCurrent
                      ? (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(0, 229, 201, 0.12) !important"
                            : "rgba(0, 229, 201, 0.08) !important"
                      : "transparent",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    {r.is_owner ? (
                      <HomeIcon sx={{ fontSize: 17, color: "primary.main" }} />
                    ) : (
                      <RoomIcon sx={{ fontSize: 17, color: isItemAdmin ? "#34d399" : "#f59e0b" }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isCurrent ? 700 : 500,
                            color: isCurrent ? "primary.main" : "text.primary",
                            fontSize: "0.8125rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 130,
                          }}
                        >
                          {r.room_name}
                        </Typography>
                        <Chip
                          size="small"
                          label={r.is_owner ? "Owner" : isItemAdmin ? "Admin" : "View"}
                          sx={{
                            height: 16,
                            fontSize: "0.5625rem",
                            fontWeight: 700,
                            bgcolor: r.is_owner
                              ? "rgba(0, 229, 201, 0.15)"
                              : isItemAdmin
                              ? "rgba(52, 211, 153, 0.15)"
                              : "rgba(245, 158, 11, 0.15)",
                            color: r.is_owner ? "primary.main" : isItemAdmin ? "#34d399" : "#f59e0b",
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary", fontSize: "0.6875rem" }}>
                        {r.room_code}
                      </Typography>
                    }
                  />
                  {isCurrent && <CheckIcon sx={{ fontSize: 16, color: "primary.main", ml: 1 }} />}
                </MenuItem>
              );
            })}

            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                openJoinModal();
              }}
              sx={{ borderRadius: 1, mx: 0.5, py: 0.6, px: 1.5, gap: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <AddIcon sx={{ fontSize: 17, color: "primary.main" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main", fontSize: "0.75rem" }}>
                    Join another Room with Code
                  </Typography>
                }
              />
            </MenuItem>

            {activeRoom?.room_code && (
              <MenuItem
                onClick={(e) => handleCopyCode(e, activeRoom.room_code)}
                sx={{ borderRadius: 1, mx: 0.5, py: 0.6, px: 1.5, gap: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <CopyIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                      Copy Room Code ({activeRoom.room_code})
                    </Typography>
                  }
                />
              </MenuItem>
            )}

            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate("/settings");
                setTimeout(() => {
                  const el = document.getElementById("room-members-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }, 150);
              }}
              sx={{ borderRadius: 1, mx: 0.5, py: 0.6, px: 1.5, gap: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <GroupIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                    Manage Room Members
                  </Typography>
                }
              />
            </MenuItem>

            <Divider sx={{ my: 0.5 }} />

            {/* 3. Settings Navigation */}
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

            <Divider sx={{ my: 0.5 }} />

            {/* 4. Sign Out */}
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
            onClose={() => {
              setNotifAnchorEl(null);
              setUnreadNotifCount(getNotificationLogs().filter((l) => !l.read).length);
            }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
