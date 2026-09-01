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
  PowerSettingsNew as PowerIcon,
  Storage as DatabaseIcon,
  AccessTime as ClockIcon,
  Speed as SpeedIcon,
  CalendarMonth as CalendarIcon,
  FileDownload as FileDownloadIcon,
  DeleteSweep as DeleteSweepIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Settings as SettingsIcon,
  Create as PenIcon,
  CameraAlt as CameraIcon,
} from "@mui/icons-material";
import { UserAppliance, UserCalendarEvent, ApplianceList as ApplianceSpace } from "../../types";
import { useList, useDelete, useUpdate, useCreate } from "@refinedev/core";
import { ApplianceModal } from "./ApplianceModal";
import { PelpCatalogModal } from "./PelpCatalogModal";
import { SpaceManagementModal } from "./SpaceManagementModal";
import { AiVisionScannerModal } from "../vision/AiVisionScannerModal";
import { ScheduleQueueModal } from "../calendar/ScheduleQueueModal";
import { useToast } from "../common/ToastProvider";
import { useConfirm } from "../common/ConfirmProvider";
import { devLog } from "../../lib/devLogger";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";
import { supabaseClient } from "../../lib/supabaseClient";
import { accumulateLiveSessionDailyUsage, calculateKwh, calculateApplianceKwh, calculateCost } from "../../lib/dailyUsageService";

interface ApplianceListProps {
  onOpenAiScanner?: () => void;
}

