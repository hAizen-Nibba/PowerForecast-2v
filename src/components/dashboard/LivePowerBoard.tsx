import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import {
  PowerSettingsNew as PowerIcon,
  Bolt as BoltIcon,
  Air as WindIcon,
  Kitchen as RefrigeratorIcon,
  Tv as TvIcon,
  LocalLaundryService as WashingMachineIcon,
  Lightbulb as LightbulbIcon,
  Add as PlusIcon,
  AccessTime as ClockIcon,
  Speed as SpeedIcon,
} from "@mui/icons-material";
import { UserAppliance } from "../../types";
import { useUpdate, useList } from "@refinedev/core";
import { devLog } from "../../lib/devLogger";

interface LivePowerBoardProps {
  onOpenAddModal: () => void;
}

export const LivePowerBoard: React.FC<LivePowerBoardProps> = ({ onOpenAddModal }) => {
  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const { mutate: updateAppliance } = useUpdate();
  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "air conditioners":
        return <WindIcon fontSize="small" sx={{ color: "primary.light" }} />;
      case "refrigerators & freezers":
        return <RefrigeratorIcon fontSize="small" sx={{ color: "primary.light" }} />;
      case "television sets":
        return <TvIcon fontSize="small" sx={{ color: "primary.light" }} />;
      case "electric fans":
        return <SpeedIcon fontSize="small" sx={{ color: "primary.light" }} />;
      case "washing machines":
        return <WashingMachineIcon fontSize="small" sx={{ color: "primary.light" }} />;
      default:
        return <LightbulbIcon fontSize="small" sx={{ color: "primary.light" }} />;
    }
  };

  const togglePower = (app: UserAppliance) => {
    const newState = !app.is_currently_on;
    const nowIso = newState ? new Date().toISOString() : null;

    devLog.telemetry("Telemetry", `Circuit switched ${newState ? "⚡ [ACTIVE ON]" : "⚪ [STANDBY OFF]"}: "${app.name}" (${app.watts}W @ 230V)`, {
      applianceId: app.id,
      name: app.name,
      category: app.category,
      watts: app.watts,
      is_currently_on: newState,
      last_turned_on_at: nowIso,
      ratePerHourPHP: ((app.watts * (app.quantity || 1) / 1000) * 14.8261).toFixed(2),
    });

    updateAppliance({
      resource: "user_appliances",
      id: app.id,
      values: {
        is_currently_on: newState,
        last_turned_on_at: nowIso,
      },
    });
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

  const getAccumulatedPesos = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = app.watts * (app.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    return accumulatedKwh * 14.8261;
  };

  return (
    <Card sx={{ p: 3, borderRadius: 3, height: "100%" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: "primary.main",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BoltIcon sx={{ color: "#ffd54f" }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Live Circuit Power Board
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Toggle circuit breakers to inspect live wattage and costs
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={onOpenAddModal}
          startIcon={<PlusIcon />}
        >
          Add Appliance
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Grid of circuit switches */}
      {appliances.length === 0 ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            No appliances configured in your household yet.
          </Typography>
          <Button variant="contained" size="small" onClick={onOpenAddModal} startIcon={<PlusIcon />}>
            Add First Appliance
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {appliances.map((app: UserAppliance) => {
            const isOn = app.is_currently_on;
            const totalWatts = app.watts * (app.quantity || 1);
            const hourlyRate = ((totalWatts / 1000) * 14.8261).toFixed(2);
            const liveSpent = getAccumulatedPesos(app);

            return (
              <Grid size={{ xs: 12, sm: 6 }} key={app.id}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderColor: isOn ? "success.main" : "divider",
                    bgcolor: isOn
                      ? (theme) => (theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.05)")
                      : "transparent",
                    transition: "all 0.15s ease-in-out",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: "action.hover",
                        display: "flex",
                      }}
                    >
                      {getCategoryIcon(app.category)}
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                        {app.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        {totalWatts}W • {app.room_location || "General"}
                      </Typography>

                      {isOn && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                          <ClockIcon sx={{ fontSize: 12, color: "success.main" }} />
                          <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700, fontFamily: "monospace", fontSize: "0.6875rem" }}>
                            {getRunningDuration(app.last_turned_on_at)} (₱{liveSpent.toFixed(3)})
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                    <Chip
                      label={`₱${hourlyRate}/hr`}
                      size="small"
                      sx={{ fontWeight: 700, fontFamily: "monospace", height: 20, fontSize: "0.6875rem" }}
                    />

                    <Tooltip title={isOn ? "Click to Switch OFF" : "Click to Switch ON"}>
                      <IconButton
                        size="small"
                        onClick={() => togglePower(app)}
                        sx={{
                          bgcolor: isOn ? "success.main" : "action.hover",
                          color: isOn ? "#ffffff" : "text.secondary",
                          border: "1px solid",
                          borderColor: isOn ? "success.dark" : "divider",
                          "&:hover": {
                            bgcolor: isOn ? "success.dark" : "action.selected",
                          },
                        }}
                      >
                        <PowerIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Card>
  );
};

export default LivePowerBoard;
