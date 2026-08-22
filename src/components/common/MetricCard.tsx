import React from "react";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { TrendingUp, TrendingDown, Remove } from "@mui/icons-material";

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    direction?: "up" | "down" | "neutral";
    label?: string;
  };
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  onClick,
}) => {
  const getTrendColor = () => {
    if (!trend?.direction) return "default";
    if (trend.direction === "up") return "success";
    if (trend.direction === "down") return "info";
    return "default";
  };

  const getTrendIcon = () => {
    if (!trend?.direction) return null;
    if (trend.direction === "up") return <TrendingUp sx={{ fontSize: 14 }} />;
    if (trend.direction === "down") return <TrendingDown sx={{ fontSize: 14 }} />;
    return <Remove sx={{ fontSize: 14 }} />;
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        cursor: onClick ? "pointer" : "default",
        p: 2.25,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
          {title}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.1)",
            color: "primary.main",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.2)",
          }}
        >
          {icon}
        </Box>
      </Box>

      <Box sx={{ my: 0.5 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontFamily: "monospace",
            color: "text.primary",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
        {subtitle && (
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Chip
            size="small"
            icon={getTrendIcon() || undefined}
            label={trend.label ? `${trend.value} ${trend.label}` : trend.value}
            color={getTrendColor() as any}
            sx={{
              height: 20,
              fontSize: "0.6875rem",
              fontWeight: 700,
              ml: "auto",
            }}
          />
        )}
      </Box>
    </Card>
  );
};

export default MetricCard;
