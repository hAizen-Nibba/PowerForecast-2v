import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import Radio from "@mui/material/Radio";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Switch from "@mui/material/Switch";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import {
  Settings as SettingsIcon,
  Tune as GeneralIcon,
  Translate as LanguageIcon,
  People as HouseholdIcon,
  DeleteForever as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  Bolt as BoltIcon,
  Shield as ShieldIcon,
  WarningAmber as WarningIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
  NotificationsActive as NotificationsActiveIcon,
  Sensors as SensorsIcon,
  CloudDone as CloudDoneIcon,
  ExpandMore as ExpandMoreIcon,
  HelpOutlined as HelpIcon,
  Explore as ExploreIcon,
  RocketLaunch as RocketIcon,
  RestartAlt as ResetIcon,
  PlayArrow as PlayArrowIcon,
  Calculate as CalculateIcon,
  CalendarToday as CalendarIcon,
  Insights as InsightsIcon,
  AutoGraph as AutoGraphIcon,
  Dashboard as DashboardIcon,
  AccessTime as ClockIcon,
  Timer as TimerIcon,
  Logout as LogoutIcon,
  DeviceHub as DeviceHubIcon,
  VerifiedUser as VerifiedIcon,
  VolumeUp as SoundIcon,
  Vibration as VibrationIcon,
  FlashOn as SurgeIcon,
  AccountBalanceWallet as BudgetIcon,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTour } from "../../hooks/useTour";
import {
  FULL_TOUR_PAGE_ORDER,
  PAGE_METADATA,
  ALL_PAGE_TOURS,
  PAGE_TO_ROUTE,
  TourPage,
} from "../tour/tourSteps";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { useToast } from "../common/ToastProvider";
import { supabaseClient } from "../../lib/supabaseClient";
import { useLanguage, Language } from "../../context/LanguageContext";
import { useRoom } from "../../context/RoomContext";
import { useNotifications } from "../../hooks/useNotifications";
import { NotificationLevel } from "../../lib/notificationService";
import { devLog } from "../../lib/devLogger";
import {
  isPushSupported,
  getPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestBackgroundPush,
} from "../../lib/pushNotificationService";
import { RoomMembersPanel } from "../rooms/RoomMembersPanel";
import { ChangePasswordCard } from "./ChangePasswordCard";

const SETTINGS_TABS = ["general", "household", "notifications", "security"] as const;
type SettingsTabKey = (typeof SETTINGS_TABS)[number];

const LEVEL_CONFIG: Record<
  NotificationLevel,
  { label: string; sub: string; color: string; bg: string; border: string }
> = {
  relaxed: {
    label: "Relaxed (L1)",
    sub: "Passive & silent; high thresholds only (6h timer, 90% budget)",
    color: "#60a5fa",
    bg: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.35)",
  },
  standard: {
    label: "Standard (L2)",
    sub: "Balanced household tracking (4h timer, 80% budget, peak hours)",
    color: "#00e5c9",
    bg: "rgba(0, 229, 201, 0.12)",
    border: "rgba(0, 229, 201, 0.35)",
  },
  proactive: {
    label: "Proactive (L3)",
    sub: "Energy saver; 2h timer, 70% budget, >2.5kW surge, chimes & haptics",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.35)",
  },
  strict: {
    label: "Strict (L4)",
    sub: "Maximum vigilance; 1h timer, 50% budget, >2.0kW surge, urgent alarms",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.4)",
  },
};

