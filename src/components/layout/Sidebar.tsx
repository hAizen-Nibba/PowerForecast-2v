import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import {
  Dashboard as DashboardIcon,
  Calculate as CalculatorIcon,
  Bolt as BoltIcon,
  CalendarMonth as CalendarIcon,
  BarChart as AnalyticsIcon,
  VerifiedUser as ShieldIcon,
  Paid as CoinsIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useList } from "@refinedev/core";
import { UserAppliance } from "../../types";
import { APP_VERSION } from "../../lib/supabaseClient";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  activeWattage?: number;
  runningCount?: number;
}

const DRAWER_WIDTH = 260;

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const location = useLocation();

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];

  // Live 1-second ticker
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const runningAppliances = appliances.filter((a) => a.is_currently_on);
  const activeWattage = runningAppliances.reduce((acc, curr) => acc + curr.watts * (curr.quantity || 1), 0);
  const runningCount = runningAppliances.length;

  const getAccumulatedPesos = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = app.watts * (app.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    return accumulatedKwh * 14.8261;
  };

  const totalSessionCost = runningAppliances.reduce((acc, curr) => acc + getAccumulatedPesos(curr), 0);

  const navItems = [
    { label: "Dashboard", icon: <DashboardIcon fontSize="small" />, path: "/dashboard" },
    { label: "Bill Calculator", icon: <CalculatorIcon fontSize="small" />, path: "/calculator" },
    { label: "Appliance Hub", icon: <BoltIcon fontSize="small" />, path: "/appliances" },
    { label: "Smart Calendar", icon: <CalendarIcon fontSize="small" />, path: "/calendar" },
    { label: "Analytics", icon: <AnalyticsIcon fontSize="small" />, path: "/analytics" },
    { label: "Forecasting", icon: <ShieldIcon fontSize="small" />, path: "/forecasting" },
    { label: "API Docs", icon: <CoinsIcon fontSize="small" />, path: "/docs" },
    { label: "Settings", icon: <SettingsIcon fontSize="small" />, path: "/settings" },
  ];

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
      {/* Brand Header */}
      <Box>
        <Box
          component={Link}
          to="/"
          onClick={onClose}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2.5,
            py: 2.25,
            textDecoration: "none",
            color: "inherit",
            borderBottom: "1px solid",
            borderColor: "divider",
            "&:hover": { bgcolor: "action.hover" },
            transition: "background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Box
            component="img"
            src="/Assets/LOGO.png"
            alt="PowerForecast Logo"
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 8px rgba(99, 102, 241, 0.4))",
            }}
          />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: "-0.01em", color: "#ffffff", lineHeight: 1.2 }}>
              PowerForecast
            </Typography>
            <Typography variant="caption" sx={{ color: "primary.light", fontSize: "0.6875rem", mt: 0.25, display: "block" }}>
              Meralco Energy Intel
            </Typography>
          </Box>
        </Box>

        {/* Navigation List */}
        <List sx={{ px: 1.25, py: 1.75 }}>
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path || (item.path === "/dashboard" && location.pathname === "/");
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={isActive}
                  onClick={onClose}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    px: 1.5,
                    position: "relative",
                    "&.Mui-selected": {
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        top: "18%",
                        bottom: "18%",
                        width: 3,
                        borderRadius: "0 4px 4px 0",
                        bgcolor: "#ffd54f",
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 34,
                      color: isActive ? "#ffd54f" : "primary.light",
                      transition: "color 0.2s ease",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: "0.8125rem",
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? "#ffffff" : "text.secondary",
                          letterSpacing: "-0.01em",
                        },
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Live Grid Load Card & Footer */}
      <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.75,
            borderRadius: 2.5,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(15, 16, 56, 0.85)" : "rgba(255, 255, 255, 0.08)",
            border: "1px solid",
            borderColor: "divider",
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: runningCount > 0 ? "success.main" : "text.disabled",
                  boxShadow: runningCount > 0 ? "0 0 8px #10b981" : "none",
                  transition: "all 0.3s ease",
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                Live Load
              </Typography>
            </Box>
            <Chip
              label={`${runningCount} Active`}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.6875rem",
                fontWeight: 700,
                bgcolor: "rgba(99, 102, 241, 0.2)",
                color: "primary.light",
                border: "1px solid rgba(99, 102, 241, 0.3)",
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#ffffff" }}>
              {activeWattage} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>W</Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: "#ffd54f", fontFamily: "monospace", fontWeight: 700 }}>
              ₱{((activeWattage / 1000) * 14.8261).toFixed(2)}/hr
            </Typography>
          </Box>

          {runningCount > 0 && (
            <>
              <Divider sx={{ my: 1, borderColor: "divider" }} />
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <CoinsIcon sx={{ fontSize: 13, color: "#ffd54f" }} />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                    Session:
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "success.light", fontFamily: "monospace", fontWeight: 700 }}>
                  ₱{totalSessionCost.toFixed(4)}
                </Typography>
              </Box>
            </>
          )}
        </Paper>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <ShieldIcon sx={{ fontSize: 14, color: "success.main" }} />
            <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>
              Supabase Hybrid
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontFamily: "monospace",
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: "primary.light",
            }}
          >
            {APP_VERSION}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={isOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Permanent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
