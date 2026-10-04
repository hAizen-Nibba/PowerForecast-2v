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
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import {
  Home as HomeIcon,
  Store as StoreIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { ApplianceList } from "../../types";
import { useCreate, useUpdate, useDelete } from "@refinedev/core";
import { supabaseClient } from "../../lib/supabaseClient";
import { devLog } from "../../lib/devLogger";
import { useConfirm } from "../common/ConfirmProvider";
import { useRoom } from "../../context/RoomContext";
import { tokens } from "../../theme/tokens";

interface SpaceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceToEdit?: ApplianceList | null;
  canDelete?: boolean;
  fallbackSpace?: ApplianceList | null;
  onDeleted?: (spaceId: string) => void;
  onCreated?: (newSpace: ApplianceList) => void;
}

export const SpaceManagementModal: React.FC<SpaceManagementModalProps> = ({
  isOpen,
  onClose,
  spaceToEdit,
  canDelete = false,
  fallbackSpace,
  onDeleted,
  onCreated,
}) => {
  const { canEdit } = useRoom();
  const [name, setName] = useState("");
  const [tariffType, setTariffType] = useState<"residential" | "commercial">("residential");
  const [isDeletingLocal, setIsDeletingLocal] = useState(false);

  const { confirm } = useConfirm();
  const { mutate: createSpace, isLoading: isCreating } = useCreate();
  const { mutate: updateSpace, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteSpace } = useDelete();

  useEffect(() => {
    if (spaceToEdit) {
      setName(spaceToEdit.name || "");
      setTariffType(spaceToEdit.tariff_type || "residential");
    } else {
      setName("");
      setTariffType("residential");
    }
  }, [spaceToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !name.trim()) return;

    if (spaceToEdit) {
      updateSpace(
        {
          resource: "appliance_lists",
          id: spaceToEdit.id,
          values: {
            name: name.trim(),
            tariff_type: tariffType,
          },
        },
        {
          onSuccess: () => onClose(),
        }
      );
    } else {
      createSpace(
        {
          resource: "appliance_lists",
          values: {
            name: name.trim(),
            tariff_type: tariffType,
            is_default: false,
          },
        },
        {
          onSuccess: (data: any) => {
            const created = data?.data;
            if (created && onCreated) {
              onCreated(created);
            }
            onClose();
          },
        }
      );
    }
  };

  const handleDelete = async () => {
    if (!canEdit || !spaceToEdit) return;
    if (!canDelete) {
      await confirm({
        title: "Action Restricted",
        message: "Cannot delete the only remaining space in your account. Please create another space first before removing this one.",
        confirmText: "Understood",
        cancelText: "Close",
        severity: "warning",
      });
      return;
    }

    const ok = await confirm({
      title: "Delete Space / List?",
      message: `Are you sure you want to permanently delete the space "${spaceToEdit.name}"?`,
      detail: fallbackSpace
        ? `Zero data loss: all registered appliances in "${spaceToEdit.name}" will be automatically moved to "${fallbackSpace.name}".`
        : "All registered appliances in this space will be retained in your unassigned appliance pool.",
      itemName: `${spaceToEdit.name} • ${spaceToEdit.tariff_type === "commercial" ? "Commercial Tariff" : "Residential Tariff"}`,
      confirmText: "Yes, Delete Space",
      cancelText: "Cancel",
      severity: "error",
    });

    if (!ok) return;

    setIsDeletingLocal(true);
    try {
      if (fallbackSpace) {
        const { error: moveErr } = await supabaseClient
          .from("user_appliances")
          .update({ list_id: fallbackSpace.id })
          .eq("list_id", spaceToEdit.id);

        if (moveErr) {
          devLog.warn("SpaceManagement", `Error moving appliances to fallback space: ${moveErr.message}`);
        } else {
          devLog.info("SpaceManagement", `Reassigned appliances from deleted space to ${fallbackSpace.name}`);
        }
      } else {
        await supabaseClient
          .from("user_appliances")
          .update({ list_id: null })
          .eq("list_id", spaceToEdit.id);
      }

      deleteSpace(
        {
          resource: "appliance_lists",
          id: spaceToEdit.id,
        },
        {
          onSuccess: () => {
            if (onDeleted) onDeleted(spaceToEdit.id);
            onClose();
          },
        }
      );
    } catch (err: any) {
      devLog.error("SpaceManagement", `Exception deleting space: ${err?.message}`, err);
    } finally {
      setIsDeletingLocal(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2.5, py: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
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
              }}
            >
              {tariffType === "commercial" ? <StoreIcon fontSize="small" /> : <HomeIcon fontSize="small" />}
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {spaceToEdit ? "Configure Space" : "Add New Space"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider
          sx={{
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
          }}
        />

        <DialogContent sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            required
            fullWidth
            size="small"
            label="Space Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Master Bedroom, Bakery Shop"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
              },
            }}
          />

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 1 }}>
              Tariff Classification
            </Typography>
            <Grid container spacing={1.5}>
              <Grid size={6}>
                <Paper
                  variant="outlined"
                  onClick={() => setTariffType("residential")}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    textAlign: "center",
                    border: "1px solid",
                    borderColor: (theme) => {
                      const isDark = theme.palette.mode === "dark";
                      return tariffType === "residential"
                        ? isDark ? tokens.dark.primary : tokens.light.primary
                        : isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
                    },
                    bgcolor: (theme) => {
                      const isDark = theme.palette.mode === "dark";
                      return tariffType === "residential"
                        ? isDark ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle
                        : "transparent";
                    },
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <HomeIcon sx={{ fontSize: 22, mb: 0.5, color: "text.primary" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Residential
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                    230V Stepped Tiers
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={6}>
                <Paper
                  variant="outlined"
                  onClick={() => setTariffType("commercial")}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    textAlign: "center",
                    border: "1px solid",
                    borderColor: (theme) => {
                      const isDark = theme.palette.mode === "dark";
                      return tariffType === "commercial"
                        ? isDark ? tokens.dark.primary : tokens.light.primary
                        : isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
                    },
                    bgcolor: (theme) => {
                      const isDark = theme.palette.mode === "dark";
                      return tariffType === "commercial"
                        ? isDark ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle
                        : "transparent";
                    },
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <StoreIcon sx={{ fontSize: 22, mb: 0.5, color: "text.primary" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Commercial
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                    General Power
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            }}
          >
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
              {tariffType === "residential"
                ? "Residential rates include stepped distribution tiers (0–200, 201–300, 301–400, 401+ kWh) and Lifeline subsidies."
                : "Commercial rates use General Power unbundled distribution and fixed commercial metering charges."}
            </Typography>
          </Paper>
        </DialogContent>

        <Divider
          sx={{
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
          }}
        />

        <DialogActions sx={{ p: 2, px: 2.5, display: "flex", justifyContent: "space-between" }}>
          {spaceToEdit ? (
            canDelete ? (
              <Button
                color="error"
                size="small"
                startIcon={<DeleteIcon fontSize="small" />}
                onClick={handleDelete}
                disabled={isDeletingLocal || !canEdit}
                sx={{ fontWeight: 600, textTransform: "none" }}
              >
                {isDeletingLocal ? "Deleting..." : "Delete Space"}
              </Button>
            ) : (
              <Tooltip title="Cannot delete the only remaining space">
                <span>
                  <Button color="error" size="small" startIcon={<DeleteIcon fontSize="small" />} disabled sx={{ fontWeight: 600, textTransform: "none" }}>
                    Delete Space
                  </Button>
                </span>
              </Tooltip>
            )
          ) : (
            <Box />
          )}

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={onClose}
              sx={{
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 1,
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="small"
              disabled={isCreating || isUpdating || isDeletingLocal || !canEdit}
              startIcon={<SaveIcon fontSize="small" />}
              sx={{
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 1,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg,
              }}
            >
              {spaceToEdit ? "Save Changes" : "Create Space"}
            </Button>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
};
