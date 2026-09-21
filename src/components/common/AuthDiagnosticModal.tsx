import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import {
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  Storage as StorageIcon,
  PhoneAndroid as PhoneIcon,
  Computer as ComputerIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  BugReport as BugReportIcon,
} from "@mui/icons-material";
import { DiagnosticReport, runAuthDiagnostics } from "../../lib/diagnostics";
import { useToast } from "./ToastProvider";

interface AuthDiagnosticModalProps {
  open: boolean;
  onClose: () => void;
  initialReport?: DiagnosticReport | null;
  rawError?: any;
  onRetry?: () => void;
}

export const AuthDiagnosticModal: React.FC<AuthDiagnosticModalProps> = ({
  open,
  onClose,
  initialReport,
  rawError,
  onRetry,
}) => {
  const { showSuccess } = useToast();
  const [report, setReport] = useState<DiagnosticReport | null>(initialReport || null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  // Re-run diagnostics on demand
  const handleReRun = async () => {
    setIsRunning(true);
    try {
      const newReport = await runAuthDiagnostics(rawError);
      setReport(newReport);
    } finally {
      setIsRunning(false);
    }
  };

  // Synchronize when initialReport changes
  React.useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
    } else if (open && !report) {
      handleReRun();
    }
  }, [initialReport, open]);

  const handleCopy = async () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    try {
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      showSuccess("Diagnostic log copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers / webviews
      const textArea = document.createElement("textarea");
      textArea.value = jsonStr;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      showSuccess("Diagnostic log copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
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
            borderRadius: 2.5,
            p: 1,
            bgcolor: "background.paper",
            backgroundImage: "none",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
            border: "1px solid",
            borderColor: "divider",
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
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              p: 0.75,
              borderRadius: 1.5,
              bgcolor: report?.errorAnalysis?.category === "credentials" ? "warning.main" : "error.main",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BugReportIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Authentication Diagnostics
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Mobile & Cloud Connection Inspector
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        {isRunning ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 2 }}>
            <CircularProgress size={36} color="primary" />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Testing Supabase connection, storage, and device environment...
            </Typography>
          </Box>
        ) : report ? (
          <>
            {/* Primary Status Banner */}
            <Alert
              severity={
                report.errorAnalysis?.category === "credentials"
                  ? "warning"
                  : report.errorAnalysis?.category === "rate_limit"
                  ? "error"
                  : report.errorAnalysis?.category === "network"
                  ? "error"
                  : "info"
              }
              sx={{ borderRadius: 2 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {report.errorAnalysis?.friendlyExplanation || "Authentication Check Complete"}
              </Typography>
              {report.errorAnalysis?.suggestedFix && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  <strong>Suggested Fix:</strong> {report.errorAnalysis.suggestedFix}
                </Typography>
              )}
            </Alert>

            {/* Quick Diagnostic Badges */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {/* Network */}
              <Chip
                icon={report.isOnline ? <WifiIcon fontSize="small" /> : <WifiOffIcon fontSize="small" />}
                label={report.isOnline ? "Network Online" : "Network Offline"}
                color={report.isOnline ? "success" : "error"}
                size="small"
                variant="outlined"
              />

              {/* Supabase Ping */}
              <Chip
                icon={report.supabase.reachable ? <CloudDoneIcon fontSize="small" /> : <CloudOffIcon fontSize="small" />}
                label={
                  report.supabase.reachable
                    ? `Supabase Connected (${report.supabase.latencyMs}ms)`
                    : "Supabase Unreachable"
                }
                color={report.supabase.reachable ? "success" : "error"}
                size="small"
                variant="outlined"
              />

              {/* Storage */}
              <Chip
                icon={<StorageIcon fontSize="small" />}
                label={
                  report.storage.localStorageAvailable
                    ? "Storage Accessible"
                    : "Storage Blocked (Private Mode)"
                }
                color={report.storage.localStorageAvailable ? "success" : "error"}
                size="small"
                variant="outlined"
              />

              {/* Device */}
              <Chip
                icon={report.isMobile ? <PhoneIcon fontSize="small" /> : <ComputerIcon fontSize="small" />}
                label={
                  report.isWebView
                    ? "In-App Browser (WebView)"
                    : report.isMobile
                    ? report.isIOS
                      ? "iOS Mobile"
                      : "Android Mobile"
                    : "Desktop PC"
                }
                color={report.isWebView ? "warning" : "default"}
                size="small"
                variant="outlined"
              />
            </Box>

            {/* In-App Browser Warning if detected */}
            {report.isWebView && (
              <Alert severity="warning" sx={{ borderRadius: 1.5, py: 0.5 }}>
                <Typography variant="caption">
                  You opened this link inside a social media app (e.g. Messenger or Instagram). Please tap the menu and choose <strong>"Open in Chrome"</strong> or <strong>"Open in Safari"</strong> to allow session saving.
                </Typography>
              </Alert>
            )}

            {/* Storage blocked warning */}
            {!report.storage.localStorageAvailable && (
              <Alert severity="error" sx={{ borderRadius: 1.5, py: 0.5 }}>
                <Typography variant="caption">
                  Browser storage is blocked. This usually happens in <strong>Safari Private Browsing</strong>. Please turn off Private Browsing to stay logged in.
                </Typography>
              </Alert>
            )}

            {/* Error Code & Status details */}
            {report.errorAnalysis?.status && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                  HTTP STATUS CODE
                </Typography>
                <Chip
                  label={`${report.errorAnalysis.status} ${report.errorAnalysis.code || report.errorAnalysis.name || ""}`}
                  size="small"
                  color={report.errorAnalysis.status >= 500 ? "error" : "warning"}
                  sx={{ fontFamily: "monospace", fontWeight: 700 }}
                />
              </Box>
            )}

            {/* Technical Details Accordion */}
            <Accordion
              disableGutters
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                "&:before": { display: "none" },
                overflow: "hidden",
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  Technical Payload & Raw Logs
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Box
                  component="pre"
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "background.default",
                    color: "text.primary",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    overflowX: "auto",
                    maxHeight: 200,
                    m: 0,
                  }}
                >
                  {JSON.stringify(report, null, 2)}
                </Box>
              </AccordionDetails>
            </Accordion>
          </>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleReRun}
            startIcon={<RefreshIcon fontSize="small" />}
            disabled={isRunning}
          >
            Re-test
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleCopy}
            startIcon={copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
            color={copied ? "success" : "inherit"}
          >
            {copied ? "Copied!" : "Copy Log"}
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          {onRetry && (
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={() => {
                onClose();
                onRetry();
              }}
            >
              Retry Login
            </Button>
          )}
          <Button size="small" variant="text" onClick={onClose}>
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
