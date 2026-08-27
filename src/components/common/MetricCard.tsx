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
  highlight?: boolean;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  highlight,
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
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        p: { xs: 2.25, sm: 2.5 },
        borderRadius: 1.5,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "&::after": highlight ? {
          content: '""',
          position: "absolute",
          bottom: 0,
          left: "15%",
          right: "15%",
          height: 2.5,
          bgcolor: "#00e5c9",
          borderRadius: "3px 3px 0 0",
          boxShadow: "0 -2px 10px rgba(0, 229, 201, 0.6)",
        } : {},
        "&:hover": onClick ? {
          transform: "translateY(-2px)",
          borderColor: "rgba(0, 229, 201, 0.4)",
        } : {},
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.25, gap: 1 }}>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.8125rem", letterSpacing: "-0.01em" }}>
          {title}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 1,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(0, 158, 136, 0.1)",
            color: "primary.main",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(0, 158, 136, 0.2)",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>

      <Box sx={{ my: 0.75 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontFamily: "monospace",
            color: "text.primary",
            letterSpacing: "-0.02em",
            fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1, gap: 1 }}>
        {subtitle && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.75rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
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
              flexShrink: 0,
            }}
          />
        )}
      </Box>
    </Card>
  );
};

export default MetricCard;