export const ApplianceList: React.FC<ApplianceListProps> = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState("all");
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

  const [selectedApplianceForQueue, setSelectedApplianceForQueue] = useState<UserAppliance | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  const { showSuccess, showInfo, showError } = useToast();
  const { confirm } = useConfirm();

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const spacesRes = useList<ApplianceSpace>({
    resource: "appliance_lists",
  }) as any;

  const eventsRes = useList<UserCalendarEvent>({
    resource: "user_calendar_events",
  }) as any;

  const { mutate: deleteAppliance } = useDelete();
  const { mutate: updateAppliance } = useUpdate();
  const { mutate: createEvent } = useCreate();
  const { mutate: deleteEvent } = useDelete();
  const { mutate: createSpace, isLoading: isCreatingSpace } = useCreate();

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceSpace[] = spacesRes?.data?.data || spacesRes?.result?.data || [];
  const events: UserCalendarEvent[] = eventsRes?.data?.data || eventsRes?.result?.data || [];

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

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

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

  // Filter appliances strictly to the active space
  const currentSpaceAppliances = useMemo(() => {
    if (!activeSpace) return [];
    return appliances.filter(
      (app) => app.list_id === activeSpace.id || (!app.list_id && activeSpace.is_default)
    );
  }, [appliances, activeSpace]);

  const filteredAppliances = useMemo(() => {
    return currentSpaceAppliances.filter((app: UserAppliance) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.brand && app.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (app.model && app.model.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === "all" || app.category.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesRoom =
        selectedRoom === "all" || (app.room_location && app.room_location.toLowerCase() === selectedRoom.toLowerCase());

      return matchesSearch && matchesCategory && matchesRoom;
    });
  }, [currentSpaceAppliances, searchQuery, selectedCategory, selectedRoom]);

  // Space-specific stats
  const spaceTotalWatts = currentSpaceAppliances.reduce(
    (acc, curr) => acc + curr.watts * (curr.quantity || 1),
    0
  );

  const spaceMonthlyKwh = currentSpaceAppliances.reduce((acc, curr) => {
    const w = Number(curr.watts) || 0;
    const h = Number(curr.hours_per_day) || 0;
    const q = Number(curr.quantity) || 1;
    const d = Number(curr.days_per_month) || 30;
    const kwh = Number(curr.monthly_kwh) > 0 ? Number(curr.monthly_kwh) : (w * h * q * d) / 1000;
    return acc + kwh;
  }, 0);

  const spaceTariffType = activeSpace?.tariff_type || "residential";
  const spaceBillCalc = calculateMeralcoBill(spaceMonthlyKwh, undefined, 0, false, spaceTariffType);

  const togglePower = async (app: UserAppliance) => {
    const newState = !app.is_currently_on;
    const nowIso = newState ? new Date().toISOString() : null;

    if (!newState && app.last_turned_on_at) {
      // Stopwatch is being STOPPED! Save the completed session to logs & daily usage
      const start = new Date(app.last_turned_on_at);
      const end = new Date();
      if (!isNaN(start.getTime())) {
        const diffMs = Math.max(1000, end.getTime() - start.getTime());
        const durationMinutes = Math.max(1, Math.round(diffMs / 60000));
        const durationHours = diffMs / 3600000;
        const appKwh = calculateApplianceKwh(app, durationHours);
        const effectiveRate = app.tariff_type === "commercial" ? 15.2 : 14.8261;
        const appCost = calculateCost(appKwh, effectiveRate);

        try {
          // 1. Insert session log
          await supabaseClient.from("appliance_usage_logs").insert({
            appliance_id: app.id,
            user_id: app.user_id || null,
            started_at: start.toISOString(),
            ended_at: end.toISOString(),
            duration_minutes: durationMinutes,
            kwh_consumed: appKwh,
            estimated_cost: appCost,
            source: "stopwatch",
          });

          // 2. Accumulate in daily_appliance_usage
          await accumulateLiveSessionDailyUsage({
            appliance_id: app.id,
            durationMinutes,
            watts: app.watts,
            quantity: app.quantity || 1,
            effectiveRate,
            user_id: app.user_id,
            startTime: start,
            endTime: end,
          });

          // 3. Dispatch global sync event
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("powerforecast_stopwatch_rollover", {
                detail: {
                  rolledOverCount: 1,
                  affectedDates: [start.toISOString().split("T")[0], end.toISOString().split("T")[0]],
                },
              })
            );
          }
        } catch (err: any) {
          devLog.warn("ApplianceList", `Error auto-saving stopped session: ${err?.message}`);
        }
      }
    }

    devLog.telemetry("Telemetry", `Stopwatch ${newState ? "started [TIMING]" : "stopped [STOPPED]"}: "${app.name}" (${app.watts}W @ 230V)`, {
      applianceId: app.id,
      name: app.name,
      category: app.category,
      watts: app.watts,
      is_currently_on: newState,
      last_turned_on_at: nowIso,
      ratePerHourPHP: (((app.watts * (app.quantity || 1)) / 1000) * 14.8261).toFixed(2),
    });

    updateAppliance({
      resource: "user_appliances",
      id: app.id,
      values: {
        is_currently_on: newState,
        last_turned_on_at: nowIso,
      },
    });

    showInfo(`${app.name} stopwatch ${newState ? "started" : "stopped and saved"}.`);
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
    const totalKwh = (totalWatts * (diffSeconds / 3600)) / 1000;
    const effectiveRate = spaceTariffType === "commercial" ? 15.2 : 14.8261;
    return totalKwh * effectiveRate;
  };

  const exportLoadListJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentSpaceAppliances, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `powerforecast_${activeSpace?.name || "space"}_inventory.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showSuccess("Appliance inventory exported to JSON.");
  };

  const handleClearAll = async () => {
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
    return (
      <Box sx={{ maxWidth: 640, mx: "auto", py: { xs: 4, sm: 6 } }}>
        <Card sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 1.5, textAlign: "center", border: "1px solid", borderColor: "primary.main" }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "rgba(0, 229, 201, 0.15)",
              color: "primary.main",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <BoltIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, letterSpacing: "-0.02em" }}>
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
              />

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Select Tariff Classification
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Paper
                      variant="outlined"
                      onClick={() => setInitialTariffType("residential")}
                      sx={{
                        p: 2,
                        borderRadius: 1.25,
                        cursor: "pointer",
                        textAlign: "center",
                        border: "2px solid",
                        borderColor: initialTariffType === "residential" ? "primary.main" : "divider",
                        bgcolor: initialTariffType === "residential" ? "rgba(0, 229, 201, 0.08)" : "transparent",
                        transition: "all 0.15s ease",
                        "&:hover": { borderColor: "primary.main" },
                      }}
                    >
                      <HomeIcon sx={{ color: initialTariffType === "residential" ? "primary.main" : "text.secondary", fontSize: 28, mb: 0.5 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: initialTariffType === "residential" ? "primary.main" : "text.primary" }}>
                        Residential
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem", mt: 0.5 }}>
                        230V Stepped Tiers & Lifeline
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={6}>
                    <Paper
                      variant="outlined"
                      onClick={() => setInitialTariffType("commercial")}
                      sx={{
                        p: 2,
                        borderRadius: 1.25,
                        cursor: "pointer",
                        textAlign: "center",
                        border: "2px solid",
                        borderColor: initialTariffType === "commercial" ? "secondary.main" : "divider",
                        bgcolor: initialTariffType === "commercial" ? "rgba(244, 63, 94, 0.1)" : "transparent",
                        transition: "all 0.15s ease",
                        "&:hover": { borderColor: "secondary.main" },
                      }}
                    >
                      <StoreIcon sx={{ color: initialTariffType === "commercial" ? "secondary.main" : "text.secondary", fontSize: 28, mb: 0.5 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: initialTariffType === "commercial" ? "secondary.main" : "text.primary" }}>
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
                size="large"
                disabled={isCreatingSpace}
                startIcon={<PlusIcon />}
                sx={{ py: 1.5, borderRadius: 2.5, fontWeight: 800, mt: 1 }}
              >
                {isCreatingSpace ? "Creating Space..." : "Create Space & Start Adding Appliances"}
              </Button>
            </Box>
          </form>
        </Card>
      </Box>
    );
  }

  // -------------------------------------------------------------
  // 2. BENTO-STYLE MULTI-SPACE HUB (ACTIVE SPACE VIEW)
  // -------------------------------------------------------------
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3 } }}>
      {/* Bento Row 1: Space Switcher Bar & Add Space */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
        <Tabs
          data-tour="appliance-space-tabs"
          value={activeSpaceId}
          onChange={(_, val) => setActiveSpaceId(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              minHeight: 44,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              px: 2.25,
              mr: 1,
            },
          }}
        >
          {spaces.map((s) => (
            <Tab
              key={s.id}
              value={s.id}
              icon={s.tariff_type === "commercial" ? <StoreIcon fontSize="small" /> : <HomeIcon fontSize="small" />}
              iconPosition="start"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span>{s.name}</span>
                  <Chip
                    label={s.tariff_type === "commercial" ? "Commercial" : "Residential"}
                    size="small"
                    color={s.tariff_type === "commercial" ? "secondary" : "primary"}
                    sx={{ height: 18, fontSize: "0.625rem", fontWeight: 800 }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            color="secondary"
            startIcon={<PlusIcon />}
            onClick={() => {
              setSpaceToEdit(null);
              setIsSpaceModalOpen(true);
            }}
            sx={{ borderRadius: 2, fontWeight: 800 }}
          >
            Add Space
          </Button>
        </Box>
      </Box>

      {/* Bento Row 2: Active Space Banner Tile */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 1.5,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(23, 25, 29, 0.95) 0%, rgba(32, 35, 40, 0.9) 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f4f6ff 100%)",
          border: "1px solid",
          borderColor: "rgba(0, 229, 201, 0.25)",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2.5,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 1.25,
                bgcolor: spaceTariffType === "commercial" ? "secondary.main" : "primary.main",
                color: spaceTariffType === "commercial" ? "#ffffff" : "#0c1b18",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(0, 229, 201, 0.3)",
                flexShrink: 0,
              }}
            >
              {spaceTariffType === "commercial" ? <StoreIcon sx={{ color: "#ffffff" }} /> : <HomeIcon sx={{ color: "#0c1b18" }} />}
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
                {activeSpace?.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {spaceTariffType === "commercial"
                  ? "Commercial General Power Tariff • Flat distribution & commercial metering"
                  : "Residential 230V Tariff • Stepped distribution tiers & Lifeline subsidy"}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          <Chip
            icon={<SpeedIcon sx={{ color: "#00e5c9 !important" }} />}
            label={`Load: ${spaceTotalWatts} W`}
            sx={{ fontWeight: 800, bgcolor: "rgba(0, 229, 201, 0.08)", border: "1px solid rgba(0, 229, 201, 0.25)", color: "#00e5c9" }}
          />
          <Chip
            label={`${currentSpaceAppliances.length} Appliances`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
          <Chip
            label={`₱${spaceBillCalc.totalBill.toFixed(2)} / mo`}
            color={spaceTariffType === "commercial" ? "secondary" : "default"}
            sx={{ fontWeight: 800, fontFamily: "monospace" }}
          />
          <Button
            data-tour="appliance-space-manage"
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={() => {
              setSpaceToEdit(activeSpace);
              setIsSpaceModalOpen(true);
            }}
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            Configure
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={exportLoadListJson}
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            Export
          </Button>
          {spaces.length > 1 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<TrashIcon />}
              onClick={() => {
                setSpaceToEdit(activeSpace);
                setIsSpaceModalOpen(true);
              }}
              sx={{ borderRadius: 1, fontWeight: 700 }}
            >
              Delete Space
            </Button>
          )}
          {currentSpaceAppliances.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={handleClearAll}
              sx={{ borderRadius: 1, fontWeight: 700 }}
            >
              Clear All
            </Button>
          )}
        </Box>
      </Card>

      {/* Bento Row 3: Unified Add Appliance Action Bar */}
      <Paper
        variant="outlined"
        data-tour="appliance-add-buttons"
        sx={{
          p: 2.25,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.04)" : "rgba(0, 158, 136, 0.02)",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(0, 158, 136, 0.2)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            borderColor: "primary.main",
            boxShadow: "0 4px 20px rgba(0, 229, 201, 0.12)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PlusIcon />}
            onClick={() => {
              setApplianceToEdit(null);
              setAddModalInitialTab(0);
              setIsAddModalOpen(true);
            }}
            sx={{
              fontWeight: 800,
              px: 3,
              py: 1.1,
              borderRadius: 1.25,
              boxShadow: "0 4px 16px rgba(0, 229, 201, 0.25)",
              fontSize: "0.9375rem",
              textTransform: "none",
            }}
          >
            + Add Appliance
          </Button>
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Add custom devices, import from 12k+ certified PELP models, or scan energy stickers
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              Choose from Manual Entry, Official DOE PELP Database, or AI Vision Camera Scan
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            icon={<PenIcon sx={{ fontSize: "14px !important" }} />}
            label="Manual"
            size="small"
            variant="outlined"
            onClick={() => {
              setApplianceToEdit(null);
              setAddModalInitialTab(0);
              setIsAddModalOpen(true);
            }}
            sx={{ cursor: "pointer", fontWeight: 600 }}
          />
          <Chip
            icon={<DatabaseIcon sx={{ fontSize: "14px !important" }} />}
            label="PELP Catalog"
            size="small"
            variant="outlined"
            onClick={() => {
              setApplianceToEdit(null);
              setAddModalInitialTab(1);
              setIsAddModalOpen(true);
            }}
            sx={{ cursor: "pointer", fontWeight: 600 }}
          />
          <Chip
            icon={<CameraIcon sx={{ fontSize: "14px !important" }} />}
            label="AI Scan"
            size="small"
            color="primary"
            variant="outlined"
            onClick={() => {
              setApplianceToEdit(null);
              setAddModalInitialTab(2);
              setIsAddModalOpen(true);
            }}
            sx={{ cursor: "pointer", fontWeight: 700 }}
          />
        </Box>
      </Paper>

      {/* Bento Row 4: Search & Filters */}
      <Box data-tour="appliance-filters" sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: "center", justifyContent: "space-between" }}>
        <TextField

          size="small"
          placeholder="Search appliances in this space..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: { xs: "100%", sm: 340 } }}
        />

        <Box sx={{ display: "flex", gap: 1.5, width: { xs: "100%", sm: "auto" } }}>
          <TextField
            select
            size="small"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All Categories</MenuItem>
            <MenuItem value="Air Conditioners">Air Conditioners</MenuItem>
            <MenuItem value="Refrigerators & Freezers">Refrigerators</MenuItem>
            <MenuItem value="Television Sets">TV Sets</MenuItem>
            <MenuItem value="Electric Fans">Fans</MenuItem>
            <MenuItem value="Washing Machines">Washing Machines</MenuItem>
            <MenuItem value="Lighting Products">Lighting</MenuItem>
            <MenuItem value="Kitchen & Cooking">Kitchen</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>
        </Box>
      </Box>

      {/* Bento Row 5: Space Appliances Grid */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }}>
        {filteredAppliances.length === 0 ? (
          <Grid size={12}>
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: 1.25, border: "1px dashed", borderColor: "divider" }}>
              <BoltIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                No appliances in "{activeSpace?.name}" yet.
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                Use the "+ Add Appliance" button above to add custom devices, import from the certified DOE PELP database, or scan energy stickers with AI.
              </Typography>
            </Paper>
          </Grid>
        ) : (
          filteredAppliances.map((app: UserAppliance, appIdx: number) => {
            const isOn = app.is_currently_on;
            const liveSpent = getAccumulatedPesos(app);
            const w = Number(app.watts) || 0;
            const h = Number(app.hours_per_day) || 0;
            const q = Number(app.quantity) || 1;
            const d = Number(app.days_per_month) || 30;

            const isInverter = Boolean(
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
            const isFridge = (app.category || "").toLowerCase().includes("refrigerat");
            const cruisingFactor = isFridge ? 0.35 : 0.42;
            const cruisingWatts = Math.round(w * cruisingFactor);
            const effectiveWatts = h > 0 ? Math.round((dailyKwh * 1000) / h) : (isInverter ? cruisingWatts : w);
            const hourlyRate = (effectiveWatts / 1000) * (appBill.effectiveRatePerKwh || 14.82);

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={app.id}>
                  <Card
                    data-tour={appIdx === 0 ? "appliance-card" : undefined}
                    sx={{
                      p: { xs: 2.25, sm: 2.5 },
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: (theme) =>
                        isOn
                          ? theme.palette.mode === "dark"
                            ? "#00e5c9"
                            : "#0d9488"
                          : theme.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "#e2e8f0",
                      bgcolor: (theme) =>
                        isOn
                          ? theme.palette.mode === "dark"
                            ? "rgba(0, 229, 201, 0.08)"
                            : "rgba(13, 148, 136, 0.06)"
                          : "background.paper",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: "primary.main",
                        transform: "translateY(-3px)",
                        boxShadow: (theme) =>
                          theme.palette.mode === "dark"
                            ? "0 8px 24px rgba(0, 229, 201, 0.15)"
                            : "0 8px 24px rgba(13, 148, 136, 0.1)",
                      },
                    }}
                  >
                    <Box>
                      {/* Top Row: Category & Power Toggle */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5, gap: 1 }}>
                        <Chip
                          label={app.category}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(0, 229, 201, 0.1)"
                                : "rgba(13, 148, 136, 0.08)",
                            color: (theme) =>
                              theme.palette.mode === "dark" ? "#00e5c9" : "#0f766e",
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => togglePower(app)}
                          sx={{
                            bgcolor: (theme) =>
                              isOn
                                ? theme.palette.mode === "dark"
                                  ? "primary.main"
                                  : "#0d9488"
                                : theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.06)"
                                : "#f1f5f9",
                            color: (theme) =>
                              isOn
                                ? theme.palette.mode === "dark"
                                  ? "#0c1b18"
                                  : "#ffffff"
                                : "text.secondary",
                            "&:hover": {
                              bgcolor: (theme) =>
                                isOn
                                  ? theme.palette.mode === "dark"
                                    ? "primary.dark"
                                    : "#0f766e"
                                  : theme.palette.mode === "dark"
                                  ? "rgba(0, 229, 201, 0.2)"
                                  : "#e2e8f0",
                              transform: "scale(1.08)",
                            },
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        >
                          <PowerIcon fontSize="small" />
                        </IconButton>
                      </Box>

                    {/* Appliance Name & Details */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                      {app.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      {app.brand ? `${app.brand} • ` : ""}{app.model || app.room_location || "General"}
                    </Typography>

                    {/* Stats Badges */}
                    <Box sx={{ display: "flex", gap: 0.75, mt: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                      {isInverter ? (
                        <>
                          <Tooltip title={`⚡ Inverter Cruising: ~${cruisingWatts}W maintenance mode after cooldown`}>
                            <Chip
                              icon={<BoltIcon sx={{ fontSize: "14px !important", color: "#00e5c9 !important" }} />}
                              label={`⚡ Inverter (~${cruisingWatts}W avg)`}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.6875rem",
                                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)",
                                color: (theme) => theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488",
                                border: "1px solid",
                                borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
                              }}
                            />
                          </Tooltip>
                          <Chip
                            label={`Peak ${app.watts}W`}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: "0.6875rem" }}
                          />
                        </>
                      ) : (
                        <Chip
                          icon={<BoltIcon sx={{ fontSize: "14px !important", color: "#ffd54f !important" }} />}
                          label={`${app.watts} W`}
                          size="small"
                          sx={{ fontWeight: 800 }}
                        />
                      )}
                      {app.quantity > 1 && (
                        <Chip
                          label={`Qty: ${app.quantity}`}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                      <Chip
                        label={`${app.hours_per_day}h/day`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Monthly estimated cost */}
                    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                          Monthly Cost ({spaceTariffType === "commercial" ? "Commercial" : "Residential"})
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.main", letterSpacing: "-0.01em" }}>
                          ₱{monthlyCost.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                          Energy Load
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                          {monthlyKwh.toFixed(1)} kWh/mo
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Card Footer with Live Cost & Actions */}
                  <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {isOn ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "success.main" }}>
                        <ClockIcon sx={{ fontSize: 12 }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                          {getRunningDuration(app.last_turned_on_at)} (₱{liveSpent.toFixed(4)})
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                        ₱{hourlyRate.toFixed(2)}/hr rate
                      </Typography>
                    )}

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Tooltip title="Manage Schedule Queue">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedApplianceForQueue(app);
                            setIsQueueModalOpen(true);
                          }}
                        >
                          <CalendarIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Edit Appliance">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setApplianceToEdit(app);
                            setIsAddModalOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete Appliance">
                        <IconButton
                          size="small"
                          color="error"
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
                        >
                          <TrashIcon fontSize="small" />
                        </IconButton>
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

      {/* Schedule Queue Manager Modal */}
      {isQueueModalOpen && selectedApplianceForQueue && (
        <ScheduleQueueModal
          isOpen={isQueueModalOpen}
          onClose={() => {
            setIsQueueModalOpen(false);
            setSelectedApplianceForQueue(null);
          }}
          appliance={selectedApplianceForQueue}
          events={events}
          onCreateEvent={async (eventData: Partial<UserCalendarEvent>) => {
            createEvent({ resource: "user_calendar_events", values: eventData });
            showSuccess("Scheduled slot added!");
          }}
          onDeleteEvent={async (id: string) => {
            deleteEvent({ resource: "user_calendar_events", id });
            showInfo("Scheduled slot deleted.");
          }}
          onBulkDeleteEvents={async (ids: string[]) => {
            ids.forEach((id) => deleteEvent({ resource: "user_calendar_events", id }));
            showInfo(`Removed ${ids.length} slots.`);
          }}
        />
      )}
    </Box>
  );
};

export default ApplianceList;
