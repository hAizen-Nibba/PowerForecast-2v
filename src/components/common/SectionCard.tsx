import React from "react";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tokens } from "../../theme/tokens";

export interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
  dataTour?: string;
  id?: string;
  sx?: any;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  headerActions,
  children,
  footer,
  noPadding = false,
  dataTour,
  id,
  sx,
}) => {
  const hasHeader = Boolean(title || subtitle || headerActions);

  return (
    <Card
      id={id}
      data-tour={dataTour}
      sx={{
        borderRadius: 1, // 8px
        border: "1px solid",
        borderColor: (theme) =>
          theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
        backgroundImage: "none",
        boxShadow: "none",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...sx,
      }}
    >
      {hasHeader && (
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 1.75,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            borderBottom: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {typeof title === "string" ? (
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  letterSpacing: "-0.01em",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                  lineHeight: 1.3,
                }}
              >
                {title}
              </Typography>
            ) : (
              title
            )}
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
                  fontSize: "0.75rem",
                  mt: 0.25,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {headerActions && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
              {headerActions}
            </Box>
          )}
        </Box>
      )}

      <Box
        sx={{
          p: noPadding ? 0 : { xs: 2, sm: 2.5 },
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </Box>

      {footer && (
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
            borderTop: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
          }}
        >
          {footer}
        </Box>
      )}
    </Card>
  );
};

export default SectionCard;
