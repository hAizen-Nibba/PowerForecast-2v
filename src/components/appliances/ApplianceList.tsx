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
  ViewModule as AllSpacesIcon,
} from "@mui/icons-material";
import { UserAppliance, UserCalendarEvent, ApplianceList as ApplianceSpace } from "../../types";
import { useList, useDelete, useUpdate, useCreate } from "@refinedev/core";
import { ApplianceModal } from "./ApplianceModal";
import { PelpCatalogModal } from "./PelpCatalogModal";
import { SpaceManagementModal } from "./SpaceManagementModal";
import { ScheduleQueueModal } from "../calendar/ScheduleQueueModal";
import { useToast } from "../common/ToastProvider";
import { devLog } from "../../lib/devLogger";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";

interface ApplianceListProps {
  onOpenAiScanner?: () => void;
}

export const ApplianceList: React.FC<ApplianceListProps> = ({ onOpenAiScanner }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [activeSpaceId, setActiveSpaceId] = useState<string>("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPelpModalOpen, setIsPelpModalOpen] = useState(false);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<ApplianceSpace | null>(null);
  const [applianceToEdit, setApplianceToEdit] = useState<UserAppliance | null>(null);

  const [selectedApplianceForQueue, setSelectedApplianceForQueue] = useState<UserAppliance | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  const { showSuccess, showInfo } = useToast();

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
  const { mutate: createSpace } = useCreate();

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceSpace[] = spacesRes?.data?.data || spacesRes?.result?.data || [];
  const events: UserCalendarEvent[] = eventsRes?.data?.data || eventsRes?.result?.data || [];

  // Seed default "Main Residence" if user has no spaces
  useEffect(() => {
    if (spacesRes?.data && spaces.length === 0 && !spacesRes.isLoading) {
      createSpace({
        resource: "appliance_lists",
        values: {
          name: "Main Residence",
          tariff_type: "residential",
          is_default: true,
        },
      });
    }
  }, [spaces, spacesRes, createSpace]);

  // Set default active tab once spaces load
  useEffect(() => {
    if (activeSpaceId === "all" && spaces.length > 0) {
      setActiveSpaceId(spaces[0].id);
    }
  }, [spaces]);

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId);

  // Filter appliances
  const filteredAppliances = useMemo(() => {
    return appliances.filter((app: UserAppliance) => {
      const matchesSpace =
        activeSpaceId === "all" ||
        app.list_id === activeSpaceId ||
        (!app.list_id && spaces[0]?.id === activeSpaceId);

      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.brand && app.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (app.model && app.model.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === "all" || app.category.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesRoom =
        selectedRoom === "all" || (app.room_location && app.room_location.toLowerCase() === selectedRoom.toLowerCase());

      return matchesSpace && matchesSearch && matchesCategory && matchesRoom;
    });
  }, [appliances, activeSpaceId, searchQuery, selectedCategory, selectedRoom, spaces]);

  // Space-specific stats
  const currentSpaceAppliances = useMemo(() => {
    if (activeSpaceId === "all") return appliances;
    return appliances.filter((app) => app.list_id === activeSpaceId || (!app.list_id && spaces[0]?.id === activeSpaceId));
  }, [appliances, activeSpaceId, spaces]);

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

    devLog.telemetry("Telemetry", `Circuit switched ${newState ? "⚡ [ACTIVE ON]" : "⚪ [STANDBY OFF]"}: "${app.name}" (${app.watts}W @ 230V)`, {
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

    showInfo(`${app.name} turned ${newState ? "ON" : "OFF"}.`);
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
    downloadAnchor.setAttribute("download", `powerforecast_${activeSpace?.name || "all_spaces"}_inventory.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showSuccess("Appliance inventory exported to JSON.");
  };

  const handleClearAll = () => {
    if (!window.confirm(`Are you sure you want to clear all registered appliances in ${activeSpace?.name || "this list"}?`)) return;
    currentSpaceAppliances.forEach((a) => deleteAppliance({ resource: "user_appliances", id: a.id }));
    showInfo("Cleared space appliances.");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* 1. Space Tabs Header Navigation */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Tabs
          value={activeSpaceId}
          onChange={(_, val) => {
            if (val !== "new_space") setActiveSpaceId(val);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              minHeight: 44,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              px: 2,
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

          {spaces.length > 1 && (
            <Tab
              value="all"
              icon={<AllSpacesIcon fontSize="small" />}
              iconPosition="start"
              label="All Spaces"
            />
          )}
        </Tabs>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {activeSpace && activeSpaceId !== "all" && (
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
              Configure Space
            </Button>
          )}

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

      {/* 2. Space Banner & Stats Card */}
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
                width: 44,
                height: 44,
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
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
                {activeSpace ? activeSpace.name : "All Household & Commercial Spaces"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {spaceTariffType === "commercial"
                  ? "💼 Commercial General Power Tariff • Unbundled flat distribution & commercial metering"
                  : "🏠 Residential 230V Tariff • ERC stepped distribution tiers & Lifeline protection"}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Chip
            icon={<SpeedIcon sx={{ color: "#ffd54f !important" }} />}
            label={`Total Load: ${spaceTotalWatts} W`}
            sx={{ fontWeight: 800, bgcolor: "rgba(15, 14, 58, 0.5)", border: "1px solid rgba(108, 122, 224, 0.3)" }}
          />
          <Chip
            label={`${currentSpaceAppliances.length} Devices`}
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

      {/* 3. Search, Filters & Action Buttons */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: "center", justifyContent: "space-between" }}>
        <TextField
          size="small"
          placeholder="Search by name, brand, model..."
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
          sx={{ width: { xs: "100%", sm: 320 } }}
        />

        <Box sx={{ display: "flex", gap: 1.5, width: { xs: "100%", sm: "auto" }, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DatabaseIcon />}
            onClick={() => setIsPelpModalOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            + DOE Catalog
          </Button>

          {onOpenAiScanner && (
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              startIcon={<SparklesIcon />}
              onClick={onOpenAiScanner}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              AI Vision Scan
            </Button>
          )}

          <Button
            variant="contained"
            size="small"
            startIcon={<PlusIcon />}
            onClick={() => {
              setApplianceToEdit(null);
              setIsAddModalOpen(true);
            }}
            sx={{ borderRadius: 2, fontWeight: 800 }}
          >
            Add Appliance
          </Button>
        </Box>
      </Box>

      {/* 4. Cards Grid */}
      <Grid container spacing={2.5}>
        {filteredAppliances.length === 0 ? (
          <Grid size={12}>
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3, border: "1px dashed", borderColor: "divider" }}>
              <BoltIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                No appliances in this space yet.
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                Add devices to {activeSpace?.name || "your space"} using manual entry, DOE PELP catalog, or AI camera scanner.
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<PlusIcon />}
                onClick={() => {
                  setApplianceToEdit(null);
                  setIsAddModalOpen(true);
                }}
                sx={{ mt: 2, borderRadius: 2 }}
              >
                Add First Appliance
              </Button>
            </Paper>
          </Grid>
        ) : (
          filteredAppliances.map((app: UserAppliance) => {
            const isOn = app.is_currently_on;
            const liveSpent = getAccumulatedPesos(app);
            const appSpace = spaces.find((s) => s.id === app.list_id);
            const appTariff = app.tariff_type || appSpace?.tariff_type || "residential";
            const monthlyKwh = Number(app.monthly_kwh) || ((app.watts * app.hours_per_day * (app.quantity || 1) * 30) / 1000);
            
            // Calculate deterministic unbundled monthly cost
            const appBill = calculateMeralcoBill(monthlyKwh, undefined, 0, false, appTariff);
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
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        <Chip
                          label={app.category}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: "rgba(108, 122, 224, 0.15)" }}
                        />
                        {appSpace && activeSpaceId === "all" && (
                          <Chip
                            label={appSpace.name}
                            size="small"
                            color={appTariff === "commercial" ? "secondary" : "primary"}
                            variant="outlined"
                            sx={{ fontSize: "0.65rem", height: 22 }}
                          />
                        )}
                      </Box>
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
                      <Chip
                        label={appTariff === "commercial" ? "Commercial" : "Residential"}
                        size="small"
                        sx={{ fontSize: "0.625rem", height: 20 }}
                      />
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Monthly estimated cost */}
                    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                          Monthly Projected Cost
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
                        <ClockIcon sx={{ fontSize: 14 }} />
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
          defaultListId={activeSpaceId !== "all" ? activeSpaceId : (spaces[0]?.id || null)}
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
        />
      )}

      {/* DOE PELP Catalog Modal */}
      {isPelpModalOpen && (
        <PelpCatalogModal
          isOpen={isPelpModalOpen}
          onClose={() => setIsPelpModalOpen(false)}
          defaultListId={activeSpaceId !== "all" ? activeSpaceId : (spaces[0]?.id || null)}
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

