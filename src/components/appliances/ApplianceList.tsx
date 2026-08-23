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
  AutoAwesome as SparklesIcon,
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
  LocationCity as CityIcon,
} from "@mui/icons-material";
import { UserAppliance, UserCalendarEvent, ApplianceList as ApplianceSpace } from "../../types";
import { useList, useDelete, useUpdate, useCreate } from "@refinedev/core";
import { ApplianceModal } from "./ApplianceModal";
import { PelpCatalogModal } from "./PelpCatalogModal";
import { SpaceManagementModal } from "./SpaceManagementModal";
import { AiVisionScannerModal } from "../vision/AiVisionScannerModal";
import { ScheduleQueueModal } from "../calendar/ScheduleQueueModal";
import { useToast } from "../common/ToastProvider";
import { devLog } from "../../lib/devLogger";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";

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
  const [isPelpModalOpen, setIsPelpModalOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<ApplianceSpace | null>(null);
  const [applianceToEdit, setApplianceToEdit] = useState<UserAppliance | null>(null);

  // First-time space creation form state
  const [initialSpaceName, setInitialSpaceName] = useState("");
  const [initialTariffType, setInitialTariffType] = useState<"residential" | "commercial">("residential");

  const [selectedApplianceForQueue, setSelectedApplianceForQueue] = useState<UserAppliance | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  const { showSuccess, showInfo, showError } = useToast();

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
    const kwh = Number(curr.monthly_kwh) || (curr.watts * curr.hours_per_day * (curr.quantity || 1) * 30) / 1000;
    return acc + kwh;
  }, 0);

  const spaceTariffType = activeSpace?.tariff_type || "residential";
  const spaceBillCalc = calculateMeralcoBill(spaceMonthlyKwh, undefined, 0, false, spaceTariffType);

  const togglePower = (app: UserAppliance) => {
    const newState = !app.is_currently_on;
    const nowIso = newState ? new Date().toISOString() : null;

    devLog.telemetry("Telemetry", `Stopwatch ${newState ? "started ⏱️ [TIMING]" : "stopped ⏹️ [STOPPED]"}: "${app.name}" (${app.watts}W @ 230V)`, {
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

    showInfo(`${app.name} stopwatch ${newState ? "started ⏱️" : "stopped ⏹️"}.`);
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

  const handleClearAll = () => {
    if (!window.confirm(`Are you sure you want to clear all registered appliances in ${activeSpace?.name}?`)) return;
    currentSpaceAppliances.forEach((a) => deleteAppliance({ resource: "user_appliances", id: a.id }));
    showInfo("Cleared space appliances.");
  };

  // -------------------------------------------------------------
  // 1. FIRST-TIME ONBOARDING (ZERO SPACES GATE)
  // -------------------------------------------------------------
  if (spaces.length === 0) {
    return (
      <Box sx={{ maxWidth: 640, mx: "auto", py: 4 }}>
        <Card
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            border: "1px solid",
            borderColor: "rgba(108, 122, 224, 0.3)",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(13, 12, 45, 0.95)" : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 12px 36px rgba(99, 102, 241, 0.15)",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3.5 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
                boxShadow: "0 6px 20px rgba(99, 102, 241, 0.4)",
              }}
            >
              <CityIcon sx={{ fontSize: 32, color: "#ffd54f" }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
              Create Your Space First
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, maxWidth: 460, mx: "auto" }}>
              To start tracking and categorizing appliances, set up your first household or commercial space.
            </Typography>
          </Box>

          <form onSubmit={handleCreateInitialSpace}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                required
                fullWidth
                label="Space / Property Name"
                placeholder="e.g. Burat's House or Burat's Sari-Sari Store"
                value={initialSpaceName}
                onChange={(e) => setInitialSpaceName(e.target.value)}
                autoFocus
              />

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
                  TARIFF CLASSIFICATION
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Paper
                      variant="outlined"
                      onClick={() => setInitialTariffType("residential")}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        cursor: "pointer",
                        textAlign: "center",
                        border: "2px solid",
                        borderColor: initialTariffType === "residential" ? "primary.main" : "divider",
                        bgcolor: initialTariffType === "residential" ? "rgba(99, 102, 241, 0.1)" : "transparent",
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
                        borderRadius: 3,
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Bento Row 1: Space Switcher Bar & Add Space */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Tabs
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
              px: 2.5,
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
          borderRadius: 3.5,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(15, 14, 58, 0.9) 0%, rgba(20, 18, 80, 0.8) 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f4f6ff 100%)",
          border: "1px solid",
          borderColor: "rgba(108, 122, 224, 0.3)",
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
                borderRadius: 2.5,
                bgcolor: spaceTariffType === "commercial" ? "secondary.main" : "primary.main",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(108, 122, 224, 0.4)",
              }}
            >
              {spaceTariffType === "commercial" ? <StoreIcon sx={{ color: "#ffffff" }} /> : <HomeIcon sx={{ color: "#ffd54f" }} />}
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
                {activeSpace?.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {spaceTariffType === "commercial"
                  ? "💼 Commercial General Power Tariff • Flat distribution & commercial metering"
                  : "🏠 Residential 230V Tariff • Stepped distribution tiers & Lifeline subsidy"}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Chip
            icon={<SpeedIcon sx={{ color: "#ffd54f !important" }} />}
            label={`Load: ${spaceTotalWatts} W`}
            sx={{ fontWeight: 800, bgcolor: "rgba(15, 14, 58, 0.5)", border: "1px solid rgba(108, 122, 224, 0.3)" }}
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
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={() => {
              setSpaceToEdit(activeSpace);
              setIsSpaceModalOpen(true);
            }}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Configure
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={exportLoadListJson}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Export
          </Button>
          {currentSpaceAppliances.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={handleClearAll}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Clear All
            </Button>
          )}
        </Box>
      </Card>

      {/* Bento Row 3: 3-Method Ingestion Action Bento Panel */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            variant="outlined"
            onClick={() => {
              setApplianceToEdit(null);
              setIsAddModalOpen(true);
            }}
            sx={{
              p: 2.5,
              borderRadius: 3,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 2,
              border: "1px solid",
              borderColor: "primary.main",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.04)",
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: "0 8px 24px rgba(99, 102, 241, 0.2)",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)",
              },
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <PenIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                + Manual Entry
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Add custom device with wattage & daily runtime
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            variant="outlined"
            onClick={() => setIsPelpModalOpen(true)}
            sx={{
              p: 2.5,
              borderRadius: 3,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 2,
              border: "1px solid",
              borderColor: "secondary.main",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(244, 63, 94, 0.08)" : "rgba(244, 63, 94, 0.04)",
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: "0 8px 24px rgba(244, 63, 94, 0.2)",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(244, 63, 94, 0.15)" : "rgba(244, 63, 94, 0.08)",
              },
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: "secondary.main",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <DatabaseIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                + DOE PELP Catalog
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Search official Philippine certified models
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            variant="outlined"
            onClick={() => setIsAiScannerOpen(true)}
            sx={{
              p: 2.5,
              borderRadius: 3,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 2,
              border: "1px solid",
              borderColor: "warning.main",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.04)",
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "translateY(-3px)",
                boxShadow: "0 8px 24px rgba(245, 158, 11, 0.2)",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.08)",
              },
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: "warning.main",
                color: "#080720",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CameraIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                + AI Vision Scan
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Scan energy label sticker or nameplate with camera
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Bento Row 4: Search & Filters */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: "center", justifyContent: "space-between" }}>
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
      <Grid container spacing={2.5}>
        {filteredAppliances.length === 0 ? (
          <Grid size={12}>
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3, border: "1px dashed", borderColor: "divider" }}>
              <BoltIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                No appliances in "{activeSpace?.name}" yet.
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                Use one of the 3 buttons above (Manual Entry, DOE PELP Catalog, or AI Vision Scan) to add devices into this space.
              </Typography>
            </Paper>
          </Grid>
        ) : (
          filteredAppliances.map((app: UserAppliance) => {
            const isOn = app.is_currently_on;
            const liveSpent = getAccumulatedPesos(app);
            const monthlyKwh = Number(app.monthly_kwh) || ((app.watts * app.hours_per_day * (app.quantity || 1) * 30) / 1000);
            
            // Calculate deterministic unbundled monthly cost with this space's tariff
            const appBill = calculateMeralcoBill(monthlyKwh, undefined, 0, false, spaceTariffType);
            const monthlyCost = appBill.totalBill;
            const hourlyRate = ((app.watts * (app.quantity || 1)) / 1000) * (appBill.effectiveRatePerKwh || 14.82);

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={app.id}>
                <Card
                  sx={{
                    p: 2.5,
                    borderRadius: 3.5,
                    border: "1px solid",
                    borderColor: isOn ? "success.main" : "rgba(108, 122, 224, 0.2)",
                    bgcolor: isOn ? "rgba(6, 78, 59, 0.15)" : "background.paper",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "primary.main",
                      transform: "translateY(-3px)",
                      boxShadow: "0 8px 24px rgba(108, 122, 224, 0.15)",
                    },
                  }}
                >
                  <Box>
                    {/* Top Row: Category & Power Toggle */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                      <Chip
                        label={app.category}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(108, 122, 224, 0.15)" }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => togglePower(app)}
                        sx={{
                          bgcolor: isOn ? "success.main" : "rgba(108, 122, 224, 0.15)",
                          color: isOn ? "#ffffff" : "text.secondary",
                          "&:hover": {
                            bgcolor: isOn ? "success.dark" : "rgba(108, 122, 224, 0.3)",
                          },
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
                    <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
                      <Chip
                        icon={<BoltIcon sx={{ fontSize: "14px !important", color: "#ffd54f !important" }} />}
                        label={`${app.watts} W`}
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
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
                    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                          Monthly Cost ({spaceTariffType === "commercial" ? "Commercial" : "Residential"})
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#ffd54f" }}>
                          ₱{monthlyCost.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
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
                          onClick={() => {
                            if (window.confirm(`Delete ${app.name}?`)) {
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

      {/* Add / Edit Appliance Modal */}
      {isAddModalOpen && (
        <ApplianceModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setApplianceToEdit(null);
          }}
          applianceToEdit={applianceToEdit}
          defaultListId={activeSpace?.id || null}
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
          canDelete={spaces.length > 0}
        />
      )}

      {/* DOE PELP Catalog Modal */}
      {isPelpModalOpen && (
        <PelpCatalogModal
          isOpen={isPelpModalOpen}
          onClose={() => setIsPelpModalOpen(false)}
          defaultListId={activeSpace?.id || null}
        />
      )}

      {/* AI Vision Scanner Modal */}
      {isAiScannerOpen && (
        <AiVisionScannerModal
          isOpen={isAiScannerOpen}
          onClose={() => setIsAiScannerOpen(false)}
          defaultListId={activeSpace?.id || null}
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
