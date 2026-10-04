import React, { useState, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
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
  Warning as WarningIcon,
  Laptop as LaptopIcon,
  Spa as LightModeIcon,
  WorkOutlined as OfficeModeIcon,
  VideogameAsset as GamingModeIcon,
} from "@mui/icons-material";
import { UserAppliance, ApplianceList } from "../../types";
import { useUpdate, useList } from "@refinedev/core";
import { devLog } from "../../lib/devLogger";
import { calculateSimultaneousDemand } from "../../lib/meralcoCalculator";
import { supabaseClient } from "../../lib/supabaseClient";
import {
  calculateKwh,
  calculateApplianceKwh,
  calculateCost,
  isComputerCategory,
  getApplianceEffectiveRunningWatts,
} from "../../lib/dailyUsageService";
import {
  switchOnCircuit,
  switchOffCircuit,
  switchApplianceWorkloadMode,
  getEffectiveApplianceRate,
} from "../../lib/sessionService";
import { PcWorkloadProfile, getApplianceWorkloadWatts } from "../../lib/pcHardwareService";
import { PcWorkloadModeModal } from "../appliances/PcWorkloadModeModal";
import { useRoom } from "../../context/RoomContext";
import { tokens } from "../../theme/tokens";

interface LivePowerBoardProps {
  onOpenAddModal: () => void;
}

