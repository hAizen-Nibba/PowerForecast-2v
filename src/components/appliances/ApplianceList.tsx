import React, { useState, useEffect } from "react";
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
} from "@mui/icons-material";
import { UserAppliance, UserCalendarEvent } from "../../types";
import { useList, useDelete, useUpdate, useCreate } from "@refinedev/core";
import { ApplianceModal } from "./ApplianceModal";
import { PelpCatalogModal } from "./PelpCatalogModal";
import { ScheduleQueueModal } from "../calendar/ScheduleQueueModal";
import { useToast } from "../common/ToastProvider";
import { devLog } from "../../lib/devLogger";

interface ApplianceListProps {
  onOpenAiScanner?: () => void;
}

export const ApplianceList: React.FC<ApplianceListProps> = ({ onOpenAiScanner }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPelpModalOpen, setIsPelpModalOpen] = useState(false);
  const [applianceToEdit, setApplianceToEdit] = useState<UserAppliance | null>(null);

  const [selectedApplianceForQueue, setSelectedApplianceForQueue] = useState<UserAppliance | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  const { showSuccess, showInfo } = useToast();

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const eventsRes = useList<UserCalendarEvent>({
    resource: "user_calendar_events",
  }) as any;

  const { mutate: deleteAppliance } = useDelete();
  const { mutate: updateAppliance } = useUpdate();
  const { mutate: createEvent } = useCreate();
  const { mutate: deleteEvent } = useDelete();

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const events: UserCalendarEvent[] = eventsRes?.data?.data || eventsRes?.result?.data || [];

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredAppliances = appliances.filter((app: UserAppliance) => {
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
    return totalKwh * 14.8261;
  };

  const exportLoadListJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appliances, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `powerforecast_inventory_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showSuccess("Household inventory exported to JSON.");
  };

  const handleClearAll = () => {
    if (!window.confirm("Are you sure you want to clear all registered appliances?")) return;
    appliances.forEach((a) => deleteAppliance({ resource: "user_appliances", id: a.id }));
    showInfo("Cleared all appliances.");
  };

  const totalRegisteredWatts = appliances.reduce(
    (acc, curr) => acc + curr.watts * (curr.quantity || 1),
    0
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* 1. Header & Live Stats Banner */}
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
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(108, 122, 224, 0.4)",
              }}
            >
              <BoltIcon sx={{ color: "#ffd54f" }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
                Registered Household Appliances
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Manage, schedule, and track all DOE PELP-certified and custom appliances in your household.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Chip
            icon={<SpeedIcon sx={{ color: "#ffd54f !important" }} />}
            label={`Total Load: ${totalRegisteredWatts} W`}
            sx={{ fontWeight: 800, bgcolor: "rgba(15, 14, 58, 0.5)", border: "1px solid rgba(108, 122, 224, 0.3)" }}
          />
          <Chip
            label={`${appliances.length} Devices`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700 }}
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
          {appliances.length > 0 && (
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

      {/* 2. Search, Filters & Action Buttons */}
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

      {/* 3. Cards Grid */}
      <Grid container spacing={2.5}>
        {filteredAppliances.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3, border: "1px dashed", borderColor: "divider" }}>
              <BoltIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                No appliances found.
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                Add your household devices using the manual form, DOE catalog search, or AI camera scan.
              </Typography>
            </Paper>
          </Grid>
        ) : (
          filteredAppliances.map((app: UserAppliance) => {
            const isOn = app.is_currently_on;
            const liveSpent = getAccumulatedPesos(app);
            const monthlyKwh = Number(app.monthly_kwh) || ((app.watts * app.hours_per_day * (app.quantity || 1) * 30) / 1000);
            const monthlyCost = monthlyKwh * 14.8261;
            const hourlyCost = ((app.watts * (app.quantity || 1)) / 1000) * 14.8261;

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
                        ₱{hourlyCost.toFixed(2)}/hr rate
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

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <ApplianceModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setApplianceToEdit(null);
          }}
          applianceToEdit={applianceToEdit}
        />
      )}

      {/* DOE PELP Catalog Modal */}
      {isPelpModalOpen && (
        <PelpCatalogModal
          isOpen={isPelpModalOpen}
          onClose={() => setIsPelpModalOpen(false)}
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
