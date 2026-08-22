import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import {
  Menu as MenuIcon,
  LightMode as SunIcon,
  DarkMode as MoonIcon,
  AutoAwesome as SparklesIcon,
  Bolt as BoltIcon,
  AccessTime as ClockIcon,
  Whatshot as FlameIcon,
  Logout as LogoutIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
} from "@mui/icons-material";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { checkSupabaseConnection } from "../../lib/supabaseClient";

interface HeaderProps {
  onOpenSidebar: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAiScanner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  isDark,
  onToggleTheme,
  onOpenAiScanner,
}) => {
  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dbStatus, setDbStatus] = useState<{ ok: boolean; latency?: number }>({ ok: true, latency: 45 });

  // Check Supabase connection health on mount and every 30s
  useEffect(() => {
    let isMounted = true;
    const verifyConnection = async () => {
      const res = await checkSupabaseConnection();
      if (isMounted) {
        setDbStatus({ ok: res.ok, latency: res.latencyMs });
      }
    };
    verifyConnection();
    const interval = setInterval(verifyConnection, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Real-time Clock
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = new Date().getHours();
  const isPeak = (currentHour >= 11 && currentHour < 16) || (currentHour >= 18 && currentHour < 21);

  return (
    <AppBar
      position="sticky"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backdropFilter: "blur(16px)",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 3 } }}>
        {/* Left: Mobile Menu Toggle, DB Status, and Tariff Indicators */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={onOpenSidebar}
            sx={{ display: { lg: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Database Connection Status Chip */}
          <Tooltip title={dbStatus.ok ? `Supabase Connected (${dbStatus.latency || 0}ms)` : "Supabase Offline / Local Mode"}>
            <Chip
              icon={
                dbStatus.ok ? (
                  <CloudDoneIcon sx={{ color: "#34d399 !important", fontSize: "15px !important" }} />
                ) : (
                  <CloudOffIcon sx={{ color: "#f87171 !important", fontSize: "15px !important" }} />
                )
              }
              label={dbStatus.ok ? "Supabase Live" : "Local Mode"}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: "0.6875rem",
                bgcolor: dbStatus.ok ? "rgba(52, 211, 153, 0.12)" : "rgba(248, 113, 113, 0.12)",
                color: dbStatus.ok ? "#34d399" : "#f87171",
                border: "1px solid",
                borderColor: dbStatus.ok ? "rgba(52, 211, 153, 0.3)" : "rgba(248, 113, 113, 0.3)",
                display: { xs: "none", sm: "inline-flex" },
              }}
            />
          </Tooltip>

          {/* Rate Badge */}
          <Chip
            icon={<BoltIcon sx={{ color: "#ffd54f !important" }} />}
            label="₱9.2800/kWh"
            size="small"
            sx={{
              display: { xs: "none", md: "inline-flex" },
              fontWeight: 700,
              fontFamily: "monospace",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(99, 102, 241, 0.08)",
              border: "1px solid",
              borderColor: "divider",
            }}
          />

          {/* Peak / Off-Peak status */}
          <Chip
            icon={
              isPeak ? (
                <FlameIcon sx={{ color: "#f59e0b !important", fontSize: "16px !important" }} />
              ) : (
                <ClockIcon sx={{ color: "#10b981 !important", fontSize: "16px !important" }} />
              )
            }
            label={isPeak ? "PEAK (₱16.83/kWh)" : "OFF-PEAK (₱12.45/kWh)"}
            size="small"
            color={isPeak ? "warning" : "success"}
            sx={{
              display: { xs: "none", lg: "inline-flex" },
              fontWeight: 700,
              fontSize: "0.6875rem",
            }}
          />
        </Box>

        {/* Center: Live Time / Date */}
        <Box sx={{ display: { xs: "none", lg: "flex" }, flexDirection: "column", alignItems: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.05em" }}>
            {timeStr}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
            {dateStr} (GMT+8)
          </Typography>
        </Box>

        {/* Right: AI Scanner CTA, Theme Switch, and User Profile */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {onOpenAiScanner && (
            <Button
              variant="outlined"
              size="small"
              onClick={onOpenAiScanner}
              startIcon={<SparklesIcon sx={{ color: "#ffd54f" }} />}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                borderRadius: 2,
                borderColor: "primary.main",
              }}
            >
              AI Scanner
            </Button>
          )}

          {/* Theme Mode Toggle Button */}
          <Tooltip title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}>
            <IconButton
              onClick={onToggleTheme}
              color="inherit"
              size="small"
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                border: "1px solid",
                borderColor: "divider",
                p: 0.75,
              }}
            >
              {isDark ? <SunIcon sx={{ color: "#ffd54f", fontSize: 18 }} /> : <MoonIcon sx={{ color: "#4f46e5", fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          {/* User Profile Pill & Menu */}
          <Box
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: "4px 8px 4px 4px",
              borderRadius: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
              border: "1px solid",
              borderColor: "divider",
              cursor: "pointer",
              "&:hover": { borderColor: "primary.main" },
              transition: "border-color 0.2s",
            }}
          >
            <Avatar
              src={identity?.avatar}
              sx={{ width: 26, height: 26, bgcolor: "primary.main", fontSize: "0.75rem", fontWeight: 700 }}
            >
              {identity?.name?.charAt(0) || "U"}
            </Avatar>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                maxWidth: 110,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: { xs: "none", sm: "block" },
              }}
            >
              {identity?.name || identity?.email?.split("@")[0] || "User"}
            </Typography>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 180,
                  p: 0.5,
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {identity?.name || "PowerForecast User"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {identity?.email || "Authenticated Account"}
              </Typography>
            </Box>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                logout();
              }}
              sx={{ gap: 1, color: "error.main", fontSize: "0.8125rem", fontWeight: 600 }}
            >
              <LogoutIcon fontSize="small" />
              Sign Out
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
