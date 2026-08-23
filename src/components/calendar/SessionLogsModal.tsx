import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import {
  Search as SearchIcon,
  ReceiptLong as ReceiptIcon,
  DeleteOutlined as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { Modal } from "../common/Modal";
import { ApplianceUsageLog, UserAppliance } from "../../types";

interface SessionLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ApplianceUsageLog[];
  appliances: UserAppliance[];
  onViewReceipt: (log: ApplianceUsageLog, appliance?: UserAppliance) => void;
  onDeleteLog: (id: string) => Promise<void>;
  onClearAllLogs: () => Promise<void>;
}

export const SessionLogsModal: React.FC<SessionLogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  appliances,
  onViewReceipt,
  onDeleteLog,
  onClearAllLogs,
}) => {
  const [filterText, setFilterText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const getAppliance = (appId: string) => appliances.find((a) => a.id === appId);

  const filteredLogs = logs.filter((log) => {
    const app = getAppliance(log.appliance_id);
    const searchTarget = `${app?.name || ""} ${log.notes || ""} ${log.source || ""}`.toLowerCase();
    return searchTarget.includes(filterText.toLowerCase());
  });

  const totalCost = filteredLogs.reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);
  const totalKwh = filteredLogs.reduce((acc, curr) => acc + (curr.kwh_consumed || 0), 0);

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all historical session logs?")) return;
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
            borderRadius: 3,
            bgcolor: "rgba(108, 122, 224, 0.08)",
            border: "1px solid rgba(108, 122, 224, 0.25)",
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
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#34d399" }}>
                ₱{totalCost.toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>Total Energy Tracked</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#fbbf24" }}>
                {totalKwh.toFixed(3)} kWh
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>Total Sessions</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "text.primary" }}>
                {logs.length} Recorded
              </Typography>
            </Box>
          </Box>

          {logs.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={handleClearAll}
              disabled={isDeleting}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Clear All Logs
            </Button>
          )}
        </Paper>

        {/* Search Filter */}
        <TextField
          size="small"
          placeholder="Search logs by appliance name or keyword..."
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

        {/* Logs Feed Container */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 380, overflowY: "auto", pr: 0.5 }}>
          {filteredLogs.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
              <HistoryIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {filterText ? "No matching session logs found." : "No historical session logs recorded yet."}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                When appliances finish running or are powered OFF, audited energy consumption receipts are recorded here automatically.
              </Typography>
            </Box>
          ) : (
            filteredLogs.map((log) => {
              const app = getAppliance(log.appliance_id);
              const startDt = log.started_at ? new Date(log.started_at) : new Date();
              const dateStr = startDt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              const timeStr = startDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

              let durText = "";
              const mins = log.duration_minutes || 0;
              if (mins >= 60) {
                const h = Math.floor(mins / 60);
                const m = Math.round(mins % 60);
                durText = m > 0 ? `${h}h ${m}m` : `${h}h`;
              } else {
                durText = `${Math.round(mins)} mins`;
              }

              return (
                <Paper
                  key={log.id}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
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
                        borderRadius: 2,
                        bgcolor: "rgba(108, 122, 224, 0.15)",
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
                        variant="contained"
                        startIcon={<ReceiptIcon />}
                        onClick={() => onViewReceipt(log, app)}
                        sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: "0.75rem", py: 0.5 }}
                      >
                        Receipt
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDeleteLog(log.id)}
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
          <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2.5, fontWeight: 700 }}>
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};
