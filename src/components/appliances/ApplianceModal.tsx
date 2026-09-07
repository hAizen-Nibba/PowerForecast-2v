import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";
import {
  Bolt as BoltIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Create as PenIcon,
  Storage as DatabaseIcon,
  CameraAlt as CameraIcon,
  InfoOutlined as InfoIcon,
  ElectricMeter as MeterIcon,
  Add as PlusIcon,
} from "@mui/icons-material";
import { UserAppliance, ApplianceList, STREAMLINED_CATEGORIES } from "../../types";
import { useCreate, useUpdate, useList } from "@refinedev/core";
import { getDefaultStartHour } from "../../lib/loadCurveService";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";
import {
  calculateKwh,
  isCompressorInverterCategory,
  normalizeApplianceCategory,
} from "../../lib/dailyUsageService";
import { DuplicateApplianceModal } from "./DuplicateApplianceModal";
import { SpaceManagementModal } from "./SpaceManagementModal";
import { PelpCatalogTabContent } from "./PelpCatalogTabContent";
import { AiVisionScannerTabContent } from "./AiVisionScannerTabContent";

interface ApplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  applianceToEdit?: UserAppliance | null;
  defaultListId?: string | null;
  initialTab?: number;
}

export const ApplianceModal: React.FC<ApplianceModalProps> = ({
  isOpen,
  onClose,
  applianceToEdit,
  defaultListId,
  initialTab = 0,
}) => {
  const [activeTab, setActiveTab] = useState<number>(initialTab);

  // Manual Entry Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Air Conditioners");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [watts, setWatts] = useState(750);
  const [quantity, setQuantity] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [daysPerMonth, setDaysPerMonth] = useState(30);
  const [startHour, setStartHour] = useState<number>(13);
  const [roomLocation, setRoomLocation] = useState("Living Room");
  const [energyRating, setEnergyRating] = useState("5-Star Inverter");
  const [isInverter, setIsInverter] = useState<boolean>(true);
  const [customCruisingWatts, setCustomCruisingWatts] = useState<number | "">("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);

  // Duplicate modal states
  const [duplicateIncoming, setDuplicateIncoming] = useState<Partial<UserAppliance> | null>(null);
  const [duplicateExisting, setDuplicateExisting] = useState<UserAppliance | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  const listsRes = useList<ApplianceList>({
    resource: "appliance_lists",
  }) as any;

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const spaces: ApplianceList[] = listsRes?.data?.data || listsRes?.result?.data || [];
  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];

  const { mutate: createAppliance, isLoading: isCreating } = useCreate();
  const { mutate: updateAppliance, isLoading: isUpdating } = useUpdate();

  useEffect(() => {
    if (applianceToEdit) {
      setActiveTab(0);
      setName(applianceToEdit.name || "");
      const cat = normalizeApplianceCategory(applianceToEdit.category || "Air Conditioners");
      setCategory(cat);
      setBrand(applianceToEdit.brand || "");
      setModel(applianceToEdit.model || "");
      setWatts(applianceToEdit.watts || 100);
      setQuantity(applianceToEdit.quantity || 1);
      setHoursPerDay(applianceToEdit.hours_per_day || 8);
      setDaysPerMonth(applianceToEdit.days_per_month || 30);
      setStartHour(applianceToEdit.start_hour !== undefined ? applianceToEdit.start_hour : getDefaultStartHour(cat));
      setRoomLocation(applianceToEdit.room_location || "Living Room");
      setEnergyRating(applianceToEdit.energy_rating || "5-Star");
      setIsInverter(
        Boolean(
          applianceToEdit.is_inverter === true ||
          (applianceToEdit.energy_rating && /inverter/i.test(applianceToEdit.energy_rating)) ||
          (applianceToEdit.name && /inverter/i.test(applianceToEdit.name)) ||
          (applianceToEdit.model && /inverter/i.test(applianceToEdit.model)) ||
          (applianceToEdit.ai_metadata?.is_inverter === true)
        )
      );
      setCustomCruisingWatts(
        applianceToEdit.cruising_watts ?? applianceToEdit.ai_metadata?.cruising_watts ?? ""
      );
      setSelectedListId(applianceToEdit.list_id || (spaces[0]?.id || ""));
    } else {
      setActiveTab(initialTab);
      setName("");
      setCategory("Air Conditioners");
      setBrand("");
      setModel("");
      setWatts(750);
      setQuantity(1);
      setHoursPerDay(8);
      setDaysPerMonth(30);
      setStartHour(13);
      setRoomLocation("Living Room");
      setEnergyRating("5-Star Inverter");
      setIsInverter(true);
      setCustomCruisingWatts("");
      setSelectedListId(defaultListId || (spaces[0]?.id || ""));
    }
  }, [applianceToEdit, isOpen, spaces, defaultListId, initialTab]);

  const currentSpace = spaces.find((s) => s.id === selectedListId) || spaces[0];
  const tariffType: "residential" | "commercial" = currentSpace?.tariff_type || "residential";

  const catLower = category.toLowerCase();
  const isFridge = catLower.includes("refrigerat") || catLower.includes("fridge") || catLower.includes("freezer") || catLower.includes("chiller");
  const isWasher = catLower.includes("wash") || catLower.includes("laundry");
  const isAc = catLower.includes("air condition") || catLower.includes("aircon");
  const supportsInverter = isCompressorInverterCategory(category);

  // Calibrated Smart Auto Cruising Watts: 1/3 (~33.3%) for fridge/freezers, ~50% for washers, ~42% for ACs
  const defaultCruisingWatts = isFridge
    ? Math.round(watts / 3)
    : isWasher
    ? Math.round(watts * 0.50)
    : Math.round(watts * 0.42);

  const activeCruisingWatts =
    customCruisingWatts !== "" && Number(customCruisingWatts) > 0
      ? Number(customCruisingWatts)
      : defaultCruisingWatts;

  const isCustom =
    customCruisingWatts !== "" &&
    Number(customCruisingWatts) > 0 &&
    Number(customCruisingWatts) !== defaultCruisingWatts;

  const cruisingPercent =
    watts > 0 ? ((activeCruisingWatts / watts) * 100).toFixed(1) : "0";

  const dailyKwh = calculateKwh(watts, hoursPerDay, quantity, {
    isInverter: supportsInverter ? isInverter : false,
    category,
    energy_rating: energyRating,
    name,
    model,
    cruising_watts: isCustom ? activeCruisingWatts : undefined,
  });
  const monthlyKwh = Math.round(dailyKwh * daysPerMonth * 10) / 10;
  const billCalc = calculateMeralcoBill(monthlyKwh, undefined, 0, false, tariffType);
  const estimatedCost = billCalc.totalBill.toFixed(2);

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const targetListId = selectedListId || (spaces[0]?.id ?? null);
    if (!targetListId) {
      setIsSpaceModalOpen(true);
      return;
    }
    const targetSpace = spaces.find((s) => s.id === targetListId);

    const payload: Partial<UserAppliance> = {
      name: name.trim(),
      category: normalizeApplianceCategory(category),
      brand: brand.trim(),
      model: model.trim(),
      watts,
      quantity,
      hours_per_day: hoursPerDay,
      days_per_month: daysPerMonth,
      start_hour: startHour,
      room_location: roomLocation,
      energy_rating: energyRating,
      is_inverter: supportsInverter ? isInverter : false,
      cruising_watts: supportsInverter && isInverter && isCustom ? activeCruisingWatts : undefined,
      monthly_kwh: monthlyKwh,
      list_id: targetListId,
      tariff_type: targetSpace?.tariff_type || "residential",
      ai_metadata: {
        ...(applianceToEdit?.ai_metadata || {}),
        ...(supportsInverter && isInverter && isCustom
          ? { cruising_watts: activeCruisingWatts }
          : { cruising_watts: null }),
      },
    };

    if (applianceToEdit) {
      updateAppliance(
        {
          resource: "user_appliances",
          id: applianceToEdit.id,
          values: payload,
        },
        {
          onSuccess: () => onClose(),
        }
      );
    } else {
      // Check for duplicate in the same space
      const existing = appliances.find((a) => {
        const isSameSpace = a.list_id === targetListId || (!a.list_id && spaces.find((s) => s.id === targetListId)?.is_default);
        if (!isSameSpace) return false;

        const isSameName = a.name.trim().toLowerCase() === name.trim().toLowerCase();
        const isSameModel =
          brand.trim() &&
          model.trim() &&
          a.brand?.trim().toLowerCase() === brand.trim().toLowerCase() &&
          a.model?.trim().toLowerCase() === model.trim().toLowerCase();

        return isSameName || isSameModel;
      });

      if (existing) {
        setDuplicateExisting(existing);
        setDuplicateIncoming(payload);
        setIsDuplicateModalOpen(true);
        return;
      }

      createAppliance(
        {
          resource: "user_appliances",
          values: payload,
        },
        {
          onSuccess: () => onClose(),
        }
      );
    }
  };

  const handleCombineQuantity = (existing: UserAppliance) => {
    updateAppliance(
      {
        resource: "user_appliances",
        id: existing.id,
        values: {
          quantity: (existing.quantity || 1) + quantity,
        },
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  const handleAddDistinct = (distinctPayload: Partial<UserAppliance>) => {
    createAppliance(
      {
        resource: "user_appliances",
        values: distinctPayload,
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  const isEditing = Boolean(applianceToEdit);

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        fullWidth
        maxWidth={isEditing ? "sm" : "md"}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              overflow: "hidden",
            },
          },
        }}
      >
        <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.5,
                  bgcolor: isEditing ? "warning.main" : "primary.main",
                  color: "#0c1b18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BoltIcon sx={{ color: isEditing ? "#ffffff" : "#0c1b18", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {isEditing ? "Edit Appliance Specs" : "Add New Appliance"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                  {isEditing
                    ? `Updating "${applianceToEdit?.name}" in ${currentSpace?.name || "Space"}`
                    : `Add or import a device into "${currentSpace?.name || "Space"}"`}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* Tab Navigation Header (Only in Add mode) */}
        {!isEditing && (
          <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3, bgcolor: "action.hover" }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 48,
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  minHeight: 48,
                  py: 1,
                  px: 2,
                  gap: 1,
                },
              }}
            >
              <Tab
                icon={<PenIcon fontSize="small" />}
                iconPosition="start"
                label="Manual Entry"
              />
              <Tab
                icon={<DatabaseIcon fontSize="small" />}
                iconPosition="start"
                label="DOE PELP Catalog"
              />
              <Tab
                icon={<CameraIcon fontSize="small" />}
                iconPosition="start"
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <span>AI Vision Scan</span>
                    <Chip label="AI" size="small" color="primary" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 800 }} />
                  </Box>
                }
              />
            </Tabs>
          </Box>
        )}

        <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* TAB 0 / EDIT MODE: MANUAL ENTRY FORM */}
          {activeTab === 0 && (
            <form id="manual-appliance-form" onSubmit={handleSubmitManual}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {/* Space / List Selection */}
                {spaces.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      bgcolor: "action.hover",
                      borderColor: "warning.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "warning.main" }}>
                        Space Required
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        You must create a space first (e.g. Home, Office, or Shop) before adding appliances.
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      color="warning"
                      startIcon={<PlusIcon />}
                      onClick={() => setIsSpaceModalOpen(true)}
                    >
                      Create Space
                    </Button>
                  </Paper>
                ) : (
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                        TARGET SPACE
                      </Typography>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<PlusIcon fontSize="small" />}
                        onClick={() => setIsSpaceModalOpen(true)}
                        sx={{ fontSize: "0.75rem", p: 0, textTransform: "none", fontWeight: 700 }}
                      >
                        Add New Space
                      </Button>
                    </Box>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={selectedListId || spaces[0]?.id || ""}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      helperText={`Tariff Applied: ${tariffType === "commercial" ? "Commercial (General Power)" : "Residential (230V Stepped)"}`}
                    >
                      {spaces.map((space) => (
                        <MenuItem key={space.id} value={space.id}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {space.tariff_type === "commercial" ? (
                              <StoreIcon fontSize="small" sx={{ color: "secondary.main" }} />
                            ) : (
                              <HomeIcon fontSize="small" sx={{ color: "primary.main" }} />
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {space.name}
                            </Typography>
                            <Chip
                              label={space.tariff_type === "commercial" ? "Commercial" : "Residential"}
                              size="small"
                              sx={{ fontSize: "0.6875rem", height: 20 }}
                            />
                          </Box>
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                )}

                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      size="small"
                      label="Appliance Name / Description"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Master Bedroom Inverter AC or Store Showcase Chiller"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Category"
                      value={normalizeApplianceCategory(category)}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setCategory(newCat);
                        if (!isCompressorInverterCategory(newCat)) {
                          setIsInverter(false);
                        } else {
                          setIsInverter(true);
                        }
                      }}
                    >
                      {STREAMLINED_CATEGORIES.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Room / Zone Location"
                      value={roomLocation}
                      onChange={(e) => setRoomLocation(e.target.value)}
                    >
                      <MenuItem value="Living Room">Living Room</MenuItem>
                      <MenuItem value="Master Bedroom">Master Bedroom</MenuItem>
                      <MenuItem value="Bedroom 2">Bedroom 2</MenuItem>
                      <MenuItem value="Kitchen">Kitchen</MenuItem>
                      <MenuItem value="Dining">Dining</MenuItem>
                      <MenuItem value="Laundry Area">Laundry Area</MenuItem>
                      <MenuItem value="Home Office">Home Office</MenuItem>
                      <MenuItem value="Store Front / Retail">Store Front / Retail</MenuItem>
                      <MenuItem value="Workshop / Storage">Workshop / Storage</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid size={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Brand (Optional)"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Panasonic, Carrier"
                    />
                  </Grid>

                  <Grid size={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Model No. (Optional)"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. CS-XPU12WKH"
                    />
                  </Grid>

                  <Grid size={6}>
                    <TextField
                      required
                      type="number"
                      fullWidth
                      size="small"
                      label="Power Draw (Watts)"
                      value={watts}
                      onChange={(e) => setWatts(Number(e.target.value) || 0)}
                    />
                  </Grid>

                  <Grid size={6}>
                    <TextField
                      required
                      type="number"
                      fullWidth
                      size="small"
                      label="Quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </Grid>

                  {/* INVERTER COMPRESSOR TELEMETRY & FALLBACK TOGGLE (Category-Adaptive) */}
                  {supportsInverter && (
                    <Grid size={12}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: isInverter
                            ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.05)" : "rgba(13, 148, 136, 0.04)")
                            : "action.hover",
                          borderColor: isInverter
                            ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)")
                            : "divider",
                          transition: "all 0.2s ease-in-out",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <BoltIcon sx={{ color: isInverter ? "primary.main" : "text.secondary", fontSize: 22 }} />
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isInverter ? "primary.main" : "text.primary" }}>
                                ⚡ {isFridge ? "Inverter Compressor & Thermal Duty" : isWasher ? "Inverter Direct Drive Motor" : "Inverter Technology & Duty Cycle"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                {isInverter
                                  ? isFridge
                                    ? "Smart continuous thermal maintenance & cruising efficiency active"
                                    : isWasher
                                    ? "Smart variable-speed drum motor efficiency active"
                                    : "Smart compressor time-decay & cruising efficiency active"
                                  : "Fixed-speed continuous power draw (100% constant)"}
                              </Typography>
                            </Box>
                          </Box>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={isInverter}
                                onChange={(e) => setIsInverter(e.target.checked)}
                                color="primary"
                                size="medium"
                              />
                            }
                            label={
                              <Typography variant="body2" sx={{ fontWeight: 800, color: isInverter ? "primary.main" : "text.secondary" }}>
                                {isInverter ? "INVERTER ON" : "INVERTER OFF"}
                              </Typography>
                            }
                            sx={{ m: 0 }}
                          />
                        </Box>

                        {/* Live Inverter Telemetry Preview & Manual Cruising Input */}
                        {isInverter && (
                          <Box
                            sx={{
                              mt: 1.5,
                              pt: 1.5,
                              borderTop: "1px dashed",
                              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(13, 148, 136, 0.2)"),
                              display: "flex",
                              flexDirection: "column",
                              gap: 1.5,
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                              {isFridge ? (
                                <Chip
                                  size="small"
                                  label="Thermal Duty: Steady Cruising (1/3 Cycle)"
                                  sx={{ fontWeight: 700, fontSize: "0.6875rem", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9" }}
                                />
                              ) : isWasher ? (
                                <Chip
                                  size="small"
                                  label="Inverter Direct Drive Motor"
                                  sx={{ fontWeight: 700, fontSize: "0.6875rem", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9" }}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  label={`1st Hr Cooldown: ${watts}W (100%)`}
                                  sx={{ fontWeight: 700, fontSize: "0.6875rem", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9" }}
                                />
                              )}

                              <Chip
                                size="small"
                                label={`Cruising Mode: ~${activeCruisingWatts}W avg${isCustom ? " (Custom)" : isFridge ? " (~33%)" : isWasher ? " (~50%)" : " (~42%)"}`}
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: "0.6875rem" }}
                              />

                              <Chip
                                size="small"
                                label={`Effective: ~${isFridge ? activeCruisingWatts : Math.round((dailyKwh * 1000) / (hoursPerDay || 1))}W @ ${hoursPerDay}h`}
                                sx={{ fontWeight: 800, fontSize: "0.6875rem", bgcolor: "primary.main", color: "#ffffff" }}
                              />
                            </Box>

                            {/* Manual Cruising Wattage Input Box */}
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 1.25,
                                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.04)" : "rgba(13, 148, 136, 0.03)",
                                border: "1px solid",
                                borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.15)",
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                                  {isFridge ? "Running / Cruising Power Draw (Watts)" : "Cruising Power Draw (Watts)"}
                                </Typography>
                                {isCustom && (
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setCustomCruisingWatts("")}
                                    sx={{ fontSize: "0.6875rem", p: 0, minWidth: "auto", textTransform: "none", color: "primary.main", fontWeight: 700 }}
                                  >
                                    Reset to Smart Auto ({isFridge ? "~33%" : isWasher ? "~50%" : "~42%"})
                                  </Button>
                                )}
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={customCruisingWatts !== "" ? customCruisingWatts : defaultCruisingWatts}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomCruisingWatts(val === "" ? "" : Math.max(0, Number(val)));
                                  }}
                                  slotProps={{
                                    input: {
                                      endAdornment: <InputAdornment position="end">W</InputAdornment>,
                                    },
                                  }}
                                  sx={{ width: 140 }}
                                />
                                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                  {activeCruisingWatts}W ({cruisingPercent}% of {watts}W rated)
                                  {isCustom ? " • Custom Override Active" : ` • Smart Auto (${isFridge ? "~33%" : isWasher ? "~50%" : "~42%"})`}
                                </Typography>
                              </Box>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 0.25 }}>
                              <InfoIcon sx={{ fontSize: 16, color: "text.secondary", mt: 0.25 }} />
                              <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.4 }}>
                                {isFridge ? (
                                  <>
                                    <strong>Bakit mahalaga ito?</strong> Ang Inverter Refrigerator / Freezer ay may tuluy-tuloy na thermal insulation at nagme-maintain sa mababang cruising draw (~33% o sa in-input mong running watts tulad ng 200W–350W sa chest freezers). Mas accurate ang projection ng iyong Meralco bill kumpara sa fixed-speed. Kung ordinaryong ref ito, i-toggle lang ng <strong>OFF</strong>.
                                  </>
                                ) : isWasher ? (
                                  <>
                                    <strong>Bakit mahalaga ito?</strong> Ang Inverter Direct Drive motor ay nag-a-adjust ng bilis depende sa bigat ng labada para makatipid sa kuryente. Kung ordinaryong washing machine ito, i-toggle lang ng <strong>OFF</strong>.
                                  </>
                                ) : (
                                  <>
                                    <strong>Bakit mahalaga ito?</strong> Ang Inverter Aircon ay awtomatikong nagbabawas ng kuryente (cruising mode @ ~42% o custom draw mo) kapag lumamig na ang kwarto. Mas accurate ang projection ng iyong Meralco bill kumpara sa fixed-speed. Kung ordinaryong aircon ito, i-toggle lang ng <strong>OFF</strong>.
                                  </>
                                )}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  )}

                  <Grid size={6}>
                    <TextField
                      type="number"
                      fullWidth
                      size="small"
                      label="Daily Run-Time (Hours)"
                      value={hoursPerDay}
                      onChange={(e) => setHoursPerDay(Number(e.target.value) || 0)}
                    />
                  </Grid>

                  <Grid size={6}>
                    <TextField
                      type="number"
                      fullWidth
                      size="small"
                      label="Days Active per Month"
                      value={daysPerMonth}
                      onChange={(e) => setDaysPerMonth(Number(e.target.value) || 0)}
                    />
                  </Grid>
                </Grid>

                {/* Real-time projection preview */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: "action.hover",
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      Monthly Projected Cost ({tariffType === "commercial" ? "Commercial Rate" : "Residential Rate"})
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#ffd54f" }}>
                      ₱{estimatedCost}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      Energy Volume
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                      {monthlyKwh} kWh/mo
                    </Typography>
                  </Box>
                </Paper>

                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mt: 1 }}>
                  <Button variant="outlined" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isCreating || isUpdating}
                    startIcon={<SaveIcon />}
                    sx={{ fontWeight: 700 }}
                  >
                    {isEditing ? "Save Changes" : "Save Appliance"}
                  </Button>
                </Box>
              </Box>
            </form>
          )}

          {/* TAB 1: DOE PELP CATALOG */}
          {activeTab === 1 && !isEditing && (
            <PelpCatalogTabContent
              selectedListId={selectedListId}
              onSelectedListIdChange={setSelectedListId}
              onClose={onClose}
            />
          )}

          {/* TAB 2: AI VISION SCAN */}
          {activeTab === 2 && !isEditing && (
            <AiVisionScannerTabContent
              selectedListId={selectedListId}
              onSelectedListIdChange={setSelectedListId}
              onClose={onClose}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate Appliance Resolution Modal */}
      {isDuplicateModalOpen && (
        <DuplicateApplianceModal
          isOpen={isDuplicateModalOpen}
          onClose={() => {
            setIsDuplicateModalOpen(false);
            setDuplicateIncoming(null);
            setDuplicateExisting(null);
          }}
          incomingAppliance={duplicateIncoming}
          existingAppliance={duplicateExisting}
          spaceName={spaces.find((s) => s.id === (selectedListId || spaces[0]?.id))?.name || "Current Space"}
          onCombineQuantity={handleCombineQuantity}
          onAddDistinct={handleAddDistinct}
        />
      )}

      {/* In-Modal Space Creation Modal */}
      <SpaceManagementModal
        isOpen={isSpaceModalOpen}
        onClose={() => setIsSpaceModalOpen(false)}
        onCreated={(newSpace) => {
          if (newSpace?.id) {
            setSelectedListId(newSpace.id);
          }
        }}
      />
    </>
  );
};

export default ApplianceModal;
