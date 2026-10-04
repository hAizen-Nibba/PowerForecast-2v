import React from "react";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import { TrendingUp, TrendingDown, Remove } from "@mui/icons-material";
import { tokens } from "../../theme/tokens";

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  infoTooltip?: string;
  trend?: {
    value: string;
    direction?: "up" | "down" | "neutral";
    label?: string;
  };
  highlight?: boolean;
  liveDot?: boolean;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  dataTour?: string;
  id?: string;
  sx?: any;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  infoTooltip,
  trend,
  highlight,
  liveDot,
  badge,
  footer,
  onClick,
  dataTour,
  id,
  sx,
}) => {
  const getTrendColor = () => {
    if (!trend?.direction) return "default";
    if (trend.direction === "up") return "success";
    if (trend.direction === "down") return "info";
    return "default";
  };

  const getTrendIcon = () => {
    if (!trend?.direction) return null;
    if (trend.direction === "up") return <TrendingUp sx={{ fontSize: 13 }} />;
    if (trend.direction === "down") return <TrendingDown sx={{ fontSize: 13 }} />;
    return <Remove sx={{ fontSize: 13 }} />;
  };

  return (
    <Card
      id={id}
      data-tour={dataTour}
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        p: { xs: 2, sm: 2.25 },
        borderRadius: 1, // 8px
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
        border: "1px solid",
        borderColor: (theme) => {
          if (highlight) {
            return theme.palette.mode === "dark" ? tokens.zinc[700] : tokens.zinc[300];
          }
          return theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
        },
        backgroundImage: "none",
        boxShadow: "none",
        transition: "all 0.15s ease",
        "&:hover": onClick
          ? {
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
            }
          : {},
        ...sx,
      }}
    >
      {/* Top Header: Label + Optional Icon/Live Dot */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {liveDot && (
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.emerald[400] : tokens.emerald[600],
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? `0 0 6px ${tokens.emerald[500]}`
                    : `0 0 4px ${tokens.emerald[500]}`,
                animation: "pulse 2s infinite ease-in-out",
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1, transform: "scale(1)" },
                  "50%": { opacity: 0.4, transform: "scale(0.85)" },
                },
              }}
            />
          )}
          <Typography
            variant="body2"
            sx={{
              color: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
              fontWeight: 500,
              fontSize: "0.75rem",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </Typography>
          {infoTooltip && (
            <Tooltip title={infoTooltip} arrow placement="top">
              <Box
                component="span"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 15,
                  height: 15,
                  borderRadius: "50%",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  cursor: "help",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    color: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover,
                  },
                }}
              >
                ?
              </Box>
            </Tooltip>
          )}
        </Box>

        {icon && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 0.75,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              color: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
              flexShrink: 0,
              "& svg": {
                fontSize: 16,
              },
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      {/* Main Metric Value */}
      <Box sx={{ my: 0.5 }}>
        <Typography
          component="div"
          sx={{
            fontWeight: 600,
            color: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
            letterSpacing: "-0.025em",
            fontSize: { xs: "1.5rem", sm: "1.75rem" },
            lineHeight: 1.15,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </Typography>
      </Box>

      {/* Bottom Row / Meta */}
      {(subtitle || trend || badge || footer) && (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1, gap: 1, flexWrap: "wrap" }}>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
                fontSize: "0.75rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </Typography>
          )}

          {badge && badge}

          {trend && (
            <Chip
              size="small"
              icon={getTrendIcon() || undefined}
              label={trend.label ? `${trend.value} ${trend.label}` : trend.value}
              color={getTrendColor() as any}
              sx={{
                height: 20,
                fontSize: "0.6875rem",
                fontWeight: 600,
                ml: "auto",
                flexShrink: 0,
              }}
            />
          )}

          {footer && footer}
        </Box>
      )}
    </Card>
  );
};

export default MetricCard;
