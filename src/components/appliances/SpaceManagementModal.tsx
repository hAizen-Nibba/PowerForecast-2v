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

interface SpaceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceToEdit?: ApplianceList | null;
  canDelete?: boolean;
  fallbackSpace?: ApplianceList | null;
  onDeleted?: (spaceId: string) => void;
}

export const SpaceManagementModal: React.FC<SpaceManagementModalProps> = ({
  isOpen,
  onClose,
  spaceToEdit,
  canDelete = false,
  fallbackSpace,
  onDeleted,
}) => {
  const [name, setName] = useState("");
  const [tariffType, setTariffType] = useState<"residential" | "commercial">("residential");
  const [isDeletingLocal, setIsDeletingLocal] = useState(false);

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
    if (!name.trim()) return;

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
          onSuccess: () => onClose(),
        }
      );
    }
  };

  const handleDelete = async () => {
    if (!spaceToEdit) return;
    if (!canDelete) {
      alert("Cannot delete the only remaining space.");
      return;
    }

    const confirmMsg = fallbackSpace
      ? `Are you sure you want to delete the space "${spaceToEdit.name}"?\n\nAll registered appliances in this space will be automatically and safely moved to "${fallbackSpace.name}".`
      : `Are you sure you want to delete the space "${spaceToEdit.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setIsDeletingLocal(true);
    try {
      // 1. Reassign appliances in this space to fallback space (or null)
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

      // 2. Delete the space from appliance_lists
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
          onError: (err: any) => {
            devLog.error("SpaceManagement", `Failed to delete space: ${err?.message}`, err);
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
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: tariffType === "commercial" ? "secondary.main" : "primary.main",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
            >
              {tariffType === "commercial" ? <StoreIcon fontSize="small" /> : <HomeIcon fontSize="small" />}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {spaceToEdit ? "Edit Space / List" : "Add New Space / List"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField
            required
            fullWidth
            size="small"
            label="Space Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Master Bedroom, Bakery Shop"
          />

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
              TARIFF CLASSIFICATION
            </Typography>
            <Grid container spacing={1.5}>
              <Grid size={6}>
                <Paper
                  variant="outlined"
                  onClick={() => setTariffType("residential")}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.25,
                    cursor: "pointer",
                    textAlign: "center",
                    border: "2px solid",
                    borderColor: tariffType === "residential" ? "primary.main" : "divider",
                    bgcolor: tariffType === "residential" ? "rgba(0, 229, 201, 0.08)" : "transparent",
                    transition: "all 0.15s ease",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                >
                  <HomeIcon sx={{ color: tariffType === "residential" ? "primary.main" : "text.secondary", mb: 0.5 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tariffType === "residential" ? "primary.main" : "text.primary" }}>
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
                    borderRadius: 1.25,
                    cursor: "pointer",
                    textAlign: "center",
                    border: "2px solid",
                    borderColor: tariffType === "commercial" ? "secondary.main" : "divider",
                    bgcolor: tariffType === "commercial" ? "rgba(244, 63, 94, 0.08)" : "transparent",
                    transition: "all 0.15s ease",
                    "&:hover": { borderColor: "secondary.main" },
                  }}
                >
                  <StoreIcon sx={{ color: tariffType === "commercial" ? "secondary.main" : "text.secondary", mb: 0.5 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tariffType === "commercial" ? "secondary.main" : "text.primary" }}>
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
              borderRadius: 2,
              bgcolor: "action.hover",
            }}
          >
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {tariffType === "residential"
                ? "Residential rates include stepped distribution tiers (0–200, 201–300, 301–400, 401+ kWh) and Lifeline subsidies."
                : "Commercial rates use General Power unbundled distribution and fixed commercial metering charges."}
            </Typography>
          </Paper>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5, px: 3, display: "flex", justifyContent: "space-between" }}>
          {spaceToEdit ? (
            canDelete ? (
              <Button
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                disabled={isDeletingLocal}
                sx={{ fontWeight: 700 }}
              >
                {isDeletingLocal ? "Deleting..." : "Delete Space"}
              </Button>
            ) : (
              <Tooltip title="Cannot delete the only remaining space">
                <span>
                  <Button color="error" size="small" startIcon={<DeleteIcon />} disabled sx={{ fontWeight: 700 }}>
                    Delete Space
                  </Button>
                </span>
              </Tooltip>
            )
          ) : (
            <Box />
          )}

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" onClick={onClose} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="small"
              disabled={isCreating || isUpdating || isDeletingLocal}
              startIcon={<SaveIcon />}
              sx={{ fontWeight: 700 }}
            >
              {spaceToEdit ? "Save Changes" : "Create Space"}
            </Button>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
};
