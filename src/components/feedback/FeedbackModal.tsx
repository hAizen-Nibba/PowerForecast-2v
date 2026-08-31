import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import type { Theme } from "@mui/material/styles";
import {
  Close as CloseIcon,
  Verified as VerifiedIcon,
  OpenInNew as OpenInNewIcon,
  SupportAgent as SupportIcon,
  FormatQuote as QuoteIcon,
  Facebook as FacebookIcon,
} from "@mui/icons-material";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export const FB_PM_LINK = "https://www.facebook.com/aj.umali.533308";

interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  fbLink: string;
  isLead?: boolean;
  quote?: string;
  verified?: boolean;
}

const TEAM_MEMBERS: {
  lead: TeamMember;
  collaborators: TeamMember[];
} = {
  lead: {
    name: "AJ Umali",
    role: "Lead Developer",
    avatar: "/Assets/ellen-joe-wallpaper-v0-d9cvw6chy46e1.jpg",
    fbLink: "https://www.facebook.com/aj.umali.533308",
    isLead: true,
    verified: true,
    quote: "Chill lang par! 'Di ko pa nagagawa dailies ko sa ZZZ at NTE!",
  },
  collaborators: [
    {
      name: "Dave Villegas",
      role: "Associate Lead Developer & Backend Developer",
      avatar: "/Assets/images.jpg",
      fbLink: "https://www.facebook.com/di3bu",
    },
    {
      name: "Mehojeriel Lacerna",
      role: "Project Manager, Thesis Group Leader",
      avatar: "/Assets/eggplant_300x.jpg",
      fbLink: "https://www.facebook.com/mehojeriel.lacerna",
    },
  ],
};

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onClose }) => {
  const handleOpenLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const lead = TEAM_MEMBERS.lead;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(12px)",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
          },
        },
        paper: {
          sx: {
            borderRadius: { xs: 2.5, sm: 3.5 },
            bgcolor: (theme: Theme) =>
              theme.palette.mode === "dark" ? "rgba(11, 13, 27, 0.96)" : "rgba(255, 255, 255, 0.98)",
            backgroundImage: "none",
            border: "1px solid",
            borderColor: (theme: Theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.35)" : "rgba(0, 229, 201, 0.3)",
            boxShadow: (theme: Theme) =>
              theme.palette.mode === "dark"
                ? "0 24px 64px rgba(0, 0, 0, 0.8), 0 0 32px rgba(0, 229, 201, 0.15)"
                : "0 24px 64px rgba(0, 0, 0, 0.15)",
            backdropFilter: "blur(24px)",
            p: { xs: 1.5, sm: 2.5 },
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1.5,
          px: { xs: 1, sm: 1.5 },
          pt: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: "12px",
              bgcolor: "rgba(0, 229, 201, 0.15)",
              border: "1px solid rgba(0, 229, 201, 0.4)",
              color: "#00e5c9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(0, 229, 201, 0.25)",
            }}
          >
            <SupportIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              Developer & Direct Support
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
              Connect directly with the developers and team on Facebook Messenger
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", mb: 2 }} />

      <DialogContent sx={{ px: { xs: 1, sm: 1.5 }, py: 0.5 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Hero Bento Card (AJ Umali) */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              bgcolor: (theme: Theme) =>
                theme.palette.mode === "dark" ? "rgba(17, 20, 39, 0.85)" : "rgba(241, 245, 249, 0.9)",
              border: "1px solid",
              borderColor: (theme: Theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.35)" : "rgba(0, 229, 201, 0.3)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top Row: Avatar, Name, Role */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 2,
                mb: 1.75,
              }}
            >
              {/* Circular Avatar with Cover Fit */}
              <Avatar
                src={lead.avatar}
                alt={lead.name}
                sx={{
                  width: { xs: 60, sm: 68 },
                  height: { xs: 60, sm: 68 },
                  border: "2px solid #00e5c9",
                  boxShadow: "0 0 16px rgba(0, 229, 201, 0.45)",
                  flexShrink: 0,
                  "& img": {
                    objectFit: "cover",
                    objectPosition: "center",
                  },
                }}
              />

              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.125rem", letterSpacing: "-0.01em" }}>
                    {lead.name}
                  </Typography>
                  {lead.verified && (
                    <Tooltip title="Verified Project Creator & Lead Developer">
                      <VerifiedIcon sx={{ fontSize: 18, color: "#00e5c9" }} />
                    </Tooltip>
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.8125rem" }}>
                  {lead.role}
                </Typography>
                <Typography variant="caption" sx={{ color: "#00e5c9", fontSize: "0.6875rem", fontWeight: 700 }}>
                  ● Active on Facebook Messenger
                </Typography>
              </Box>
            </Box>

            {/* Custom Quote Box */}
            {lead.quote && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.25,
                  p: 1.5,
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: (theme: Theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.35)" : "rgba(0, 0, 0, 0.04)",
                  border: "1px solid",
                  borderColor: (theme: Theme) =>
                    theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                }}
              >
                <QuoteIcon sx={{ fontSize: 20, color: "#00e5c9", transform: "scaleX(-1)", flexShrink: 0, mt: 0.25 }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontStyle: "italic",
                    fontSize: "0.8125rem",
                    color: "text.secondary",
                    lineHeight: 1.5,
                  }}
                >
                  "{lead.quote}"
                </Typography>
              </Box>
            )}

            {/* Message Action Button */}
            <Button
              fullWidth
              variant="contained"
              onClick={() => handleOpenLink(lead.fbLink)}
              startIcon={<FacebookIcon sx={{ fontSize: 20 }} />}
              endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
              sx={{
                bgcolor: "#1877f2",
                color: "#ffffff",
                fontWeight: 800,
                borderRadius: 2,
                textTransform: "none",
                fontSize: "0.875rem",
                py: 1,
                boxShadow: "0 4px 16px rgba(24, 119, 242, 0.35)",
                "&:hover": {
                  bgcolor: "#166fe5",
                  boxShadow: "0 6px 20px rgba(24, 119, 242, 0.5)",
                  transform: "translateY(-1px)",
                },
                transition: "all 0.2s ease-in-out",
              }}
            >
              Message on Facebook (PM)
            </Button>
          </Paper>

          {/* Secondary Bento Grid (Dave Villegas & Mehojeriel Lacerna) */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            {TEAM_MEMBERS.collaborators.map((member, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 2,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderRadius: 3,
                  bgcolor: (theme: Theme) =>
                    theme.palette.mode === "dark" ? "rgba(17, 20, 39, 0.75)" : "rgba(241, 245, 249, 0.8)",
                  border: "1px solid",
                  borderColor: (theme: Theme) =>
                    theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "rgba(0, 229, 201, 0.3)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <Avatar
                    src={member.avatar}
                    alt={member.name}
                    sx={{
                      width: 48,
                      height: 48,
                      border: "2px solid rgba(0, 229, 201, 0.5)",
                      boxShadow: "0 0 10px rgba(0, 229, 201, 0.25)",
                      flexShrink: 0,
                      "& img": {
                        objectFit: "cover",
                        objectPosition: "center",
                      },
                    }}
                  />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.875rem", lineHeight: 1.25 }}>
                      {member.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontSize: "0.6875rem",
                        display: "block",
                        lineHeight: 1.35,
                        mt: 0.25,
                      }}
                    >
                      {member.role}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => handleOpenLink(member.fbLink)}
                  startIcon={<FacebookIcon sx={{ fontSize: 16 }} />}
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    borderRadius: 1.5,
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: "0.75rem",
                    py: 0.75,
                    borderColor: "rgba(24, 119, 242, 0.4)",
                    color: "#1877f2",
                    "&:hover": {
                      borderColor: "#1877f2",
                      bgcolor: "rgba(24, 119, 242, 0.08)",
                    },
                  }}
                >
                  Message on Facebook
                </Button>
              </Paper>
            ))}
          </Box>
        </Box>
      </DialogContent>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", mt: 2 }} />

      {/* Footer */}
      <DialogActions sx={{ px: { xs: 1, sm: 1.5 }, py: 1.5, justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            px: 3,
            py: 0.75,
            borderRadius: 2,
            fontWeight: 700,
            textTransform: "none",
            color: "text.secondary",
            borderColor: (theme: Theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
            "&:hover": {
              borderColor: "text.primary",
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackModal;
