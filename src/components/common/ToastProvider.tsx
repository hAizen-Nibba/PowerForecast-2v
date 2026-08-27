import React, { createContext, useContext, useState, useCallback } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert, { AlertColor } from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";

interface ToastOptions {
  title?: string;
  message: string;
  severity?: AlertColor;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, severity?: AlertColor, title?: string, duration?: number) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastOptions>({
    message: "",
    severity: "info",
    duration: 4000,
  });

  const showToast = useCallback(
    (message: string, severity: AlertColor = "info", title?: string, duration = 4000) => {
      setToast({ message, severity, title, duration });
      setOpen(true);
    },
    []
  );

  const showSuccess = useCallback((message: string, title?: string) => showToast(message, "success", title), [showToast]);
  const showError = useCallback((message: string, title?: string) => showToast(message, "error", title), [showToast]);
  const showWarning = useCallback((message: string, title?: string) => showToast(message, "warning", title), [showToast]);
  const showInfo = useCallback((message: string, title?: string) => showToast(message, "info", title), [showToast]);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={toast.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ mb: 6, zIndex: 99999 }}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          sx={{
            minWidth: 280,
            maxWidth: 420,
            borderRadius: 1,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          {toast.title && <AlertTitle sx={{ fontWeight: 800, mb: 0.5 }}>{toast.title}</AlertTitle>}
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
