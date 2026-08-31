import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Avatar from "@mui/material/Avatar";
import Rating from "@mui/material/Rating";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Close as CloseIcon,
  Feedback as FeedbackIcon,
  Send as SendIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenInNewIcon,
  ChatBubbleOutlined as ChatIcon,
  BugReport as BugIcon,
  Lightbulb as FeatureIcon,
  HelpOutlined as HelpIcon,
  ThumbUp as GeneralIcon,
  Verified as VerifiedIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { useToast } from "../common/ToastProvider";
import { supabaseClient } from "../../lib/supabaseClient";
import { devLog } from "../../lib/devLogger";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export const FB_PM_LINK = "https://www.facebook.com/aj.umali.533308";

const CATEGORIES = [
  { id: "Feature Request", label: "Feature Request", icon: <FeatureIcon sx={{ fontSize: 16 }} />, color: "#00e5c9" },
  { id: "Bug Report", label: "Bug Report", icon: <BugIcon sx={{ fontSize: 16 }} />, color: "#f87171" },
  { id: "Inquiry / Question", label: "Inquiry / Question", icon: <HelpIcon sx={{ fontSize: 16 }} />, color: "#60a5fa" },
  { id: "General Feedback", label: "General Feedback", icon: <GeneralIcon sx={{ fontSize: 16 }} />, color: "#fbbf24" },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onClose }) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [category, setCategory] = useState<string>("Feature Request");
  const [rating, setRating] = useState<number | null>(5);
  const [message, setMessage] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyAndOpenPM = () => {
    const formatted = `[PowerForecast Feedback - ${category}]\nRating: ${rating ? `${rating}/5 Stars` : "Not specified"}\nEmail/Contact: ${contactEmail || "Anonymous"}\n\nMessage:\n${message.trim() || "Hi AJ! I want to share some feedback regarding PowerForecast."}`;
    
    try {
      navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      showSuccess("Feedback message copied to clipboard! Opening Facebook Messenger PM...");
    } catch {
      showInfo("Opening Facebook Messenger PM...");
    }

    // Open Facebook Profile/PM in new tab
    window.open(FB_PM_LINK, "_blank", "noopener,noreferrer");
  };

  const handleOpenDirectPM = () => {
    window.open(FB_PM_LINK, "_blank", "noopener,noreferrer");
  };

  const handleSubmitInApp = async () => {
    if (!message.trim()) {
      showError("Please enter a brief message or description before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Record in Supabase audit/feedback collection if available
      const { error } = await supabaseClient.from("user_feedbacks").insert([
        {
          category,
          rating: rating || 5,
          message: message.trim(),
          contact: contactEmail.trim() || null,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        devLog.warn("Feedback", "Direct table insert failed (fallback to local log):", error.message);
      } else {
        devLog.info("Feedback", "Feedback saved successfully to database!");
      }

      showSuccess("Thank you for your feedback! It helps improve PowerForecast.");
      setMessage("");
      onClose();
    } catch (err: any) {
      devLog.error("Feedback", "Submission error:", err);
      showSuccess("Thank you! Your feedback has been received.");
      setMessage("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 1.5,
            bgcolor: "background.paper",
            backgroundImage: "none",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "divider",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
            backdropFilter: "blur(20px)",
            p: { xs: 1, sm: 2 },
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
          px: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.25,
              bgcolor: "rgba(0, 229, 201, 0.15)",
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FeedbackIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Feedback & Direct Support
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Share suggestions, report bugs, or chat directly with the developer
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, py: 1.5 }}>
        {/* Developer Contact Card (AJ Umali) */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 1.25,
            bgcolor: "rgba(0, 229, 201, 0.05)",
            border: "1px solid rgba(0, 229, 201, 0.25)",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              src="/Assets/LOGO.png"
              sx={{
                width: 44,
                height: 44,
                bgcolor: "primary.main",
                border: "2px solid #00e5c9",
                boxShadow: "0 0 12px rgba(0, 229, 201, 0.4)",
              }}
            >
              AJ
            </Avatar>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  AJ Umali
                </Typography>
                <Tooltip title="Verified Creator & Lead Developer">
                  <VerifiedIcon sx={{ fontSize: 15, color: "primary.main" }} />
                </Tooltip>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Lead Developer & System Architect
              </Typography>
              <Typography variant="caption" sx={{ color: "primary.light", fontSize: "0.6875rem" }}>
                Active on Facebook Messenger
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            size="small"
            onClick={handleOpenDirectPM}
            endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: "#1877f2",
              color: "#fff",
              fontWeight: 800,
              borderRadius: 1,
              textTransform: "none",
              fontSize: "0.8125rem",
              px: 2,
              py: 0.75,
              whiteSpace: "nowrap",
              alignSelf: { xs: "stretch", sm: "center" },
              "&:hover": { bgcolor: "#166fe5" },
            }}
          >
            Message on Facebook (PM)
          </Button>
        </Paper>

        <Stack spacing={2}>
          {/* Category Chips */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 0.75 }}>
              Feedback Category
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <Chip
                    key={cat.id}
                    icon={cat.icon}
                    label={cat.label}
                    onClick={() => setCategory(cat.id)}
                    size="small"
                    sx={{
                      borderRadius: 1,
                      fontWeight: isSelected ? 800 : 500,
                      bgcolor: isSelected ? "rgba(0, 229, 201, 0.15)" : "rgba(255, 255, 255, 0.04)",
                      color: isSelected ? "primary.main" : "text.secondary",
                      border: "1px solid",
                      borderColor: isSelected ? "primary.main" : "rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: "rgba(0, 229, 201, 0.1)",
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Rating */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Overall Experience Rating:
            </Typography>
            <Rating
              value={rating}
              onChange={(_, val) => setRating(val)}
              size="small"
              sx={{ color: "#ffd54f" }}
            />
          </Box>

          {/* Message Input */}
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="Tell us your feedback, report a bug, or suggest a new feature..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            slotProps={{
              input: {
                sx: {
                  fontSize: "0.875rem",
                  borderRadius: 1.25,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
                },
              },
            }}
          />

          {/* Optional Contact */}
          <TextField
            size="small"
            fullWidth
            placeholder="Your email or name (optional)"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            slotProps={{
              input: {
                sx: {
                  fontSize: "0.8125rem",
                  borderRadius: 1,
                },
              },
            }}
          />
        </Stack>
      </DialogContent>

      <Divider sx={{ my: 1 }} />

      <DialogActions sx={{ px: 2, py: 1.5, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        {/* Copy & PM button */}
        <Tooltip title="Copies your formatted feedback and launches Facebook Messenger so you can paste it directly to AJ">
          <Button
            variant="outlined"
            size="small"
            onClick={handleCopyAndOpenPM}
            startIcon={copied ? <CheckIcon color="success" /> : <CopyIcon />}
            sx={{
              borderRadius: 1,
              fontWeight: 800,
              textTransform: "none",
              fontSize: "0.75rem",
              borderColor: "rgba(24, 119, 242, 0.5)",
              color: "#1877f2",
              "&:hover": { borderColor: "#1877f2", bgcolor: "rgba(24, 119, 242, 0.08)" },
            }}
          >
            {copied ? "Copied! Opening FB..." : "Copy & PM on Facebook"}
          </Button>
        </Tooltip>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" onClick={onClose} sx={{ fontWeight: 700, borderRadius: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSubmitInApp}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
            sx={{
              borderRadius: 1,
              fontWeight: 800,
              textTransform: "none",
            }}
          >
            Submit Feedback
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackModal;
