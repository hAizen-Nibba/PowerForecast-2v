import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  Dashboard as DashboardIcon,
  Calculate as CalculatorIcon,
  Bolt as BoltIcon,
  CalendarMonth as CalendarIcon,
  BarChart as AnalyticsIcon,
  VerifiedUser as ShieldIcon,
  Paid as CoinsIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  ChevronRight as ChevronRightIcon,
  HistoryEdu as ChangelogIcon,
  Group as FamilyIcon,
  AdminPanelSettings as HouseholdAdminIcon,
  AccessTime as ClockIcon,
  PowerSettingsNew as PowerIcon,
  ArrowForward as ArrowForwardIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  LightMode as SunIcon,
  DarkMode as MoonIcon,
} from "@mui/icons-material";
import Tooltip from "@mui/material/Tooltip";
import { useList, useGetIdentity, useLogout } from "@refinedev/core";
import { UserAppliance } from "../../types";
import { APP_VERSION, checkSupabaseConnection } from "../../lib/supabaseClient";
import { useLanguage } from "../../context/LanguageContext";
import { SystemChangelogModal } from "../changelog/SystemChangelogModal";
import { getMeralcoTariff, MeralcoTariffData, DEFAULT_MERALCO_TARIFF } from "../../lib/meralcoRateService";
import { useRoom } from "../../context/RoomContext";
import { switchOffCircuit } from "../../lib/sessionService";
import { DEFAULT_EFFECTIVE_RATE } from "../../lib/dailyUsageService";
import { useColorMode } from "../../theme/AppTheme";
import { tokens } from "../../theme/tokens";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  activeWattage?: number;
  runningCount?: number;
}