export const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { startTour, startFullTour, resetTour, completedPages } = useTour();
  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();
  const { showSuccess, showError, showInfo } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { activeRoom, role: roomRole, isOwner } = useRoom();

  // Unified Notifications hook
  const {
    permission: notifPermission,
    isSupported: isNotifSupported,
    prefs: notifPrefs,
    setLevel: setNotifLevel,
    requestPermission: requestNotifPermission,
    updatePrefs: updateNotifPrefs,
    testNotification: triggerTestNotification,
    previewSound,
    previewVibration,
  } = useNotifications();

  // Tab state synchronized with URL search param: /settings?tab=general|household|notifications|security
  const tabParam = searchParams.get("tab") as SettingsTabKey | null;
  const activeTabIndex =
    tabParam && SETTINGS_TABS.indexOf(tabParam) !== -1
      ? SETTINGS_TABS.indexOf(tabParam)
      : 0;

  const handleTabChange = (_: React.SyntheticEvent, newIndex: number) => {
    setSearchParams({ tab: SETTINGS_TABS[newIndex] }, { replace: true });
  };

  const [isSignoutConfirmOpen, setIsSignoutConfirmOpen] = useState(false);

  // ── 2. Language & Localization ───────────────────────────
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    showSuccess(
      lang === "tl" ? "Wika ay pinalitan sa Tagalog (Filipino)!" : "Language updated to English (US)!",
      lang === "tl" ? "Na-update ang Wika" : "Language Updated"
    );
  };

  // ── 3. Web Push & Background OS Notifications ─────────────
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [pushCountdown, setPushCountdown] = useState<number | null>(null);
  const [pushEndpointType, setPushEndpointType] = useState<string>("Detecting...");

  useEffect(() => {
    if (isPushSupported()) {
      getPushSubscription().then((sub) => {
        setIsPushSubscribed(Boolean(sub));
        if (sub?.endpoint) {
          if (sub.endpoint.includes("fcm.googleapis.com")) setPushEndpointType("Google FCM / Chrome");
          else if (sub.endpoint.includes("notify.windows.com")) setPushEndpointType("Microsoft WNS / Edge");
          else if (sub.endpoint.includes("mozilla.com")) setPushEndpointType("Mozilla Autopush");
          else setPushEndpointType("W3C Standard Gateway");
        } else {
          setPushEndpointType("Not Subscribed");
        }
      });
    } else {
      setPushEndpointType("Unsupported");
    }
  }, []);

  const handleToggleWebPush = async () => {
    setIsPushLoading(true);
    try {
      if (isPushSubscribed) {
        await unsubscribeFromPush(identity?.id);
        setIsPushSubscribed(false);
        setPushEndpointType("Not Subscribed");
        showInfo(
          language === "tl"
            ? "Na-unlink ang device sa Web Push notifications."
            : "Device unlinked from background Web Push notifications."
        );
      } else {
        const res = await subscribeToPush(identity?.id);
        if (res.success) {
          setIsPushSubscribed(true);
          const endpoint = res.subscription?.endpoint || "";
          if (endpoint.includes("fcm.googleapis.com")) setPushEndpointType("Google FCM / Chrome");
          else if (endpoint.includes("notify.windows.com")) setPushEndpointType("Microsoft WNS / Edge");
          else if (endpoint.includes("mozilla.com")) setPushEndpointType("Mozilla Autopush");
          else setPushEndpointType("W3C Standard Gateway");

          showSuccess(
            language === "tl"
              ? "Matagumpay na na-link ang device para sa closed-app push alerts!"
              : "Device successfully registered for closed-app Web Push alerts!",
            "Web Push Active"
          );
        } else {
          showError(res.error || "Failed to enable Web Push.");
        }
      }
    } catch (err: any) {
      showError(err?.message || "Failed to update push subscription.");
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleTestBackgroundPush = async () => {
    setPushCountdown(5);
    showInfo(
      language === "tl"
        ? "Alert scheduled! Isara ang browser o PWA ngayon upang masubukan ang Windows Action Center notification."
        : "Alert scheduled! Close your browser or PWA window right now to verify closed-app delivery in Windows Action Center."
    );

    sendTestBackgroundPush({
      delaySeconds: 5,
      title: "PowerForecast Background Alert",
      message: "⚡ Closed-app push alert successfully received by your device!",
      userId: identity?.id,
    }).catch((err) => {
      devLog.warn("Settings", "Background push error:", err);
    });

    const interval = setInterval(() => {
      setPushCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── 4. Account Deletion Security Flow ─────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleOpenDeleteModal = () => {
    setDeletePassword("");
    setDeleteConfirmText("");
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const isDeleteReady = deletePassword.length > 0 && deleteConfirmText === "Confirm";

  const handleExecuteAccountDeletion = async () => {
    if (!isDeleteReady) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      // 1. Authenticate with password to verify identity
      const userEmail = identity?.email || "";
      if (userEmail) {
        const { error: authErr } = await supabaseClient.auth.signInWithPassword({
          email: userEmail,
          password: deletePassword,
        });

        if (authErr) {
          setDeleteError(
            language === "tl"
              ? "Maling password. Pakisuri ang kasalukuyang password ng iyong account."
              : "Incorrect password. Please verify your current account password."
          );
          setIsDeleting(false);
          return;
        }
      }

      // 2. Wipe user data records from Supabase tables
      const userId = identity?.id;
      if (userId) {
        try {
          await supabaseClient.from("daily_appliance_usage").delete().eq("user_id", userId);
          await supabaseClient.from("simulated_appliance_usage").delete().eq("user_id", userId);
          await supabaseClient.from("appliance_usage_logs").delete().eq("user_id", userId);
          await supabaseClient.from("user_appliances").delete().eq("user_id", userId);
          await supabaseClient.from("user_calendar_events").delete().eq("user_id", userId);
          await supabaseClient.from("appliance_lists").delete().eq("user_id", userId);
          await supabaseClient.from("accounts").delete().eq("id", userId);
        } catch (dbErr) {
          console.warn("Error cleaning up database rows:", dbErr);
        }
      }

      // 3. Clear local storage caches
      localStorage.removeItem("powerforecast_active_user");
      if (userId) {
        localStorage.removeItem(`powerforecast_active_room_${userId}`);
        localStorage.removeItem(`powerforecast_active_room_owner_${userId}`);
        localStorage.removeItem(`powerforecast_active_room_role_${userId}`);
      }

      showSuccess(
        language === "tl"
          ? "Ang iyong account at lahat ng datos ay permanenteng nabura na."
          : "Your account and all associated telemetry have been permanently deleted.",
        language === "tl" ? "Nabura ang Account" : "Account Deleted"
      );
      setIsDeleteModalOpen(false);

      // 4. Sign out
      logout();
    } catch (err: any) {
      setDeleteError(err?.message || "An unexpected error occurred during account deletion.");
      setIsDeleting(false);
    }
  };

  const userInitial =
    identity?.name?.charAt(0)?.toUpperCase() ||
    identity?.email?.charAt(0)?.toUpperCase() ||
    "U";

  const activeLevelConfig = LEVEL_CONFIG[notifPrefs.notificationLevel || "standard"];

  return (
    <Box
      sx={{
        maxWidth: 1080,
        mx: "auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2.5, sm: 3 },
      }}
    >
      {/* ── Production Header & Breadcrumbs ── */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "primary.main",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            PowerForecast Refine
          </Typography>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            /
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
            {t("settings.title", "Account & Household Settings")}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, flexWrap: "wrap", gap: 1.5 }}>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                color: "text.primary",
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                letterSpacing: "-0.02em",
              }}
            >
              <SettingsIcon sx={{ color: "primary.main", fontSize: 28 }} />
              {t("settings.title", "Account & Household Settings")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {t(
                "settings.subtitle",
                "Manage your language preferences, invite family members with tailored roles, and manage your account security."
              )}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Active User Profile Banner (UID Removed) ── */}
      <Card
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(13, 148, 136, 0.18)",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(20, 24, 30, 0.85)" : "#ffffff",
          backdropFilter: "blur(12px)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              src={identity?.avatar}
              sx={{
                width: 52,
                height: 52,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 800,
                fontSize: "1.25rem",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "0 0 16px rgba(0, 229, 201, 0.3)"
                    : "0 2px 10px rgba(13, 148, 136, 0.25)",
              }}
            >
              {userInitial}
            </Avatar>

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}>
                  {identity?.name || (identity?.email ? identity.email.split("@")[0] : "Authenticated User")}
                </Typography>
                <Chip
                  icon={<VerifiedIcon sx={{ fontSize: "13px !important" }} />}
                  label={isOwner ? (language === "tl" ? "May-ari ng Bahay" : "Household Owner") : (roomRole || "Household Member")}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 800, fontSize: "0.6875rem", height: 22 }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
                {identity?.email || "No email detected"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => setIsSignoutConfirmOpen(true)}
              startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: 1.5,
                fontWeight: 700,
                fontSize: "0.75rem",
                textTransform: "none",
                borderColor: "rgba(239, 68, 68, 0.35)",
                "&:hover": { borderColor: "error.main", bgcolor: "rgba(239, 68, 68, 0.08)" },
              }}
            >
              {language === "tl" ? "Mag-sign Out" : "Sign Out"}
            </Button>
          </Box>
        </Box>
      </Card>

      {/* ── Production Segmented Tab Navigation ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          p: 0.75,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.6)" : "rgba(248, 250, 252, 0.8)",
        }}
      >
        <Tabs
          value={activeTabIndex}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          indicatorColor="primary"
          textColor="primary"
          sx={{
            minHeight: 46,
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
            "& .MuiTab-root": {
              minHeight: 46,
              fontWeight: 800,
              fontSize: { xs: "0.8rem", sm: "0.875rem" },
              textTransform: "none",
              px: { xs: 2, sm: 3 },
              py: 1,
              borderRadius: 1.5,
              transition: "all 0.15s ease",
              color: "text.secondary",
              "&.Mui-selected": {
                color: "primary.main",
              },
              "&:hover:not(.Mui-selected)": {
                color: "text.primary",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
              },
            },
          }}
        >
          <Tab
            icon={<GeneralIcon sx={{ fontSize: 19 }} />}
            iconPosition="start"
            label={t("settings.tabGeneral", "General & Tours")}
            id="settings-tab-0"
            aria-controls="settings-tabpanel-0"
          />
          <Tab
            icon={<HouseholdIcon sx={{ fontSize: 19 }} />}
            iconPosition="start"
            label={t("settings.tabHousehold", "Household & Sharing")}
            id="settings-tab-1"
            aria-controls="settings-tabpanel-1"
          />
          <Tab
            icon={<NotificationsActiveIcon sx={{ fontSize: 19 }} />}
            iconPosition="start"
            label={t("settings.tabNotifications", "Notifications & Alerts")}
            id="settings-tab-2"
            aria-controls="settings-tabpanel-2"
          />
          <Tab
            icon={<SecurityIcon sx={{ fontSize: 19 }} />}
            iconPosition="start"
            label={t("settings.tabSecurity", "Security & Account")}
            id="settings-tab-3"
            aria-controls="settings-tabpanel-3"
          />
        </Tabs>
      </Paper>

      {/* ──────────────────────────────────────────────────────────
          TAB 0: GENERAL & GUIDED TOURS
      ────────────────────────────────────────────────────────── */}
      {activeTabIndex === 0 && (
        <Box
          role="tabpanel"
          id="settings-tabpanel-0"
          aria-labelledby="settings-tab-0"
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          {/* Language Preferences Section */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.7)" : "#ffffff",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <LanguageIcon sx={{ color: "primary.main" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                {t("settings.langTitle", "Language & Localization (Wika)")}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
              {t("settings.langSubtitle", "Choose your preferred interface and notification language.")}
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  onClick={() => handleLanguageChange("en")}
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    borderRadius: 1.5,
                    border: "2px solid",
                    borderColor: language === "en" ? "primary.main" : "divider",
                    bgcolor: language === "en"
                      ? (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(0, 229, 201, 0.08)"
                            : "rgba(13, 148, 136, 0.06)"
                      : "background.paper",
                    transition: "all 0.15s ease-in-out",
                    "&:hover": {
                      borderColor: "primary.main",
                      transform: "translateY(-1px)",
                    },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      sx={{
                        bgcolor: language === "en" ? "primary.main" : "action.selected",
                        color: language === "en" ? "primary.contrastText" : "text.secondary",
                        width: 38,
                        height: 38,
                        fontWeight: 800,
                        fontSize: "0.85rem",
                      }}
                    >
                      EN
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                        English (US)
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Default metric system and currency formatting
                      </Typography>
                    </Box>
                  </Box>
                  <Radio
                    checked={language === "en"}
                    onChange={() => handleLanguageChange("en")}
                    value="en"
                    name="language-radio"
                    color="primary"
                  />
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  onClick={() => handleLanguageChange("tl")}
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    borderRadius: 1.5,
                    border: "2px solid",
                    borderColor: language === "tl" ? "primary.main" : "divider",
                    bgcolor: language === "tl"
                      ? (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(0, 229, 201, 0.08)"
                            : "rgba(13, 148, 136, 0.06)"
                      : "background.paper",
                    transition: "all 0.15s ease-in-out",
                    "&:hover": {
                      borderColor: "primary.main",
                      transform: "translateY(-1px)",
                    },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      sx={{
                        bgcolor: language === "tl" ? "primary.main" : "action.selected",
                        color: language === "tl" ? "primary.contrastText" : "text.secondary",
                        width: 38,
                        height: 38,
                        fontWeight: 800,
                        fontSize: "0.85rem",
                      }}
                    >
                      PH
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                        Tagalog (Filipino)
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Lokalisadong mga termino para sa Meralco bill at kuryente
                      </Typography>
                    </Box>
                  </Box>
                  <Radio
                    checked={language === "tl"}
                    onChange={() => handleLanguageChange("tl")}
                    value="tl"
                    name="language-radio"
                    color="primary"
                  />
                </Paper>
              </Grid>
            </Grid>
          </Card>

          {/* Interactive Guided Tour & Tutorials Section */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.2)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.7)" : "#ffffff",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1.5,
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <ExploreIcon sx={{ color: "primary.main" }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                    {language === "tl"
                      ? "Mga Gabay at Tutorial sa Sistema (Interactive Guided Tours)"
                      : "Guided Tours & System Tutorials"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {language === "tl"
                      ? "Suriin ang mga gabay sa bawat modyul o simulan ang komprehensibong paglalakbay mula ulo hanggang paa"
                      : "Replay step-by-step tutorials for specific modules or experience the full app walkthrough"}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={startFullTour}
                  startIcon={<RocketIcon />}
                  sx={{
                    fontWeight: 800,
                    borderRadius: 1.25,
                    fontSize: "0.75rem",
                    textTransform: "none",
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    boxShadow: (theme) =>
                      theme.palette.mode === "dark"
                        ? "0 2px 10px rgba(0, 229, 201, 0.3)"
                        : "0 2px 10px rgba(13, 148, 136, 0.25)",
                    "&:hover": {
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "#00c7ae" : "primary.dark",
                    },
                  }}
                >
                  {language === "tl" ? "Simulan ang Buong Gabay" : "Start Full App Tour"}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    resetTour();
                    showSuccess(
                      language === "tl"
                        ? "Na-reset na ang lahat ng kasaysayan ng tour. Maaari mong ulitin ang anumang gabay."
                        : "All tour history has been reset. You can restart any tour at any time.",
                      language === "tl" ? "Na-reset ang Tour" : "Tours Reset"
                    );
                  }}
                  startIcon={<ResetIcon />}
                  sx={{
                    fontWeight: 700,
                    borderRadius: 1.25,
                    fontSize: "0.75rem",
                    textTransform: "none",
                    color: "text.secondary",
                    borderColor: "divider",
                    "&:hover": { borderColor: "primary.main", color: "primary.main" },
                  }}
                >
                  {language === "tl" ? "I-reset Lahat" : "Reset History"}
                </Button>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={1.5}>
              {FULL_TOUR_PAGE_ORDER.map((pageKey) => {
                const meta = PAGE_METADATA[pageKey];
                const tour = ALL_PAGE_TOURS[pageKey];
                const isCompleted = completedPages[pageKey];
                const icons: Record<TourPage, React.ReactElement> = {
                  dashboard: <DashboardIcon sx={{ fontSize: 18 }} />,
                  calculator: <CalculateIcon sx={{ fontSize: 18 }} />,
                  appliances: <BoltIcon sx={{ fontSize: 18 }} />,
                  calendar: <CalendarIcon sx={{ fontSize: 18 }} />,
                  analytics: <InsightsIcon sx={{ fontSize: 18 }} />,
                  forecasting: <AutoGraphIcon sx={{ fontSize: 18 }} />,
                };

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pageKey}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.75,
                        borderRadius: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        height: "100%",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
                        borderColor: isCompleted ? "rgba(52, 211, 153, 0.3)" : "divider",
                        transition: "border-color 0.2s ease",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              p: 0.75,
                              borderRadius: 1,
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(0, 229, 201, 0.1)"
                                  : "rgba(13, 148, 136, 0.08)",
                              color: "primary.main",
                              display: "flex",
                            }}
                          >
                            {icons[pageKey]}
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {meta.title[language]}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {tour.steps.length} {language === "tl" ? "mga hakbang" : "interactive steps"}
                            </Typography>
                          </Box>
                        </Box>

                        {isCompleted ? (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: "12px !important", color: "#34d399 !important" }} />}
                            label={language === "tl" ? "Natapos" : "Completed"}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.625rem",
                              height: 20,
                              bgcolor: "rgba(52, 211, 153, 0.12)",
                              color: "#34d399",
                              border: "1px solid rgba(52, 211, 153, 0.3)",
                            }}
                          />
                        ) : (
                          <Chip
                            label={language === "tl" ? "Bago" : "Unseen"}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.625rem",
                              height: 20,
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.05)"
                                  : "rgba(0, 0, 0, 0.05)",
                              color: "text.secondary",
                            }}
                          />
                        )}
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: "auto" }}>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          startIcon={<PlayArrowIcon sx={{ fontSize: "14px !important" }} />}
                          onClick={() => {
                            navigate(PAGE_TO_ROUTE[pageKey]);
                            setTimeout(() => {
                              startTour(pageKey);
                            }, 400);
                          }}
                          sx={{
                            borderRadius: 1,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            textTransform: "none",
                            py: 0.5,
                          }}
                        >
                          {language === "tl" ? "Simulan ang Gabay" : "Start Tour"}
                        </Button>
                        {isCompleted && (
                          <Tooltip title={language === "tl" ? "I-reset itong modyul" : "Reset this module tour"}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                resetTour(pageKey);
                                showSuccess(
                                  language === "tl"
                                    ? `Na-reset ang tour para sa ${meta.title[language]}.`
                                    : `Reset tour for ${meta.title[language]}.`
                                );
                              }}
                              sx={{
                                border: "1px solid",
                                borderColor: "divider",
                                p: 0.5,
                                borderRadius: 1,
                              }}
                            >
                              <ResetIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Card>
        </Box>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 1: HOUSEHOLD & MULTI-USER ACCESS
      ────────────────────────────────────────────────────────── */}
      {activeTabIndex === 1 && (
        <Box
          role="tabpanel"
          id="settings-tabpanel-1"
          aria-labelledby="settings-tab-1"
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          <Box id="room-members-section">
            <RoomMembersPanel />
          </Box>
        </Box>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 2: NOTIFICATIONS & SYSTEM ALERTS (COMMAND CENTER)
      ────────────────────────────────────────────────────────── */}
      {activeTabIndex === 2 && (
        <Box
          role="tabpanel"
          id="settings-tabpanel-2"
          aria-labelledby="settings-tab-2"
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          {/* 1. Master Toggle & Sensitivity Presets Card */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.85)" : "#ffffff",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                mb: 2.5,
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <ShieldIcon sx={{ color: activeLevelConfig.color, fontSize: 24 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                    {language === "tl" ? "Antas ng Sensitibidad ng mga Alerto" : "Master Notifications & Alert Sensitivity"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {language === "tl"
                      ? "Piliin ang antas ng pagkaalerto ng system batay sa iyong gawi sa pagtitipid ng enerhiya."
                      : "Select an automated vigilance preset to balance notification urgency and frequency."}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: notifPrefs.enabled ? "primary.main" : "text.secondary" }}>
                  {notifPrefs.enabled
                    ? (language === "tl" ? "Naka-on ang mga Abiso" : "Notifications Active")
                    : (language === "tl" ? "Naka-pause ang mga Abiso" : "Notifications Paused")}
                </Typography>
                <Switch
                  checked={notifPrefs.enabled}
                  onChange={(e) => updateNotifPrefs({ enabled: e.target.checked })}
                  color="primary"
                />
              </Box>
            </Box>

            {/* 4-Level Sensitivity Selector Cards */}
            <Grid container spacing={1.5}>
              {(["relaxed", "standard", "proactive", "strict"] as NotificationLevel[]).map((level) => {
                const cfg = LEVEL_CONFIG[level];
                const isSelected = notifPrefs.notificationLevel === level;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={level}>
                    <Paper
                      elevation={0}
                      onClick={() => setNotifLevel(level)}
                      sx={{
                        p: 1.75,
                        borderRadius: 1.5,
                        cursor: "pointer",
                        border: "2px solid",
                        borderColor: isSelected ? cfg.color : "divider",
                        bgcolor: isSelected ? cfg.bg : (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#f8fafc",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          borderColor: cfg.color,
                          transform: "translateY(-1px)",
                        },
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        height: "100%",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isSelected ? cfg.color : "text.primary" }}>
                          {cfg.label}
                        </Typography>
                        {isSelected && (
                          <Chip
                            label="Active"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.625rem",
                              fontWeight: 900,
                              bgcolor: cfg.color,
                              color: "#042f2e",
                            }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.4, fontSize: "0.72rem" }}>
                        {cfg.sub}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Card>

          {/* 2. Hardware Feedback & Delivery Channels Card */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.7)" : "#ffffff",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <NotificationsActiveIcon sx={{ color: "primary.main" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                {language === "tl" ? "Mga Channel ng Paghahatid at Hardware Feedback" : "Delivery Channels & Hardware Feedback"}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
              {language === "tl"
                ? "I-configure kung paano maririnig o mararamdaman ang mga alerto sa iyong aparato."
                : "Choose audio chimes, tactile haptics, email alerts, and closed-app background OS pushes."}
            </Typography>

            <Grid container spacing={2}>
              {/* Synthesized Audio Chimes */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.25)" : "#f8fafc",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <SoundIcon sx={{ color: "primary.main", fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {language === "tl" ? "Audio Chimes (Synthesized)" : "Synthesized Audio Chimes"}
                      </Typography>
                    </Box>
                    <Switch
                      size="small"
                      checked={notifPrefs.soundEnabled}
                      onChange={(e) => updateNotifPrefs({ soundEnabled: e.target.checked })}
                      color="primary"
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
                    {language === "tl"
                      ? "Tumutunog ng harmonic chime kapag may bagong alerto (gumagana offline nang walang sound files)."
                      : "Plays harmonic synthesized audio chimes on alerts using Web Audio API."}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!notifPrefs.soundEnabled}
                    onClick={() => previewSound("chime")}
                    startIcon={<SoundIcon sx={{ fontSize: 15 }} />}
                    sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700, borderRadius: 1 }}
                  >
                    {language === "tl" ? "Subukan ang Tunog" : "Play Test Chime"}
                  </Button>
                </Paper>
              </Grid>

              {/* Mobile Haptic Vibration */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.25)" : "#f8fafc",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <VibrationIcon sx={{ color: "primary.main", fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {language === "tl" ? "Haptic Vibration (Mobile)" : "Mobile Haptic Vibration"}
                      </Typography>
                    </Box>
                    <Switch
                      size="small"
                      checked={notifPrefs.vibrationEnabled}
                      onChange={(e) => updateNotifPrefs({ vibrationEnabled: e.target.checked })}
                      color="primary"
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
                    {language === "tl"
                      ? "Nagbibigay ng banayad o mabilis na vibration patterns sa Android smartphones tuwing may alerto."
                      : "Triggers tactile vibration pulses on mobile devices during critical power spikes."}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!notifPrefs.vibrationEnabled}
                    onClick={() => previewVibration("high")}
                    startIcon={<VibrationIcon sx={{ fontSize: 15 }} />}
                    sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700, borderRadius: 1 }}
                  >
                    {language === "tl" ? "Subukan ang Vibration" : "Test Vibration"}
                  </Button>
                </Paper>
              </Grid>

              {/* Automated Smart Email Alerts */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.25)" : "#f8fafc",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <EmailIcon sx={{ color: "warning.main", fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {language === "tl" ? "Smart Email Delivery" : "Automated Smart Email Alerts"}
                      </Typography>
                    </Box>
                    <Switch
                      size="small"
                      checked={notifPrefs.emailAlertsEnabled}
                      onChange={(e) => updateNotifPrefs({ emailAlertsEnabled: e.target.checked, alertEmailAddress: identity?.email })}
                      color="warning"
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
                    {language === "tl"
                      ? `Nagpapadala ng opisyal na email sa ${identity?.email || "iyong inbox"} kapag lumagpas sa 80% o 100% ng budget.`
                      : `Dispatches critical budget milestone and surge warnings to ${identity?.email || "your inbox"}.`}
                  </Typography>
                  <Chip
                    size="small"
                    label={identity?.email ? `To: ${identity.email}` : "Recipient: Active Account"}
                    sx={{ alignSelf: "flex-start", fontWeight: 700, fontSize: "0.6875rem" }}
                  />
                </Paper>
              </Grid>

              {/* Background Web Push Notification */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.25)" : "#f8fafc",
                    borderColor: isPushSubscribed ? "primary.main" : "divider",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <SensorsIcon sx={{ color: "primary.main", fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {language === "tl" ? "Closed-App Web Push" : "Closed-App Background Web Push"}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={isPushSubscribed ? "Active" : "Disabled"}
                      color={isPushSubscribed ? "success" : "default"}
                      sx={{ fontWeight: 800, fontSize: "0.6875rem", height: 20 }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
                    {language === "tl"
                      ? "Pumapasok sa Windows Action Center o notification tray kahit nakasara ang browser window."
                      : "Pushes alerts to Windows Action Center and mobile trays even when the browser is closed."}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      size="small"
                      variant={isPushSubscribed ? "outlined" : "contained"}
                      color={isPushSubscribed ? "inherit" : "primary"}
                      onClick={handleToggleWebPush}
                      disabled={isPushLoading || !isPushSupported()}
                      sx={{ textTransform: "none", fontWeight: 800, borderRadius: 1 }}
                    >
                      {isPushSubscribed
                        ? (language === "tl" ? "I-unlink Device" : "Unlink Device")
                        : (language === "tl" ? "I-enable Push" : "Enable Push")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!isPushSubscribed}
                      onClick={handleTestBackgroundPush}
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1 }}
                    >
                      {pushCountdown !== null ? `${pushCountdown}s...` : "Test 5s Push"}
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Card>

          {/* 3. Granular Power & Budget Rules Card */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.7)" : "#ffffff",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <BoltIcon sx={{ color: "primary.main" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                {language === "tl" ? "Mga Patakaran sa Enerhiya at Badyet (Thresholds)" : "Smart Energy & Budget Threshold Rules"}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
              {language === "tl"
                ? "Itakda ang eksaktong wattage spikes, oras ng stopwatch, at limitasyon sa kuryente bago mag-alerto."
                : "Fine-tune power draw limits, circuit runtimes, and billing milestone thresholds."}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Rule A: Live Load Surge Alert */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.25)" : "#f8fafc",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 240 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                    <SurgeIcon sx={{ color: "error.main", fontSize: 18 }} />
                    {language === "tl" ? "Alerto sa Pagtaas ng Wattage (Surge Spikes)" : "Live Load Surge Alert"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {language === "tl"
                      ? "Awtomatikong mag-aabiso kapag sabay-sabay na lumagpas ang aktibong konsumo sa itinakdang Watts."
                      : "Triggers immediate alert when active simultaneous wattage draw exceeds your threshold."}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <TextField
                    select
                    size="small"
                    label="Watts Limit"
                    value={notifPrefs.surgeThresholdWatts || 2500}
                    onChange={(e) => updateNotifPrefs({ surgeThresholdWatts: Number(e.target.value) })}
                    disabled={!notifPrefs.surgeAlert}
                    sx={{ width: 140 }}
                  >
                    <MenuItem value={1500}>1,500 Watts</MenuItem>
                    <MenuItem value={2000}>2,000 Watts</MenuItem>
                    <MenuItem value={2500}>2,500 Watts</MenuItem>
                    <MenuItem value={3000}>3,000 Watts</MenuItem>
                    <MenuItem value={4000}>4,000 Watts</MenuItem>
                  </TextField>
                  <Switch
                    checked={notifPrefs.surgeAlert}
                    onChange={(e) => updateNotifPrefs({ surgeAlert: e.target.checked })}
                    color="primary"
                  />
                </Box>
              </Paper>

              {/* Rule B: Continuous Runtime & Unattended Stopwatch */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.25)" : "#f8fafc",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 240 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                    <ClockIcon sx={{ color: "primary.main", fontSize: 18 }} />
                    {language === "tl" ? "Hindi Napatay na Circuit (Runtime Limit)" : "Unattended Circuit & Runtime Limit"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {language === "tl"
                      ? "Nag-aabiso kapag ang isang appliance circuit ay tuloy-tuloy na tumatakbo lampas sa itinakdang oras."
                      : "Alerts when an appliance runs continuously without being shut off past your set duration."}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <TextField
                    select
                    size="small"
                    label="Runtime Threshold"
                    value={notifPrefs.runtimeThresholdHours || 4}
                    onChange={(e) => updateNotifPrefs({ runtimeThresholdHours: Number(e.target.value), stopwatchThresholdHours: Number(e.target.value) })}
                    disabled={!notifPrefs.runtimeAlert}
                    sx={{ width: 140 }}
                  >
                    <MenuItem value={1}>1 hour</MenuItem>
                    <MenuItem value={2}>2 hours</MenuItem>
                    <MenuItem value={3}>3 hours</MenuItem>
                    <MenuItem value={4}>4 hours</MenuItem>
                    <MenuItem value={6}>6 hours</MenuItem>
                  </TextField>
                  <Switch
                    checked={notifPrefs.runtimeAlert}
                    onChange={(e) => updateNotifPrefs({ runtimeAlert: e.target.checked, stopwatchAlert: e.target.checked })}
                    color="primary"
                  />
                </Box>
              </Paper>

              {/* Rule C: Simulated Plan Quota Overrun Warning */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.25)" : "#f8fafc",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 240 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                    <TimerIcon sx={{ color: "warning.main", fontSize: 18 }} />
                    {language === "tl" ? "Bala sa Paglagpas sa Simulated Quota" : "Plan Quota Overrun Alert"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {language === "tl"
                      ? "Nagpapadala ng alerto kapag lumagpas ang runtime ng stopwatch sa nakalaang simulation plan hours ngayong araw."
                      : "Fires when live stopwatch runtime exceeds today's planned hours in your Simulation Plan."}
                  </Typography>
                </Box>
                <Switch
                  checked={notifPrefs.planQuotaAlert ?? true}
                  onChange={(e) => updateNotifPrefs({ planQuotaAlert: e.target.checked })}
                  color="warning"
                />
              </Paper>

              {/* Rule D: Budget Milestones (Multi-Tier) */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.25)" : "#f8fafc",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 240 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                    <BudgetIcon sx={{ color: "success.main", fontSize: 18 }} />
                    {language === "tl" ? "Mga Milestone sa Badyet (Target Spending)" : "Budget Milestone Alerts (Multi-Tier)"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {language === "tl"
                      ? "Nagpapadala ng babala kapag naabot ang porsyento ng iyong buwanang target na Meralco budget."
                      : "Warns when projected electricity spend reaches your percentage milestone of target budget."}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <TextField
                    select
                    size="small"
                    label="Milestone %"
                    value={notifPrefs.budgetThresholdPercent || 80}
                    onChange={(e) => updateNotifPrefs({ budgetThresholdPercent: Number(e.target.value) })}
                    disabled={!notifPrefs.budgetAlert}
                    sx={{ width: 140 }}
                  >
                    <MenuItem value={50}>50% of budget</MenuItem>
                    <MenuItem value={70}>70% of budget</MenuItem>
                    <MenuItem value={80}>80% (Standard)</MenuItem>
                    <MenuItem value={90}>90% of budget</MenuItem>
                  </TextField>
                  <Switch
                    checked={notifPrefs.budgetAlert}
                    onChange={(e) => updateNotifPrefs({ budgetAlert: e.target.checked })}
                    color="primary"
                  />
                </Box>
              </Paper>

              {/* Rule E: Schedule Reminders & Peak Hours */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.25)" : "#f8fafc",
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                        <CalendarIcon sx={{ color: "info.main", fontSize: 18 }} />
                        {language === "tl" ? "Paalala sa Iskedyul (5m Bago)" : "Schedule Reminders (5m Before)"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {language === "tl" ? "Mag-aabiso 5 minuto bago ang nakatakdang routine." : "Sends reminder 5 minutes before scheduled appliances."}
                      </Typography>
                    </Box>
                    <Switch
                      checked={notifPrefs.scheduleAlert}
                      onChange={(e) => updateNotifPrefs({ scheduleAlert: e.target.checked })}
                      color="primary"
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.25)" : "#f8fafc",
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                        <SurgeIcon sx={{ color: "warning.dark", fontSize: 18 }} />
                        {language === "tl" ? "Meralco Peak Hours Warning" : "Meralco Peak Hours Warning"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {language === "tl" ? "Babala sa oras ng peak grid demand (2-4pm, 6-9pm)." : "Warns during commercial high-tariff grid windows."}
                      </Typography>
                    </Box>
                    <Switch
                      checked={notifPrefs.peakHourAlert}
                      onChange={(e) => updateNotifPrefs({ peakHourAlert: e.target.checked })}
                      color="primary"
                    />
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Test Notification Trigger Action */}
            <Box sx={{ mt: 3, pt: 2, borderTop: "1px dashed", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, display: "block" }}>
                  {language === "tl" ? "Subukan ang In-App Notification System" : "Verify In-App Notifications"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {language === "tl"
                    ? "Magpapadala ng alerto upang masubukan ang tunog, vibration, at in-app toast feed."
                    : "Dispatches a live test alert to verify chime audio, haptics, and notification log entries."}
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="small"
                onClick={triggerTestNotification}
                startIcon={<NotificationsActiveIcon />}
                sx={{
                  fontWeight: 800,
                  textTransform: "none",
                  borderRadius: 1.25,
                  px: 2,
                }}
              >
                {language === "tl" ? "Magpadala ng Test Alert" : "Send Test Notification"}
              </Button>
            </Box>
          </Card>

          {/* 4. Web Push Setup & Error Prevention Accordion */}
          <Accordion
            disableGutters
            elevation={0}
            sx={{
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(18, 21, 26, 0.7)" : "rgba(248, 250, 252, 0.7)",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
              sx={{ px: 2, py: 0.5, minHeight: 44 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <HelpIcon sx={{ fontSize: 18, color: "primary.main" }} />
                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: "0.8rem" }}>
                  {language === "tl"
                    ? "Gabay: Paano maiwasan ang push connection error? (Brave, Chrome, Windows)"
                    : "Setup Guide: How to avoid push connection errors (Brave, Chrome, Windows)"}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
                {language === "tl"
                  ? "Kung nakaranas ka ng 'Push service connection failed' o AbortError habang nag-e-enable, sundin ang mga hakbang na ito:"
                  : "If you encounter 'Push service connection failed' or an AbortError when enabling, follow these browser guidelines:"}
              </Typography>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      height: "100%",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", display: "block", mb: 0.5 }}>
                      🦁 {language === "tl" ? "1. Para sa Brave Browser (Pinakakaraniwan)" : "1. For Brave Browser Users (Most Common)"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
                      {language === "tl"
                        ? "I-type ang brave://settings/privacy sa URL bar. Hanapin ang 'Use Google services for push messaging' at i-ON ito, pagkatapos ay i-relaunch ang Brave."
                        : "Open brave://settings/privacy in your URL bar. Scroll down and toggle ON 'Use Google services for push messaging', then relaunch Brave."}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      height: "100%",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "warning.main", display: "block", mb: 0.5 }}>
                      🛡️ {language === "tl" ? "2. Ad-Blockers, VPNs & Firewalls" : "2. Ad-Blockers, VPNs & Firewalls"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
                      {language === "tl"
                        ? "Siguraduhing hindi bina-block ng extensions (uBlock, AdGuard, Pi-hole) o corporate VPN ang Google FCM (fcm.googleapis.com, mtalk.google.com)."
                        : "Ensure extensions (uBlock, AdGuard, Pi-hole) or VPNs do not block Google FCM socket domains (fcm.googleapis.com, mtalk.google.com)."}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      height: "100%",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "info.main", display: "block", mb: 0.5 }}>
                      🪟 {language === "tl" ? "3. Windows Action Center Notifications" : "3. Windows Action Center Notifications"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
                      {language === "tl"
                        ? "Pumunta sa Windows Settings -> System -> Notifications. Siguraduhing naka-ON ang Notifications at pinapayagan ang iyong browser."
                        : "Open Windows Settings -> System -> Notifications. Ensure Notifications are ON and your browser is allowed to display desktop banners."}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      height: "100%",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "success.main", display: "block", mb: 0.5 }}>
                      🌐 {language === "tl" ? "4. Regular Browsing Window Lamang" : "4. Standard Window (No Incognito)"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
                      {language === "tl"
                        ? "Awtomatikong bina-block ng mga browser ang Web Push sa Incognito o InPrivate mode. Gamitin ang regular window."
                        : "Browsers strictly disallow Web Push subscriptions in Incognito or InPrivate windows. Use a normal browser profile."}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 3: SECURITY, CREDENTIALS & DANGER ZONE
      ────────────────────────────────────────────────────────── */}
      {activeTabIndex === 3 && (
        <Box
          role="tabpanel"
          id="settings-tabpanel-3"
          aria-labelledby="settings-tab-3"
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          {/* Account Security & Password Change */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(13, 148, 136, 0.2)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.85)" : "#ffffff",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <SecurityIcon sx={{ color: "primary.main" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                {language === "tl" ? "Seguridad at Kredensyal ng Account" : "Account Security & Credentials"}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
              {language === "tl"
                ? "I-update ang password ng iyong account upang mapanatiling ligtas ang iyong access."
                : "Update your master login password to keep your account secure."}
            </Typography>

            <Grid container spacing={3} sx={{ justifyContent: "center" }}>
              <Grid size={{ xs: 12, md: 8, lg: 7 }}>
                <ChangePasswordCard userEmail={identity?.email} />
              </Grid>
            </Grid>
          </Card>

          {/* Danger Zone: Account Deletion */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(248, 113, 113, 0.3)" : "rgba(239, 68, 68, 0.35)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(127, 29, 29, 0.12)" : "rgba(254, 242, 242, 0.8)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <WarningIcon sx={{ color: "error.main" }} />
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                      color: (theme) => (theme.palette.mode === "dark" ? "error.light" : "error.dark"),
                    }}
                  >
                    {t("settings.dangerTitle", "Danger Zone: Account Deletion")}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
                  {t(
                    "settings.dangerSubtitle",
                    "Permanently erase your account, registered appliances, daily calendar logs, usage simulation history, and analytics records. This action is irreversible."
                  )}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleOpenDeleteModal}
                sx={{
                  borderRadius: 1.25,
                  fontWeight: 800,
                  px: 2.5,
                  fontSize: "0.8125rem",
                  borderColor: "rgba(248, 113, 113, 0.5)",
                  "&:hover": { bgcolor: "rgba(248, 113, 113, 0.15)", borderColor: "error.main" },
                }}
              >
                {t("settings.deleteAccount", "Delete My Account")}
              </Button>
            </Box>
          </Card>
        </Box>
      )}

      {/* ── Strict 2-Step Account Deletion Security Dialog ── */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              border: "1px solid rgba(248, 113, 113, 0.5)",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(20, 10, 25, 0.96)" : "#ffffff"),
              backdropFilter: "blur(24px)",
              p: 1,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            color: (theme) => (theme.palette.mode === "dark" ? "error.light" : "error.main"),
            display: "flex",
            alignItems: "center",
            gap: 1.25,
          }}
        >
          <WarningIcon sx={{ color: "error.main" }} />
          {t("settings.deleteModalTitle", "Confirm Permanent Account Deletion")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Alert severity="error" sx={{ borderRadius: 1.25, fontWeight: 600 }}>
            {t(
              "settings.deleteWarning",
              "This action is permanent and cannot be undone. All your appliances, daily logs, simulation records, and analytics telemetry will be deleted."
            )}
          </Alert>

          {deleteError && (
            <Alert severity="warning" sx={{ borderRadius: 1.5, fontWeight: 700 }}>
              {deleteError}
            </Alert>
          )}

          {/* Step 1: Password Verification */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary" }}>
              {t("settings.step1Password", "STEP 1: ENTER YOUR ACCOUNT PASSWORD")}
            </Typography>
            <TextField
              type={showPassword ? "text" : "password"}
              size="small"
              placeholder={language === "tl" ? "Ilagay ang kasalukuyang password..." : "Enter current password..."}
              fullWidth
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={isDeleting}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Step 2: Explicit Confirmation Text */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary" }}>
              {language === "tl" ? (
                <>HAKBANG 2: I-TYPE ANG <span style={{ color: "#f87171", fontWeight: 900 }}>Confirm</span> PARA PAHINTULUTAN ANG PAGBURA</>
              ) : (
                <>STEP 2: TYPE <span style={{ color: "#f87171", fontWeight: 900 }}>Confirm</span> TO AUTHORIZE DELETION</>
              )}
            </Typography>
            <TextField
              size="small"
              placeholder="Type 'Confirm'..."
              fullWidth
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              disabled={isDeleting}
              slotProps={{
                input: {
                  sx: { fontFamily: "monospace", fontWeight: 800 },
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} sx={{ fontWeight: 700 }}>
            {t("header.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!isDeleteReady || isDeleting}
            onClick={handleExecuteAccountDeletion}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{ fontWeight: 900, borderRadius: 1.5, px: 2.5 }}
          >
            {isDeleting ? t("settings.deleteExecuting", "Deleting Account...") : t("settings.deletePerm", "Permanently Delete My Account")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Sign Out Confirmation Dialog ── */}
      <Dialog
        open={isSignoutConfirmOpen}
        onClose={() => setIsSignoutConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1.25 }}>
          <LogoutIcon color="error" />
          {language === "tl" ? "Kumpirmahin ang Pag-sign Out" : "Confirm Sign Out"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {language === "tl"
              ? "Sigurado ka bang nais mong mag-sign out mula sa PowerForecast? Kakailanganin mong mag-log in muli."
              : "Are you sure you want to sign out from PowerForecast? You will need to log back in to access your telemetry."}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsSignoutConfirmOpen(false)} sx={{ fontWeight: 700 }}>
            {t("header.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setIsSignoutConfirmOpen(false);
              logout();
            }}
            sx={{ fontWeight: 800, borderRadius: 1.25 }}
          >
            {language === "tl" ? "Mag-sign Out" : "Sign Out"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsView;
