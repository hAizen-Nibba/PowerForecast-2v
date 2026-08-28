import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Grid from "@mui/material/Grid";
import {
  Search as SearchIcon,
  ReceiptLong as ReceiptIcon,
  DeleteOutlined as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { Modal } from "../common/Modal";
import { ApplianceUsageLog, UserAppliance } from "../../types";
import { useConfirm } from "../common/ConfirmProvider";

interface SessionLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ApplianceUsageLog[];
  appliances: UserAppliance[];
  onViewReceipt: (log: ApplianceUsageLog, appliance?: UserAppliance) => void;
  onDeleteLog: (id: string) => Promise<void>;
  onClearAllLogs: () => Promise<void>;
  onUpdateLog?: (id: string, newDurationMinutes: number) => Promise<void>;
}

export const SessionLogsModal: React.FC<SessionLogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  appliances,
  onViewReceipt,
  onDeleteLog,
  onClearAllLogs,
  onUpdateLog,
}) => {
  const { confirm } = useConfirm();
  const [filterText, setFilterText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingLog, setEditingLog] = useState<ApplianceUsageLog | null>(null);
  const [editHours, setEditHours] = useState(0);
  const [editMinutes, setEditMinutes] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const getAppliance = (appId: string) => appliances.find((a) => a.id === appId);

  const handleStartEdit = (log: ApplianceUsageLog) => {
    setEditingLog(log);
    const totalMins = log.duration_minutes || 60;
    setEditHours(Math.floor(totalMins / 60));
    setEditMinutes(Math.round(totalMins % 60));
  };

  const handleSaveEdit = async () => {
    if (!editingLog || !onUpdateLog) return;
    const newTotalMinutes = editHours * 60 + editMinutes;
    if (newTotalMinutes <= 0) return;

    setIsUpdating(true);
    try {
      await onUpdateLog(editingLog.id, newTotalMinutes);
      setEditingLog(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const app = getAppliance(log.appliance_id);
    const searchTarget = `${app?.name || ""} ${log.notes || ""} ${log.source || ""}`.toLowerCase();
    return searchTarget.includes(filterText.toLowerCase());
  });

  const totalCost = filteredLogs.reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);
  const totalKwh = filteredLogs.reduce((acc, curr) => acc + (curr.kwh_consumed || 0), 0);
  const totalMinutes = filteredLogs.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
  const totalHours = totalMinutes / 60;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title: "Clear All Historical Session Logs?",
      message: `Are you sure you want to permanently delete all ${logs.length} historical stopwatch session log(s)?`,
      detail: "This will remove all session receipt records. Your calendar daily usage totals will remain intact.",
      itemName: `${logs.length} Session Logs • Total ₱${totalCost.toFixed(2)}`,
      confirmText: "Yes, Clear All Logs",
      cancelText: "Cancel",
      severity: "error",
    });

    if (!ok) return;

    setIsDeleting(true);
    try {
      await onClearAllLogs();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Historical Appliance Session Logs & Audited Receipts"
      maxWidth="md"
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Top Summary Banner & Bulk Actions */}
        <Paper
          sx={{
            p: 2.5,
            borderRadius: 1.25,
            bgcolor: "rgba(0, 229, 201, 0.08)",
            border: "1px solid rgba(0, 229, 201, 0.25)",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", gap: 3 }}>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>Total Incurred Cost</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "#00e5c9", fontFamily: "monospace" }}>
                ₱{totalCost.toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>Total Metered Energy</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "#ffd54f", fontFamily: "monospace" }}>
                {totalKwh.toFixed(3)} <Typography component="span" variant="caption">kWh</Typography>
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>Total Hours Metered</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "text.primary", fontFamily: "monospace" }}>
                {totalHours.toFixed(1)} <Typography component="span" variant="caption">hrs</Typography>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {logs.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteSweepIcon />}
                onClick={handleClearAll}
                disabled={isDeleting}
                sx={{ borderRadius: 1, fontWeight: 700 }}
              >
                Clear All Logs
              </Button>
            )}
          </Box>
        </Paper>

        {/* Search & Filter bar */}
        <TextField
          placeholder="Filter logs by appliance name or space..."
          size="small"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
          fullWidth
        />

        {/* Logs List */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, maxHeight: 420, overflowY: "auto", pr: 0.5 }}>
          {filteredLogs.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 1.25 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {filterText ? "No matching session logs found." : "No historical session logs recorded yet."}
              </Typography>
            </Paper>
          ) : (
            filteredLogs.map((log) => {
              const app = getAppliance(log.appliance_id);
              const durText = formatDuration(log.duration_minutes || 0);
              const dateStr = new Date(log.started_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const timeStr = new Date(log.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              return (
                <Paper
                  key={log.id}
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: "rgba(0, 229, 201, 0.12)",
                        color: "primary.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ReceiptIcon fontSize="small" />
                    </Box>
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                          {app?.name || "Archived Appliance"}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {dateStr} • {timeStr} • <strong>{durText}</strong>
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: { xs: "100%", sm: "auto" }, gap: 2 }}>
                    <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#34d399" }}>
                        ₱{(log.estimated_cost || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#fbbf24", fontWeight: 700 }}>
                        {(log.kwh_consumed || 0).toFixed(3)} kWh
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => handleStartEdit(log)}
                        sx={{ borderRadius: 1, fontWeight: 700, fontSize: "0.75rem", py: 0.5 }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<ReceiptIcon />}
                        onClick={() => onViewReceipt(log, app)}
                        sx={{ borderRadius: 1, fontWeight: 700, fontSize: "0.75rem", py: 0.5 }}
                      >
                        Receipt
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Delete Session Receipt?",
                            message: `Are you sure you want to delete this session log for "${app?.name || "Appliance"}"?`,
                            detail: `Duration: ${durText} • ${(log.kwh_consumed || 0).toFixed(3)} kWh (₱${(log.estimated_cost || 0).toFixed(2)})`,
                            itemName: `${app?.name || "Session"} • ${dateStr}`,
                            confirmText: "Yes, Delete Log",
                            cancelText: "Cancel",
                            severity: "error",
                          });
                          if (ok) {
                            onDeleteLog(log.id);
                          }
                        }}
                        disabled={isDeleting}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              );
            })
          )}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 1, fontWeight: 700 }}>
            Close
          </Button>
        </Box>
      </Box>

      {/* Edit Session Log Duration Dialog */}
      {editingLog && (
        <Dialog
          open={Boolean(editingLog)}
          onClose={() => setEditingLog(null)}
          maxWidth="xs"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 1.5, p: 1 } } }}
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800 }}>
            <EditIcon sx={{ color: "primary.main" }} />
            Edit Session Duration
          </DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Appliance: <strong>{getAppliance(editingLog.appliance_id)?.name || "Appliance"}</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Logged on {new Date(editingLog.started_at).toLocaleString()}
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Hours"
                  type="number"
                  size="small"
                  value={editHours}
                  onChange={(e) => setEditHours(Math.max(0, parseInt(e.target.value) || 0))}
                  slotProps={{ htmlInput: { min: 0, max: 120 } }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Minutes"
                  type="number"
                  size="small"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  slotProps={{ htmlInput: { min: 0, max: 59 } }}
                  fullWidth
                />
              </Grid>
            </Grid>

            {(() => {
              const app = getAppliance(editingLog.appliance_id);
              const watts = (app?.watts || 1000) * (app?.quantity || 1);
              const totalH = editHours + editMinutes / 60;
              const kwh = (watts * totalH) / 1000;
              const cost = kwh * 14.8261;
              return (
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, bgcolor: "rgba(0,0,0,0.2)" }}>
                  <Typography variant="caption" sx={{ display: "block", color: "#ffd54f", fontWeight: 800 }}>
                    Preview: {totalH.toFixed(2)} hrs • {kwh.toFixed(3)} kWh • ₱{cost.toFixed(2)}
                  </Typography>
                </Paper>
              );
            })()}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditingLog(null)} color="inherit" sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveEdit}
              disabled={isUpdating || (editHours === 0 && editMinutes === 0)}
              startIcon={<CheckCircleIcon />}
              sx={{ fontWeight: 800, borderRadius: 1 }}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Modal>
  );
};
