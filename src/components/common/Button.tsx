import React from "react";
import MuiButton, { ButtonProps as MuiButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

export interface ButtonProps extends Omit<MuiButtonProps, "variant" | "size"> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "text" | "contained" | "outlined";
  size?: "sm" | "md" | "lg" | "small" | "medium" | "large";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  disabled,
  sx,
  ...props
}) => {
  const getMuiVariant = () => {
    if (variant === "primary" || variant === "contained") return "contained";
    if (variant === "secondary" || variant === "outlined") return "outlined";
    if (variant === "ghost" || variant === "text") return "text";
    if (variant === "danger") return "contained";
    return "contained";
  };

  const getMuiColor = () => {
    if (variant === "danger") return "error";
    if (variant === "secondary") return "primary";
    return "primary";
  };

  const getMuiSize = () => {
    if (size === "sm" || size === "small") return "small";
    if (size === "lg" || size === "large") return "large";
    return "medium";
  };

  return (
    <MuiButton
      variant={getMuiVariant()}
      color={getMuiColor() as any}
      size={getMuiSize()}
      disabled={disabled || isLoading}
      startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : icon}
      sx={{
        borderRadius: 2,
        fontWeight: 600,
        ...sx,
      }}
      {...props}
    >
      {children}
    </MuiButton>
  );
};

export default Button;
