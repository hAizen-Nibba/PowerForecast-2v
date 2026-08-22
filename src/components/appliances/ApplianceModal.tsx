import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import {
  Bolt as BoltIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { UserAppliance } from "../../types";
import { useCreate, useUpdate } from "@refinedev/core";
import { getDefaultStartHour } from "../../lib/loadCurveService";

interface ApplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  applianceToEdit?: UserAppliance | null;
}

export const ApplianceModal: React.FC<ApplianceModalProps> = ({
  isOpen,
  onClose,
  applianceToEdit,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Air Conditioners");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [watts, setWatts] = useState(750);
  const [quantity, setQuantity] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [daysPerMonth, setDaysPerMonth] = useState(30);
  const [startHour, setStartHour] = useState<number>(13);
  const [roomLocation, setRoomLocation] = useState("Living Room");
  const [energyRating, setEnergyRating] = useState("5-Star Inverter");

  const { mutate: createAppliance, isLoading: isCreating } = useCreate();
  const { mutate: updateAppliance, isLoading: isUpdating } = useUpdate();

  useEffect(() => {
    if (applianceToEdit) {
      setName(applianceToEdit.name || "");
      const cat = applianceToEdit.category || "Air Conditioners";
      setCategory(cat);
      setBrand(applianceToEdit.brand || "");
      setModel(applianceToEdit.model || "");
      setWatts(applianceToEdit.watts || 100);
      setQuantity(applianceToEdit.quantity || 1);
      setHoursPerDay(applianceToEdit.hours_per_day || 8);
      setDaysPerMonth(applianceToEdit.days_per_month || 30);
      setStartHour(applianceToEdit.start_hour !== undefined ? applianceToEdit.start_hour : getDefaultStartHour(cat));
      setRoomLocation(applianceToEdit.room_location || "Living Room");
      setEnergyRating(applianceToEdit.energy_rating || "5-Star");
    } else {
      setName("");
      setCategory("Air Conditioners");
      setBrand("");
      setModel("");
      setWatts(750);
      setQuantity(1);
      setHoursPerDay(8);
      setDaysPerMonth(30);
      setStartHour(13);
      setRoomLocation("Living Room");
      setEnergyRating("5-Star");
    }
  }, [applianceToEdit, isOpen]);

  const monthlyKwh = ((watts * quantity * hoursPerDay * daysPerMonth) / 1000).toFixed(1);
  const estimatedCost = (Number(monthlyKwh) * 14.8261).toFixed(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      category,
      brand,
      model,
      watts,
      quantity,
      hours_per_day: hoursPerDay,
      days_per_month: daysPerMonth,
      start_hour: startHour,
      room_location: roomLocation,
      energy_rating: energyRating,
      monthly_kwh: Number(monthlyKwh),
    };

    if (applianceToEdit) {
      updateAppliance(
        {
          resource: "user_appliances",
          id: applianceToEdit.id,
          values: payload,
        },
        {
          onSuccess: () => onClose(),
        }
      );
    } else {
      createAppliance(
        {
          resource: "user_appliances",
          values: payload,
        },
        {
          onSuccess: () => onClose(),
        }
      );
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
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
              <BoltIcon sx={{ color: "#ffd54f" }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {applianceToEdit ? "Edit Appliance Specs" : "Add New Appliance"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                required
                fullWidth
                size="small"
                label="Appliance Name / Description"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Master Bedroom Inverter AC"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <MenuItem value="Air Conditioners">Air Conditioners</MenuItem>
                <MenuItem value="Refrigerators & Freezers">Refrigerators & Freezers</MenuItem>
                <MenuItem value="Television Sets">Television Sets</MenuItem>
                <MenuItem value="Electric Fans">Electric Fans</MenuItem>
                <MenuItem value="Washing Machines">Washing Machines</MenuItem>
                <MenuItem value="Lighting Products">Lighting Products</MenuItem>
                <MenuItem value="Kitchen & Cooking">Kitchen & Cooking</MenuItem>
                <MenuItem value="Computing & Office">Computing & Office</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Room Location"
                value={roomLocation}
                onChange={(e) => setRoomLocation(e.target.value)}
              >
                <MenuItem value="Living Room">Living Room</MenuItem>
                <MenuItem value="Master Bedroom">Master Bedroom</MenuItem>
                <MenuItem value="Bedroom 2">Bedroom 2</MenuItem>
                <MenuItem value="Kitchen">Kitchen</MenuItem>
                <MenuItem value="Dining">Dining</MenuItem>
                <MenuItem value="Laundry Area">Laundry Area</MenuItem>
                <MenuItem value="Home Office">Home Office</MenuItem>
              </TextField>
            </Grid>

            <Grid size={6}>
              <TextField
                fullWidth
                size="small"
                label="Brand (Optional)"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Panasonic, Carrier"
              />
            </Grid>

            <Grid size={6}>
              <TextField
                fullWidth
                size="small"
                label="Model No. (Optional)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. CS-XPU12WKH"
              />
            </Grid>

            <Grid size={6}>
              <TextField
                required
                type="number"
                fullWidth
                size="small"
                label="Power Draw (Watts)"
                value={watts}
                onChange={(e) => setWatts(Number(e.target.value) || 0)}
              />
            </Grid>

            <Grid size={6}>
              <TextField
                required
                type="number"
                fullWidth
                size="small"
                label="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
            </Grid>

            <Grid size={6}>
              <TextField
                type="number"
                fullWidth
                size="small"
                label="Daily Run-Time (Hours)"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value) || 0)}
              />
            </Grid>

            <Grid size={6}>
              <TextField
                type="number"
                fullWidth
                size="small"
                label="Days Active per Month"
                value={daysPerMonth}
                onChange={(e) => setDaysPerMonth(Number(e.target.value) || 0)}
              />
            </Grid>
          </Grid>

          {/* Real-time projection preview */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "action.hover",
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Monthly Projected Cost
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#ffd54f" }}>
                ₱{estimatedCost}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Energy Volume
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                {monthlyKwh} kWh/mo
              </Typography>
            </Box>
          </Paper>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5, px: 3 }}>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isCreating || isUpdating}
            startIcon={<SaveIcon />}
          >
            {applianceToEdit ? "Save Changes" : "Save Appliance"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ApplianceModal;
