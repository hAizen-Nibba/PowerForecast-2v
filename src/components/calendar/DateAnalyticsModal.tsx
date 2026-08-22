import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Card from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import {
  CalendarMonth as CalendarIcon,
  Close as CloseIcon,
  Add as PlusIcon,
  Delete as TrashIcon,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { UserAppliance, UserCalendarEvent } from "../../types";
import { useCreate, useDelete } from "@refinedev/core";

interface DateAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  appliances: UserAppliance[];
  events: UserCalendarEvent[];
}

export const DateAnalyticsModal: React.FC<DateAnalyticsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  appliances,
  events,
}) => {
  const [eventTitle, setEventTitle] = useState("");
  const [eventApplianceId, setEventApplianceId] = useState("");
  const [startHour, setStartHour] = useState(14);
  const [durationHours, setDurationHours] = useState(2);
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  const { mutate: createEvent, isLoading: isCreating } = useCreate();
  const { mutate: deleteEvent } = useDelete();

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const dayOfWeekMap: Record<number, 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };
  const dayStr = dayOfWeekMap[selectedDate.getDay()];
  const dayEvents = events.filter((e) => e.day === dayStr || e.is_recurring);

  // Generate 24-hour load curve
  const hourlyData = Array.from({ length: 24 }).map((_, hour) => {
    let totalWatts = 0;

    // Routine appliance active hours
    appliances.forEach((app) => {
      const appStart = app.start_hour !== undefined ? app.start_hour : 8;
      const appEnd = (appStart + app.hours_per_day) % 24;
      const isActive =
        appStart <= appEnd
          ? hour >= appStart && hour < appEnd
          : hour >= appStart || hour < appEnd;

      if (isActive) {
        totalWatts += app.watts * (app.quantity || 1);
      }
    });

    // Scheduled event load
    dayEvents.forEach((ev) => {
      const evEnd = ev.hour + ev.duration_hours;
      if (hour >= ev.hour && hour < evEnd) {
        const associatedApp = appliances.find((a) => a.id === ev.appliance_id);
        totalWatts += associatedApp ? associatedApp.watts * (associatedApp.quantity || 1) : 500;
      }
    });

    const isPeak = (hour >= 11 && hour < 16) || (hour >= 18 && hour < 21);
    const hourlyCost = (totalWatts / 1000) * (isPeak ? 16.83 : 12.45);

    const period = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 === 0 ? 12 : hour % 12;

    return {
      hour: `${h12} ${period}`,
      watts: totalWatts,
      cost: hourlyCost,
      isPeak,
    };
  });

  const totalDayKwh = hourlyData.reduce((acc, curr) => acc + curr.watts / 1000, 0);
  const totalDayCost = hourlyData.reduce((acc, curr) => acc + curr.cost, 0);
  const peakWatts = Math.max(...hourlyData.map((d) => d.watts));

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    createEvent(
      {
        resource: "user_calendar_events",
        values: {
          title: eventTitle,
          category: "appliance",
          day: dayStr,
          hour: startHour,
          duration_hours: durationHours,
          appliance_id: eventApplianceId || null,
          is_recurring: false,
        },
      },
      {
        onSuccess: () => {
          setEventTitle("");
          setIsAddingEvent(false);
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
            <CalendarIcon sx={{ color: "#ffd54f" }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {formattedDate}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              24-Hour hourly power load curve and scheduled energy events
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        {/* KPI Row */}
        <Grid container spacing={2}>
          <Grid size={4}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                ESTIMATED DAY BILL
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#ffd54f", my: 0.5 }}>
                ₱{totalDayCost.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Effective Meralco Rate
              </Typography>
            </Paper>
          </Grid>
          <Grid size={4}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                DAY CONSUMPTION
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.light", my: 0.5 }}>
                {totalDayKwh.toFixed(1)} kWh
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                24-Hour Energy Draw
              </Typography>
            </Paper>
          </Grid>
          <Grid size={4}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                PEAK DEMAND
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "warning.main", my: 0.5 }}>
                {peakWatts} W
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Maximum Hourly Spike
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 24-Hour Load Curve Chart */}
        <Card sx={{ p: 2.5, borderRadius: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              24-Hour Load Profile (Watts)
            </Typography>
            <Chip
              label="Peak: 11 AM – 4 PM & 6 PM – 9 PM"
              size="small"
              color="warning"
              sx={{ fontWeight: 700, fontSize: "0.6875rem" }}
            />
          </Box>

          <Box sx={{ height: 220, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWatts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#0f0e3a", border: "1px solid rgba(99, 102, 241, 0.4)", color: "#ffffff" }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {d.hour} ({d.isPeak ? "Peak Window" : "Off-Peak"})
                          </Typography>
                          <Typography variant="caption" sx={{ display: "block", color: "#ffd54f", fontWeight: 800, fontFamily: "monospace" }}>
                            {d.watts} Watts (₱{d.cost.toFixed(2)}/hr)
                          </Typography>
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="watts" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorWatts)" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Card>

        {/* Scheduled Events Section */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Scheduled Energy Tasks & Events ({dayEvents.length})
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setIsAddingEvent(!isAddingEvent)}
              startIcon={<PlusIcon />}
            >
              {isAddingEvent ? "Cancel" : "Add Task"}
            </Button>
          </Box>

          {isAddingEvent && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, mb: 2 }}>
              <form onSubmit={handleAddEvent}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      required
                      fullWidth
                      size="small"
                      label="Event / Task Title"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g. Laundry & Dryer Run"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Associated Appliance (Optional)"
                      value={eventApplianceId}
                      onChange={(e) => setEventApplianceId(e.target.value)}
                    >
                      <MenuItem value="">Custom / Manual Draw</MenuItem>
                      {appliances.map((app) => (
                        <MenuItem key={app.id} value={app.id}>
                          {app.name} ({app.watts}W)
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Start Hour"
                      value={startHour}
                      onChange={(e) => setStartHour(Number(e.target.value))}
                    >
                      {Array.from({ length: 24 }).map((_, h) => (
                        <MenuItem key={h} value={h}>
                          {h % 12 === 0 ? 12 : h % 12} {h >= 12 ? "PM" : "AM"}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      type="number"
                      fullWidth
                      size="small"
                      label="Duration (Hours)"
                      value={durationHours}
                      onChange={(e) => setDurationHours(Number(e.target.value) || 1)}
                    />
                  </Grid>
                  <Grid size={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button type="submit" variant="contained" size="small" disabled={isCreating}>
                      Schedule Task
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>
          )}

          {dayEvents.length === 0 ? (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textAlign: "center", py: 2 }}>
              No custom scheduled tasks for this date.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {dayEvents.map((ev) => (
                <Paper
                  key={ev.id}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {ev.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {ev.hour % 12 === 0 ? 12 : ev.hour % 12} {ev.hour >= 12 ? "PM" : "AM"} • {ev.duration_hours}h duration
                    </Typography>
                  </Box>

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      deleteEvent({
                        resource: "user_calendar_events",
                        id: ev.id,
                      });
                    }}
                  >
                    <TrashIcon fontSize="small" />
                  </IconButton>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, px: 3 }}>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DateAnalyticsModal;
