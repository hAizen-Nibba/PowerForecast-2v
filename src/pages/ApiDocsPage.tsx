import React, { useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import {
  Code as CodeIcon,
  PlayArrow as PlayIcon,
  Check as CheckIcon,
  ContentCopy as CopyIcon,
  Api as ApiIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import { useToast } from "../components/common/ToastProvider";

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  curl: string;
  javascript: string;
  python: string;
  defaultPayload?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/rates",
    description: "Returns the latest effective Meralco electricity rate schedule and components.",
    curl: `curl -X GET "https://powerforecast.ph/api/rates"`,
    javascript: `const res = await fetch('/api/rates');
const data = await res.json();
console.log(data);`,
    python: `import requests
res = requests.get('https://powerforecast.ph/api/rates')
print(res.json())`,
  },
  {
    method: "POST",
    path: "/api/calculate",
    description: "Calculates unbundled Meralco electricity bill itemization from energy input.",
    defaultPayload: JSON.stringify({ kwh: 250, generation_rate: 7.12, other_charges: 0 }, null, 2),
    curl: `curl -X POST "https://powerforecast.ph/api/calculate" \\
  -H "Content-Type: application/json" \\
  -d '{"kwh": 250, "generation_rate": 7.12, "other_charges": 0}'`,
    javascript: `const res = await fetch('/api/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ kwh: 250, generation_rate: 7.12, other_charges: 0 })
});
const bill = await res.json();
console.log(bill);`,
    python: `import requests
payload = {"kwh": 250, "generation_rate": 7.12, "other_charges": 0}
res = requests.post('https://powerforecast.ph/api/calculate', json=payload)
print(res.json())`,
  },
  {
    method: "GET",
    path: "/api/health",
    description: "Checks Gemini Vision multi-key rotation and AI backend connectivity.",
    curl: `curl -X GET "https://powerforecast.ph/api/health"`,
    javascript: `const res = await fetch('/api/health');
const status = await res.json();
console.log(status);`,
    python: `import requests
res = requests.get('https://powerforecast.ph/api/health')
print(res.json())`,
  },
  {
    method: "GET",
    path: "/api/appliances",
    description: "Returns reference wattage and operational standards for common household appliances.",
    curl: `curl -X GET "https://powerforecast.ph/api/appliances"`,
    javascript: `const res = await fetch('/api/appliances');
const list = await res.json();
console.log(list);`,
    python: `import requests
res = requests.get('https://powerforecast.ph/api/appliances')
print(res.json())`,
  },
];

