import React, { useState, useEffect } from "react";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import {
  NotificationsActive as NotificationsActiveIcon,
  NotificationsNone as EmptyNotifIcon,
  Timer as TimerIcon,
  AccountBalanceWallet as BudgetIcon,
  CalendarMonth as CalendarIcon,
  Bolt as BoltIcon,
  FlashOn as SurgeIcon,
  Settings as SettingsIcon,
  DoneAll as DoneAllIcon,
  DeleteSweep as ClearAllIcon,
  Close as CloseIcon,
  Circle as DotIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  getNotificationLogs,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotificationLogs,
  NotificationLogItem,
} from "../../lib/notificationService";
import { useLanguage } from "../../context/LanguageContext";

interface NotificationPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

function formatRelativeTime(timestamp: number, language: "en" | "tl"): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return language === "tl" ? "Kani-kanina lang" : "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return language === "tl" ? `${diffMin}m ang nakalipas` : `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return language === "tl" ? `${diffHours}h ang nakalipas` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return language === "tl" ? `${diffDays}d ang nakalipas` : `${diffDays}d ago`;
}

function getCategoryIcon(category?: NotificationLogItem["category"]) {
  switch (category) {
    case "surge":
      return <BoltIcon sx={{ color: "warning.main", fontSize: 18 }} />;
    case "runtime":
      return <TimerIcon sx={{ color: "primary.main", fontSize: 18 }} />;
    case "budget":
      return <BudgetIcon sx={{ color: "success.main", fontSize: 18 }} />;
    case "peakhours":
      return <SurgeIcon sx={{ color: "error.main", fontSize: 18 }} />;
    case "schedule":
      return <CalendarIcon sx={{ color: "info.main", fontSize: 18 }} />;
    default:
      return <NotificationsActiveIcon sx={{ color: "primary.main", fontSize: 18 }} />;
  }
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ anchorEl, onClose }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const open = Boolean(anchorEl);

  const [logs, setLogs] = useState<NotificationLogItem[]>(() => getNotificationLogs());

  useEffect(() => {
    const handleUpdate = () => {
      setLogs(getNotificationLogs());
    };
    window.addEventListener("powerforecast_notifications_updated", handleUpdate);
    return () => window.removeEventListener("powerforecast_notifications_updated", handleUpdate);
  }, []);

  const unreadCount = logs.filter((l) => !l.read).length;

  const handleItemClick = (id: string) => {
    markNotificationAsRead(id);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
  };

  const handleClearAll = () => {
    clearAllNotificationLogs();
  };

  const handleOpenSettings = () => {
    onClose();
    navigate("/settings?tab=notifications");
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "calc(100vw - 24px)", sm: 400 },
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(20, 24, 30, 0.98)" : "#ffffff",
            backdropFilter: "blur(20px)",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "divider",
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 20px 50px rgba(0, 0, 0, 0.7)"
                : "0 12px 36px rgba(0, 0, 0, 0.12)",
            overflow: "hidden",
          },
        },
      }}
    >
      {/* ── Popover Header ── */}
      <Box
        sx={{
          p: 2,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <NotificationsActiveIcon sx={{ color: "primary.main", fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {language === "tl" ? "Mga Alerto at Abiso" : "System Notifications"}
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} ${language === "tl" ? "bago" : "new"}`}
              size="small"
              color="primary"
              sx={{ fontWeight: 800, fontSize: "0.6875rem", height: 20 }}
            />
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {unreadCount > 0 && (
            <Tooltip title={language === "tl" ? "Markahan lahat bilang nabasa" : "Mark all as read"}>
              <IconButton size="small" onClick={handleMarkAllRead} sx={{ p: 0.5 }}>
                <DoneAllIcon sx={{ fontSize: 17, color: "text.secondary" }} />
              </IconButton>
            </Tooltip>
          )}

          {logs.length > 0 && (
            <Tooltip title={language === "tl" ? "Burahin lahat ng logs" : "Clear all notifications"}>
              <IconButton size="small" onClick={handleClearAll} sx={{ p: 0.5 }}>
                <ClearAllIcon sx={{ fontSize: 17, color: "text.secondary" }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* ── Notifications List / Feed ── */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
        {logs.length === 0 ? (
          <Box
            sx={{
              py: 6,
              px: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
                color: "text.secondary",
              }}
            >
              <EmptyNotifIcon sx={{ fontSize: 26 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
              {language === "tl" ? "Walang mga Abiso" : "All Caught Up!"}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", maxWidth: 240 }}>
              {language === "tl"
                ? "Lahat ng smart energy alerts, continuous circuit warnings, at budget reminders ay lalabas dito."
                : "Real-time energy alerts, circuit overrun warnings, and budget milestones will appear here."}
            </Typography>
          </Box>
        ) : (
          logs.map((log) => {
            const isUnread = !log.read;
            return (
              <Paper
                key={log.id}
                elevation={0}
                onClick={() => handleItemClick(log.id)}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: isUnread
                    ? (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(0, 229, 201, 0.35)"
                          : "rgba(13, 148, 136, 0.3)"
                    : "divider",
                  bgcolor: isUnread
                    ? (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(0, 229, 201, 0.06)"
                          : "rgba(13, 148, 136, 0.04)"
                    : (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.02)"
                          : "background.paper",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                  <Box
                    sx={{
                      p: 0.75,
                      borderRadius: 1,
                      display: "flex",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.04)",
                      flexShrink: 0,
                    }}
                  >
                    {getCategoryIcon(log.category)}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.25 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isUnread ? 800 : 700,
                          color: "text.primary",
                          fontSize: "0.8125rem",
                          lineHeight: 1.3,
                        }}
                      >
                        {log.title}
                      </Typography>

                      {isUnread && (
                        <DotIcon
                          sx={{
                            color: "primary.main",
                            fontSize: 10,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>

                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        display: "block",
                        lineHeight: 1.4,
                        fontSize: "0.75rem",
                        mb: 0.75,
                      }}
                    >
                      {log.body}
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.6875rem" }}>
                        {formatRelativeTime(log.timestamp, language)}
                      </Typography>

                      {log.urgency === "critical" && (
                        <Chip
                          label={language === "tl" ? "Kritikal" : "Critical"}
                          size="small"
                          color="error"
                          sx={{ height: 18, fontSize: "0.625rem", fontWeight: 800 }}
                        />
                      )}
                      {log.urgency === "high" && (
                        <Chip
                          label={language === "tl" ? "Alerto" : "High"}
                          size="small"
                          color="warning"
                          sx={{ height: 18, fontSize: "0.625rem", fontWeight: 800 }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              </Paper>
            );
          })
        )}
      </Box>

      {/* ── Popover Footer Link ── */}
      <Divider />
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
        }}
      >
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
          {language === "tl" ? "I-configure ang mga patakaran:" : "Customize alert triggers:"}
        </Typography>

        <Button
          size="small"
          onClick={handleOpenSettings}
          startIcon={<SettingsIcon sx={{ fontSize: 15 }} />}
          sx={{
            fontWeight: 800,
            fontSize: "0.75rem",
            textTransform: "none",
            borderRadius: 1,
            py: 0.5,
          }}
        >
          {language === "tl" ? "Mga Setting ng Abiso" : "Notification Settings"}
        </Button>
      </Box>
    </Popover>
  );
};

export default NotificationPopover;
