import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Terminal,
  Activity,
  Sparkles,
  Bug,
  Trash2,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Zap,
  Database,
  Pause,
  Play,
  Radio,
} from "lucide-react";
import { devLog, DevLogEntry, LogLevel, LogSource } from "../../lib/devLogger";
import { useLanguage } from "../../context/LanguageContext";

export const SystemDevLogsCard: React.FC = () => {
  const { language } = useLanguage();
  const [logs, setLogs] = useState<DevLogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [hasNewPulse, setHasNewPulse] = useState(false);

  const logListRef = useRef<HTMLDivElement>(null);

  // Subscribe to devLogger events
  useEffect(() => {
    // Initial fetch of logs
    setLogs(devLog.getLogs());

    const unsubscribe = devLog.subscribe((currentLogs, newEntry) => {
      setLogs(currentLogs);
      if (newEntry) {
        setHasNewPulse(true);
        setTimeout(() => setHasNewPulse(false), 1500);
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-scroll to top of list
  useEffect(() => {
    if (autoScroll && logListRef.current) {
      logListRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  // Filter and Search
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === "all" || log.level === filterLevel;
    const matchesSource = filterSource === "all" || log.source === filterSource;
    const matchesSearch =
      searchQuery === "" ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesLevel && matchesSource && matchesSearch;
  });

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  const handleCopyLog = (log: DevLogEntry) => {
    let detailsStr = "None";
    if (log.details) {
      try {
        if (log.details instanceof Error) {
          detailsStr = JSON.stringify(
            {
              name: log.details.name,
              message: log.details.message,
              stack: log.details.stack,
            },
            null,
            2
          );
        } else {
          detailsStr = JSON.stringify(
            log.details,
            (_key, value) => {
              if (value instanceof Error) {
                return { name: value.name, message: value.message, stack: value.stack };
              }
              return value;
            },
            2
          );
        }
      } catch {
        detailsStr = String(log.details);
      }
    }
    const text = `[${log.formattedTime}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}\nDetails: ${detailsStr}`;
    navigator.clipboard.writeText(text);
    setCopiedLogId(log.id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  const handleExportDump = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `powerforecast-devlogs-${new Date().toISOString().slice(0, 19)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case "api":
        return <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-mono text-[10px]">API</span>;
      case "success":
        return <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-mono text-[10px]">SUCCESS</span>;
      case "warn":
        return <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-mono text-[10px]">WARN</span>;
      case "error":
        return <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 font-mono text-[10px]">ERROR</span>;
      case "telemetry":
        return <span className="px-1.5 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800 font-mono text-[10px]">TELEM</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded bg-[#202530] text-slate-300 border border-[#2e3544] font-mono text-[10px]">INFO</span>;
    }
  };

  const getSourceIcon = (source: LogSource) => {
    switch (source) {
      case "AI Scanner":
        return <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
      case "PELP Database":
        return <Database className="w-3.5 h-3.5 text-teal-300 shrink-0" />;
      case "Telemetry":
        return <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case "Calculator":
        return <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
      case "Calendar":
        return <Activity className="w-3.5 h-3.5 text-cyan-300 shrink-0" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  // Distinct sources from existing logs
  const distinctSources = Array.from(new Set(logs.map((l) => l.source))).filter(Boolean);

  return (
    <Card
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        border: "1px solid",
        borderColor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)",
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(20, 24, 30, 0.95)" : "#ffffff",
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 4px 20px rgba(0, 0, 0, 0.5)"
            : "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)",
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Terminal className="w-5 h-5 text-[#00e5c9]" />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
              {language === "tl" ? "System Dev Logs at Telemetry" : "System Dev Logs & Telemetry"}
            </Typography>

            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>

            {errorCount > 0 && (
              <Chip
                icon={<Bug className="w-3.5 h-3.5 !text-rose-300" />}
                label={`${errorCount} Errors`}
                size="small"
                sx={{
                  bgcolor: "rgba(244, 63, 94, 0.15)",
                  color: "#fb7185",
                  border: "1px solid rgba(244, 63, 94, 0.4)",
                  fontWeight: 700,
                  fontSize: "0.6875rem",
                  height: 22,
                }}
              />
            )}
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.75 }}>
            {language === "tl"
              ? "Real-time engine telemetry, Google Gemini 3.7 Flash traces, OCR events, Supabase API calls, at local cache audits."
              : "Real-time engine telemetry, Google Gemini 3.7 Flash traces, OCR events, Supabase API calls, and local cache audits."}
          </Typography>
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title={autoScroll ? "Auto-scroll ON (Click to pause)" : "Auto-scroll PAUSED (Click to resume)"}>
            <IconButton
              size="small"
              onClick={() => setAutoScroll(!autoScroll)}
              sx={{
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1a202c" : "#f1f5f9"),
                border: "1px solid",
                borderColor: (theme) => (theme.palette.mode === "dark" ? "#2d3748" : "#cbd5e1"),
                color: autoScroll ? "#10b981" : "text.secondary",
                "&:hover": {
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "#2d3748" : "#e2e8f0"),
                },
              }}
            >
              {autoScroll ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4 text-amber-400" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Export Logs Dump (.json)">
            <IconButton
              size="small"
              onClick={handleExportDump}
              sx={{
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1a202c" : "#f1f5f9"),
                border: "1px solid",
                borderColor: (theme) => (theme.palette.mode === "dark" ? "#2d3748" : "#cbd5e1"),
                color: "text.secondary",
                "&:hover": {
                  color: "primary.main",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "#2d3748" : "#e2e8f0"),
                },
              }}
            >
              <Download className="w-4 h-4" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Clear Logs">
            <IconButton
              size="small"
              onClick={() => devLog.clear()}
              sx={{
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1a202c" : "#f1f5f9"),
                border: "1px solid",
                borderColor: (theme) => (theme.palette.mode === "dark" ? "#2d3748" : "#cbd5e1"),
                color: "text.secondary",
                "&:hover": {
                  color: "#f43f5e",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "#2d3748" : "#e2e8f0"),
                },
              }}
            >
              <Trash2 className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Terminal View Container */}
      <div className="rounded-xl bg-[#0f1217] border border-[#232936] shadow-inner overflow-hidden flex flex-col">
        {/* Search & Filter Bar */}
        <div className="p-3 bg-[#151921] border-b border-[#232936] space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter logs by keyword, model, or payload..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1b202a] border border-[#2b3343] rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00e5c9] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-0.5"
                >
                  ×
                </button>
              )}
            </div>

            {/* Source Dropdown */}
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="bg-[#1b202a] border border-[#2b3343] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#00e5c9] cursor-pointer"
            >
              <option value="all">All Sources</option>
              {distinctSources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          {/* Level Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            {[
              { id: "all", label: `All (${logs.length})` },
              { id: "api", label: "API Traces" },
              { id: "telemetry", label: "Telemetry" },
              { id: "success", label: "Success" },
              { id: "warn", label: `Warn (${warnCount})` },
              { id: "error", label: `Errors (${errorCount})` },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setFilterLevel(pill.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  filterLevel === pill.id
                    ? "bg-[#00e5c9] text-slate-950 font-bold shadow-xs"
                    : "bg-[#1b202a] text-slate-400 hover:text-white border border-[#2b3343] hover:border-[#3d485e]"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Feed Container */}
        <div
          ref={logListRef}
          className="h-[440px] overflow-y-auto p-3 space-y-2 font-mono text-xs select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <Terminal className="w-9 h-9 mx-auto text-slate-600" />
              <p className="text-xs font-sans text-slate-300">No log entries matching your current filters.</p>
              <p className="text-[11px] font-sans text-slate-500">Interact with the app to generate live telemetry.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isCopied = copiedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    log.level === "error"
                      ? "bg-rose-950/30 border-rose-900/60"
                      : log.level === "warn"
                      ? "bg-amber-950/30 border-amber-900/60"
                      : log.level === "api"
                      ? "bg-cyan-950/20 border-cyan-900/40"
                      : log.level === "success"
                      ? "bg-emerald-950/20 border-emerald-900/40"
                      : "bg-[#141820] border-[#222835] hover:border-[#333c4f]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5">{getSourceIcon(log.source)}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-sans">{log.formattedTime}</span>
                          {getLevelBadge(log.level)}
                          <span className="text-[10px] font-semibold text-teal-300 font-sans">[{log.source}]</span>
                          {log.durationMs !== undefined && (
                            <span className="text-[10px] text-amber-300 font-sans font-medium">
                              ({log.durationMs}ms)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-100 mt-1 break-words font-sans leading-relaxed">
                          {log.message}
                        </p>
                      </div>
                    </div>

                    {/* Log Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopyLog(log)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#232936] transition-colors"
                        title="Copy Log Entry"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {log.details && (
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#232936] transition-colors"
                          title={isExpanded ? "Collapse payload" : "Expand JSON payload"}
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable JSON Payload Inspector */}
                  {isExpanded && log.details && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#232936]">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 font-sans">
                        <span>Payload / Metadata:</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(log.details, null, 2))}
                          className="text-[#00e5c9] hover:underline"
                        >
                          Copy Raw JSON
                        </button>
                      </div>
                      <pre className="p-2.5 rounded bg-[#0b0e12] text-[10px] text-emerald-300 font-mono overflow-x-auto max-h-56 whitespace-pre-wrap leading-relaxed border border-[#1f2532]">
                        {typeof log.details === "string"
                          ? log.details
                          : JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Status Bar */}
        <div className="p-2.5 bg-[#151921] border-t border-[#232936] flex items-center justify-between text-[11px] text-slate-400 font-mono flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>Total: <strong className="text-white">{logs.length}</strong></span>
            <span>Errors: <strong className={errorCount > 0 ? "text-rose-400" : "text-slate-400"}>{errorCount}</strong></span>
            <span>Filtered: <strong className="text-amber-300">{filteredLogs.length}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-teal-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-sans text-[11px]">Gemini 3.7 Flash Active</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SystemDevLogsCard;
