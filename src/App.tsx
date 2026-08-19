import React from "react";
import { Refine } from "@refinedev/core";
import routerBindings, {
  UnsavedChangesNotifier,
} from "@refinedev/react-router-v6";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { localDataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";
import { Layout } from "./components/layout/Layout";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CalculatorPage } from "./pages/CalculatorPage";
import { AppliancesPage } from "./pages/AppliancesPage";
import { CalendarPage } from "./pages/CalendarPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { LayoutDashboard, Calendar, Zap, Calculator, BarChart3 } from "lucide-react";

export const App: React.FC = () => {
  return (
    <HashRouter>
      <Refine
        dataProvider={localDataProvider}
        authProvider={authProvider}
        routerProvider={routerBindings}
        resources={[
          {
            name: "dashboard",
            list: "/dashboard",
            meta: {
              label: "Dashboard",
              icon: <LayoutDashboard className="w-4 h-4" />,
            },
          },
          {
            name: "calculator",
            list: "/calculator",
            meta: {
              label: "Bill Calculator",
              icon: <Calculator className="w-4 h-4" />,
            },
          },
          {
            name: "user_appliances",
            list: "/appliances",
            meta: {
              label: "Appliances Hub",
              icon: <Zap className="w-4 h-4" />,
            },
          },
          {
            name: "user_calendar_events",
            list: "/calendar",
            meta: {
              label: "Smart Calendar",
              icon: <Calendar className="w-4 h-4" />,
            },
          },
          {
            name: "analytics",
            list: "/analytics",
            meta: {
              label: "Analytics & Forecast",
              icon: <BarChart3 className="w-4 h-4" />,
            },
          },
        ]}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
        }}
      >
        <Routes>
          {/* Public Landing / Home Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />

          {/* Authentication Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* App Workspace Pages (under Layout) */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/calculator" element={<CalculatorPage />} />
            <Route path="/appliances" element={<AppliancesPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <UnsavedChangesNotifier />
      </Refine>
    </HashRouter>
  );
};

export default App;
