import React, { useState } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import {
  Bolt as BoltIcon,
  Calculate as CalculatorIcon,
  CalendarMonth as CalendarIcon,
  AutoAwesome as SparklesIcon,
  Storage as DatabaseIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Whatshot as FlameIcon,
  AccessTime as ClockIcon,
  Add as PlusIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { MetricCard } from "../components/common/MetricCard";
import { LivePowerBoard } from "../components/dashboard/LivePowerBoard";
import { ConsumptionDonut } from "../components/dashboard/ConsumptionDonut";
import { ApplianceModal } from "../components/appliances/ApplianceModal";
import { PelpCatalogModal } from "../components/appliances/PelpCatalogModal";
import { AiVisionScannerModal } from "../components/vision/AiVisionScannerModal";
import { useList } from "@refinedev/core";
import { UserAppliance } from "../types";

export const DashboardPage: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPelpModalOpen, setIsPelpModalOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);

  const listResponse = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const appliances: UserAppliance[] = listResponse?.data?.data || listResponse?.result?.data || [];
  const runningAppliances = appliances.filter((a: UserAppliance) => a.is_currently_on);
  const activeWattage = runningAppliances.reduce(
    (acc: number, curr: UserAppliance) => acc + curr.watts * (curr.quantity || 1),
    0
  );

  const totalMonthlyKwh = appliances.reduce(
    (acc: number, curr: UserAppliance) => acc + (Number(curr.monthly_kwh) || 0),
    0
  );
  const estimatedMonthlyBill = totalMonthlyKwh * 14.8261;

  const currentHour = new Date().getHours();
  const isPeak = (currentHour >= 11 && currentHour < 16) || (currentHour >= 18 && currentHour < 21);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* 1. Hero Welcome Header Card */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 3,
          borderRadius: 3.5,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ maxWidth: 640 }}>
          <Chip
            icon={<BoltIcon sx={{ color: "#ffd54f !important", fontSize: "14px !important" }} />}
            label="Active Grid Telemetry"
            size="small"
            sx={{
              mb: 1.5,
              fontWeight: 700,
              fontSize: "0.75rem",
              bgcolor: "rgba(99, 102, 241, 0.15)",
              color: "primary.light",
              border: "1px solid rgba(99, 102, 241, 0.3)",
            }}
          />

          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 0.75 }}>
            Household Energy Dashboard
          </Typography>

          <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 2.5 }}>
            Real-time household circuits, Meralco unbundled tariff projection, DOE PELP database matching, and intelligent appliance scheduling.
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => setIsAddModalOpen(true)}
              startIcon={<PlusIcon />}
            >
              Add Appliance
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setIsPelpModalOpen(true)}
              startIcon={<DatabaseIcon sx={{ color: "primary.light" }} />}
            >
              PELP Catalog
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setIsAiScannerOpen(true)}
              startIcon={<SparklesIcon sx={{ color: "#ffd54f" }} />}
            >
              AI Scanner
            </Button>
          </Box>
        </Box>

        {/* Live Draw summary pill */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(9, 9, 56, 0.75)" : "rgba(240, 243, 255, 0.8)",
            border: "1px solid",
            borderColor: "divider",
            minWidth: { xs: "100%", md: 240 },
            textAlign: { xs: "left", md: "right" },
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.light", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Current Draw Load
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, fontFamily: "monospace", my: 0.5 }}>
            {activeWattage} <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>Watts</Typography>
          </Typography>
          <Typography variant="caption" sx={{ color: "#f59e0b", fontWeight: 700, fontFamily: "monospace" }}>
            ₱{((activeWattage / 1000) * 14.8261).toFixed(2)}/hr running rate
          </Typography>
        </Paper>
      </Card>

      {/* 2. Main KPI Stat Cards */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Projected Monthly Bill"
            value={`₱${estimatedMonthlyBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Rate: ₱14.82/kWh"
            icon={<BoltIcon sx={{ color: "#ffd54f" }} />}
            trend={{ value: "-₱240.50", direction: "down", label: "vs prior" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Monthly Energy Volume"
            value={`${totalMonthlyKwh.toFixed(1)} kWh`}
            subtitle="Household total load"
            icon={<TrendingUpIcon sx={{ color: "primary.light" }} />}
            trend={{ value: "Tier 3", direction: "neutral" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Active Appliances"
            value={`${runningAppliances.length} / ${appliances.length}`}
            subtitle="Circuits online"
            icon={<SpeedIcon sx={{ color: "success.main" }} />}
            trend={{ value: `${runningAppliances.length} ON`, direction: "up" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Tariff Window"
            value={isPeak ? "Peak" : "Off-Peak"}
            subtitle={isPeak ? "11 AM – 4 PM & 6 PM – 9 PM" : "Optimal Low-Cost"}
            icon={isPeak ? <FlameIcon sx={{ color: "warning.main" }} /> : <ClockIcon sx={{ color: "success.main" }} />}
          />
        </Grid>
      </Grid>

      {/* 3. Main Grid: Live Power Board & Energy Distribution Donut */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <LivePowerBoard onOpenAddModal={() => setIsAddModalOpen(true)} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ConsumptionDonut appliances={appliances} />
        </Grid>
      </Grid>

      {/* 4. Quick Module Launchpad */}
      <Grid container spacing={2.5}>
        {[
          {
            title: "Bill Calculator",
            desc: "ERC unbundled rate formulas",
            icon: <CalculatorIcon sx={{ color: "#ffd54f" }} />,
            link: "/calculator",
          },
          {
            title: "Appliance Hub",
            desc: "DOE PELP database lookup",
            icon: <BoltIcon sx={{ color: "primary.light" }} />,
            link: "/appliances",
          },
          {
            title: "Smart Scheduler",
            desc: "Off-peak load optimization",
            icon: <CalendarIcon sx={{ color: "success.light" }} />,
            link: "/calendar",
          },
        ].map((item, idx) => (
          <Grid size={{ xs: 12, sm: 4 }} key={idx}>
            <Card
              component={Link}
              to={item.link}
              sx={{
                p: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textDecoration: "none",
                color: "inherit",
                borderRadius: 3,
                "&:hover": {
                  borderColor: "primary.main",
                  transform: "translateY(-2px)",
                },
                transition: "all 0.2s ease-in-out",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {item.desc}
                  </Typography>
                </Box>
              </Box>
              <ArrowForwardIcon fontSize="small" sx={{ color: "primary.main" }} />
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Global Modals */}
      <ApplianceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      <PelpCatalogModal
        isOpen={isPelpModalOpen}
        onClose={() => setIsPelpModalOpen(false)}
      />
      <AiVisionScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
      />
    </Box>
  );
};

export default DashboardPage;
