import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  Close as CloseIcon,
  Key as KeyIcon,
  Add as AddIcon,
  Delete as DeleteOutlineIcon,
  CheckCircle as CheckCircleOutlineIcon,
  Error as ErrorOutlineIcon,
} from "@mui/icons-material";
import {
  getGeminiApiKeyPool,
  getGeminiKeyStatus,
  saveGeminiApiKeys,
  testGeminiApiKey,
} from "../../lib/geminiKeyService";

interface GeminiKeyConfigModalProps {
  open: boolean;
  onClose: () => void;
}

export const GeminiKeyConfigModal: React.FC<GeminiKeyConfigModalProps> = ({
  open,
  onClose,
}) => {
  const [primaryKey, setPrimaryKey] = useState<string>("");
  const [fallbackKeys, setFallbackKeys] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      const pool = getGeminiApiKeyPool();
      const storedPrimary = localStorage.getItem("powerforecast_gemini_api_key") || "";
      const storedFallbacks = localStorage.getItem("powerforecast_gemini_fallback_keys");
      
      setPrimaryKey(storedPrimary || pool[0] || "");
      
      let fallbacks: string[] = [];
      if (storedFallbacks) {
        try {
          const parsed = JSON.parse(storedFallbacks);
          if (Array.isArray(parsed)) fallbacks = parsed;
        } catch {
          fallbacks = storedFallbacks.split(/[,;\n\r]+/).filter(Boolean);
        }
      } else if (pool.length > 1) {
        fallbacks = pool.slice(1);
      }
      setFallbackKeys(fallbacks);
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [open]);

  const handleAddFallback = () => {
    setFallbackKeys((prev) => [...prev, ""]);
  };

  const handleUpdateFallback = (index: number, val: string) => {
    setFallbackKeys((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleRemoveFallback = (index: number) => {
    setFallbackKeys((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTest = async () => {
    const keyToTest = primaryKey.trim() || fallbackKeys[0]?.trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: "Please enter at least one API key to test.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(keyToTest);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Connection failed" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const validFallbacks = fallbackKeys.map((k) => k.trim()).filter(Boolean);
    saveGeminiApiKeys(primaryKey.trim(), validFallbacks);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const status = getGeminiKeyStatus();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <KeyIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Gemini AI Multi-Key Manager
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Alert severity="info" sx={{ borderRadius: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Multi-Key Failover Pool Active
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
            If your Primary Key hits rate limits (HTTP 429) or quota exhaustion,
            PowerForecast automatically switches to your Fallback Keys seamlessly.
          </Typography>
        </Alert>

        {/* Current Status Badges */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Chip
            size="small"
            color={status.hasKeys ? "success" : "warning"}
            label={status.hasKeys ? `${status.keyCount} Key(s) Configured` : "No Key Detected"}
            sx={{ fontWeight: 700 }}
          />
          {status.primarySource !== "none" && (
            <Chip
              size="small"
              variant="outlined"
              label={`Source: ${status.primarySource === "localStorage" ? "Browser Storage" : "Vercel / Env"}`}
            />
          )}
        </Box>

        {/* Primary Key Input */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.75, display: "block" }}>
            Primary Gemini API Key (Default)
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="password"
            placeholder="AIzaSy..."
            value={primaryKey}
            onChange={(e) => setPrimaryKey(e.target.value)}
            helperText="Stored locally in your browser. Takes precedence over environment keys."
          />
        </Box>

        <Divider />

        {/* Fallback Keys Pool */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                Automated Fallback Keys (Backup Pool)
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Used automatically when the primary key is exhausted or rate-limited.
              </Typography>
            </Box>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddFallback}
              sx={{ fontSize: "0.75rem", textTransform: "none" }}
            >
              Add Fallback
            </Button>
          </Box>

          {fallbackKeys.length === 0 ? (
            <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
              No fallback keys added. Click "+ Add Fallback" to add secondary keys.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
              {fallbackKeys.map((keyVal, idx) => (
                <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="password"
                    placeholder={`Fallback Key #${idx + 1} (AIzaSy...)`}
                    value={keyVal}
                    onChange={(e) => handleUpdateFallback(idx, e.target.value)}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveFallback(idx)}
                    title="Remove fallback key"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Test Result Message */}
        {testResult && (
          <Alert
            severity={testResult.success ? "success" : "error"}
            icon={testResult.success ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
            sx={{ borderRadius: 1.5 }}
          >
            {testResult.message}
          </Alert>
        )}

        {saveSuccess && (
          <Alert severity="success" sx={{ borderRadius: 1.5 }}>
            API keys saved successfully!
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={handleTest}
          disabled={isTesting}
          startIcon={isTesting ? <CircularProgress size={16} /> : undefined}
        >
          {isTesting ? "Testing..." : "Test Connection"}
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="text" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" size="small" onClick={handleSave}>
            Save Keys
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
