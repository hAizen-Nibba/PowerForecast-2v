import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import {
  Timer as TimerIcon,
  PowerSettingsNew as PowerIcon,
  ReceiptLong as ReceiptIcon,
} from "@mui/icons-material";
import { Modal } from "../common/Modal";
import { UserAppliance, ApplianceUsageLog } from "../../types";

interface LiveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appliance: UserAppliance | null;
  onStopSession: (applianceId: string) => Promise<void>;
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

  // Calculate live running stopwatch if appliance is on
  useEffect(() => {
    if (!isOpen || !appliance?.is_currently_on || !appliance.last_turned_on_at) {
      setElapsedSeconds(0);
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

  if (!appliance && !receiptLog) return null;

  const isLive = appliance?.is_currently_on;
  const watts = appliance?.watts ? appliance.watts * (appliance.quantity || 1) : 1000;
  const genRate = 14.8261; // Effective Meralco rate per kWh

  // Live metered kWh and cost
  const liveHours = elapsedSeconds / 3600;
  const liveKwh = (watts * liveHours) / 1000;
  const liveCost = liveKwh * genRate;

  const formatDuration = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${s}s`;
    if (mins > 0) return `${mins}m ${s}s`;
    return `${s}s`;
  };

  const handleStop = async () => {
    if (!appliance) return;
    setIsStopping(true);
    try {
      await onStopSession(appliance.id);
    } finally {
      setIsStopping(false);
      onClose();
    }
  };

  return (
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
              <Chip
                icon={<TimerIcon sx={{ fontSize: "14px !important", color: "#34d399 !important" }} />}
                label={formatDuration(elapsedSeconds)}
                color="success"
                size="small"
                sx={{ fontWeight: 800 }}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Metered Consumption</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: "#fbbf24" }}>
                  {liveKwh < 0.01 ? liveKwh.toFixed(4) : liveKwh.toFixed(3)} kWh
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Incurred Cost</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: "#34d399" }}>
                  ₱{liveCost.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>

            <Button
              variant="contained"
              color="error"
              fullWidth
              startIcon={<PowerIcon />}
              onClick={handleStop}
              disabled={isStopping}
              sx={{ borderRadius: 2.5, fontWeight: 800, py: 1.2, mt: 1 }}
            >
              {isStopping ? "Stopping Stopwatch..." : "⏹️ Stop Stopwatch & Save Log"}
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1.5, borderBottom: "1px solid rgba(108, 122, 224, 0.2)" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <ReceiptIcon sx={{ color: "primary.main" }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                  Audited Energy Receipt
                </Typography>
              </Box>
              <Chip
                label="Metered Session"
                color="primary"
                size="small"
                sx={{ fontWeight: 800, fontSize: "0.7rem" }}
              />
            </Box>

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
  );
};
