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
import { tokens } from "../../theme/tokens";

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
        return <LightIcon sx={{ color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live), fontSize: 24 }} />;
      case "heavy":
        return <GamingIcon sx={{ color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.error : tokens.light.error), fontSize: 24 }} />;
      case "standard":
      default:
        return <WorkIcon sx={{ color: "text.primary", fontSize: 24 }} />;
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
            borderRadius: 1,
            backgroundImage: "none",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            boxShadow: "none",
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1.5, pt: 2, px: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
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
            {isLaptop ? <LaptopIcon fontSize="small" /> : <DesktopIcon fontSize="small" />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
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
            lineHeight: 1.5,
          }}
        >
          Computers dynamically adjust power based on task load. Tap a mode to start tracking with calibrated real-world telemetry:
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {presets.map((preset) => (
            <Paper
              key={preset.id}
              onClick={() => handleCardClick(preset)}
              variant="outlined"
              sx={{
                p: 1.75,
                borderRadius: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                transition: "border-color 0.15s ease, background-color 0.15s ease",
                border: "1px solid",
                borderColor: (theme) =>
                  preset.id === "standard"
                    ? theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary
                    : theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                bgcolor: (theme) =>
                  preset.id === "standard"
                    ? theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle
                    : "transparent",
                "&:hover": {
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {getModeIcon(preset.id)}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {preset.label}
                    </Typography>
                    {preset.id === "standard" && (
                      <Chip
                        label="Standard"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.625rem",
                          fontWeight: 600,
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
                          border: "1px solid",
                          borderColor: (theme) =>
                            theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                        }}
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
                  icon={<BoltIcon sx={{ fontSize: "13px !important" }} />}
                  label={`~${preset.watts}W`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  }}
                />
              </Box>
            </Paper>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, justifyContent: "space-between" }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Peak PSU: {appliance.watts}W
        </Typography>
        <Button
          size="small"
          onClick={onClose}
          sx={{
            textTransform: "none",
            color: "text.secondary",
            fontWeight: 500,
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
