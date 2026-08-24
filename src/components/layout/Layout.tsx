import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Box from "@mui/material/Box";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AiVisionScannerModal } from "../vision/AiVisionScannerModal";
import { DevLogsFloatingWidget } from "../devlogs/DevLogsFloatingWidget";
import { VersionBadge } from "../common/VersionBadge";
import { useColorMode } from "../../theme/AppTheme";
import { TourProvider } from "../tour/TourProvider";

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const { mode, toggleColorMode } = useColorMode();

  return (
    <TourProvider>
      <Box
        sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        transition: "background-color 0.24s cubic-bezier(0.4, 0, 0.2, 1), color 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Left Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Viewport & Header */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          pl: { xs: 0, lg: "260px" },
          position: "relative",
          zIndex: 10,
          transition: "padding-left 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          isDark={mode === "dark"}
          onToggleTheme={toggleColorMode}
          onOpenAiScanner={() => setIsAiScannerOpen(true)}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: { xs: 2, sm: 3, md: 4, lg: 4.5 },
            py: { xs: 2.5, sm: 3.5, md: 4 },
            maxWidth: 1360,
            width: "100%",
            mx: "auto",
            pb: { xs: 8, sm: 10, md: 12 },
            boxSizing: "border-box",
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Global Modals & Widgets */}
      <AiVisionScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
      />

      {/* Global Draggable Floating Dev Logs & Telemetry Widget */}
      <DevLogsFloatingWidget />

      {/* Persistent Version Display on Bottom-Right Corner */}
      <VersionBadge />
    </Box>
  </TourProvider>
  );
};

export default Layout;
