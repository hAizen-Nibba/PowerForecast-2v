import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import {
  CameraAlt as CameraIcon,
  CloudUpload as UploadIcon,
  AutoAwesome as SparklesIcon,
  CheckCircle as CheckCircleIcon,
  Key as KeyIcon,
  Delete as TrashIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { analyzeMultipleApplianceImages, ImageItem } from "../../lib/visionService";
import { VisionScanResult } from "../../types";
import { useCreate } from "@refinedev/core";
import { getDefaultStartHour } from "../../lib/loadCurveService";
import { devLog } from "../../lib/devLogger";

interface AiVisionScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiVisionScannerModal: React.FC<AiVisionScannerModalProps> = ({
  isOpen,
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

  const { mutate: createAppliance, isLoading: isSaving } = useCreate();

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
    createAppliance(
      {
        resource: "user_appliances",
        values: {
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
        },
      },
      {
        onSuccess: () => {
          devLog.info("AI Scanner", `Saved scanned appliance "${editName}" to inventory.`);
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}>
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
            <CameraIcon sx={{ color: "#ffd54f" }} />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Google Gemini AI Energy Auditor
              </Typography>
              <Chip
                icon={<SmartToyIcon sx={{ fontSize: "14px !important", color: "#6366f1" }} />}
                label="100% Genuine AI"
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  bgcolor: "rgba(99, 102, 241, 0.12)",
                  color: "primary.light",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Upload appliance rating plates or DOE energy labels for multimodal vision extraction
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Error Alert Display */}
        {scanError && (
          <Alert severity="error" onClose={() => setScanError(null)} sx={{ borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              AI Vision Analysis Unsuccessful
            </Typography>
            <Typography variant="body2" sx={{ fontSize: "0.8125rem", mt: 0.5 }}>
              {scanError}
            </Typography>
          </Alert>
        )}

        {/* Preset Selector & API Key Toggle */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            {[
              { id: "energy_guide", label: "DOE Yellow Energy Guide" },
              { id: "nameplate", label: "Specification Nameplate" },
            ].map((p) => (
              <Chip
                key={p.id}
                label={p.label}
                clickable
                onClick={() => setPreset(p.id as any)}
                color={preset === p.id ? "primary" : "default"}
                variant={preset === p.id ? "filled" : "outlined"}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>

          <Button
            size="small"
            variant="text"
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            startIcon={<KeyIcon />}
            sx={{ fontSize: "0.75rem" }}
          >
            {apiKey ? "Custom Key Configured" : "Enter API Key"}
          </Button>
        </Box>

        {showApiKeyInput && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
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
            p: 4,
            borderRadius: 3,
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
          <UploadIcon sx={{ fontSize: 44, color: "primary.main", mb: 1 }} />
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
                      borderRadius: 2,
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
                      sx={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 1.5 }}
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

        {/* Scan Action Progress */}
        {isScanning && (
          <Box sx={{ py: 2 }}>
            <LinearProgress />
            <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 600, display: "block", textAlign: "center", mt: 1 }}>
              ⚡ Google Gemini Multimodal AI is inspecting photos, recognizing circuits, and verifying specs...
            </Typography>
          </Box>
        )}

        {/* Parsed Result & Editable Form */}
        {scanResult && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: "action.hover" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "success.main", display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <CheckCircleIcon fontSize="small" />
                Gemini AI Specs Extracted
              </Typography>

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
                <Grid size={6}>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    label="Power Draw (Watts)"
                    value={editWatts}
                    onChange={(e) => setEditWatts(Number(e.target.value) || 0)}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    label="Monthly kWh"
                    value={editMonthlyKwh}
                    onChange={(e) => setEditMonthlyKwh(Number(e.target.value) || 0)}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Expandable Direct AI Diagnostic Notes */}
            {scanResult.raw_markdown && (
              <Accordion sx={{ borderRadius: 2, "&:before": { display: "none" } }} defaultExpanded={false}>
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
                      borderRadius: 1.5,
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
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, px: 3 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        {scanResult ? (
          <Button
            variant="contained"
            color="success"
            onClick={handleSaveToInventory}
            disabled={isSaving}
            startIcon={<CheckCircleIcon />}
          >
            Save Scanned Appliance
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleScan}
            disabled={isScanning || stagedImages.length === 0}
            startIcon={<SparklesIcon />}
          >
            {isScanning ? "Scanning..." : `Scan ${stagedImages.length} Image(s)`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AiVisionScannerModal;
