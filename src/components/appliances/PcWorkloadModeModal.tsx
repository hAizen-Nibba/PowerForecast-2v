import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import {
  Close as CloseIcon,
  Laptop as LaptopIcon,
  DesktopWindows as DesktopIcon,
  Bolt as BoltIcon,
  VideogameAsset as GamingIcon,
  WorkOutlined as WorkIcon,
  Spa as LightIcon,
} from "@mui/icons-material";
import { UserAppliance } from "../../types";
import {
  getApplianceWorkloadPresets,
  PcWorkloadProfile,
  WorkloadOptionPreset,
} from "../../lib/pcHardwareService";

interface PcWorkloadModeModalProps {
  open: boolean;
  onClose: () => void;
  appliance: UserAppliance | null;
  onSelectMode: (mode: PcWorkloadProfile, watts: number) => void;
}

export const PcWorkloadModeModal: React.FC<PcWorkloadModeModalProps> = ({
  open,
  onClose,
  appliance,
  onSelectMode,
}) => {
  if (!appliance) return null;

  const presets = getApplianceWorkloadPresets(appliance);
  const isLaptop =
    appliance.ai_metadata?.device_type === "laptop" ||
    /laptop|notebook|macbook/i.test(`${appliance.name} ${appliance.model || ""}`);

  const getModeIcon = (id: PcWorkloadProfile) => {
    switch (id) {
      case "light":
        return <LightIcon sx={{ color: "#34d399", fontSize: 28 }} />;
      case "heavy":
        return <GamingIcon sx={{ color: "#f87171", fontSize: 28 }} />;
      case "standard":
      default:
        return <WorkIcon sx={{ color: "#60a5fa", fontSize: 28 }} />;
    }
  };

  const getBadgeColor = (id: PcWorkloadProfile) => {
    switch (id) {
      case "light":
        return "success";
      case "heavy":
        return "error";
      case "standard":
      default:
        return "primary";
    }
  };

  const handleCardClick = (preset: WorkloadOptionPreset) => {
    onSelectMode(preset.id, preset.watts);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            p: 1,
            backgroundImage: "none",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(18, 24, 38, 0.95)" : "background.paper",
            backdropFilter: "blur(12px)",
            border: (theme) =>
              `1px solid ${
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
              }`,
            boxShadow: 24,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(96, 165, 250, 0.15)" : "rgba(37, 99, 235, 0.1)",
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isLaptop ? <LaptopIcon fontSize="small" /> : <DesktopIcon fontSize="small" />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>
              {appliance.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Select session workload to start stopwatch
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 1.5 }}>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 2,
            color: "text.secondary",
            fontWeight: 500,
          }}
        >
          Computers dynamically adjust power based on task load. Tap a mode to start tracking with calibrated real-world telemetry:
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {presets.map((preset) => (
            <Paper
              key={preset.id}
              onClick={() => handleCardClick(preset)}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                borderWidth: preset.id === "standard" ? 2 : 1,
                borderColor: (theme) =>
                  preset.id === "standard"
                    ? "primary.main"
                    : theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                bgcolor: (theme) =>
                  preset.id === "standard"
                    ? theme.palette.mode === "dark"
                      ? "rgba(37, 99, 235, 0.08)"
                      : "rgba(37, 99, 235, 0.03)"
                    : "transparent",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: (theme) =>
                    theme.palette.mode === "dark"
                      ? "0 6px 20px rgba(0, 0, 0, 0.4)"
                      : "0 6px 16px rgba(0, 0, 0, 0.08)",
                  borderColor: "primary.main",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.02)",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {getModeIcon(preset.id)}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {preset.label}
                    </Typography>
                    {preset.id === "standard" && (
                      <Chip
                        label="Standard"
                        size="small"
                        color="primary"
                        sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700 }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    {preset.sublabel}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Chip
                  icon={<BoltIcon sx={{ fontSize: "14px !important" }} />}
                  label={`~${preset.watts}W`}
                  color={getBadgeColor(preset.id) as any}
                  variant="outlined"
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: 800,
                    fontSize: "0.75rem",
                  }}
                />
              </Box>
            </Paper>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, justifyContent: "space-between" }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
          Peak PSU: {appliance.watts}W
        </Typography>
        <Button size="small" onClick={onClose} sx={{ textTransform: "none", color: "text.secondary" }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
