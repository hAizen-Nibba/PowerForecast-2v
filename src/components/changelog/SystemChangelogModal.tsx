import React, { useState, useEffect, useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import Fade from "@mui/material/Fade";
import {
  Close as CloseIcon,
  Search as SearchIcon,
  GitHub as GitHubIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  HistoryEdu as ChangelogIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  Verified as VerifiedIcon,
  Terminal as TerminalIcon,
  FiberManualRecord as DotIcon,
} from "@mui/icons-material";
import { supabaseClient, APP_VERSION } from "../../lib/supabaseClient";

export interface SystemChangelogEntry {
  id?: string;
  version: string;
  description: string;
  git_commit_tag?: string;
  deployed_by?: string;
  created_at?: string;
}

// Fallback historical changelog cache in case of offline/network issues
const FALLBACK_CHANGELOGS: SystemChangelogEntry[] = [
  {
    id: "2.13.DEV-fallback",
    version: "2.13.DEV",
    description: "2.13.DEV - Harmonize DevLogs floating widget colors with obsidian & teal system theme, add interactive GitHub Version Changelog Viewer Modal with audit log sync",
    git_commit_tag: "2.13.DEV",
    deployed_by: "Antigravity Developer",
    created_at: new Date().toISOString(),
  },
  {
    id: "2.13.1v-fallback",
    version: "2.13.1v",
    description: "2.13.1v - Overnight stopwatch 11:59 PM auto-save rollover, live multi-day timeline previews, and Option 1 smart allocation anti-duplication sync",
    git_commit_tag: "2.13.1v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-28T02:00:59.995Z",
  },
  {
    id: "2.13.0v-fallback",
    version: "2.13.0v",
    description: "2.13.0v - Fix calculator, popover, auth, and component color schemes to match graphite and cyan palette",
    git_commit_tag: "2.13.0v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-27T03:03:51.000Z",
  },
  {
    id: "2.12.2v-fallback",
    version: "2.12.2v",
    description: "2.12.2v - Bento corner radius harmonization across entire application, complete emoji removal, and theme aesthetics refinement",
    git_commit_tag: "2.12.2v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-27T02:44:46.000Z",
  },
  {
    id: "2.12.1v-fallback",
    version: "2.12.1v",
    description: "2.12.1v - Add live stopwatch start/stop controls inside DateAnalyticsModal for Today with real-time session logging and visual receipts",
    git_commit_tag: "2.12.1v",
    deployed_by: "Antigravity Release Bot",
    created_at: "2026-08-26T23:09:16.390Z",
  },
  {
    id: "2.12.0v-fallback",
    version: "2.12.0v",
    description: "2.12.0v - Major Release: Appliance Target Quota system with interactive Mini Calendar historical backfill, 3-mode contextual calendar telemetry, Progressive Routine conversion, and comprehensive English & Tagalog guided tours",
    git_commit_tag: "2.12.0v",
    deployed_by: "Antigravity Release Bot",
    created_at: "2026-08-26T23:01:48.401Z",
  },
  {
    id: "2.11.1cv-fallback",
    version: "2.11.1cv",
    description: "2.11.1cv - Comprehensive system-flow aligned overhaul of guided tours across all 6 pages with pure English and Tagalog support (Taglish removed)",
    git_commit_tag: "2.11.1cv",
    deployed_by: "Antigravity Release Bot",
    created_at: "2026-08-26T22:58:52.299Z",
  },
  {
    id: "2.11.1bv-fallback",
    version: "2.11.1bv",
    description: "2.11.1bv - Replace from-to date inputs with interactive Mini Calendar Grid date selector locked strictly to current account month with past day toggleable presets and future date locking",
    git_commit_tag: "2.11.1bv",
    deployed_by: "Antigravity Release Bot",
    created_at: "2026-08-26T22:50:24.024Z",
  },
  {
    id: "2.11.1v-fallback",
    version: "2.11.1v",
    description: "2.11.1v - Add ApplianceRoutineModal with Quick Target Quota & Elaborated Past Dates backfill on catalog import, graceful warning on 0h save, remove Use Routine Defaults toolbar button, and add interactive past timeline tracks with Progressive Routine Conversion prompt",
    git_commit_tag: "2.11.1v",
    deployed_by: "Antigravity Release Bot",
    created_at: "2026-08-26T22:35:42.073Z",
  },
  {
    id: "2.11.0bv-fallback",
    version: "2.11.0bv",
    description: "2.11.0bv - Implement Smart Date-Aware Autofill with Exclude Today toggle, decouple routine target quota from stopwatch runtime, and add date-contextual telemetry modes",
    git_commit_tag: "2.11.0bv",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-26T21:42:44.825Z",
  },
  {
    id: "2.11.0v-fallback",
    version: "2.11.0v",
    description: "2.11.0v - Release PowerForecast 2.11.0 with refactored 24h activity timeline, enhanced calendar telemetry modal, and live stopwatch tracking",
    git_commit_tag: "2.11.0v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-26T21:20:23.505Z",
  },
  {
    id: "2.10.7v-fallback",
    version: "2.10.7v",
    description: "2.10.7v - Refactor 24-hour activity timeline and calendar analytics modal to remove simulated routine slots, optimize live stopwatch telemetry, and streamline session inspections",
    git_commit_tag: "2.10.7v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-26T21:13:49.811Z",
  },
  {
    id: "2.10.6v-fallback",
    version: "2.10.6v",
    description: "2.10.6v - Remove email verification requirement and redirect on registration to allow immediate post-signup access to dashboard",
    git_commit_tag: "2.10.6v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-26T17:42:39.247Z",
  },
  {
    id: "2.10.5v-fallback",
    version: "2.10.5v",
    description: "2.10.5v - Fix calendar space filter leakage, resolve DateAnalyticsModal slider lock-in override, and include live running stopwatches in Today cell metrics",
    git_commit_tag: "2.10.5v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-26T17:14:05.308Z",
  },
  {
    id: "2.10.4v-fallback",
    version: "2.10.4v",
    description: "2.10.4v - Implement registration timestamp guard, global token invalidation on auto-confirm, and database connection telemetry",
    git_commit_tag: "2.10.4v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-26T17:04:20.863Z",
  },
  {
    id: "2.10.3v-fallback",
    version: "2.10.3v",
    description: "2.10.3v - Add interactive 24-hour timeline block inspector with click-to-edit and delete actions, auto-log past routine baselines into appliance_usage_logs for session log visibility, and add inline edit and update support in Schedule Queue.",
    git_commit_tag: "2.10.3v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-26T16:20:01.514Z",
  },
  {
    id: "2.10.2v-fallback",
    version: "2.10.2v",
    description: "2.10.2v - Fix 24-hour activity timeline calculation and visual collision bugs: enforce 24.0h daily cap, prevent duplicate manual block accounting, implement non-overlapping idle slot allocation algorithm, and refine timeline in-bar label typography",
    git_commit_tag: "2.10.2v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-26T15:51:24.254Z",
  },
  {
    id: "2.10.1v-fallback",
    version: "2.10.1v",
    description: "2.10.1v - Resolve 7 calendar & daily usage logic loopholes: fix double-counting on log updates, reconcile orphaned usage on log delete, prevent passive timer drift in stopwatch edit mode, fix 24h load curve modulo collapse, prevent live session overwrite in date analytics, parse routine autofill dates at local midnight, and await bulk async deletes",
    git_commit_tag: "2.10.1v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-26T15:23:31.871Z",
  },
  {
    id: "2.10.0v-fallback",
    version: "2.10.0v",
    description: "2.10.0v - Implement user registration email verification flow with cross-tab sync, optimize live power demand memoization, and add comprehensive auth documentation",
    git_commit_tag: "2.10.0v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-26T14:49:27.693Z",
  },
  {
    id: "2.6.1cv-fallback",
    version: "2.6.1cv",
    description: "2.6.1cv - Audit landing page copy to remove overpromised claims and ground features in real system capabilities, add mobile navigation drawer, and refine scrollspy boundary calculations.",
    git_commit_tag: "2.6.1cv",
    deployed_by: "System",
    created_at: "2026-08-24T13:58:17.534Z",
  },
  {
    id: "2.6.0v-fallback",
    version: "2.6.0v",
    description: "2.6.0v - Release major version 2.6.0 with interactive multi-language guided tour and onboarding system across Dashboard to Forecasting",
    git_commit_tag: "2.6.0v",
    deployed_by: "Antigravity Developer",
    created_at: "2026-08-24T12:50:10.125Z",
  },
];

const GITHUB_REPO_URL = "https://github.com/hAizen-Nibba/PowerForecast-2v";

interface SystemChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemChangelogModal: React.FC<SystemChangelogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [changelogs, setChangelogs] = useState<SystemChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchChangelogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("system_changelogs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setChangelogs(FALLBACK_CHANGELOGS);
      } else {
        // Merge with current in-memory version if newer
        const exists = data.some((d: any) => d.version === APP_VERSION);
        if (!exists) {
          const currentEntry: SystemChangelogEntry = {
            id: "current-runtime",
            version: APP_VERSION,
            description: `${APP_VERSION} - Active runtime development version with live database synchronization and telemetry`,
            git_commit_tag: APP_VERSION,
            deployed_by: "Antigravity Developer",
            created_at: new Date().toISOString(),
          };
          setChangelogs([currentEntry, ...data]);
        } else {
          setChangelogs(data);
        }
      }
    } catch {
      setChangelogs(FALLBACK_CHANGELOGS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChangelogs();
    }
  }, [isOpen]);

  const handleCopyChangelog = (item: SystemChangelogEntry) => {
    const text = `[PowerForecast Release ${item.version}]\nDate: ${item.created_at ? new Date(item.created_at).toLocaleString() : "Recent"}\nAuthor: ${item.deployed_by || "Developer"}\n\n${item.description}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id || item.version);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter options
  const filterOptions = [
    { id: "all", label: "All Releases" },
    { id: "2.13", label: "v2.13.x" },
    { id: "2.12", label: "v2.12.x" },
    { id: "2.11", label: "v2.11.x" },
    { id: "2.10", label: "v2.10.x" },
    { id: "2.6", label: "v2.6.x" },
  ];

  const filteredChangelogs = useMemo(() => {
    return changelogs.filter((entry) => {
      const matchesSearch =
        searchQuery === "" ||
        entry.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.deployed_by && entry.deployed_by.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag =
        selectedTagFilter === "all" ||
        entry.version.toLowerCase().startsWith(selectedTagFilter.toLowerCase());

      return matchesSearch && matchesTag;
    });
  }, [changelogs, searchQuery, selectedTagFilter]);

  const openGitHubTag = (tag?: string) => {
    if (tag) {
      window.open(`${GITHUB_REPO_URL}/releases/tag/${tag}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(GITHUB_REPO_URL, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(8px)",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
          },
        },
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: "#13161c",
            backgroundImage: "none",
            border: "1px solid #262c37",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7)",
            color: "text.primary",
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 2.5,
          pb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderB: "1px solid #242934",
          bgcolor: "#181c23",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: "rgba(0, 229, 201, 0.12)",
              border: "1px solid rgba(0, 229, 201, 0.3)",
              color: "#00e5c9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChangelogIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#ffffff" }}>
                Release History & Audit Changelogs
              </Typography>
              <Chip
                label={`${APP_VERSION} • Current`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.6875rem",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  bgcolor: "rgba(0, 229, 201, 0.15)",
                  color: "#00e5c9",
                  border: "1px solid rgba(0, 229, 201, 0.35)",
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", display: "block" }}>
              GitHub repository release audit trail with verified database parity
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<GitHubIcon sx={{ fontSize: 16 }} />}
            endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
            onClick={() => window.open(GITHUB_REPO_URL, "_blank", "noopener,noreferrer")}
            sx={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "none",
              color: "#f1f5f9",
              borderColor: "#2e3542",
              bgcolor: "#1c2028",
              "&:hover": {
                borderColor: "#00e5c9",
                bgcolor: "#242a35",
              },
            }}
          >
            GitHub Repo
          </Button>
          <IconButton
            size="small"
            onClick={fetchChangelogs}
            disabled={isLoading}
            title="Refresh logs from Supabase DB"
            sx={{ color: "text.secondary", "&:hover": { color: "#00e5c9" } }}
          >
            <RefreshIcon sx={{ fontSize: 18, animation: isLoading ? "spin 1s linear infinite" : "none" }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: "text.secondary", "&:hover": { color: "#ffffff", bgcolor: "rgba(255,255,255,0.08)" } }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Search & Filter Toolbar */}
      <Box
        sx={{
          p: 2,
          bgcolor: "#15181f",
          borderBottom: "1px solid #242934",
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search updates by keyword, module, or version tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery("")}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  bgcolor: "#1c2028",
                  borderRadius: 2,
                  fontSize: "0.8125rem",
                  "& fieldset": { borderColor: "#2e3542" },
                  "&:hover fieldset": { borderColor: "#404858" },
                  "&.Mui-focused fieldset": { borderColor: "#00e5c9" },
                },
              },
            }}
          />
        </Box>

        {/* Filter Pills */}
        <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto", pb: 0.25 }}>
          {filterOptions.map((opt) => (
            <Chip
              key={opt.id}
              label={opt.label}
              size="small"
              clickable
              onClick={() => setSelectedTagFilter(opt.id)}
              sx={{
                height: 24,
                fontSize: "0.6875rem",
                fontWeight: 700,
                borderRadius: 1.5,
                bgcolor: selectedTagFilter === opt.id ? "#00e5c9" : "#1c2028",
                color: selectedTagFilter === opt.id ? "#0c1b18" : "text.secondary",
                border: "1px solid",
                borderColor: selectedTagFilter === opt.id ? "#00c4aa" : "#282e3a",
                "&:hover": {
                  bgcolor: selectedTagFilter === opt.id ? "#00e5c9" : "#242a35",
                  borderColor: selectedTagFilter === opt.id ? "#00c4aa" : "#384050",
                  color: selectedTagFilter === opt.id ? "#0c1b18" : "#ffffff",
                },
              }}
            />
          ))}
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: "monospace" }}>
              Showing {filteredChangelogs.length} release(s)
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Changelog Feed */}
      <DialogContent
        sx={{
          p: 2.5,
          flex: 1,
          overflowY: "auto",
          bgcolor: "#13161c",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {isLoading && changelogs.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, gap: 1.5 }}>
            <CircularProgress size={32} sx={{ color: "#00e5c9" }} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Loading audit changelogs from database...
            </Typography>
          </Box>
        ) : filteredChangelogs.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
            <TerminalIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              No releases matching "{searchQuery}"
            </Typography>
            <Typography variant="caption">
              Try adjusting your search query or tag filter above.
            </Typography>
          </Box>
        ) : (
          filteredChangelogs.map((item, idx) => {
            const isLatest = idx === 0;
            const isCurrentRuntime = item.version === APP_VERSION;
            const isCopied = copiedId === (item.id || item.version);
            const dateStr = item.created_at
              ? new Date(item.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recent";

            return (
              <Paper
                key={item.id || item.version}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: isCurrentRuntime ? "rgba(0, 229, 201, 0.04)" : "#181c23",
                  borderColor: isCurrentRuntime ? "rgba(0, 229, 201, 0.35)" : "#242a34",
                  boxShadow: isCurrentRuntime ? "0 4px 20px rgba(0, 229, 201, 0.08)" : "none",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: isCurrentRuntime ? "#00e5c9" : "#384050",
                    bgcolor: isCurrentRuntime ? "rgba(0, 229, 201, 0.06)" : "#1b1f27",
                  },
                }}
              >
                {/* Release Card Header */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1.25 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      icon={isLatest ? <DotIcon sx={{ fontSize: "10px !important", color: "#10b981 !important" }} /> : undefined}
                      label={item.version}
                      size="small"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        bgcolor: isCurrentRuntime ? "rgba(0, 229, 201, 0.18)" : "#202530",
                        color: isCurrentRuntime ? "#00e5c9" : "#f1f5f9",
                        border: "1px solid",
                        borderColor: isCurrentRuntime ? "rgba(0, 229, 201, 0.45)" : "#2e3544",
                      }}
                    />
                    {isCurrentRuntime && (
                      <Chip
                        label="ACTIVE UI VERSION"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.625rem",
                          fontWeight: 800,
                          bgcolor: "rgba(16, 185, 129, 0.15)",
                          color: "#34d399",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                      />
                    )}
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      • {dateStr}
                    </Typography>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    {item.deployed_by && (
                      <Chip
                        icon={<VerifiedIcon sx={{ fontSize: "12px !important", color: "#06b6d4 !important" }} />}
                        label={item.deployed_by}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.625rem",
                          fontWeight: 600,
                          bgcolor: "rgba(6, 182, 212, 0.1)",
                          color: "#22d3ee",
                          border: "1px solid rgba(6, 182, 212, 0.2)",
                        }}
                      />
                    )}
                    <Tooltip title={isCopied ? "Copied to clipboard!" : "Copy release details"}>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyChangelog(item)}
                        sx={{
                          p: 0.5,
                          borderRadius: 1.5,
                          bgcolor: "#1e232c",
                          color: isCopied ? "#34d399" : "text.secondary",
                          border: "1px solid #29303d",
                          "&:hover": { color: "#ffffff", bgcolor: "#262c37" },
                        }}
                      >
                        {isCopied ? <CheckIcon sx={{ fontSize: 14 }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Tag on GitHub">
                      <IconButton
                        size="small"
                        onClick={() => openGitHubTag(item.git_commit_tag || item.version)}
                        sx={{
                          p: 0.5,
                          borderRadius: 1.5,
                          bgcolor: "#1e232c",
                          color: "text.secondary",
                          border: "1px solid #29303d",
                          "&:hover": { color: "#00e5c9", bgcolor: "#262c37" },
                        }}
                      >
                        <GitHubIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Description Body */}
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "0.8125rem",
                    lineHeight: 1.6,
                    color: "#e2e8f0",
                    fontFamily: "inherit",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {item.description}
                </Typography>
              </Paper>
            );
          })
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SystemChangelogModal;
