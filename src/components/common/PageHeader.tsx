import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tokens } from "../../theme/tokens";

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
        pb: 1,
        mb: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          {typeof title === "string" ? (
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "1.375rem", sm: "1.625rem" },
                fontWeight: 600,
                letterSpacing: "-0.025em",
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                lineHeight: 1.25,
              }}
            >
              {title}
            </Typography>
          ) : (
            title
          )}
          {badge}
        </Box>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              fontSize: "0.875rem",
              color: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            width: { xs: "100%", sm: "auto" },
            justifyContent: { xs: "flex-start", sm: "flex-end" },
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  );
};

export default PageHeader;
