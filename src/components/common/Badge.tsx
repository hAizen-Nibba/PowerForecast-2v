import React from "react";
import Chip, { ChipProps } from "@mui/material/Chip";

export interface BadgeProps extends Omit<ChipProps, "variant" | "color"> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
  text?: string;
  icon?: React.ReactElement;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "primary",
  text,
  label,
  icon,
  sx,
  ...props
}) => {
  const getColor = () => {
    switch (variant) {
      case "primary":
        return "primary";
      case "secondary":
        return "secondary";
      case "success":
        return "success";
      case "warning":
        return "warning";
      case "danger":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Chip
      label={text || label}
      color={getColor() as any}
      icon={icon}
      size="small"
      sx={{
        fontWeight: 600,
        ...sx,
      }}
      {...props}
    />
  );
};

export default Badge;
