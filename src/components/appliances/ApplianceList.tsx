import React, { useState, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import {
  Bolt as BoltIcon,
  Search as SearchIcon,
  Add as PlusIcon,
  Edit as EditIcon,
  Delete as TrashIcon,
  Storage as DatabaseIcon,
  AccessTime as ClockIcon,
  Speed as SpeedIcon,
  DeleteSweep as DeleteSweepIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Settings as SettingsIcon,
  CameraAlt as CameraIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
} from "@mui/icons-material";
import { PageHeader } from "../common/PageHeader";
import { SectionCard } from "../common/SectionCard";
import { tokens } from "../../theme/tokens";
import { UserAppliance, ApplianceList as ApplianceSpace, STREAMLINED_CATEGORIES } from "../../types";
import { useList, useDelete, useUpdate, useCreate } from "@refinedev/core";
import { ApplianceModal } from "./ApplianceModal";
import { SpaceManagementModal } from "./SpaceManagementModal";
import { useToast } from "../common/ToastProvider";
import { useConfirm } from "../common/ConfirmProvider";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";
import { switchOnCircuit, switchOffCircuit, getEffectiveApplianceRate } from "../../lib/sessionService";
import {
  calculateApplianceKwh,
  normalizeApplianceCategory,
  isCompressorInverterCategory,
  isComputerCategory,
  getApplianceEffectiveRunningWatts,
} from "../../lib/dailyUsageService";
import { PcWorkloadProfile } from "../../lib/pcHardwareService";
import { PcWorkloadModeModal } from "./PcWorkloadModeModal";
import { useRoom } from "../../context/RoomContext";

interface ApplianceListProps {
  onOpenAiScanner?: () => void;
}

export const ApplianceList: React.FC<ApplianceListProps> = () => {
  const { canEdit } = useRoom();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRoom] = useState("all");
  const [activeSpaceId, setActiveSpaceId] = useState<string>("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialTab, setAddModalInitialTab] = useState<number>(0);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<ApplianceSpace | null>(null);
  const [applianceToEdit, setApplianceToEdit] = useState<UserAppliance | null>(null);

  // First-time space creation form state
  const [initialSpaceName, setInitialSpaceName] = useState("");
  const [initialTariffType, setInitialTariffType] = useState<"residential" | "commercial">("residential");

  const { showSuccess, showInfo, showError } = useToast();
  const { confirm } = useConfirm();

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const spacesRes = useList<ApplianceSpace>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const { mutate: deleteAppliance } = useDelete();
  const { mutate: updateAppliance } = useUpdate();
  const { mutate: createSpace, isLoading: isCreatingSpace } = useCreate();

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceSpace[] = spacesRes?.data?.data || spacesRes?.result?.data || [];

  // Sync activeSpaceId when spaces list changes
  useEffect(() => {
    if (spaces.length > 0) {
      if (!activeSpaceId || !spaces.some((s) => s.id === activeSpaceId)) {
        setActiveSpaceId(spaces[0].id);
      }
    } else {
      setActiveSpaceId("");
    }
  }, [spaces, activeSpaceId]);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  // Live 1-second ticker for running stopwatches
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const hasRunning = appliances.some((a) => a.is_currently_on);
    if (!hasRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [appliances]);

  // Synchronize circuit toggles triggered from Sidebar, Dashboard, or Smart Calendar
  useEffect(() => {
    const handleCircuitToggled = () => {
      if (appliancesRes?.refetch) appliancesRes.refetch();
    };
    window.addEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
    return () => window.removeEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
  }, [appliancesRes]);

  // PC Workload Mode Modal state
  const [pcModeAppliance, setPcModeAppliance] = useState<UserAppliance | null>(null);

  const handleSelectPcMode = async (mode: PcWorkloadProfile, watts: number) => {
    if (!pcModeAppliance) return;
    const app = pcModeAppliance;
    setPcModeAppliance(null);
    const res = await switchOnCircuit(app, { workloadMode: mode, sessionWatts: watts });
    if (res.success) {
      const modeLabel = mode === "heavy" ? "Gaming" : mode === "light" ? "Idle / Light" : "Office / Standard";
      showSuccess(`Stopwatch started for ${app.name} (${modeLabel} mode, ~${watts}W)! Real-time tracking active.`);
      if (appliancesRes?.refetch) appliancesRes.refetch();
    } else {
      showError(`Failed to start stopwatch for ${app.name}`);
    }
  };

  const togglePower = async (app: UserAppliance) => {
    if (!canEdit) {
      showError("View-only members cannot toggle circuits.");
      return;
    }
    if (app.is_active === false) {
      showError("Appliance is blacklisted. Restore it first to enable the stopwatch.");
      return;
    }

    if (app.is_currently_on) {
      const res = await switchOffCircuit(app);
      if (res.success) {
        showSuccess(`Stopwatch stopped: Logged ${res.durationMinutes}m (~₱${res.cost.toFixed(2)}) for ${app.name}`);
        if (appliancesRes?.refetch) appliancesRes.refetch();
      } else {
        showError(`Failed to stop stopwatch for ${app.name}`);
      }
    } else {
      // If it's a computer or laptop, trigger the 1-tap mode picker
      if (isComputerCategory(app.category, app.name)) {
        setPcModeAppliance(app);
        return;
      }

      const res = await switchOnCircuit(app);
      if (res.success) {
        showSuccess(`Stopwatch started for ${app.name}! Real-time energy tracking active.`);
        if (appliancesRes?.refetch) appliancesRes.refetch();
      } else {
        showError(`Failed to start stopwatch for ${app.name}`);
      }
    }
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

  const getLiveSpent = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const telemetry = getApplianceEffectiveRunningWatts(app, diffSeconds / 60);
    const accumulatedKwh = (telemetry.effectiveWatts / 1000) * (diffSeconds / 3600);
    const rate = getEffectiveApplianceRate(app);
    return accumulatedKwh * rate;
  };

  // First-time space submission handler
  const handleCreateInitialSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialSpaceName.trim()) {
      showError("Please enter a name for your space.");
      return;
    }

    createSpace(
      {
        resource: "appliance_lists",
        values: {
          name: initialSpaceName.trim(),
          tariff_type: initialTariffType,
          is_default: true,
        },
      },
      {
        onSuccess: (data: any) => {
          const newId = data?.data?.id;
          if (newId) setActiveSpaceId(newId);
          setInitialSpaceName("");
          showSuccess(`Space "${initialSpaceName.trim()}" created! You can now add appliances.`);
        },
      }
    );
  };

  // Filter appliances strictly to the active space with smart fallback for unassigned or orphaned spaces
  const currentSpaceAppliances = useMemo(() => {
    if (!activeSpace) return appliances;
    const hasDefault = spaces.some((s) => s.is_default);
    const isSingleSpace = spaces.length <= 1;

    return appliances.filter((app) => {
      // Direct space ID match
      if (app.list_id && app.list_id === activeSpace.id) return true;
      // If appliance has no list_id OR points to a space that doesn't exist, show in default or primary space
      const spaceExists = app.list_id ? spaces.some((s) => s.id === app.list_id) : false;
      if (!app.list_id || !spaceExists) {
        if (activeSpace.is_default) return true;
        if (isSingleSpace) return true;
        if (!hasDefault && activeSpace.id === spaces[0]?.id) return true;
      }
      return false;
    });
  }, [appliances, activeSpace, spaces]);

  const filteredAppliances = useMemo(() => {
    return currentSpaceAppliances.filter((app: UserAppliance) => {
      const appName = String(app.name || "");
      const appBrand = String(app.brand || "");
      const appModel = String(app.model || "");
      const appCategory = String(app.category || "");
      const appRoom = String(app.room_location || "");
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        appName.toLowerCase().includes(q) ||
        appBrand.toLowerCase().includes(q) ||
        appModel.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === "all" ||
        normalizeApplianceCategory(appCategory, appName, appModel) === selectedCategory ||
        appCategory.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesRoom =
        selectedRoom === "all" || appRoom.toLowerCase() === selectedRoom.toLowerCase();

      return matchesSearch && matchesCategory && matchesRoom;
    });
  }, [currentSpaceAppliances, searchQuery, selectedCategory, selectedRoom]);

  // Space-specific stats (excluding blacklisted / inactive appliances)
  const activeSpaceAppliances = currentSpaceAppliances.filter((a) => a.is_active !== false);
  const blacklistedCount = currentSpaceAppliances.filter((a) => a.is_active === false).length;

  const spaceTotalWatts = activeSpaceAppliances.reduce(
    (acc, curr) => acc + curr.watts * (curr.quantity || 1),
    0
  );

  const spaceMonthlyKwh = activeSpaceAppliances.reduce((acc, curr) => {
    const w = Number(curr.watts) || 0;
    const h = Number(curr.hours_per_day) || 0;
    const q = Number(curr.quantity) || 1;
    const d = Number(curr.days_per_month) || 30;
    const kwh = Number(curr.monthly_kwh) > 0 ? Number(curr.monthly_kwh) : (w * h * q * d) / 1000;
    return acc + kwh;
  }, 0);

  const spaceTariffType = activeSpace?.tariff_type || "residential";
  const spaceBillCalc = calculateMeralcoBill(spaceMonthlyKwh, undefined, 0, false, spaceTariffType);

  const handleToggleBlacklist = async (app: UserAppliance) => {
    if (!canEdit) {
      showError("View-only members cannot modify appliance configuration.");
      return;
    }
    const isCurrentlyBlacklisted = app.is_active === false;
    const willBeBlacklisted = !isCurrentlyBlacklisted;

    // If appliance is currently active and will be blacklisted, de-energize and save its session first
    if (willBeBlacklisted && app.is_currently_on) {
      await switchOffCircuit(app);
    }

    updateAppliance(
      {
        resource: "user_appliances",
        id: app.id,
        values: {
          is_active: !willBeBlacklisted,
          ...(willBeBlacklisted ? { is_currently_on: false, last_turned_on_at: null } : {}),
        },
      },
      {
        onSuccess: () => {
          if (willBeBlacklisted) {
            showInfo(`"${app.name}" blacklisted from Smart Calendar & Forecasting calculations.`);
          } else {
            showSuccess(`"${app.name}" restored to active Forecasting & Smart Calendar.`);
          }
        },
        onError: (err: any) => {
          showError(`Failed to update appliance status: ${err?.message || "Unknown error"}`);
        },
      }
    );
  };

  const handleClearAll = async () => {
    if (!canEdit) {
      showError("View-only members cannot clear appliances.");
      return;
    }
    const ok = await confirm({
      title: "Clear All Registered Appliances?",
      message: `Are you sure you want to remove all ${currentSpaceAppliances.length} appliance(s) from "${activeSpace?.name}"?`,
      detail: "This action cannot be undone. You will need to re-add your appliances manually or from the PELP catalog.",
      itemName: activeSpace?.name,
      confirmText: "Yes, Clear All",
      cancelText: "Cancel",
      severity: "error",
    });

    if (!ok) return;

    currentSpaceAppliances.forEach((a) => deleteAppliance({ resource: "user_appliances", id: a.id }));
    showInfo(`Cleared all appliances in ${activeSpace?.name}.`);
  };

  // -------------------------------------------------------------
  // 1. FIRST-TIME ONBOARDING (ZERO SPACES GATE)
  // -------------------------------------------------------------
  if (spaces.length === 0) {
    if (!canEdit) {
      return (
        <Box sx={{ maxWidth: 540, mx: "auto", py: { xs: 4, sm: 6 } }}>
          <SectionCard noPadding>
            <Box sx={{ p: { xs: 3, sm: 4.5 }, textAlign: "center" }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                <BoltIcon sx={{ fontSize: 24 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                No Spaces Configured Yet
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                You are currently viewing this room in <strong>View-only</strong> mode. Please ask a Room Admin or the Room Owner to set up spaces and add appliances.
              </Typography>
            </Box>
          </SectionCard>
        </Box>
      );
    }
    return (
      <Box sx={{ maxWidth: 580, mx: "auto", py: { xs: 4, sm: 6 } }}>
        <SectionCard noPadding>
          <Box sx={{ p: { xs: 3, sm: 4.5 }, textAlign: "center" }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <BoltIcon sx={{ fontSize: 24 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, letterSpacing: "-0.02em" }}>
              Welcome to Appliances Hub
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 3.5, lineHeight: 1.6 }}>
              Organize your appliances into physical spaces (such as your Main Residence, Bakery, or Rental Unit) for exact sub-metering and unbundled tariff calculations.
            </Typography>

            <form onSubmit={handleCreateInitialSpace}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, textAlign: "left" }}>
                <TextField
                  label="Space Name"
                  placeholder="e.g. Main Residence or Cafe Store"
                  value={initialSpaceName}
                  onChange={(e) => setInitialSpaceName(e.target.value)}
                  required
                  fullWidth
                  size="small"
                />

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: "block", color: "text.secondary" }}>
                    Select Tariff Classification
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper
                        variant="outlined"
                        onClick={() => setInitialTariffType("residential")}
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          cursor: "pointer",
                          textAlign: "center",
                          border: "1px solid",
                          borderColor: (theme) => {
                            const isDark = theme.palette.mode === "dark";
                            return initialTariffType === "residential"
                              ? isDark ? tokens.dark.primary : tokens.light.primary
                              : isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
                          },
                          bgcolor: (theme) => {
                            const isDark = theme.palette.mode === "dark";
                            return initialTariffType === "residential"
                              ? isDark ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle
                              : "transparent";
                          },
                          transition: "border-color 0.15s ease",
                        }}
                      >
                        <HomeIcon sx={{ fontSize: 24, mb: 0.5, color: "text.primary" }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Residential
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem", mt: 0.5 }}>
                          230V Stepped Tiers & Lifeline
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper
                        variant="outlined"
                        onClick={() => setInitialTariffType("commercial")}
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          cursor: "pointer",
                          textAlign: "center",
                          border: "1px solid",
                          borderColor: (theme) => {
                            const isDark = theme.palette.mode === "dark";
                            return initialTariffType === "commercial"
                              ? isDark ? tokens.dark.primary : tokens.light.primary
                              : isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
                          },
                          bgcolor: (theme) => {
                            const isDark = theme.palette.mode === "dark";
                            return initialTariffType === "commercial"
                              ? isDark ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle
                              : "transparent";
                          },
                          transition: "border-color 0.15s ease",
                        }}
                      >
                        <StoreIcon sx={{ fontSize: 24, mb: 0.5, color: "text.primary" }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Commercial
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem", mt: 0.5 }}>
                          General Power Flat Rate
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={isCreatingSpace}
                  startIcon={<PlusIcon />}
                  sx={{
                    py: 1.25,
                    borderRadius: 1,
                    fontWeight: 600,
                    textTransform: "none",
                    mt: 1,
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary),
                    color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg),
                  }}
                >
                  {isCreatingSpace ? "Creating Space..." : "Create Space & Start Adding Appliances"}
                </Button>
              </Box>
            </form>
          </Box>
        </SectionCard>
      </Box>
    );
  }

  // -------------------------------------------------------------
  // 2. MODERN REFINED MULTI-SPACE HUB (ACTIVE SPACE VIEW)
  // -------------------------------------------------------------
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Page Header */}
      <PageHeader
        title="Appliances Hub"
        subtitle={
          activeSpace
            ? `Sub-metered circuit inventory for "${activeSpace.name}" (${spaceTariffType === "commercial" ? "Commercial Tariff" : "Residential Tariff"}).`
            : "Manage circuits, physical spaces, and energy loads with sub-metered unbundled tariffs."
        }
        badge={
          <Chip
            size="small"
            label={`${currentSpaceAppliances.length} ${currentSpaceAppliances.length === 1 ? "device" : "devices"}`}
            sx={{
              fontWeight: 600,
              fontSize: "0.75rem",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              color: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            }}
          />
        }
        actions={
          <Box data-tour="appliance-add-buttons" sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Tooltip title={!canEdit ? "View-only members cannot add spaces" : ""}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!canEdit}
                  startIcon={<PlusIcon fontSize="small" />}
                  onClick={() => {
                    setSpaceToEdit(null);
                    setIsSpaceModalOpen(true);
                  }}
                  sx={{
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 1,
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                    color: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                    "&:hover": {
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover,
                    },
                  }}
                >
                  New Space
                </Button>
              </span>
            </Tooltip>

            <Tooltip title={!canEdit ? "View-only members cannot import appliances" : ""}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!canEdit}
                  startIcon={<DatabaseIcon fontSize="small" />}
                  onClick={() => {
                    if (!canEdit) return;
                    setApplianceToEdit(null);
                    setAddModalInitialTab(1);
                    setIsAddModalOpen(true);
                  }}
                  sx={{
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 1,
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                    color: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                    "&:hover": {
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover,
                    },
                  }}
                >
                  PELP Catalog
                </Button>
              </span>
            </Tooltip>

            <Tooltip title={!canEdit ? "View-only members cannot scan appliances" : ""}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!canEdit}
                  startIcon={<CameraIcon fontSize="small" />}
                  onClick={() => {
                    if (!canEdit) return;
                    setApplianceToEdit(null);
                    setAddModalInitialTab(2);
                    setIsAddModalOpen(true);
                  }}
                  sx={{
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 1,
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                    color: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                    "&:hover": {
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover,
                    },
                  }}
                >
                  AI Scan
                </Button>
              </span>
            </Tooltip>

            <Tooltip title={!canEdit ? "View-only members cannot add appliances" : ""}>
              <span>
                <Button
                  variant="contained"
                  size="small"
                  disabled={!canEdit}
                  startIcon={<PlusIcon fontSize="small" />}
                  onClick={() => {
                    setApplianceToEdit(null);
                    setAddModalInitialTab(0);
                    setIsAddModalOpen(true);
                  }}
                  sx={{
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 1,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
                    color: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg,
                    "&:hover": {
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "#e4e4e7" : "#27272a",
                    },
                  }}
                >
                  Add Appliance
                </Button>
              </span>
            </Tooltip>
          </Box>
        }
      />

      {/* Space Switcher Tabs */}
      <Box
        data-tour="appliance-space-tabs"
        sx={{
          borderBottom: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
        }}
      >
        <Tabs
          value={activeSpaceId}
          onChange={(_, val) => setActiveSpaceId(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            "& .MuiTabs-indicator": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
              height: 2,
            },
            "& .MuiTab-root": {
              minHeight: 40,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              px: 2,
              color: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
              "&.Mui-selected": {
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
              },
            },
          }}
        >
          {spaces.map((s) => {
            const count = appliances.filter((a) => {
              if (a.list_id && a.list_id === s.id) return true;
              if (!a.list_id) {
                if (s.is_default) return true;
                if (spaces.length <= 1) return true;
                if (!spaces.some((sp) => sp.is_default) && s.id === spaces[0]?.id) return true;
              }
              return false;
            }).length;

            return (
              <Tab
                key={s.id}
                value={s.id}
                icon={s.tariff_type === "commercial" ? <StoreIcon fontSize="small" /> : <HomeIcon fontSize="small" />}
                iconPosition="start"
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>{s.name}</span>
                    <Chip
                      label={count}
                      size="small"
                      sx={{
                        height: 18,
                        minWidth: 20,
                        fontSize: "0.625rem",
                        fontWeight: 600,
                        bgcolor: (theme) =>
                          activeSpaceId === s.id
                            ? theme.palette.mode === "dark"
                              ? tokens.dark.active
                              : tokens.light.active
                            : "transparent",
                        border: "1px solid",
                        borderColor: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                        color: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
                      }}
                    />
                    <Chip
                      label={s.tariff_type === "commercial" ? "Commercial" : "Residential"}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.625rem",
                        fontWeight: 600,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                        color: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
                      }}
                    />
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Box>

      {/* Active Space Summary Card */}
      <SectionCard
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
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
              {spaceTariffType === "commercial" ? <StoreIcon fontSize="small" /> : <HomeIcon fontSize="small" />}
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                  lineHeight: 1.25,
                }}
              >
                {activeSpace?.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
                  fontSize: "0.75rem",
                }}
              >
                {spaceTariffType === "commercial"
                  ? "Commercial General Power Tariff • Flat distribution"
                  : "Residential 230V Tariff • Stepped tiers & Lifeline subsidy"}
              </Typography>
            </Box>
          </Box>
        }
        headerActions={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Tooltip title={!canEdit ? "View-only members cannot configure spaces" : ""}>
              <span>
                <Button
                  data-tour="appliance-space-manage"
                  variant="outlined"
                  size="small"
                  disabled={!canEdit}
                  startIcon={<SettingsIcon fontSize="small" />}
                  onClick={() => {
                    setSpaceToEdit(activeSpace);
                    setIsSpaceModalOpen(true);
                  }}
                  sx={{
                    borderRadius: 1,
                    fontWeight: 500,
                    fontSize: "0.75rem",
                    textTransform: "none",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                    color: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
                    "&:hover": {
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                    },
                  }}
                >
                  Configure
                </Button>
              </span>
            </Tooltip>

            {spaces.length > 1 && canEdit && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<TrashIcon fontSize="small" />}
                onClick={() => {
                  setSpaceToEdit(activeSpace);
                  setIsSpaceModalOpen(true);
                }}
                sx={{
                  borderRadius: 1,
                  fontWeight: 500,
                  fontSize: "0.75rem",
                  textTransform: "none",
                }}
              >
                Delete Space
              </Button>
            )}

            {currentSpaceAppliances.length > 0 && canEdit && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteSweepIcon fontSize="small" />}
                onClick={handleClearAll}
                sx={{
                  borderRadius: 1,
                  fontWeight: 500,
                  fontSize: "0.75rem",
                  textTransform: "none",
                }}
              >
                Clear All
              </Button>
            )}
          </Box>
        }
      >
        {/* Telemetry metrics strip */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Chip
            icon={<SpeedIcon sx={{ fontSize: "15px !important", color: "text.secondary" }} />}
            label={`Load: ${spaceTotalWatts.toLocaleString()} W`}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: "0.75rem",
              fontVariantNumeric: "tabular-nums",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            }}
          />

          <Chip
            label={`${activeSpaceAppliances.length} Active`}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: "0.75rem",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            }}
          />

          {blacklistedCount > 0 && (
            <Tooltip title={`${blacklistedCount} appliance(s) are blacklisted and excluded from Forecasting calculations.`}>
              <Chip
                icon={<BlockIcon sx={{ fontSize: "14px !important", color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warn : tokens.light.warn) }} />}
                label={`${blacklistedCount} Blacklisted`}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warnBg : tokens.light.warnBg),
                  color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warn : tokens.light.warn),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warnBorder : tokens.light.warnBorder),
                }}
              />
            </Tooltip>
          )}

          <Chip
            label={`₱${spaceBillCalc.totalBill.toFixed(2)} / mo`}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              fontVariantNumeric: "tabular-nums",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            }}
          />
        </Box>
      </SectionCard>

      {/* Search & Filter Toolbar */}
      <Box
        data-tour="appliance-filters"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flex: 1, maxWidth: { xs: "100%", sm: 540 } }}>
          <TextField
            size="small"
            placeholder="Search appliances, brands, models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
                fontSize: "0.875rem",
              },
            }}
          />

          <TextField
            select
            size="small"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            sx={{
              minWidth: { xs: 130, sm: 170 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
                fontSize: "0.875rem",
              },
            }}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {STREAMLINED_CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, justifyContent: { xs: "space-between", sm: "flex-end" } }}>
          <Chip
            size="small"
            label={`Showing ${filteredAppliances.length} of ${currentSpaceAppliances.length}`}
            sx={{
              fontSize: "0.75rem",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              color: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            }}
          />

          <Tooltip title="Sync & Refresh from Database">
            <IconButton
              size="small"
              onClick={() => {
                if (appliancesRes?.refetch) appliancesRes.refetch();
                if (spacesRes?.refetch) spacesRes.refetch();
                showInfo("Syncing appliances with Supabase database...");
              }}
              sx={{
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                borderRadius: 1,
                p: 0.8,
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
                "&:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover,
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                },
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Appliances Grid */}
      <Grid container spacing={2}>
        {filteredAppliances.length === 0 ? (
          <Grid size={12}>
            <SectionCard noPadding>
              <Box sx={{ p: 5, textAlign: "center" }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1,
                    mx: "auto",
                    mb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                    color: "text.secondary",
                  }}
                >
                  <BoltIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  No appliances found in "{activeSpace?.name}"
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                  Use the "+ Add Appliance" button above to add custom devices, import from the certified DOE PELP database, or scan energy stickers with AI.
                </Typography>
              </Box>
            </SectionCard>
          </Grid>
        ) : (
          filteredAppliances.map((app: UserAppliance, appIdx: number) => {
            const isBlacklisted = app.is_active === false;
            const w = Number(app.watts) || 0;
            const h = Number(app.hours_per_day) || 0;
            const d = Number(app.days_per_month) || 30;

            const supportsInverter = isCompressorInverterCategory(app.category);
            const isInverter = supportsInverter && Boolean(
              app.is_inverter === true ||
              (app.energy_rating && /inverter/i.test(app.energy_rating)) ||
              (app.name && /inverter/i.test(app.name)) ||
              (app.model && /inverter/i.test(app.model)) ||
              (app.ai_metadata?.is_inverter === true)
            );

            const dailyKwh = calculateApplianceKwh(app, h);
            const monthlyKwh = Number(app.monthly_kwh) > 0 ? Number(app.monthly_kwh) : Number((dailyKwh * d).toFixed(2));

            // Calculate deterministic unbundled monthly cost with this space's tariff
            const appBill = calculateMeralcoBill(monthlyKwh, undefined, 0, false, spaceTariffType);
            const monthlyCost = appBill.totalBill;
            const isFridge = (app.category || "").toLowerCase().includes("refrigerat") || (app.category || "").toLowerCase().includes("freezer") || (app.category || "").toLowerCase().includes("chiller");
            const isWasher = (app.category || "").toLowerCase().includes("wash") || (app.category || "").toLowerCase().includes("laundry");
            const customCruising = app.cruising_watts ?? app.ai_metadata?.cruising_watts;
            const isCustomCruising = customCruising !== undefined && customCruising !== null && Number(customCruising) > 0;
            const defaultCruisingWatts = isFridge
              ? Math.round(w / 3)
              : isWasher
                ? Math.round(w * 0.50)
                : Math.round(w * 0.42);
            const cruisingWatts = isCustomCruising ? Number(customCruising) : defaultCruisingWatts;
            const effectiveWatts = isFridge
              ? cruisingWatts
              : h > 0
                ? Math.round((dailyKwh * 1000) / h)
                : (isInverter ? cruisingWatts : w);
            const hourlyRate = (effectiveWatts / 1000) * (appBill.effectiveRatePerKwh || 14.82);

            const isOn = Boolean(app.is_currently_on);
            const liveSpent = getLiveSpent(app);

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={app.id}>
                <Card
                  data-tour={appIdx === 0 ? "appliance-card" : undefined}
                  sx={{
                    p: 2.25,
                    borderRadius: 1,
                    border: "1px solid",
                    borderStyle: isBlacklisted ? "dashed" : "solid",
                    borderColor: (theme) => {
                      const isDark = theme.palette.mode === "dark";
                      if (isBlacklisted) return isDark ? tokens.dark.warnBorder : tokens.light.warnBorder;
                      if (isOn) return isDark ? tokens.dark.live : tokens.light.live;
                      return isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
                    },
                    bgcolor: (theme) => {
                      const isDark = theme.palette.mode === "dark";
                      if (isBlacklisted) return isDark ? "rgba(245, 158, 11, 0.04)" : "rgba(245, 158, 11, 0.03)";
                      if (isOn) return isDark ? tokens.dark.liveBg : tokens.light.liveBg;
                      return isDark ? tokens.dark.card : tokens.light.card;
                    },
                    backgroundImage: "none",
                    boxShadow: "none",
                    opacity: isBlacklisted ? 0.8 : 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    transition: "border-color 0.15s ease, background-color 0.15s ease",
                    "&:hover": {
                      borderColor: (theme) => {
                        const isDark = theme.palette.mode === "dark";
                        if (isBlacklisted) return isDark ? tokens.dark.warn : tokens.light.warn;
                        if (isOn) return isDark ? tokens.dark.live : tokens.light.live;
                        return isDark ? tokens.dark.borderStrong : tokens.light.borderStrong;
                      },
                    },
                  }}
                >
                  <Box>
                    {/* Top Row: Category, Blacklist badge, Room Tag & Start/Stop Button */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, gap: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                        <Chip
                          label={app.category}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.6875rem",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                            color: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
                            border: "1px solid",
                            borderColor: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                          }}
                        />
                        {isBlacklisted && (
                          <Tooltip title="Blacklisted: Excluded from Smart Calendar, Forecasting, and Monthly Projections.">
                            <Chip
                              icon={<BlockIcon sx={{ fontSize: "13px !important" }} />}
                              label="Blacklisted"
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.6875rem",
                                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warnBg : tokens.light.warnBg),
                                color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warn : tokens.light.warn),
                                border: "1px solid",
                                borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warnBorder : tokens.light.warnBorder),
                              }}
                            />
                          </Tooltip>
                        )}
                        {app.room_location && (
                          <Chip
                            label={app.room_location}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 500,
                              fontSize: "0.6875rem",
                              borderColor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                              color: "text.secondary",
                            }}
                          />
                        )}
                      </Box>

                      {/* Start / Stop Live Stopwatch Button */}
                      <Tooltip
                        title={
                          !canEdit
                            ? "View-only members cannot toggle circuits"
                            : isBlacklisted
                            ? "Appliance is blacklisted — click restore below to enable stopwatch"
                            : isOn
                            ? "Stop Live Stopwatch (Auto-logs duration and energy into today's records)"
                            : "Start Live Stopwatch (Track real-time energy & cost)"
                        }
                      >
                        <span>
                          <Button
                            size="small"
                            variant={isOn ? "contained" : "outlined"}
                            disabled={isBlacklisted || !canEdit}
                            onClick={() => togglePower(app)}
                            startIcon={
                              isOn ? (
                                <ClockIcon sx={{ fontSize: "14px !important" }} />
                              ) : (
                                <BoltIcon sx={{ fontSize: "14px !important" }} />
                              )
                            }
                            sx={{
                              py: 0.25,
                              px: 1.25,
                              minHeight: 26,
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              borderRadius: 1,
                              textTransform: "none",
                              ...(isOn
                                ? {
                                    bgcolor: (theme) =>
                                      theme.palette.mode === "dark" ? tokens.dark.error : tokens.light.error,
                                    color: "#ffffff",
                                    "&:hover": {
                                      bgcolor: "#dc2626",
                                    },
                                  }
                                : {
                                    borderColor: (theme) => {
                                      const isDark = theme.palette.mode === "dark";
                                      return isDark ? tokens.dark.liveBorder : tokens.light.liveBorder;
                                    },
                                    color: (theme) => {
                                      const isDark = theme.palette.mode === "dark";
                                      return isDark ? tokens.dark.live : tokens.light.live;
                                    },
                                    bgcolor: (theme) => {
                                      const isDark = theme.palette.mode === "dark";
                                      return isDark ? tokens.dark.liveBg : tokens.light.liveBg;
                                    },
                                    "&:hover": {
                                      borderColor: (theme) => {
                                        const isDark = theme.palette.mode === "dark";
                                        return isDark ? tokens.dark.live : tokens.light.live;
                                      },
                                      bgcolor: (theme) => {
                                        const isDark = theme.palette.mode === "dark";
                                        return isDark ? "rgba(52, 211, 153, 0.18)" : "rgba(5, 150, 105, 0.18)";
                                      },
                                    },
                                  }),
                            }}
                          >
                            {isOn ? "Stop" : "Start"}
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>

                    {/* Appliance Name & Details */}
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.9375rem",
                        color: "text.primary",
                        lineHeight: 1.3,
                      }}
                    >
                      {app.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      {app.brand ? `${app.brand} • ` : ""}{app.model || app.room_location || "General"}
                    </Typography>

                    {/* Stats Badges */}
                    <Box sx={{ display: "flex", gap: 0.75, mt: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                      {isInverter ? (
                        <>
                          <Tooltip title={`Inverter Cruising: ~${cruisingWatts}W ${isFridge ? "steady continuous maintenance (1/3 duty cycle)" : "maintenance mode after cooldown"}${isCustomCruising ? " (Custom User Override)" : ""}`}>
                            <Chip
                              icon={<BoltIcon sx={{ fontSize: "13px !important" }} />}
                              label={`Inverter (~${cruisingWatts}W)`}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.6875rem",
                                fontVariantNumeric: "tabular-nums",
                                bgcolor: (theme) =>
                                  theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                                color: (theme) =>
                                  theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
                                border: "1px solid",
                                borderColor: (theme) =>
                                  theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                              }}
                            />
                          </Tooltip>
                          <Chip
                            label={`Peak ${app.watts}W`}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.6875rem",
                              fontVariantNumeric: "tabular-nums",
                              borderColor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                            }}
                          />
                        </>
                      ) : (
                        <Chip
                          icon={<BoltIcon sx={{ fontSize: "13px !important" }} />}
                          label={`${app.watts} W`}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.6875rem",
                            fontVariantNumeric: "tabular-nums",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                            border: "1px solid",
                            borderColor: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                          }}
                        />
                      )}
                      {app.quantity > 1 && (
                        <Chip
                          label={`Qty: ${app.quantity}`}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.6875rem",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                          }}
                        />
                      )}
                      <Chip
                        label={`${app.hours_per_day}h/day`}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontWeight: 500,
                          fontSize: "0.6875rem",
                          fontVariantNumeric: "tabular-nums",
                          borderColor: (theme) =>
                            theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                        }}
                      />
                    </Box>

                    <Divider
                      sx={{
                        my: 1.5,
                        borderColor: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                      }}
                    />

                    {/* Monthly estimated cost */}
                    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                          Monthly Cost ({spaceTariffType === "commercial" ? "Commercial" : "Residential"})
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                            letterSpacing: "-0.01em",
                            color: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                          }}
                        >
                          ₱{monthlyCost.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                          Energy Load
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                            color: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
                          }}
                        >
                          {monthlyKwh.toFixed(1)} kWh/mo
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Card Footer with Rate & Actions */}
                  <Box
                    sx={{
                      mt: 1.75,
                      pt: 1.25,
                      borderTop: "1px solid",
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {isOn ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                            boxShadow: (theme) =>
                              theme.palette.mode === "dark"
                                ? `0 0 6px ${tokens.dark.live}`
                                : `0 0 6px ${tokens.light.live}`,
                            animation: "pulse 1.5s infinite",
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                            fontSize: "0.75rem",
                            color: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                          }}
                        >
                          {getRunningDuration(app.last_turned_on_at)} <span style={{ opacity: 0.75 }}>• ₱{liveSpent.toFixed(3)}</span>
                        </Typography>
                      </Box>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontSize: "0.6875rem",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        ₱{hourlyRate.toFixed(2)}/hr rate
                      </Typography>
                    )}

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {/* Blacklist / Exclude Toggle Action */}
                      <Tooltip
                        title={
                          !canEdit
                            ? "View-only members cannot modify appliances"
                            : isBlacklisted
                            ? "Restore appliance to Forecast & Calendar calculations"
                            : "Blacklist appliance (Exclude from Calendar & Forecast)"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={!canEdit}
                            onClick={() => handleToggleBlacklist(app)}
                            sx={{
                              p: 0.6,
                              color: isBlacklisted
                                ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.warn : tokens.light.warn)
                                : "text.secondary",
                              "&:hover": {
                                bgcolor: (theme) =>
                                  theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover,
                              },
                            }}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title={!canEdit ? "View-only members cannot edit appliances" : "Edit Appliance"}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={!canEdit}
                            onClick={() => {
                              setApplianceToEdit(app);
                              setIsAddModalOpen(true);
                            }}
                            sx={{
                              p: 0.6,
                              color: "text.secondary",
                              "&:hover": {
                                bgcolor: (theme) =>
                                  theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover,
                              },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title={!canEdit ? "View-only members cannot delete appliances" : "Delete Appliance"}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!canEdit}
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Delete Appliance?",
                                message: `Are you sure you want to remove "${app.name}" (${app.watts}W)?`,
                                detail: "Historical usage data and saved session logs for this device will remain archived in your audit records.",
                                itemName: `${app.name} • ${app.category || "General"}`,
                                confirmText: "Yes, Delete",
                                cancelText: "Cancel",
                                severity: "error",
                              });
                              if (ok) {
                                deleteAppliance({ resource: "user_appliances", id: app.id });
                                showInfo(`Removed ${app.name}`);
                              }
                            }}
                            sx={{
                              p: 0.6,
                              "&:hover": {
                                bgcolor: (theme) =>
                                  theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover,
                              },
                            }}
                          >
                            <TrashIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* Unified Add/Edit Appliance Modal with 3 Tabs */}
      {isAddModalOpen && (
        <ApplianceModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setApplianceToEdit(null);
            if (appliancesRes?.refetch) appliancesRes.refetch();
            if (spacesRes?.refetch) spacesRes.refetch();
          }}
          applianceToEdit={applianceToEdit}
          defaultListId={activeSpace?.id || null}
          initialTab={addModalInitialTab}
        />
      )}

      {/* Space Management Modal */}
      {isSpaceModalOpen && (
        <SpaceManagementModal
          isOpen={isSpaceModalOpen}
          onClose={() => {
            setIsSpaceModalOpen(false);
            setSpaceToEdit(null);
          }}
          spaceToEdit={spaceToEdit}
          canDelete={spaces.length > 1}
          fallbackSpace={spaces.find((s) => s.id !== (spaceToEdit?.id || activeSpace?.id)) || spaces[0]}
          onDeleted={(deletedId) => {
            const nextSpace = spaces.find((s) => s.id !== deletedId);
            if (nextSpace) {
              setActiveSpaceId(nextSpace.id);
            }
            if (spacesRes?.refetch) spacesRes.refetch();
            if (appliancesRes?.refetch) appliancesRes.refetch();
            showInfo("Space deleted and appliances reassigned.");
          }}
        />
      )}

      {/* PC Workload Mode 1-Tap Picker Modal */}
      {pcModeAppliance && (
        <PcWorkloadModeModal
          open={Boolean(pcModeAppliance)}
          onClose={() => setPcModeAppliance(null)}
          appliance={pcModeAppliance}
          onSelectMode={handleSelectPcMode}
        />
      )}
    </Box>
  );
};

export default ApplianceList;