const DRAWER_WIDTH = 240;

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();
  const { activeRoom, isAdmin, isViewer, openJoinModal } = useRoom();
  const { mode, toggleColorMode } = useColorMode();

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [isLiveDrawerOpen, setIsLiveDrawerOpen] = useState(false);

  // Meralco Tariff Telemetry for Mobile Drawer & Sidebar
  const [tariff, setTariff] = useState<MeralcoTariffData>(DEFAULT_MERALCO_TARIFF);
  const [isTariffRefreshing, setIsTariffRefreshing] = useState(false);

  // Supabase Connection Health Status
  const [dbStatus, setDbStatus] = useState<{ ok: boolean; latency?: number }>({ ok: true, latency: 45 });

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];

  // Live 1-second ticker
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Synchronize circuit toggles across views
  useEffect(() => {
    const handleCircuitToggled = () => {
      if (appliancesRes?.refetch) appliancesRes.refetch();
    };
    window.addEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
    return () => window.removeEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
  }, [appliancesRes]);

  // Synchronize room changes via event listener
  useEffect(() => {
    const handleRoomChanged = () => {
      if (appliancesRes?.refetch) appliancesRes.refetch();
    };
    window.addEventListener("powerforecast_room_changed", handleRoomChanged);
    return () => window.removeEventListener("powerforecast_room_changed", handleRoomChanged);
  }, [appliancesRes]);

  // Fetch Meralco Tariff & DB Status for mobile telemetry
  useEffect(() => {
    let isMounted = true;
    getMeralcoTariff(false).then((data) => {
      if (isMounted) setTariff(data);
    });
    checkSupabaseConnection().then((res) => {
      if (isMounted) setDbStatus({ ok: res.ok, latency: res.latencyMs });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshTariff = async () => {
    if (isTariffRefreshing) return;
    setIsTariffRefreshing(true);
    try {
      const freshData = await getMeralcoTariff(true);
      setTariff(freshData);
    } finally {
      setIsTariffRefreshing(false);
    }
  };

  const runningAppliances = appliances.filter((a) => a.is_currently_on);
  const activeWattage = runningAppliances.reduce((acc, curr) => acc + curr.watts * (curr.quantity || 1), 0);
  const runningCount = runningAppliances.length;
  const effectiveRate = tariff.totalEffectiveRate || DEFAULT_EFFECTIVE_RATE;

  const getAccumulatedPesos = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = app.watts * (app.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    const rate = app.tariff_type === "commercial" ? 15.2 : effectiveRate;
    return accumulatedKwh * rate;
  };

  const getRunningDuration = (turnedOnAt?: string | null) => {
    if (!turnedOnAt) return "00:00:00";
    const start = new Date(turnedOnAt).getTime();
    const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
    const hrs = String(Math.floor(diffSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(diffSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const handleStopCircuit = async (app: UserAppliance) => {
    await switchOffCircuit(app, effectiveRate);
    if (appliancesRes?.refetch) appliancesRes.refetch();
  };

  const handleStopAllCircuits = async () => {
    for (const app of runningAppliances) {
      await switchOffCircuit(app, effectiveRate);
    }
    if (appliancesRes?.refetch) appliancesRes.refetch();
  };

  const totalSessionCost = runningAppliances.reduce((acc, curr) => acc + getAccumulatedPesos(curr), 0);

  // Desktop grouped navigation sections
  const navSections = [
    {
      title: "Overview",
      items: [
        { label: t("nav.dashboard", "Dashboard"), icon: <DashboardIcon fontSize="small" />, path: "/dashboard" },
      ],
    },
    {
      title: "Energy",
      items: [
        { label: t("nav.appliances", "Appliance Hub"), icon: <BoltIcon fontSize="small" />, path: "/appliances" },
        { label: t("nav.calendar", "Smart Calendar"), icon: <CalendarIcon fontSize="small" />, path: "/calendar" },
      ],
    },
    {
      title: "Insights",
      items: [
        { label: t("nav.analytics", "Analytics"), icon: <AnalyticsIcon fontSize="small" />, path: "/analytics" },
        { label: t("nav.forecasting", "Forecasting"), icon: <ShieldIcon fontSize="small" />, path: "/forecasting" },
        { label: t("nav.calculator", "Bill Calculator"), icon: <CalculatorIcon fontSize="small" />, path: "/calculator" },
      ],
    },
  ];

  /* -------------------------------------------------------------------------- */
  /*                       DESKTOP PERMANENT DRAWER CONTENT                     */
  /* -------------------------------------------------------------------------- */
  const desktopDrawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
      {/* Brand Header */}
      <Box>
        <Box
          component={Link}
          to="/"
          onClick={onClose}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 2,
            height: 60,
            boxSizing: "border-box",
            textDecoration: "none",
            color: "inherit",
            borderBottom: "1px solid",
            borderColor: "divider",
            "&:hover": { bgcolor: "action.hover" },
            transition: "background-color 0.15s ease",
          }}
        >
          <Box
            component="img"
            src="/Assets/LOGO.png"
            alt="PowerForecast Logo"
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1.5,
              objectFit: "contain",
            }}
          />
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "text.primary",
                lineHeight: 1.2,
                fontSize: "0.875rem",
              }}
            >
              PowerForecast
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.6875rem",
                fontWeight: 500,
                display: "block",
              }}
            >
              Energy Intelligence
            </Typography>
          </Box>
        </Box>

        {/* Grouped Navigation List */}
        <Box sx={{ px: 1, py: 1.5 }} data-tour="nav-sidebar">
          {navSections.map((section, sIdx) => (
            <Box key={section.title} sx={{ mb: sIdx < navSections.length - 1 ? 1.5 : 0 }}>
              <Typography
                variant="caption"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  display: "block",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "text.disabled",
                }}
              >
                {section.title}
              </Typography>
              <List disablePadding>
                {section.items.map((item) => {
                  const isActive =
                    location.pathname === item.path || (item.path === "/dashboard" && location.pathname === "/");
                  return (
                    <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
                      <ListItemButton
                        component={Link}
                        to={item.path}
                        selected={isActive}
                        onClick={onClose}
                        sx={{
                          borderRadius: 1.5,
                          py: 0.85,
                          px: 1.25,
                          "&.Mui-selected": {
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                            color: "text.primary",
                            "&:hover": {
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                            },
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 28,
                            color: isActive ? "text.primary" : "text.secondary",
                            transition: "color 0.15s ease",
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          slotProps={{
                            primary: {
                              sx: {
                                fontSize: "0.8125rem",
                                fontWeight: isActive ? 600 : 450,
                                color: isActive ? "text.primary" : "text.secondary",
                                letterSpacing: "-0.01em",
                              },
                            },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Live Grid Load Card & Footer */}
      <Box sx={{ p: 1.75, borderTop: "1px solid", borderColor: "divider" }}>
        <Tooltip title="Click to view & control active live circuits" arrow placement="top">
          <Paper
            elevation={0}
            onClick={() => setIsLiveDrawerOpen(true)}
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#121215" : "#fcfcfc",
              border: "1px solid",
              borderColor: (theme) =>
                runningCount > 0
                  ? theme.palette.mode === "dark"
                    ? "rgba(52, 211, 153, 0.3)"
                    : "rgba(5, 150, 105, 0.3)"
                  : "divider",
              mb: 1.25,
              cursor: "pointer",
              transition: "border-color 0.15s ease",
              "&:hover": {
                borderColor: (theme) =>
                  runningCount > 0
                    ? theme.palette.mode === "dark"
                      ? "rgba(52, 211, 153, 0.5)"
                      : "rgba(5, 150, 105, 0.5)"
                    : "text.disabled",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: runningCount > 0 ? "success.main" : "text.disabled",
                    transition: "all 0.2s ease",
                  }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.75rem" }}>
                  {t("nav.liveLoad", "Live Load")}
                </Typography>
              </Box>
              <Chip
                label={`${runningCount} Active`}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  bgcolor: (theme) =>
                    runningCount > 0
                      ? theme.palette.mode === "dark"
                        ? "rgba(52, 211, 153, 0.12)"
                        : "rgba(5, 150, 105, 0.1)"
                      : "action.hover",
                  color: (theme) => (runningCount > 0 ? "success.main" : "text.secondary"),
                  border: "1px solid",
                  borderColor: (theme) =>
                    runningCount > 0
                      ? theme.palette.mode === "dark"
                        ? "rgba(52, 211, 153, 0.25)"
                        : "rgba(5, 150, 105, 0.25)"
                      : "transparent",
                }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: "text.primary",
                  lineHeight: 1.2,
                }}
              >
                {activeWattage.toLocaleString()} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>W</Typography>
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "success.main",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 600,
                }}
              >
                ₱{((activeWattage / 1000) * effectiveRate).toFixed(2)}/hr
              </Typography>
            </Box>

            {runningCount > 0 && (
              <>
                <Divider sx={{ my: 0.75, borderColor: "divider" }} />
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                    Session:
                  </Typography>
                  <Typography variant="caption" sx={{ color: "success.main", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    ₱{totalSessionCost.toFixed(2)}
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        </Tooltip>

        {/* Desktop Theme Switcher Toggle */}
        <Box
          onClick={toggleColorMode}
          role="button"
          tabIndex={0}
          aria-label={`Switch to ${mode === "dark" ? "Light" : "Dark"} Mode`}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.25,
            py: 0.75,
            mb: 1.25,
            borderRadius: 1,
            cursor: "pointer",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            transition: "all 0.15s ease",
            "&:hover": {
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.zinc[800] : tokens.zinc[200],
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {mode === "dark" ? (
              <SunIcon sx={{ fontSize: 15, color: "warning.main" }} />
            ) : (
              <MoonIcon sx={{ fontSize: 15, color: "text.primary" }} />
            )}
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary", fontSize: "0.75rem" }}>
              {mode === "dark" ? "Light Mode" : "Dark Mode"}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={mode === "dark" ? "Dark" : "Light"}
            sx={{
              height: 18,
              fontSize: "0.625rem",
              fontWeight: 600,
              textTransform: "uppercase",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.zinc[800] : tokens.zinc[200],
              color: "text.secondary",
            }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <ShieldIcon sx={{ fontSize: 13, color: "text.disabled" }} />
            <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>
              Cloud Sync
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontVariantNumeric: "tabular-nums",
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: "text.secondary",
            }}
          >
            {APP_VERSION}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  /* -------------------------------------------------------------------------- */
  /*           MOBILE STREAMLINED RIGHT-SIDE DRAWER CONTENT                     */
  /* -------------------------------------------------------------------------- */
  const mobileDrawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        p: 2,
        gap: 1.75,
        boxSizing: "border-box",
      }}
    >
      {/* 1. Header with Close Button (Icon and PowerForecast name removed) */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1.25,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            fontSize: "0.9375rem",
            letterSpacing: "-0.01em",
          }}
        >
          {t("nav.mobile.more", "More")}
        </Typography>

        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Close navigation menu"
          sx={{
            p: 0.75,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "transparent",
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* 2. User Profile Card & Logout */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: 1.5,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "#121215" : "#fcfcfc",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Avatar
            src={identity?.avatar}
            sx={{
              width: 40,
              height: 40,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontWeight: 700,
              fontSize: "1rem",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            {identity?.name?.charAt(0) || "U"}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "0.875rem",
              }}
            >
              {identity?.name || "PowerForecast User"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                fontSize: "0.6875rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {identity?.email || "Authenticated Account"}
            </Typography>
            {isViewer ? (
              <Chip
                icon={<VisibilityIcon sx={{ fontSize: "11px !important", color: "warning.main !important" }} />}
                label={activeRoom ? `View-only · ${activeRoom.room_name}` : "View-only"}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.625rem",
                  fontWeight: 600,
                  maxWidth: 160,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.12)" : "rgba(217, 119, 6, 0.1)",
                  color: "warning.main",
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.3)" : "rgba(217, 119, 6, 0.3)",
                  mt: 0.5,
                  '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                }}
              />
            ) : (
              <Chip
                icon={<ShieldIcon sx={{ fontSize: "11px !important", color: "success.main !important" }} />}
                label={activeRoom?.is_owner ? "Room Owner" : "Room Admin"}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.625rem",
                  fontWeight: 600,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.12)" : "rgba(5, 150, 105, 0.1)",
                  color: "success.main",
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.3)" : "rgba(5, 150, 105, 0.3)",
                  mt: 0.5,
                }}
              />
            )}
          </Box>
        </Box>

        {/* Join Room with Code Button */}
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => { openJoinModal(); if (onClose) onClose(); }}
          sx={{
            mb: 1,
            borderRadius: 1.5,
            fontWeight: 600,
            fontSize: "0.75rem",
            py: 0.75,
            textTransform: "none",
            borderColor: "divider",
            color: "text.primary",
            "&:hover": {
              bgcolor: "action.hover",
              borderColor: "text.secondary",
            },
          }}
        >
          Join a Room with Code
        </Button>

        <Button
          fullWidth
          variant="outlined"
          color="error"
          size="small"
          startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
          onClick={() => setIsLogoutConfirmOpen(true)}
          sx={{
            borderRadius: 1.5,
            fontWeight: 600,
            fontSize: "0.75rem",
            py: 0.75,
            textTransform: "none",
            borderColor: "error.main",
            color: "error.main",
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          {t("header.signOut", "Sign Out")}
        </Button>
      </Paper>

      {/* 3. Quick Navigation (Settings, API Docs, Forecasting) */}
      <Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: "text.disabled",
            px: 0.5,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontSize: "0.625rem",
          }}
        >
          Navigation & Tools
        </Typography>
        <List disablePadding sx={{ mt: 0.75, display: "flex", flexDirection: "column", gap: 0.75 }}>
          {/* Settings */}
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/settings"
              onClick={onClose}
              sx={{
                borderRadius: 1.5,
                py: 0.85,
                px: 1.5,
                border: "1px solid",
                borderColor: "divider",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "text.secondary",
                },
                transition: "all 0.15s ease",
              }}
            >
              <ListItemIcon sx={{ minWidth: 30, color: "text.secondary" }}>
                <SettingsIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary={t("header.settings", "Settings")}
                secondary="Preferences & App Configuration"
                slotProps={{
                  primary: { sx: { fontSize: "0.8125rem", fontWeight: 600 } },
                  secondary: { sx: { fontSize: "0.6875rem", color: "text.secondary" } },
                }}
              />
              <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
            </ListItemButton>
          </ListItem>

          {/* Forecasting */}
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/forecasting"
              onClick={onClose}
              sx={{
                borderRadius: 1.5,
                py: 0.85,
                px: 1.5,
                border: "1px solid",
                borderColor: "divider",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "text.secondary",
                },
                transition: "all 0.15s ease",
              }}
            >
              <ListItemIcon sx={{ minWidth: 30, color: "text.secondary" }}>
                <ShieldIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary={t("nav.forecasting", "Forecasting")}
                secondary="ML Demand & Tariff Forecasting"
                slotProps={{
                  primary: { sx: { fontSize: "0.8125rem", fontWeight: 600 } },
                  secondary: { sx: { fontSize: "0.6875rem", color: "text.secondary" } },
                }}
              />
              <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

      {/* 4. Live Grid Load Card */}
      <Paper
        elevation={0}
        onClick={() => setIsLiveDrawerOpen(true)}
        sx={{
          p: 1.75,
          borderRadius: 1.5,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "#121215" : "#fcfcfc",
          border: "1px solid",
          borderColor: (theme) =>
            runningCount > 0
              ? theme.palette.mode === "dark"
                ? "rgba(52, 211, 153, 0.3)"
                : "rgba(5, 150, 105, 0.3)"
              : "divider",
          cursor: "pointer",
          transition: "border-color 0.15s ease",
          "&:hover": {
            borderColor: (theme) =>
              runningCount > 0
                ? theme.palette.mode === "dark"
                  ? "rgba(52, 211, 153, 0.5)"
                  : "rgba(5, 150, 105, 0.5)"
                : "text.disabled",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: runningCount > 0 ? "success.main" : "text.disabled",
                transition: "all 0.2s ease",
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.75rem" }}>
              {t("nav.liveLoad", "Live Load")}
            </Typography>
          </Box>
          <Chip
            label={`${runningCount} Active`}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.6875rem",
              fontWeight: 600,
              bgcolor: (theme) =>
                runningCount > 0
                  ? theme.palette.mode === "dark"
                    ? "rgba(52, 211, 153, 0.12)"
                    : "rgba(5, 150, 105, 0.1)"
                  : "action.hover",
              color: (theme) => (runningCount > 0 ? "success.main" : "text.secondary"),
              border: "1px solid",
              borderColor: (theme) =>
                runningCount > 0
                  ? theme.palette.mode === "dark"
                    ? "rgba(52, 211, 153, 0.25)"
                    : "rgba(5, 150, 105, 0.25)"
                  : "transparent",
            }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: "text.primary",
            }}
          >
            {activeWattage.toLocaleString()} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>W</Typography>
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "success.main",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
            }}
          >
            ₱{((activeWattage / 1000) * effectiveRate).toFixed(2)}/hr
          </Typography>
        </Box>

        {runningCount > 0 && (
          <>
            <Divider sx={{ my: 1, borderColor: "divider" }} />
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                Active Session:
              </Typography>
              <Typography variant="caption" sx={{ color: "success.main", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                ₱{totalSessionCost.toFixed(2)}
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* 5. Meralco Generation Rate Card */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: 1.5,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "#121215" : "#fcfcfc",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <BoltIcon sx={{ fontSize: 16, color: "warning.main" }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
              Meralco Generation Rate
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleRefreshTariff}
            disabled={isTariffRefreshing}
            sx={{ p: 0.5, borderRadius: 1 }}
            aria-label="Refresh tariff rate"
          >
            <RefreshIcon
              sx={{
                fontSize: 15,
                color: "text.secondary",
                animation: isTariffRefreshing ? "spin 0.8s linear infinite" : "none",
                "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
              }}
            />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: "text.primary",
            }}
          >
            ₱{tariff.generationRate.toFixed(4)} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>/kWh</Typography>
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontVariantNumeric: "tabular-nums",
              fontSize: "0.6875rem",
              fontWeight: 500,
            }}
          >
            Total: ₱{tariff.totalEffectiveRate.toFixed(4)}/kWh
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem", display: "block", mt: 0.5 }}>
          {tariff.billingPeriod}
        </Typography>
      </Paper>

      {/* 6. System & Version Banner with Changelogs */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: 1.5,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "#121215" : "#fcfcfc",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box data-tour="header-db-status" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: dbStatus.ok ? "success.main" : "warning.main",
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.6875rem" }}>
              {dbStatus.ok ? `Supabase Cloud (${dbStatus.latency || 45}ms)` : "Local / Offline"}
            </Typography>
          </Box>

          <Chip
            label={APP_VERSION}
            size="small"
            sx={{
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
              fontSize: "0.6875rem",
              height: 20,
              bgcolor: "action.hover",
              color: "text.secondary",
              border: "1px solid",
              borderColor: "divider",
            }}
          />
        </Box>

        {/* Mobile Drawer Theme Switcher Toggle */}
        <Box
          onClick={toggleColorMode}
          role="button"
          tabIndex={0}
          aria-label={`Switch to ${mode === "dark" ? "Light" : "Dark"} Mode`}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.25,
            py: 0.75,
            my: 1,
            borderRadius: 1,
            cursor: "pointer",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            transition: "all 0.15s ease",
            "&:hover": {
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.zinc[800] : tokens.zinc[200],
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {mode === "dark" ? (
              <SunIcon sx={{ fontSize: 16, color: "warning.main" }} />
            ) : (
              <MoonIcon sx={{ fontSize: 16, color: "text.primary" }} />
            )}
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary", fontSize: "0.75rem" }}>
              {mode === "dark" ? "Light Mode" : "Dark Mode"}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={mode === "dark" ? "Dark" : "Light"}
            sx={{
              height: 18,
              fontSize: "0.625rem",
              fontWeight: 600,
              textTransform: "uppercase",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.zinc[800] : tokens.zinc[200],
              color: "text.secondary",
            }}
          />
        </Box>

        {/* View Version Changelogs Button */}
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<ChangelogIcon sx={{ fontSize: 16 }} />}
          onClick={() => setIsChangelogModalOpen(true)}
          sx={{
            mt: 0.75,
            py: 0.75,
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "none",
            borderRadius: 1.5,
            color: "text.primary",
            borderColor: "divider",
            "&:hover": {
              bgcolor: "action.hover",
              borderColor: "text.secondary",
            },
          }}
        >
          View Version Changelogs
        </Button>
      </Paper>
    </Box>
  );

  return (
    <>
      {/* Mobile Streamlined Drawer - Anchored to the RIGHT */}
      <Drawer
        anchor="right"
        variant="temporary"
        open={isOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            width: { xs: "86vw", sm: 340 },
            maxWidth: 360,
            boxSizing: "border-box",
            borderRadius: "12px 0 0 12px",
            borderLeft: "1px solid",
            borderColor: "divider",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "#09090b" : "#ffffff",
          },
        }}
      >
        {mobileDrawerContent}
      </Drawer>

      {/* Desktop Permanent Drawer - Anchored to the LEFT */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            borderRadius: 0,
          },
        }}
        open
      >
        {desktopDrawerContent}
      </Drawer>

      {/* Mobile Sign Out Confirmation Dialog */}
      <Dialog
        open={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
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
              onClose?.();
              logout();
            }}
            sx={{ fontWeight: 600, borderRadius: 1.5, px: 2 }}
          >
            {t("header.signOut", "Sign Out")}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Version Changelogs Modal */}
      <SystemChangelogModal
        isOpen={isChangelogModalOpen}
        onClose={() => setIsChangelogModalOpen(false)}
      />

      {/* Live Circuits & Active Stopwatch Inspection Dialog */}
      <Dialog
        open={isLiveDrawerOpen}
        onClose={() => setIsLiveDrawerOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#09090b" : "#ffffff",
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.12)" : "rgba(5, 150, 105, 0.1)",
                color: "success.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BoltIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Live Load Circuits
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Real-time active stopwatch power monitoring
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setIsLiveDrawerOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {/* Summary Banner */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2.5,
              borderRadius: 1.5,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#121215" : "#f4f4f5",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Total Active Load
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "text.primary" }}>
                {activeWattage.toLocaleString()} <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Watts</span>
              </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Current Running Burn
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "success.main" }}>
                ₱{((activeWattage / 1000) * effectiveRate).toFixed(2)}/hr
              </Typography>
            </Box>
          </Paper>

          {/* Running Circuits List */}
          {runningAppliances.length === 0 ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <PowerIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1, opacity: 0.5 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                No circuits are currently active
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, maxWidth: 360, mx: "auto" }}>
                Use the Start button in Appliance Hub or the Live Power Board on Dashboard to turn on appliances and track real-time power.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {runningAppliances.map((app) => (
                <Paper
                  key={app.id}
                  elevation={0}
                  sx={{
                    p: 1.75,
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "#121215" : "#fcfcfc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          bgcolor: "success.main",
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {app.name}
                      </Typography>
                      <Chip
                        label={`${app.watts * (app.quantity || 1)}W`}
                        size="small"
                        sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                      />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: "success.main", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                        ⏱ {getRunningDuration(app.last_turned_on_at)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                        • ₱{getAccumulatedPesos(app).toFixed(2)} spent
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleStopCircuit(app)}
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: 1.5,
                      textTransform: "none",
                      px: 1.5,
                    }}
                  >
                    Stop
                  </Button>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              component={Link}
              to="/dashboard"
              onClick={() => setIsLiveDrawerOpen(false)}
              size="small"
              variant="outlined"
              endIcon={<ArrowForwardIcon fontSize="small" />}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Dashboard
            </Button>
            <Button
              component={Link}
              to="/calendar"
              onClick={() => setIsLiveDrawerOpen(false)}
              size="small"
              variant="outlined"
              endIcon={<ArrowForwardIcon fontSize="small" />}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Calendar
            </Button>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {runningAppliances.length > 1 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleStopAllCircuits}
                sx={{ textTransform: "none", fontWeight: 800 }}
              >
                Stop All ({runningAppliances.length})
              </Button>
            )}
            <Button
              onClick={() => setIsLiveDrawerOpen(false)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Sidebar;
