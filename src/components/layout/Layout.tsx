import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AiVisionScannerModal } from "../vision/AiVisionScannerModal";
import { DevLogsFloatingWidget } from "../devlogs/DevLogsFloatingWidget";
import { VersionBadge } from "../common/VersionBadge";
import { useColorMode } from "../../theme/AppTheme";

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const { mode, toggleColorMode } = useColorMode();

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        transition: "background-color 0.3s ease, color 0.3s ease",
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
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1280,
            width: "100%",
            mx: "auto",
            pb: 10,
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
  );
};

export default Layout;
