import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import {
  CloudUpload as UploadIcon,
  AutoAwesome as SparklesIcon,
  CheckCircle as CheckCircleIcon,
  Key as KeyIcon,
  Delete as TrashIcon,
} from "@mui/icons-material";
import { analyzeMultipleApplianceImages, ImageItem } from "../../lib/visionService";
import { VisionScanResult, UserAppliance, ApplianceList } from "../../types";
import { useCreate, useUpdate, useList } from "@refinedev/core";
import { getDefaultStartHour } from "../../lib/loadCurveService";
import { devLog } from "../../lib/devLogger";
import { DuplicateApplianceModal } from "./DuplicateApplianceModal";

interface AiVisionScannerTabContentProps {
  selectedListId: string;
  onSelectedListIdChange?: (listId: string) => void;
  onClose: () => void;
}

export const AiVisionScannerTabContent: React.FC<AiVisionScannerTabContentProps> = ({
  selectedListId,
  onSelectedListIdChange,
  onClose,
}) => {
  const [preset, setPreset] = useState<"energy_guide" | "nameplate" | "inverter_check">("energy_guide");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<VisionScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [stagedImages, setStagedImages] = useState<ImageItem[]>([]);
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

  // Editable fields before saving
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editWatts, setEditWatts] = useState<number>(70);
  const [editMonthlyKwh, setEditMonthlyKwh] = useState<number>(16.8);
  const [editCategory, setEditCategory] = useState("Electric Fans");
  const [editRoom, setEditRoom] = useState("Living Room");

  // Duplicate modal states
  const [duplicateIncoming, setDuplicateIncoming] = useState<Partial<UserAppliance> | null>(null);
  const [duplicateExisting, setDuplicateExisting] = useState<UserAppliance | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const listsRes = useList<ApplianceList>({
    resource: "appliance_lists",
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceList[] = listsRes?.data?.data || listsRes?.result?.data || [];

  const { mutate: createAppliance, isLoading: isSaving } = useCreate();
  const { mutate: updateAppliance } = useUpdate();

  useEffect(() => {
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
    const savedKey = localStorage.getItem("powerforecast_gemini_api_key") || envKey;
    setApiKey(savedKey);
  }, []);

  const handleSaveApiKey = (keyVal: string) => {
    setApiKey(keyVal);
    localStorage.setItem("powerforecast_gemini_api_key", keyVal);
    devLog.info("AI Scanner", "Updated AI API Key");
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setScanError(null);

    const remainingSlots = 3 - stagedImages.length;
    if (remainingSlots <= 0) return;

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const fullBase64 = reader.result as string;
        const newImg: ImageItem = {
          id: `img-${Date.now()}-${Math.random()}`,
          base64: fullBase64,
          file,
          name: file.name,
        };
        setStagedImages((prev) => [...prev, newImg].slice(0, 3));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeStagedImage = (id: string) => {
    setStagedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleScan = async () => {
    if (stagedImages.length === 0) return;

    setIsScanning(true);
    setScanResult(null);
    setScanError(null);

    try {
      devLog.info("AI Scanner", `Sending ${stagedImages.length} image(s) to Google Gemini Multimodal AI...`);
      const result = await analyzeMultipleApplianceImages({
        images: stagedImages,
        apiKey: apiKey.trim(),
        preset,
      });
      setScanResult(result);

      if (result) {
        setEditName(
          result.detected_model
            ? `${result.detected_brand || ""} ${result.detected_model}`.trim()
            : result.detected_brand || "Smart Inverter Appliance"
        );
        setEditBrand(result.detected_brand || "");
        setEditModel(result.detected_model || "");
        setEditWatts(result.detected_watts || 100);
        setEditMonthlyKwh(result.detected_monthly_kwh || 25);
        if (result.detected_category) setEditCategory(result.detected_category);
      }
    } catch (err: any) {
      devLog.error("AI Scanner", "Analysis error:", err);
      setScanError(err.message || "Failed to process image with Google Gemini AI.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveToInventory = () => {
    const targetListId = selectedListId || (spaces[0]?.id ?? null);
    const targetSpace = spaces.find((s) => s.id === targetListId);

    const incomingPayload: Partial<UserAppliance> = {
      name: editName || "Scanned Appliance",
      category: editCategory,
      brand: editBrand,
      model: editModel,
      watts: editWatts,
      quantity: 1,
      hours_per_day: 8,
      days_per_month: 30,
      start_hour: getDefaultStartHour(editCategory),
      room_location: editRoom,
      energy_rating: scanResult?.detected_energy_rating || `${scanResult?.detected_star_rating || 5}-Star (AI Scan)`,
      monthly_kwh: editMonthlyKwh,
      list_id: targetListId,
      tariff_type: targetSpace?.tariff_type || "residential",
    };

    // Check if duplicate already exists in target space
    const existing = appliances.find((a) => {
      const isSameSpace = a.list_id === targetListId || (!a.list_id && spaces.find((s) => s.id === targetListId)?.is_default);
      if (!isSameSpace) return false;

      const isSameName = a.name?.trim().toLowerCase() === editName.trim().toLowerCase();
      const isSameModel =
        editBrand.trim() &&
        editModel.trim() &&
        a.brand?.trim().toLowerCase() === editBrand.trim().toLowerCase() &&
        a.model?.trim().toLowerCase() === editModel.trim().toLowerCase();

      return isSameName || isSameModel;
    });

    if (existing) {
      setDuplicateExisting(existing);
      setDuplicateIncoming(incomingPayload);
      setIsDuplicateModalOpen(true);
      return;
    }

    createAppliance(
      {
        resource: "user_appliances",
        values: incomingPayload,
      },
      {
        onSuccess: () => {
          devLog.info("AI Scanner", `Saved scanned appliance "${editName}" to space.`);
          onClose();
        },
      }
    );
  };

  const handleCombineQuantity = (existing: UserAppliance) => {
    updateAppliance(
      {
        resource: "user_appliances",
        id: existing.id,
        values: {
          quantity: (existing.quantity || 1) + 1,
        },
      },
      {
        onSuccess: () => {
          devLog.info("AI Scanner", `Incremented quantity for duplicate "${existing.name}".`);
          onClose();
        },
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
        onSuccess: () => {
          devLog.info("AI Scanner", `Saved separate scanned unit "${distinctPayload.name}" to space.`);
          onClose();
        },
      }
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Error Alert Display */}
      {scanError && (
        <Alert severity="error" onClose={() => setScanError(null)} sx={{ borderRadius: 1 }}>
          {scanError}
        </Alert>
      )}

      {/* Preset Mode Selector & Space / Key Controls */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Scan Mode / Preset</InputLabel>
          <Select
            value={preset}
            label="Scan Mode / Preset"
            onChange={(e) => setPreset(e.target.value as any)}
          >
            <MenuItem value="energy_guide">🟡 DOE Yellow Energy Guide</MenuItem>
            <MenuItem value="nameplate">⚙️ Technical Specification Plate</MenuItem>
            <MenuItem value="inverter_check">⚡ Inverter & Efficiency Audit</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {spaces.length > 1 && onSelectedListIdChange && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Target Space</InputLabel>
              <Select
                value={selectedListId}
                label="Target Space"
                onChange={(e) => onSelectedListIdChange(e.target.value)}
              >
                {spaces.map((sp) => (
                  <MenuItem key={sp.id} value={sp.id}>
                    {sp.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            size="small"
            variant="text"
            color="inherit"
            startIcon={<KeyIcon fontSize="small" />}
            onClick={() => setShowApiKeyInput((prev) => !prev)}
            sx={{ fontSize: "0.75rem" }}
          >
            {apiKey ? "Custom Key Configured" : "Enter API Key"}
          </Button>
        </Box>
      </Box>

      {showApiKeyInput && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.25 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 1 }}>
            Google Gemini API Key (Optional Override)
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="password"
            value={apiKey}
            onChange={(e) => handleSaveApiKey(e.target.value)}
            placeholder="AIzaSy..."
          />
        </Paper>
      )}

      {/* Upload Dropzone */}
      <Paper
        variant="outlined"
        sx={{
          p: 3.5,
          borderRadius: 1.5,
          textAlign: "center",
          borderStyle: "dashed",
          borderWidth: 2,
          bgcolor: "action.hover",
          cursor: "pointer",
          "&:hover": { borderColor: "primary.main" },
          position: "relative",
        }}
        component="label"
      >
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <UploadIcon sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Click or drag rating label photos here
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
          Upload up to 3 clear photos of appliance specifications (PNG, JPG, WebP)
        </Typography>
      </Paper>

      {/* Staged Photo Previews */}
      {stagedImages.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1.5 }}>
            STAGED PHOTOS ({stagedImages.length} / 3)
          </Typography>
          <Grid container spacing={2}>
            {stagedImages.map((img) => (
              <Grid size={4} key={img.id}>
                <Paper
                  sx={{
                    p: 1,
                    borderRadius: 1.25,
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Box
                    component="img"
                    src={img.base64}
                    alt={img.name}
                    sx={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 1 }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeStagedImage(img.id)}
                    sx={{ position: "absolute", top: 4, right: 4, bgcolor: "rgba(0,0,0,0.6)" }}
                  >
                    <TrashIcon fontSize="small" sx={{ color: "#ffffff" }} />
                  </IconButton>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Scan Action Button / Progress */}
      {isScanning ? (
        <Box sx={{ py: 2 }}>
          <LinearProgress />
          <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 600, display: "block", textAlign: "center", mt: 1 }}>
            Google Gemini Multimodal AI is inspecting photos, recognizing circuits, and verifying specs...
          </Typography>
        </Box>
      ) : !scanResult && (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            onClick={handleScan}
            disabled={isScanning || stagedImages.length === 0}
            startIcon={<SparklesIcon />}
            sx={{ fontWeight: 700 }}
          >
            Scan {stagedImages.length} Image(s) with AI
          </Button>
        </Box>
      )}

      {/* Parsed Result & Editable Form */}
      {scanResult && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.25, bgcolor: "action.hover" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "success.main", display: "flex", alignItems: "center", gap: 1 }}>
                <CheckCircleIcon fontSize="small" />
                Gemini AI Specs Extracted
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                {scanResult.is_inverter && (
                  <Chip label="⚡ Inverter" size="small" color="success" sx={{ fontWeight: 700, height: 22 }} />
                )}
                {scanResult.detected_star_rating && (
                  <Chip label={`⭐ ${scanResult.detected_star_rating}-Star`} size="small" color="warning" sx={{ fontWeight: 700, height: 22 }} />
                )}
                {(scanResult.cspf || scanResult.eer) && (
                  <Chip label={`CSPF/EER: ${scanResult.cspf || scanResult.eer}`} size="small" color="info" sx={{ fontWeight: 600, height: 22 }} />
                )}
                {scanResult.cooling_capacity_kj_h && (
                  <Chip label={`❄️ ${scanResult.cooling_capacity_kj_h.toLocaleString()} kJ/h`} size="small" sx={{ fontWeight: 600, height: 22 }} />
                )}
                <Chip
                  label={scanResult.confidence ? `${scanResult.confidence.toUpperCase()} CONFIDENCE` : "HIGH CONFIDENCE"}
                  size="small"
                  variant="outlined"
                  color={scanResult.confidence === "low" ? "warning" : "default"}
                  sx={{ fontSize: "0.65rem", height: 20 }}
                />
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Appliance Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Brand"
                  value={editBrand}
                  onChange={(e) => setEditBrand(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Model"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  <MenuItem value="Air Conditioners">Air Conditioners</MenuItem>
                  <MenuItem value="Refrigerators & Freezers">Refrigerators & Freezers</MenuItem>
                  <MenuItem value="Television Sets">Television Sets</MenuItem>
                  <MenuItem value="Electric Fans">Electric Fans</MenuItem>
                  <MenuItem value="Clothes Washing Machines">Clothes Washing Machines</MenuItem>
                  <MenuItem value="Lighting Products">Lighting Products</MenuItem>
                  <MenuItem value="Kitchen Appliances">Kitchen Appliances</MenuItem>
                  <MenuItem value="Water Heaters & Pumps">Water Heaters & Pumps</MenuItem>
                  <MenuItem value="Computers & Office">Computers & Office</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Room / Zone Location"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
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
                  type="number"
                  fullWidth
                  size="small"
                  label="Rated Electric Power (Watts)"
                  value={editWatts}
                  onChange={(e) => setEditWatts(Number(e.target.value) || 0)}
                  helperText="Actual electric input wattage"
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  type="number"
                  fullWidth
                  size="small"
                  label="Monthly Consumption (kWh)"
                  value={editMonthlyKwh}
                  onChange={(e) => setEditMonthlyKwh(Number(e.target.value) || 0)}
                  helperText="Official DOE test or estimated monthly kWh"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Expandable Direct AI Diagnostic Notes */}
          {scanResult.raw_markdown && (
            <Accordion sx={{ borderRadius: 1.25, "&:before": { display: "none" } }} defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <SmartToyIcon sx={{ fontSize: 18, color: "primary.main" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Gemini AI Engineering Diagnostic Report
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: "background.default",
                    borderRadius: 1,
                    fontFamily: "monospace",
                    fontSize: "0.8125rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {scanResult.raw_markdown}
                </Paper>
              </AccordionDetails>
            </Accordion>
          )}

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mt: 1 }}>
            <Button variant="outlined" onClick={() => setScanResult(null)}>
              Rescan / Reset
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleSaveToInventory}
              disabled={isSaving}
              startIcon={<CheckCircleIcon />}
            >
              Save Scanned Appliance
            </Button>
          </Box>
        </Box>
      )}

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
    </Box>
  );
};

export default AiVisionScannerTabContent;
