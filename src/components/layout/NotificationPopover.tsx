import React from "react";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  Timer as TimerIcon,
  AccountBalanceWallet as BudgetIcon,
  CalendarMonth as CalendarIcon,
  Bolt as BoltIcon,
} from "@mui/icons-material";
import { useNotifications } from "../../hooks/useNotifications";

interface NotificationPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ anchorEl, onClose }) => {
  const { permission, isSupported, prefs, requestPermission, updatePrefs, testNotification } =
    useNotifications();

  const open = Boolean(anchorEl);

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
            width: 360,
            p: 2.5,
            borderRadius: 1.25,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "#0f0e3a" : "#ffffff"),
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          },
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <NotificationsActiveIcon sx={{ color: "primary.main", fontSize: 22 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Smart Notifications
          </Typography>
        </Box>
        <Chip
          label={permission === "granted" ? "Active" : permission === "denied" ? "Blocked" : "Needs Permission"}
          size="small"
          color={permission === "granted" ? "success" : permission === "denied" ? "error" : "warning"}
          sx={{ fontWeight: 700, fontSize: "0.6875rem" }}
        />
      </Box>

      {!isSupported && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          Web Notifications are not supported in this browser environment.
        </Alert>
      )}

      {isSupported && permission === "default" && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
          <Typography variant="caption" sx={{ color: "text.primary", display: "block", mb: 1 }}>
            Allow browser alerts to receive live stopwatch over-run warnings and schedule reminders.
          </Typography>
          <Button
            variant="contained"
            size="small"
            fullWidth
            onClick={requestPermission}
            sx={{ fontWeight: 800, borderRadius: 1.5 }}
          >
            Enable Browser Alerts
          </Button>
        </Box>
      )}

      {isSupported && permission === "denied" && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: "0.75rem" }}>
          Notifications are blocked in your browser settings. Please allow notifications for this site to receive smart alerts.
        </Alert>
      )}

      <Stack spacing={1.5} sx={{ mt: 1 }}>
        {/* Master Switch */}
        <FormControlLabel
          control={
            <Switch
              checked={prefs.enabled}
              onChange={(e) => updatePrefs({ enabled: e.target.checked })}
              color="primary"
              size="small"
            />
          }
          label={
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Master Notifications
            </Typography>
          }
        />

        <Divider />

        {/* Stopwatch Over-run Alert */}
        <Box sx={{ opacity: prefs.enabled ? 1 : 0.4, transition: "opacity 0.2s" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TimerIcon sx={{ fontSize: 18, color: "warning.main" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Stopwatch Over-run
              </Typography>
            </Box>
            <Switch
              checked={prefs.stopwatchAlert}
              disabled={!prefs.enabled}
              onChange={(e) => updatePrefs({ stopwatchAlert: e.target.checked })}
              size="small"
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, pl: 3.25 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Alert after:
            </Typography>
            <TextField
              type="number"
              size="small"
              disabled={!prefs.enabled || !prefs.stopwatchAlert}
              value={prefs.stopwatchThresholdHours}
              onChange={(e) =>
                updatePrefs({ stopwatchThresholdHours: Math.max(1, parseInt(e.target.value) || 4) })
              }
              sx={{ width: 60, "& input": { py: 0.25, px: 1, fontSize: "0.75rem", textAlign: "center" } }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              hours
            </Typography>
          </Box>
        </Box>

        {/* Budget Alert */}
        <Box sx={{ opacity: prefs.enabled ? 1 : 0.4, transition: "opacity 0.2s" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BudgetIcon sx={{ fontSize: 18, color: "#34d399" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Budget Warning
              </Typography>
            </Box>
            <Switch
              checked={prefs.budgetAlert}
              disabled={!prefs.enabled}
              onChange={(e) => updatePrefs({ budgetAlert: e.target.checked })}
              size="small"
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, pl: 3.25 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Alert at:
            </Typography>
            <TextField
              type="number"
              size="small"
              disabled={!prefs.enabled || !prefs.budgetAlert}
              value={prefs.budgetThresholdPercent}
              onChange={(e) =>
                updatePrefs({ budgetThresholdPercent: Math.max(50, Math.min(100, parseInt(e.target.value) || 80)) })
              }
              sx={{ width: 60, "& input": { py: 0.25, px: 1, fontSize: "0.75rem", textAlign: "center" } }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              % of target
            </Typography>
          </Box>
        </Box>

        {/* Schedule Alert */}
        <Box sx={{ opacity: prefs.enabled ? 1 : 0.4, transition: "opacity 0.2s" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarIcon sx={{ fontSize: 18, color: "#818cf8" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Schedule Reminders (5m before)
              </Typography>
            </Box>
            <Switch
              checked={prefs.scheduleAlert}
              disabled={!prefs.enabled}
              onChange={(e) => updatePrefs({ scheduleAlert: e.target.checked })}
              size="small"
            />
          </Box>
        </Box>

        {/* Peak Hours Alert */}
        <Box sx={{ opacity: prefs.enabled ? 1 : 0.4, transition: "opacity 0.2s" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BoltIcon sx={{ fontSize: 18, color: "#ffd54f" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Peak Hours Warning
              </Typography>
            </Box>
            <Switch
              checked={prefs.peakHourAlert}
              disabled={!prefs.enabled}
              onChange={(e) => updatePrefs({ peakHourAlert: e.target.checked })}
              size="small"
            />
          </Box>
        </Box>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button
          size="small"
          variant="outlined"
          onClick={testNotification}
          disabled={permission !== "granted"}
          sx={{ borderRadius: 2, fontSize: "0.75rem", textTransform: "none", fontWeight: 700 }}
        >
          Test Alert
        </Button>
        <Button
          size="small"
          onClick={onClose}
          sx={{ borderRadius: 2, fontSize: "0.75rem", textTransform: "none", fontWeight: 700 }}
        >
          Close
        </Button>
      </Box>
    </Popover>
  );
};
