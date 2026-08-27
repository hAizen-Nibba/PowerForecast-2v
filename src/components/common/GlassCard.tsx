import React from "react";
import Card, { CardProps } from "@mui/material/Card";

export interface GlassCardProps extends CardProps {
  children: React.ReactNode;
  variantType?: "default" | "glow" | "interactive";
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variantType = "default",
  sx,
  ...props
}) => {
  return (
    <Card
      sx={{
        ...(variantType === "glow" && {
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 0 32px rgba(0, 229, 201, 0.2)"
              : "0 8px 30px rgba(0, 158, 136, 0.12)",
        }),
        ...(variantType === "interactive" && {
          cursor: "pointer",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "translateY(-2px)",
            borderColor: "primary.main",
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 8px 32px rgba(0, 229, 201, 0.25)"
                : "0 8px 24px rgba(0, 158, 136, 0.15)",
          },
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

export default GlassCard;