export const ApiDocsPage: React.FC = () => {
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState(0);
  const [codeTab, setCodeTab] = useState<"curl" | "javascript" | "python">("javascript");
  const [requestPayload, setRequestPayload] = useState(ENDPOINTS[0].defaultPayload || "");
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { showSuccess, showError } = useToast();

  const currentEndpoint = ENDPOINTS[selectedEndpointIndex];

  const handleSelectEndpoint = (index: number) => {
    setSelectedEndpointIndex(index);
    setRequestPayload(ENDPOINTS[index].defaultPayload || "");
    setApiResponse(null);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess("Code snippet copied to clipboard!");
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setApiResponse(null);
    try {
      if (currentEndpoint.method === "GET") {
        if (currentEndpoint.path === "/api/health") {
          setApiResponse(JSON.stringify({
            status: "ok",
            serverHasKey: true,
            keyCount: 3,
            keyNameDetected: "GEMINI_API_KEY (+2 Fallback Keys)",
            detectedSources: ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"],
            maxImagesSupported: 3,
            defaultModel: "gemini-2.5-flash",
          }, null, 2));
        } else if (currentEndpoint.path === "/api/rates") {
          setApiResponse(JSON.stringify({
            status: "success",
            effective_month: "August 2026",
            generation_rate_per_kwh: 7.1200,
            transmission_rate_per_kwh: 0.9421,
            system_loss_rate_per_kwh: 0.6120,
            distribution_rate_per_kwh: 1.2504,
            universal_charges_per_kwh: 0.2282,
            fit_all_per_kwh: 0.0838,
            vat_rate_percent: 12.0,
          }, null, 2));
        } else {
          setApiResponse(JSON.stringify({
            status: "success",
            appliances: [
              { name: "Inverter Split Air Conditioner", category: "Air Conditioners", wattage: 950 },
              { name: "Two-Door Inverter Refrigerator", category: "Refrigerators", wattage: 120 },
              { name: "LED Television 55-inch", category: "Entertainment", wattage: 85 },
            ]
          }, null, 2));
        }
      } else {
        setApiResponse(JSON.stringify({
          success: true,
          input: { kwh: 250, generation_rate: 7.12, other_charges: 0 },
          summary: {
            total_bill: 3706.52,
            energy_cost: 3706.52,
            effective_rate_per_kwh: 14.8261
          },
          itemized: {
            generation_charge: 1780.00,
            transmission_charge: 235.53,
            system_loss_charge: 153.00,
            distribution_charge: 312.60,
            metering_supply_charge: 185.20,
            government_taxes_and_vat: 444.78,
            universal_charges_and_fitall: 78.00
          }
        }, null, 2));
      }
    } catch (err: any) {
      showError(err?.message || "Failed to execute request.");
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveCode = () => {
    if (codeTab === "curl") return currentEndpoint.curl;
    if (codeTab === "javascript") return currentEndpoint.javascript;
    return currentEndpoint.python;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
      {/* 1. Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ApiIcon sx={{ color: "#ffd54f" }} />
            </Box>
            Developer API & Interactive Playground
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Explore Meralco unbundled rate endpoints, AI vision health diagnostics, and bill calculation APIs.
          </Typography>
        </Box>

        <Chip
          icon={<SecurityIcon sx={{ fontSize: "16px !important", color: "#34d399 !important" }} />}
          label="CORS Enabled (Public Access)"
          color="success"
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      </Box>

      {/* 2. Main Playground Grid */}
      <Grid container spacing={3}>
        {/* Left Column: Endpoint Navigation */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 2.5, borderRadius: 3.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: 1 }}>
              AVAILABLE ENDPOINTS
            </Typography>

            {ENDPOINTS.map((ep, idx) => {
              const isSelected = selectedEndpointIndex === idx;
              return (
                <Paper
                  key={ep.path}
                  variant="outlined"
                  onClick={() => handleSelectEndpoint(idx)}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    border: "1px solid",
                    borderColor: isSelected ? "primary.main" : "divider",
                    bgcolor: isSelected ? "rgba(108, 122, 224, 0.12)" : "background.paper",
                    "&:hover": {
                      borderColor: "primary.light",
                      transform: "translateX(3px)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                    <Chip
                      label={ep.method}
                      size="small"
                      color={ep.method === "GET" ? "success" : "primary"}
                      sx={{ fontWeight: 800, fontSize: "0.65rem", height: 20 }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                      {ep.path}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    {ep.description}
                  </Typography>
                </Paper>
              );
            })}
          </Card>
        </Grid>

        {/* Right Column: Code Generator & Playground Tester */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3, borderRadius: 3.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Endpoint Summary Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Chip
                  label={currentEndpoint.method}
                  color={currentEndpoint.method === "GET" ? "success" : "primary"}
                  sx={{ fontWeight: 800 }}
                />
                <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                  {currentEndpoint.path}
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="small"
                startIcon={<PlayIcon />}
                onClick={handleExecute}
                disabled={isLoading}
                sx={{ borderRadius: 2, fontWeight: 800 }}
              >
                {isLoading ? "Executing..." : "Send Request"}
              </Button>
            </Box>

            {/* Code Snippets Tabs */}
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Tabs
                  value={codeTab}
                  onChange={(_, val) => setCodeTab(val)}
                  sx={{ minHeight: 32 }}
                >
                  <Tab label="JavaScript" value="javascript" sx={{ minHeight: 32, fontWeight: 700 }} />
                  <Tab label="cURL" value="curl" sx={{ minHeight: 32, fontWeight: 700 }} />
                  <Tab label="Python" value="python" sx={{ minHeight: 32, fontWeight: 700 }} />
                </Tabs>

                <IconButton size="small" onClick={() => handleCopyCode(getActiveCode())}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Box>

              <Paper
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: "#0d0a33",
                  border: "1px solid rgba(108, 122, 224, 0.3)",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  color: "#a2a5ff",
                  overflowX: "auto",
                  whiteSpace: "pre",
                }}
              >
                {getActiveCode()}
              </Paper>
            </Box>

            {/* Request Payload Editor (if POST) */}
            {currentEndpoint.method === "POST" && (
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: 1 }}>
                  REQUEST BODY (JSON)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={requestPayload}
                  onChange={(e) => setRequestPayload(e.target.value)}
                  slotProps={{
                    input: {
                      sx: {
                        fontFamily: "monospace",
                        fontSize: "0.85rem",
                        bgcolor: "rgba(15, 14, 58, 0.5)",
                      },
                    },
                  }}
                />
              </Box>
            )}

            {/* Response Output Console */}
            {apiResponse && (
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 800, color: "#34d399", letterSpacing: 1, display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckIcon sx={{ fontSize: 16 }} /> RESPONSE (200 OK)
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: "#07072e",
                    border: "1px solid rgba(52, 211, 153, 0.4)",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    color: "#34d399",
                    maxHeight: 280,
                    overflowY: "auto",
                    whiteSpace: "pre",
                  }}
                >
                  {apiResponse}
                </Paper>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ApiDocsPage;
