import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import {
  DeleteOutlined as DeleteIcon,
  EditOutlined as EditIcon,
  Add as AddIcon,
  Bolt as BoltIcon,
  AccessTime as ClockIcon,
  Check as CheckIcon,
  Close as CancelIcon,
} from "@mui/icons-material";
import { Modal } from "../common/Modal";
import { UserAppliance, UserCalendarEvent } from "../../types";

interface ScheduleQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  appliance: UserAppliance | null;
  events: UserCalendarEvent[];
  onCreateEvent: (event: Partial<UserCalendarEvent>) => Promise<void>;
  onUpdateEvent?: (id: string, updates: Partial<UserCalendarEvent>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onBulkDeleteEvents: (ids: string[]) => Promise<void>;
}

export const ScheduleQueueModal: React.FC<ScheduleQueueModalProps> = ({
  isOpen,
  onClose,
  appliance,
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onBulkDeleteEvents,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [day, setDay] = useState<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">("mon");
  const [hour, setHour] = useState<number>(8);
  const [duration, setDuration] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline editing state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editDay, setEditDay] = useState<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">("mon");
  const [editHour, setEditHour] = useState<number>(8);
  const [editDuration, setEditDuration] = useState<number>(1);

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

  const handleStartEdit = (event: UserCalendarEvent) => {
    setEditingEventId(event.id);
    setEditDay((event.day as any) || "mon");
    setEditHour(event.hour || 8);
    setEditDuration(event.duration_hours || 1);
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
  };

  const handleSaveEdit = async (eventId: string) => {
    if (!onUpdateEvent) return;
    setIsSubmitting(true);
    try {
      await onUpdateEvent(eventId, {
        day: editDay,
        hour: editHour,
        duration_hours: editDuration,
      });
      setEditingEventId(null);
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
            sx={{ borderRadius: 1, fontWeight: 700 }}
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
              borderRadius: 1.25,
              bgcolor: "rgba(0, 229, 201, 0.08)",
              border: "1px solid rgba(0, 229, 201, 0.25)",
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
                    const p = h >= 12 ? "PM" : "AM";
                    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return (
                      <MenuItem key={h} value={h}>
                        {dh}:00 {p}
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
              <Button
                type="submit"
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                disabled={isSubmitting}
                sx={{ borderRadius: 1, fontWeight: 700 }}
              >
                Save Slot
              </Button>
            </Box>
          </Paper>
        )}

        {/* Bulk Action bar */}
        {applianceEvents.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedIds.length === applianceEvents.length && applianceEvents.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < applianceEvents.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  Select All ({applianceEvents.length} slots)
                </Typography>
              }
            />

            {selectedIds.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleBulkDelete}
                disabled={isSubmitting}
                sx={{ borderRadius: 1, fontWeight: 700 }}
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
              const isEditingThis = editingEventId === event.id;

              if (isEditingThis) {
                return (
                  <Paper
                    key={event.id}
                    sx={{
                      p: 2,
                      borderRadius: 1.25,
                      border: "1px solid",
                      borderColor: "primary.main",
                      bgcolor: "rgba(99, 102, 241, 0.08)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.light" }}>
                      Edit Scheduled Operating Slot
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1.5 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Day</InputLabel>
                        <Select
                          value={editDay}
                          label="Day"
                          onChange={(e) => setEditDay(e.target.value as any)}
                        >
                          {DAYS.map((d) => (
                            <MenuItem key={d.key} value={d.key}>{d.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl size="small" fullWidth>
                        <InputLabel>Start Hour</InputLabel>
                        <Select
                          value={editHour}
                          label="Start Hour"
                          onChange={(e) => setEditHour(Number(e.target.value))}
                        >
                          {Array.from({ length: 24 }).map((_, h) => {
                            const p = h >= 12 ? "PM" : "AM";
                            const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
                            return (
                              <MenuItem key={h} value={h}>
                                {dh}:00 {p}
                              </MenuItem>
                            );
                          })}
                        </Select>
                      </FormControl>

                      <TextField
                        size="small"
                        type="number"
                        label="Duration (Hours)"
                        value={editDuration}
                        onChange={(e) => setEditDuration(Math.max(0.5, Math.min(24, parseFloat(e.target.value) || 1)))}
                        slotProps={{
                          htmlInput: { step: 0.5, min: 0.5, max: 24 }
                        }}
                      />
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        startIcon={<CancelIcon />}
                        onClick={handleCancelEdit}
                        disabled={isSubmitting}
                        sx={{ borderRadius: 1 }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<CheckIcon />}
                        onClick={() => handleSaveEdit(event.id)}
                        disabled={isSubmitting}
                        sx={{ borderRadius: 1, fontWeight: 700 }}
                      >
                        Save
                      </Button>
                    </Box>
                  </Paper>
                );
              }

              const isSelected = selectedIds.includes(event.id);

              return (
                <Paper
                  key={event.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 1.25,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderColor: isSelected ? "primary.main" : "divider",
                    bgcolor: isSelected ? "rgba(99, 102, 241, 0.05)" : "transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleToggleSelect(event.id)}
                      size="small"
                    />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {dayLabel} @ {displayH}:00 {period}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Runs for {event.duration_hours} {event.duration_hours === 1 ? "hour" : "hours"} • Est. {((appliance.watts * event.duration_hours) / 1000).toFixed(2)} kWh
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <IconButton size="small" onClick={() => handleStartEdit(event)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDeleteEvent(event.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              );
            })
          )}
        </Box>
      </Box>
    </Modal>
  );
};
