import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import {
  DeleteOutlined as DeleteIcon,
  Add as AddIcon,
  Bolt as BoltIcon,
  AccessTime as ClockIcon,
} from "@mui/icons-material";
import { Modal } from "../common/Modal";
import { UserAppliance, UserCalendarEvent } from "../../types";

interface ScheduleQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  appliance: UserAppliance | null;
  events: UserCalendarEvent[];
  onCreateEvent: (event: Partial<UserCalendarEvent>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onBulkDeleteEvents: (ids: string[]) => Promise<void>;
}

export const ScheduleQueueModal: React.FC<ScheduleQueueModalProps> = ({
  isOpen,
  onClose,
  appliance,
  events,
  onCreateEvent,
  onDeleteEvent,
  onBulkDeleteEvents,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [day, setDay] = useState<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">("mon");
  const [hour, setHour] = useState<number>(8);
  const [duration, setDuration] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!appliance) return null;

  const applianceEvents = events.filter((e) => e.appliance_id === appliance.id);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(applianceEvents.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await onBulkDeleteEvents(selectedIds);
      setSelectedIds([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateEvent({
        appliance_id: appliance.id,
        title: appliance.name,
        category: "appliance",
        day,
        hour,
        duration_hours: duration,
        is_recurring: true,
      });
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const DAYS = [
    { key: "mon", label: "Monday" },
    { key: "tue", label: "Tuesday" },
    { key: "wed", label: "Wednesday" },
    { key: "thu", label: "Thursday" },
    { key: "fri", label: "Friday" },
    { key: "sat", label: "Saturday" },
    { key: "sun", label: "Sunday" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${appliance.name} — Schedule Queue`}
      maxWidth="md"
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Subheader info */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              icon={<BoltIcon sx={{ fontSize: "14px !important", color: "#ffd54f !important" }} />}
              label={`${appliance.watts * (appliance.quantity || 1)} W`}
              size="small"
              sx={{ fontWeight: 700 }}
            />
            <Chip label={appliance.category} size="small" variant="outlined" />
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setShowAddForm((prev) => !prev)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {showAddForm ? "Cancel" : "Add Time Slot"}
          </Button>
        </Box>

        {/* Add Slot Form */}
        {showAddForm && (
          <Paper
            component="form"
            onSubmit={handleAddSlot}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: "rgba(108, 122, 224, 0.08)",
              border: "1px solid rgba(108, 122, 224, 0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
              Add Scheduled Operating Window
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Day</InputLabel>
                <Select
                  value={day}
                  label="Day"
                  onChange={(e) => setDay(e.target.value as any)}
                >
                  {DAYS.map((d) => (
                    <MenuItem key={d.key} value={d.key}>{d.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>Start Hour</InputLabel>
                <Select
                  value={hour}
                  label="Start Hour"
                  onChange={(e) => setHour(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const period = h >= 12 ? "PM" : "AM";
                    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return (
                      <MenuItem key={h} value={h}>
                        {displayH}:00 {period}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <TextField
                size="small"
                type="number"
                label="Duration (Hours)"
                value={duration}
                onChange={(e) => setDuration(Math.max(0.5, Math.min(24, parseFloat(e.target.value) || 1)))}
                slotProps={{
                  htmlInput: { step: 0.5, min: 0.5, max: 24 }
                }}
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button size="small" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button type="submit" variant="contained" size="small" disabled={isSubmitting}>
                Save Slot
              </Button>
            </Box>
          </Paper>
        )}

        {/* Selection Bar */}
        {applianceEvents.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Checkbox
                checked={selectedIds.length === applianceEvents.length && applianceEvents.length > 0}
                indeterminate={selectedIds.length > 0 && selectedIds.length < applianceEvents.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                size="small"
              />
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Select All ({selectedIds.length} of {applianceEvents.length})
              </Typography>
            </Box>

            {selectedIds.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleBulkDelete}
                disabled={isSubmitting}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Delete Selected ({selectedIds.length})
              </Button>
            )}
          </Box>
        )}

        {/* Queue List */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 340, overflowY: "auto", pr: 0.5 }}>
          {applianceEvents.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
              <ClockIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                No active scheduled slots for this appliance.
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Click "Add Time Slot" above to set up automated recurring usage windows.
              </Typography>
            </Box>
          ) : (
            applianceEvents.map((event) => {
              const dayLabel = DAYS.find((d) => d.key === event.day)?.label || event.day;
              const period = event.hour >= 12 ? "PM" : "AM";
              const displayH = event.hour === 0 ? 12 : event.hour > 12 ? event.hour - 12 : event.hour;
              const isPeak = (event.hour >= 11 && event.hour < 16) || (event.hour >= 18 && event.hour < 21);

              return (
                <Paper
                  key={event.id}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: "1px solid",
                    borderColor: selectedIds.includes(event.id) ? "primary.main" : "divider",
                    bgcolor: selectedIds.includes(event.id) ? "rgba(108, 122, 224, 0.1)" : "background.paper",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Checkbox
                      checked={selectedIds.includes(event.id)}
                      onChange={() => handleToggleSelect(event.id)}
                      size="small"
                    />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                        {dayLabel} • {displayH}:00 {period} ({event.duration_hours}h)
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Recurring weekly routine
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDeleteEvent(event.id)}
                      disabled={isSubmitting}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