export const LivePowerBoard: React.FC<LivePowerBoardProps> = ({ onOpenAddModal }) => {
  const { canEdit, isViewer } = useRoom();
  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const spacesRes = useList<ApplianceList>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const { mutate: updateAppliance } = useUpdate();
  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize circuit toggles across views
  useEffect(() => {
    const handleCircuitToggled = () => {
      if (appliancesRes?.refetch) appliancesRes.refetch();
    };
    window.addEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
    return () => window.removeEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
  }, [appliancesRes]);

  // Memoize demand calculation to avoid running on every second tick
  const demand = useMemo(() => calculateSimultaneousDemand(appliances, 9.2), [appliances]);

  // Replace O(N*M) space lookup with O(N) map building and O(1) lookup
  const spacesMap = useMemo(() => {
    const map: Record<string, ApplianceList> = {};
    spaces.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [spaces]);

  const getCategoryIcon = (category: string) => {
    const c = category?.toLowerCase() || "";
    if (c.includes("air condition") || c.includes("aircon")) {
      return <WindIcon fontSize="small" sx={{ color: "primary.light" }} />;
    }
    if (c.includes("refrigerat") || c.includes("freezer") || c.includes("chiller")) {
      return <RefrigeratorIcon fontSize="small" sx={{ color: "primary.light" }} />;
    }
    if (c.includes("fan") || c.includes("cool")) {
      return <SpeedIcon fontSize="small" sx={{ color: "primary.light" }} />;
    }
    if (c.includes("wash") || c.includes("laundry")) {
      return <WashingMachineIcon fontSize="small" sx={{ color: "primary.light" }} />;
    }
    if (c.includes("computer") || c.includes("laptop") || c.includes("pc")) {
      return <LaptopIcon fontSize="small" sx={{ color: "#818cf8" }} />;
    }
    if (c.includes("tv") || c.includes("televis") || c.includes("entertain") || c.includes("office")) {
      return <TvIcon fontSize="small" sx={{ color: "primary.light" }} />;
    }
    return <LightbulbIcon fontSize="small" sx={{ color: "primary.light" }} />;
  };

  const [pcModeAppliance, setPcModeAppliance] = useState<UserAppliance | null>(null);
  const [modeMenuAnchor, setModeMenuAnchor] = useState<{ el: HTMLElement; app: UserAppliance } | null>(null);

  const handleSelectPcMode = async (mode: PcWorkloadProfile, watts: number) => {
    if (!pcModeAppliance) return;
    const app = pcModeAppliance;
    setPcModeAppliance(null);
    await switchOnCircuit(app, { workloadMode: mode, sessionWatts: watts });
    if (appliancesRes?.refetch) appliancesRes.refetch();
  };

  const handleSwitchModeOnTheFly = async (mode: PcWorkloadProfile) => {
    if (!modeMenuAnchor) return;
    const { app } = modeMenuAnchor;
    setModeMenuAnchor(null);
    const watts = getApplianceWorkloadWatts(app, mode);
    await switchApplianceWorkloadMode(app, mode, watts);
    if (appliancesRes?.refetch) appliancesRes.refetch();
  };

  const togglePower = async (app: UserAppliance) => {
    if (!canEdit) return;
    if (app.is_currently_on) {
      await switchOffCircuit(app);
    } else {
      if (isComputerCategory(app.category, app.name)) {
        setPcModeAppliance(app);
        return;
      }
      await switchOnCircuit(app);
    }
    if (appliancesRes?.refetch) appliancesRes.refetch();
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
    const telemetry = getApplianceEffectiveRunningWatts(app, diffSeconds / 60);
    const accumulatedKwh = (telemetry.effectiveWatts / 1000) * (diffSeconds / 3600);
    const effectiveRate = getEffectiveApplianceRate(app);
    return accumulatedKwh * effectiveRate;
  };

  return (
    <Card sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 1.5, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <Box>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BoltIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
                Live Circuit Power Board
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Real-time demand gauge and active appliance circuit controls
              </Typography>
            </Box>
          </Box>

          <Tooltip title={!canEdit ? "View-only members cannot add appliances" : ""}>
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={onOpenAddModal}
                disabled={!canEdit}
                startIcon={<PlusIcon />}
                sx={{ fontWeight: 700 }}
              >
                Add Appliance
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* Real-time Simultaneous Demand Gauge */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.75, sm: 2 },
            mb: 2.5,
            borderRadius: 1.25,
            bgcolor: demand.isOverloaded
              ? "rgba(239, 68, 68, 0.1)"
              : demand.loadPercentage > 75
              ? "rgba(245, 158, 11, 0.1)"
              : "action.hover",
            borderColor: demand.isOverloaded
              ? "error.main"
              : demand.loadPercentage > 75
              ? "warning.main"
              : "divider",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, flexWrap: "wrap", gap: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Real-Time Household Demand
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: demand.isOverloaded ? "error.main" : "text.primary" }}>
                {demand.simultaneousWatts.toLocaleString()} W <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>({(demand.simultaneousWatts / 230).toFixed(1)}A / 40A)</Typography>
              </Typography>
            </Box>
            <Chip
              label={`${demand.loadPercentage.toFixed(1)}% Capacity`}
              color={demand.isOverloaded ? "error" : demand.loadPercentage > 75 ? "warning" : "success"}
              size="small"
              sx={{ fontWeight: 800, fontFamily: "monospace" }}
            />
          </Box>

          <LinearProgress
            variant="determinate"
            value={Math.min(100, demand.loadPercentage)}
            color={demand.isOverloaded ? "error" : demand.loadPercentage > 75 ? "warning" : "primary"}
            sx={{ height: 8, borderRadius: 1, mb: 1 }}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
              {demand.activeCircuitsCount} circuits active • 40A Main Breaker Rating
            </Typography>
            {demand.isOverloaded ? (
              <Chip
                icon={<WarningIcon sx={{ fontSize: "14px !important" }} />}
                label="Breaker Overload Warning"
                size="small"
                color="error"
                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }}
              />
            ) : (
              <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700, fontFamily: "monospace" }}>
                ₱{demand.hourlyRunningCost.toFixed(2)}/hr combined draw
              </Typography>
            )}
          </Box>
        </Paper>

        <Divider sx={{ mb: 2 }} />

        {/* Grid of circuit switches */}
        {appliances.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              {spaces.length === 0
                ? "Set up your first space to start adding appliances."
                : "No appliances configured in your household yet."}
            </Typography>
            {spaces.length === 0 ? (
              canEdit ? (
                <Button variant="contained" size="small" onClick={onOpenAddModal} startIcon={<PlusIcon />}>
                  Set Up Space & Add Appliance
                </Button>
              ) : (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Ask a Room Admin to set up spaces and add appliances.
                </Typography>
              )
            ) : (
              canEdit ? (
                <Button variant="contained" size="small" onClick={onOpenAddModal} startIcon={<PlusIcon />}>
                  Add First Appliance
                </Button>
              ) : (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Ask a Room Admin to register appliances to this room.
                </Typography>
              )
            )}
          </Box>
        ) : (
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {appliances.map((app: UserAppliance) => {
              const isOn = app.is_currently_on;
              const totalWatts = app.watts * (app.quantity || 1);
              const appSpace = app.list_id ? spacesMap[app.list_id] : undefined;
              const effectiveRate = app.tariff_type === "commercial" ? 15.2 : 14.8261;
              const hourlyRate = ((totalWatts / 1000) * effectiveRate).toFixed(2);
              const liveSpent = getAccumulatedPesos(app);

              return (
                <Grid size={{ xs: 12, sm: 6 }} key={app.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      p: { xs: 1.75, sm: 2 },
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1.5,
                      borderColor: isOn
                        ? (theme) => (theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.3)" : "rgba(5, 150, 105, 0.3)")
                        : (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
                      bgcolor: isOn
                        ? (theme) => (theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.05)" : "rgba(5, 150, 105, 0.04)")
                        : "transparent",
                      transition: "all 0.15s ease",
                      "&:hover": {
                        borderColor: isOn
                          ? (theme) => (theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.6)" : "rgba(5, 150, 105, 0.6)")
                          : (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong),
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flexGrow: 1 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: "action.hover",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {getCategoryIcon(app.category)}
                      </Box>

                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                          {app.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                          {totalWatts}W {appSpace ? `• ${appSpace.name}` : ""}
                        </Typography>

                        {isOn && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5, flexWrap: "wrap" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <ClockIcon sx={{ fontSize: 12, color: "success.main" }} />
                              <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700, fontFamily: "monospace", fontSize: "0.6875rem" }}>
                                {getRunningDuration(app.last_turned_on_at)} (₱{liveSpent.toFixed(3)})
                              </Typography>
                            </Box>
                            {(() => {
                              const start = new Date(app.last_turned_on_at!).getTime();
                              const diffMinutes = Math.max(0, (now - start) / 60000);
                              const telemetry = getApplianceEffectiveRunningWatts(app, diffMinutes);
                              const isPc = isComputerCategory(app.category, app.name);

                              return (
                                <Tooltip title={isPc && canEdit ? "Click to switch workload mode on the fly" : ""}>
                                  <Chip
                                    label={telemetry.badgeText}
                                    color={telemetry.badgeColor as any}
                                    size="small"
                                    onClick={
                                      isPc && canEdit
                                        ? (e) => {
                                            e.stopPropagation();
                                            setModeMenuAnchor({ el: e.currentTarget, app });
                                          }
                                        : undefined
                                    }
                                    sx={{
                                      height: 18,
                                      fontSize: "0.625rem",
                                      fontWeight: 700,
                                      cursor: isPc && canEdit ? "pointer" : "default",
                                      ...(isPc && canEdit
                                        ? {
                                            "&:hover": {
                                              filter: "brightness(1.15)",
                                              boxShadow: "0 0 6px rgba(96, 165, 250, 0.4)",
                                            },
                                          }
                                        : {}),
                                    }}
                                  />
                                </Tooltip>
                              );
                            })()}
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0 }}>
                      <Chip
                        label={`₱${hourlyRate}/hr`}
                        size="small"
                        sx={{ fontWeight: 700, fontFamily: "monospace", height: 20, fontSize: "0.6875rem" }}
                      />

                      <Tooltip
                        title={
                          !canEdit
                            ? "View-only members cannot toggle circuits"
                            : isOn
                            ? "Power OFF Circuit"
                            : "Power ON Circuit"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={!canEdit}
                            onClick={() => togglePower(app)}
                            sx={{
                              bgcolor: isOn ? "success.main" : "action.hover",
                              color: isOn ? "#ffffff" : "text.secondary",
                              border: "1px solid",
                              borderColor: isOn ? "success.dark" : "divider",
                              "&:hover": {
                                bgcolor: isOn ? "success.dark" : "action.selected",
                                transform: canEdit ? "scale(1.08)" : "none",
                              },
                              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                          >
                            <PowerIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* On-the-fly PC Workload Mode Switcher Menu */}
      <Menu
        anchorEl={modeMenuAnchor?.el}
        open={Boolean(modeMenuAnchor)}
        onClose={() => setModeMenuAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              minWidth: 190,
              boxShadow: 8,
              border: "1px solid",
              borderColor: "divider",
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
            Switch Workload Mode
          </Typography>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => handleSwitchModeOnTheFly("light")}>
          <ListItemIcon>
            <LightModeIcon fontSize="small" sx={{ color: "#34d399" }} />
          </ListItemIcon>
          <ListItemText
            primary={<Typography variant="body2" sx={{ fontWeight: 700 }}>Idle / Light</Typography>}
            secondary={modeMenuAnchor ? `~${getApplianceWorkloadWatts(modeMenuAnchor.app, "light")}W` : undefined}
          />
        </MenuItem>
        <MenuItem onClick={() => handleSwitchModeOnTheFly("standard")}>
          <ListItemIcon>
            <OfficeModeIcon fontSize="small" sx={{ color: "#60a5fa" }} />
          </ListItemIcon>
          <ListItemText
            primary={<Typography variant="body2" sx={{ fontWeight: 700 }}>Office / Standard</Typography>}
            secondary={modeMenuAnchor ? `~${getApplianceWorkloadWatts(modeMenuAnchor.app, "standard")}W` : undefined}
          />
        </MenuItem>
        <MenuItem onClick={() => handleSwitchModeOnTheFly("heavy")}>
          <ListItemIcon>
            <GamingModeIcon fontSize="small" sx={{ color: "#f87171" }} />
          </ListItemIcon>
          <ListItemText
            primary={<Typography variant="body2" sx={{ fontWeight: 700 }}>Gaming / Heavy</Typography>}
            secondary={modeMenuAnchor ? `~${getApplianceWorkloadWatts(modeMenuAnchor.app, "heavy")}W` : undefined}
          />
        </MenuItem>
      </Menu>

      {/* PC Workload Mode 1-Tap Picker Modal */}
      {pcModeAppliance && (
        <PcWorkloadModeModal
          open={Boolean(pcModeAppliance)}
          onClose={() => setPcModeAppliance(null)}
          appliance={pcModeAppliance}
          onSelectMode={handleSelectPcMode}
        />
      )}
    </Card>
  );
};

export default LivePowerBoard;
