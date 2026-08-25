import React, { useState, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  Timer as TimerIcon,
  PowerSettingsNew as PowerIcon,
  ReceiptLong as ReceiptIcon,
  Edit as EditIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckCircleIcon,
  RestartAlt as ResetIcon,
} from "@mui/icons-material";
import { Modal } from "../common/Modal";
import { UserAppliance, ApplianceUsageLog } from "../../types";
import { splitSessionAcrossDays, DEFAULT_EFFECTIVE_RATE, calculateKwh, calculateCost } from "../../lib/dailyUsageService";

interface LiveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appliance: UserAppliance | null;
  onStopSession: (applianceId: string, customDurationMinutes?: number, customEndTime?: Date) => Promise<void>;
  receiptLog?: ApplianceUsageLog | null;
}

export const LiveSessionModal: React.FC<LiveSessionModalProps> = ({
  isOpen,
  onClose,
  appliance,
  onStopSession,
  receiptLog,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isStopping, setIsStopping] = useState(false);

  // Duration adjustment state
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [customDays, setCustomDays] = useState(0);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [customSeconds, setCustomSeconds] = useState(0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Calculate live running stopwatch if appliance is on
  useEffect(() => {
    if (!isOpen || !appliance?.is_currently_on || !appliance.last_turned_on_at) {
      setElapsedSeconds(0);
      setIsAdjusting(false);
      return;
    }

    const startTime = new Date(appliance.last_turned_on_at).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(diffSecs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen, appliance]);

  // Sync custom inputs when first toggling edit mode
  const handleToggleAdjust = () => {
    if (!isAdjusting) {
      const totalSecs = elapsedSeconds;
      const d = Math.floor(totalSecs / 86400);
      const remAfterDays = totalSecs % 86400;
      const h = Math.floor(remAfterDays / 3600);
      const m = Math.floor((remAfterDays % 3600) / 60);
      const s = remAfterDays % 60;
      setCustomDays(d);
      setCustomHours(h);
      setCustomMinutes(m);
      setCustomSeconds(s);
    }
    setIsAdjusting(!isAdjusting);
  };

  if (!appliance && !receiptLog) return null;

  const isLive = appliance?.is_currently_on;
  const watts = appliance?.watts ? appliance.watts * (appliance.quantity || 1) : 1000;
  const genRate = DEFAULT_EFFECTIVE_RATE;

  // Live metered kWh and cost
  const liveHours = elapsedSeconds / 3600;
  const liveKwh = calculateKwh(watts, liveHours, 1);
  const liveCost = calculateCost(liveKwh, genRate);

  // Adjusted metered kWh and cost
  const totalAdjustedSeconds = customDays * 86400 + customHours * 3600 + customMinutes * 60 + customSeconds;
  const adjustedHours = totalAdjustedSeconds / 3600;
  const adjustedKwh = calculateKwh(watts, adjustedHours, 1);
  const adjustedCost = calculateCost(adjustedKwh, genRate);

  const isDurationModified = isAdjusting && Math.abs(totalAdjustedSeconds - elapsedSeconds) > 30;

  const formatDuration = (secs: number) => {
    const days = Math.floor(secs / 86400);
    const rem = secs % 86400;
    const hrs = Math.floor(rem / 3600);
    const mins = Math.floor((rem % 3600) / 60);
    const s = secs % 60;
    if (days > 0) return `${days}d ${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h ${mins}m ${s}s`;
    if (mins > 0) return `${mins}m ${s}s`;
    return `${s}s`;
  };

  const handleApplyPreset = (d: number, h: number, m: number) => {
    setCustomDays(d);
    setCustomHours(h);
    setCustomMinutes(m);
    setCustomSeconds(0);
  };

  const handleResetToElapsed = () => {
    const totalSecs = elapsedSeconds;
    const d = Math.floor(totalSecs / 86400);
    const rem = totalSecs % 86400;
    const h = Math.floor(rem / 3600);
    const m = Math.floor((rem % 3600) / 60);
    const s = rem % 60;
    setCustomDays(d);
    setCustomHours(h);
    setCustomMinutes(m);
    setCustomSeconds(s);
  };

  // Compute Multi-Day Allocation Slices preview
  const previewSlices = React.useMemo(() => {
    if (!appliance?.last_turned_on_at) return [];
    const startTime = new Date(appliance.last_turned_on_at);
    const targetDurationMins = isDurationModified ? totalAdjustedSeconds / 60 : elapsedSeconds / 60;
    const targetEndTime = new Date(startTime.getTime() + targetDurationMins * 60000);
    return splitSessionAcrossDays(startTime, targetEndTime);
  }, [appliance, isDurationModified, totalAdjustedSeconds, elapsedSeconds]);

  const handleStopClick = () => {
    if (!appliance) return;
    if (isDurationModified) {
      setIsConfirmOpen(true);
    } else {
      executeStop();
    }
  };

  const executeStop = async (overrideDurationMinutes?: number) => {
    if (!appliance) return;
    setIsStopping(true);
    try {
      if (overrideDurationMinutes !== undefined || isDurationModified) {
        const finalMinutes = overrideDurationMinutes !== undefined ? overrideDurationMinutes : Math.max(1, Math.round(totalAdjustedSeconds / 60));
        const startTime = appliance.last_turned_on_at ? new Date(appliance.last_turned_on_at) : new Date();
        const endTime = new Date(startTime.getTime() + finalMinutes * 60000);
        await onStopSession(appliance.id, finalMinutes, endTime);
      } else {
        await onStopSession(appliance.id);
      }
    } finally {
      setIsStopping(false);
      setIsConfirmOpen(false);
      onClose();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isLive ? "⚡ Live Energy Stopwatch" : "Historical Energy Receipt"}
        maxWidth="sm"
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* Live Running Banner */}
          {isLive && (
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "rgba(6, 78, 59, 0.25)",
                border: "1px solid rgba(52, 211, 153, 0.4)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: "#34d399",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#34d399" }}>
                    ⏱️ Stopwatch Running
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    icon={<TimerIcon sx={{ fontSize: "14px !important", color: "#34d399 !important" }} />}
                    label={formatDuration(elapsedSeconds)}
                    color="success"
                    size="small"
                    sx={{ fontWeight: 800 }}
                  />
                  <Button
                    size="small"
                    variant={isAdjusting ? "contained" : "outlined"}
                    color="info"
                    startIcon={<EditIcon sx={{ fontSize: "14px !important" }} />}
                    onClick={handleToggleAdjust}
                    sx={{ borderRadius: 2, fontSize: "0.6875rem", py: 0.2, px: 1, fontWeight: 700 }}
                  >
                    {isAdjusting ? "Editing" : "Adjust"}
                  </Button>
                </Box>
              </Box>

              {/* Editable Duration Segmented Inputs */}
              {isAdjusting && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(0, 0, 0, 0.3)" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "#ffd54f" }}>
                      ✏️ Edit Stopwatch Runtime (Over-run Correction)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<ResetIcon sx={{ fontSize: "14px" }} />}
                      onClick={handleResetToElapsed}
                      sx={{ fontSize: "0.625rem", py: 0 }}
                    >
                      Reset to Live
                    </Button>
                  </Box>

                  <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
                    {elapsedSeconds >= 86400 && (
                      <Grid size={{ xs: 3 }}>
                        <TextField
                          label="Days"
                          size="small"
                          type="number"
                          value={customDays}
                          onChange={(e) => setCustomDays(Math.max(0, parseInt(e.target.value) || 0))}
                          slotProps={{ htmlInput: { min: 0, max: 30 } }}
                          fullWidth
                        />
                      </Grid>
                    )}
                    <Grid size={{ xs: elapsedSeconds >= 86400 ? 3 : 4 }}>
                      <TextField
                        label="Hours"
                        size="small"
                        type="number"
                        value={customHours}
                        onChange={(e) => setCustomHours(Math.max(0, parseInt(e.target.value) || 0))}
                        slotProps={{ htmlInput: { min: 0, max: 23 } }}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: elapsedSeconds >= 86400 ? 3 : 4 }}>
                      <TextField
                        label="Mins"
                        size="small"
                        type="number"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        slotProps={{ htmlInput: { min: 0, max: 59 } }}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: elapsedSeconds >= 86400 ? 3 : 4 }}>
                      <TextField
                        label="Secs"
                        size="small"
                        type="number"
                        value={customSeconds}
                        onChange={(e) => setCustomSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        slotProps={{ htmlInput: { min: 0, max: 59 } }}
                        fullWidth
                      />
                    </Grid>
                  </Grid>

                  {/* Preset Chips */}
                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1.5 }}>
                    <Chip label="30m" size="small" onClick={() => handleApplyPreset(0, 0, 30)} sx={{ cursor: "pointer", fontWeight: 700 }} />
                    <Chip label="1h" size="small" onClick={() => handleApplyPreset(0, 1, 0)} sx={{ cursor: "pointer", fontWeight: 700 }} />
                    <Chip label="2h" size="small" onClick={() => handleApplyPreset(0, 2, 0)} sx={{ cursor: "pointer", fontWeight: 700 }} />
                    <Chip label="4h" size="small" onClick={() => handleApplyPreset(0, 4, 0)} sx={{ cursor: "pointer", fontWeight: 700 }} />
                    <Chip label="8h" size="small" onClick={() => handleApplyPreset(0, 8, 0)} sx={{ cursor: "pointer", fontWeight: 700 }} />
                    <Chip label="1 Day (24h)" size="small" onClick={() => handleApplyPreset(1, 0, 0)} sx={{ cursor: "pointer", fontWeight: 700 }} />
                    <Chip label="3 Days (72h)" size="small" onClick={() => handleApplyPreset(3, 0, 0)} sx={{ cursor: "pointer", fontWeight: 700 }} />
                  </Box>
                </Paper>
              )}

              {/* Consumption & Cost Grid */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {isDurationModified ? "Adjusted Consumption" : "Metered Consumption"}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: "#fbbf24" }}>
                    {(isDurationModified ? adjustedKwh : liveKwh) < 0.01
                      ? (isDurationModified ? adjustedKwh : liveKwh).toFixed(4)
                      : (isDurationModified ? adjustedKwh : liveKwh).toFixed(3)}{" "}
                    kWh
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {isDurationModified ? "Adjusted Cost" : "Incurred Cost"}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: "#34d399" }}>
                    ₱{(isDurationModified ? adjustedCost : liveCost).toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>

              {/* 24-Hour Visual Day Progress Track */}
              {appliance?.last_turned_on_at && (() => {
                const start = new Date(appliance.last_turned_on_at);
                const now = new Date();
                const startFrac = start.getHours() + start.getMinutes() / 60 + start.getSeconds() / 3600;
                const nowFrac = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
                const leftPct = (startFrac / 24) * 100;
                const widthPct = Math.max(2, ((nowFrac - startFrac) / 24) * 100);
                const startTimeStr = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                return (
                  <Box sx={{ mt: 0.5, p: 1.5, borderRadius: 2, bgcolor: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(52, 211, 153, 0.2)" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.6875rem" }}>
                        Activity Timeline
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "#34d399", fontSize: "0.6875rem" }}>
                        Started {startTimeStr} {previewSlices.length > 1 ? `(${previewSlices.length} days spanned)` : "➔ LIVE"}
                      </Typography>
                    </Box>

                    {/* 24h Visual Bar */}
                    <Box
                      sx={{
                        height: 20,
                        borderRadius: 1.5,
                        bgcolor: "rgba(255, 255, 255, 0.05)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {[25, 50, 75].map((pct) => (
                        <Box
                          key={pct}
                          sx={{
                            position: "absolute",
                            left: `${pct}%`,
                            top: 0,
                            bottom: 0,
                            width: "1px",
                            bgcolor: "rgba(255, 255, 255, 0.1)",
                          }}
                        />
                      ))}

                      <Box
                        sx={{
                          position: "absolute",
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          top: 2,
                          bottom: 2,
                          borderRadius: 1,
                          bgcolor: "#10b981",
                          boxShadow: "0 0 8px #34d399",
                          animation: "pulse 2s infinite",
                        }}
                      />
                    </Box>

                    {/* Time Axis Labels */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: "0.5625rem", color: "text.secondary" }}>12 AM</Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.5625rem", color: "text.secondary" }}>6 AM</Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.5625rem", color: "text.secondary" }}>12 PM</Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.5625rem", color: "text.secondary" }}>6 PM</Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.5625rem", color: "text.secondary" }}>12 AM</Typography>
                    </Box>
                  </Box>
                );
              })()}

              <Button
                variant="contained"
                color={isDurationModified ? "warning" : "error"}
                fullWidth
                startIcon={<PowerIcon />}
                onClick={handleStopClick}
                disabled={isStopping}
                sx={{ borderRadius: 2.5, fontWeight: 800, py: 1.2, mt: 1 }}
              >
                {isStopping
                  ? "Saving Energy Log..."
                  : isDurationModified
                  ? `⏹️ Stop & Save Adjusted (${formatDuration(totalAdjustedSeconds)})`
                  : "⏹️ Stop Stopwatch & Save Log"}
              </Button>
            </Paper>
          )}

          {/* Historical Receipt View */}
          {receiptLog && (
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "rgba(15, 14, 58, 0.6)",
                border: "1px solid rgba(108, 122, 224, 0.3)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <ReceiptIcon sx={{ color: "#ffd54f", fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Audited Energy Receipt
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Logged on {new Date(receiptLog.started_at).toLocaleString()}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ borderColor: "rgba(108, 122, 224, 0.2)" }} />

              <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Total Duration</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                  {receiptLog.duration_minutes ? `${Math.round(receiptLog.duration_minutes)} mins` : "1 hr"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Energy Consumed</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: "#fbbf24" }}>
                  {(receiptLog.kwh_consumed || 0).toFixed(3)} kWh
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Rated Power</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  {watts} Watts
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Effective Tariff</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  ₱14.8261 / kWh
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ borderColor: "rgba(108, 122, 224, 0.2)" }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary" }}>
                Total Incurred Cost:
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "#34d399" }}>
                ₱{(receiptLog.estimated_cost || 0).toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2.5, fontWeight: 700 }}>
            Close
          </Button>
        </Box>
      </Box>
    </Modal>

    {/* Confirmation Dialog for Duration Adjustment */}
    <Dialog
      open={isConfirmOpen}
      onClose={() => setIsConfirmOpen(false)}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, fontWeight: 800 }}>
        <WarningIcon sx={{ color: "warning.main", fontSize: 28 }} />
        Confirm Duration Adjustment
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          The stopwatch timer was adjusted from the actual elapsed runtime. Please confirm the updated energy log:
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(0,0,0,0.2)" }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                ⏱️ Elapsed Stopwatch
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, textDecoration: "line-through", color: "text.secondary" }}>
                {formatDuration(elapsedSeconds)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                ₱{liveCost.toFixed(2)} ({liveKwh.toFixed(3)} kWh)
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 800, display: "block" }}>
                ✅ Adjusted Runtime
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 900, color: "#34d399" }}>
                {formatDuration(totalAdjustedSeconds)}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#ffd54f" }}>
                ₱{adjustedCost.toFixed(2)} ({adjustedKwh.toFixed(3)} kWh)
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Multi-Day Allocation Breakdown Preview */}
        {previewSlices.length > 1 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary", mb: 1, display: "block" }}>
              🗓️ Smart Midnight Calendar Distribution ({previewSlices.length} Days Spanned):
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {previewSlices.map((slice) => (
                <Box
                  key={slice.dateKey}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1.5,
                    bgcolor: "rgba(255, 255, 255, 0.04)",
                    fontSize: "0.75rem",
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {slice.dateKey}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#ffd54f", fontWeight: 800, fontFamily: "monospace" }}>
                    {slice.hours.toFixed(2)} hrs • ₱{calculateCost(calculateKwh(watts, slice.hours, 1)).toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, display: "flex", justifyContent: "space-between" }}>
        <Button onClick={() => setIsConfirmOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>
          Cancel
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => executeStop(Math.max(1, Math.round(elapsedSeconds / 60)))}
            disabled={isStopping}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Use Actual Timer
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => executeStop(Math.max(1, Math.round(totalAdjustedSeconds / 60)))}
            disabled={isStopping}
            startIcon={<CheckCircleIcon />}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            Save Adjusted Log
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
    </>
  );
};
