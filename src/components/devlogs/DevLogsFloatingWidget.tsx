import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Activity,
  Sparkles,
  Bug,
  Trash2,
  Download,
  Search,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Zap,
  Database,
  Pause,
  Play,
  GripVertical,
  Radio,
  EyeOff,
} from "lucide-react";
import { devLog, DevLogEntry, LogLevel, LogSource } from "../../lib/devLogger";
import { useDevLogsBubble } from "../../hooks/useDevLogsBubble";

export const DevLogsFloatingWidget: React.FC = () => {
  const { isBubbleEnabled, disableBubble } = useDevLogsBubble();

  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DevLogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [hasNewPulse, setHasNewPulse] = useState(false);
  const [isExpandedFull, setIsExpandedFull] = useState(false);

  // Floating Bubble Position (Default bottom-right, placed cleanly above VersionBadge)
  const isMobileScreen = typeof window !== "undefined" ? window.innerWidth < 1024 : false;
  const [bubblePos, setBubblePos] = useState({
    x: typeof window !== "undefined" ? Math.max(20, window.innerWidth - 76) : 1000,
    y: typeof window !== "undefined" ? Math.max(20, window.innerHeight - (isMobileScreen ? 140 : 130)) : 700,
  });

  // Popup Window Position (Default anchored next to bubble)
  const [windowPos, setWindowPos] = useState({
    x: typeof window !== "undefined" ? Math.max(10, window.innerWidth - (window.innerWidth < 640 ? window.innerWidth - 20 : 560)) : 700,
    y: typeof window !== "undefined" ? Math.max(20, window.innerHeight - 620) : 200,
  });

  const isDraggingBubble = useRef(false);
  const bubbleDragStart = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0, hasMoved: false });

  const isDraggingWindow = useRef(false);
  const windowDragStart = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0 });

  const logListRef = useRef<HTMLDivElement>(null);

  // Subscribe to devLogger events
  useEffect(() => {
    // Initial sync
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

  // Adjust coordinates on window resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      setBubblePos((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 70),
        y: Math.min(prev.y, window.innerHeight - (isMobile ? 135 : 120)),
      }));
      setWindowPos((prev) => ({
        x: Math.max(10, Math.min(prev.x, window.innerWidth - 520)),
        y: Math.max(10, Math.min(prev.y, window.innerHeight - 400)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Early return if user disabled the bubble via Developer Options switch
  if (!isBubbleEnabled) {
    return null;
  }

  // --- Bubble Dragging Handlers ---
  const handleBubblePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingBubble.current = true;
    bubbleDragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: bubblePos.x,
      startPosY: bubblePos.y,
      hasMoved: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleBubblePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBubble.current) return;
    const deltaX = e.clientX - bubbleDragStart.current.x;
    const deltaY = e.clientY - bubbleDragStart.current.y;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      bubbleDragStart.current.hasMoved = true;
    }

    const newX = Math.max(10, Math.min(window.innerWidth - 65, bubbleDragStart.current.startPosX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 65, bubbleDragStart.current.startPosY + deltaY));

    setBubblePos({ x: newX, y: newY });
  };

  const handleBubblePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBubble.current) return;
    isDraggingBubble.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture release throws
    }

    // If pointer didn't move significantly, treat as click to toggle window
    if (!bubbleDragStart.current.hasMoved) {
      setIsOpen((prev) => !prev);
    }
  };

  // --- Window Dragging Handlers ---
  const handleWindowPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingWindow.current = true;
    windowDragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: windowPos.x,
      startPosY: windowPos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleWindowPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWindow.current) return;
    const deltaX = e.clientX - windowDragStart.current.x;
    const deltaY = e.clientY - windowDragStart.current.y;

    const newX = Math.max(10, Math.min(window.innerWidth - 300, windowDragStart.current.startPosX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 200, windowDragStart.current.startPosY + deltaY));

    setWindowPos({ x: newX, y: newY });
  };

  const handleWindowPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWindow.current) return;
    isDraggingWindow.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

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
    downloadAnchor.setAttribute("download", `powerforecast-telemetry-${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case "warn":
        return <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono text-[10px]">WARN</span>;
      case "api":
        return <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono text-[10px]">API</span>;
      case "success":
        return <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px]">OK</span>;
      case "error":
        return <span className="px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono text-[10px]">ERROR</span>;
      case "telemetry":
        return <span className="px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 font-mono text-[10px]">TELEM</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono text-[10px]">INFO</span>;
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
        return <Terminal className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    }
  };

  return (
    <>
      {/* 1. DRAGGABLE FLOATING CHAT BUBBLE */}
      <div
        onPointerDown={handleBubblePointerDown}
        onPointerMove={handleBubblePointerMove}
        onPointerUp={handleBubblePointerUp}
        style={{
          position: "fixed",
          left: `${bubblePos.x}px`,
          top: `${bubblePos.y}px`,
          zIndex: 9999,
          touchAction: "none",
        }}
        className="cursor-grab active:cursor-grabbing select-none group"
        title="PowerForecast Live Dev Logs (Drag anywhere / Click to open)"
      >
        <div
          className={`relative w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#09090b]/92 backdrop-blur-xl border shadow-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${
            isOpen
              ? "border-[#00e5c9] ring-4 ring-[#00e5c9]/30 bg-[#121215]"
              : hasNewPulse
              ? "border-emerald-400 ring-4 ring-emerald-500/40"
              : errorCount > 0
              ? "border-rose-500 ring-4 ring-rose-500/30"
              : "border-white/10 hover:border-[#00e5c9]/70 ring-1 ring-white/5"
          }`}
        >
          {/* Glowing background halo */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#00e5c9]/20 via-transparent to-[#10b981]/20 blur-xs pointer-events-none" />

          {/* Icon */}
          <div className="relative text-white flex items-center justify-center">
            {errorCount > 0 ? (
              <Bug className="w-6 h-6 text-rose-400" />
            ) : hasNewPulse ? (
              <Sparkles className="w-6 h-6 text-amber-300 animate-spin" />
            ) : (
              <Terminal className="w-6 h-6 text-[#00e5c9] group-hover:text-white transition-colors" />
            )}
          </div>

          {/* Badge Counter */}
          <span
            className={`absolute -top-1.5 -right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border shadow-md font-mono ${
              errorCount > 0
                ? "bg-rose-600 border-rose-400 text-white animate-pulse"
                : "bg-[#00e5c9] border-[#00c4aa] text-zinc-950 font-bold"
            }`}
          >
            {logs.length > 99 ? "99+" : logs.length}
          </span>

          {/* Live Activity Blinking Dot */}
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#09090b] shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
        </div>
      </div>

      {/* 2. FLOATING DRAGGABLE DEV LOGS POPUP WINDOW */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            left: window.innerWidth < 640 ? "10px" : isExpandedFull ? "20px" : `${windowPos.x}px`,
            top: window.innerWidth < 640 ? "10px" : isExpandedFull ? "20px" : `${windowPos.y}px`,
            width: window.innerWidth < 640 ? "calc(100vw - 20px)" : isExpandedFull ? "calc(100vw - 40px)" : "540px",
            height: window.innerWidth < 640 ? "calc(100dvh - 100px)" : isExpandedFull ? "calc(100vh - 40px)" : "560px",
            zIndex: 9998,
          }}
          className="rounded-2xl bg-[#09090b]/98 backdrop-blur-2xl border border-[#27272a] shadow-2xl flex flex-col overflow-hidden text-zinc-200 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10"
        >
          {/* Header (Draggable Handle) */}
          <div
            onPointerDown={isExpandedFull ? undefined : handleWindowPointerDown}
            onPointerMove={isExpandedFull ? undefined : handleWindowPointerMove}
            onPointerUp={isExpandedFull ? undefined : handleWindowPointerUp}
            className={`p-3 bg-[#121215] border-b border-[#27272a] flex items-center justify-between select-none ${
              isExpandedFull ? "cursor-default" : "cursor-move"
            }`}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-zinc-500" />
              <div className="p-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[#00e5c9]">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white tracking-wide">System Dev Logs & Telemetry</h3>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Google Gemini 3.7 Flash • Supabase • OCR • Local Storage Traces
                </p>
              </div>
            </div>

            {/* Window Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-1.5 rounded-md transition-colors ${
                  autoScroll ? "text-emerald-400 hover:bg-[#1f2229]" : "text-zinc-400 hover:text-white"
                }`}
                title={autoScroll ? "Auto-scroll ON (Click to pause)" : "Auto-scroll PAUSED (Click to resume)"}
              >
                {autoScroll ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button
                onClick={handleExportDump}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1f2229] rounded-md transition-colors"
                title="Export Logs Dump (.json)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => devLog.clear()}
                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-[#1f2229] rounded-md transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsExpandedFull(!isExpandedFull)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1f2229] rounded-md transition-colors"
                title={isExpandedFull ? "Restore Window Size" : "Maximize Fullscreen"}
              >
                {isExpandedFull ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => {
                  disableBubble();
                  setIsOpen(false);
                }}
                className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-[#1f2229] rounded-md transition-colors"
                title="Hide Floating Bubble (Can be re-enabled in Settings > Developer Options)"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-rose-600/80 rounded-md transition-colors"
                title="Close Dev Logs Window"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-2.5 bg-[#121215] border-b border-[#27272a] space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter logs by keyword, model, or payload..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00e5c9] focus:ring-1 focus:ring-[#00e5c9]/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Source Dropdown */}
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#00e5c9] cursor-pointer"
              >
                <option value="all">All Sources</option>
                <option value="AI Scanner">AI Scanner</option>
                <option value="PELP Database">PELP Database</option>
                <option value="Telemetry">Telemetry</option>
                <option value="Calculator">Calculator</option>
                <option value="Calendar">Calendar</option>
                <option value="System">System</option>
                <option value="Console">Console</option>
              </select>
            </div>

            {/* Level Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
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
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    filterLevel === pill.id
                      ? "bg-[#00e5c9] text-zinc-950 font-bold shadow-xs"
                      : "bg-[#18181b] text-zinc-400 hover:text-white border border-[#27272a] hover:border-[#3f3f46]"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Feed Container */}
          <div ref={logListRef} className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 space-y-1">
                <Terminal className="w-8 h-8 mx-auto text-zinc-600 opacity-60" />
                <p className="text-xs">No log entries matching your current filters.</p>
                <p className="text-[11px] text-zinc-500">Interact with the app to generate live telemetry.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const isCopied = copiedLogId === log.id;

                return (
                  <div
                    key={log.id}
                    className={`p-2 rounded-lg border transition-all ${
                      log.level === "error"
                        ? "bg-rose-950/25 border-rose-900/50 text-rose-100"
                        : log.level === "warn"
                        ? "bg-amber-950/25 border-amber-900/50 text-amber-100"
                        : log.level === "api"
                        ? "bg-cyan-950/20 border-cyan-900/40 text-cyan-100"
                        : log.level === "success"
                        ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-100"
                        : "bg-[#121215] border-[#27272a] hover:border-[#3f3f46] text-zinc-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="mt-0.5">{getSourceIcon(log.source)}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-zinc-400 font-sans">{log.formattedTime}</span>
                            {getLevelBadge(log.level)}
                            <span className="text-[10px] font-semibold text-teal-300 font-sans">[{log.source}]</span>
                            {log.durationMs !== undefined && (
                              <span className="text-[10px] text-amber-300 font-sans font-medium">
                                ({log.durationMs}ms)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-100 mt-1 break-words font-sans leading-relaxed">
                            {log.message}
                          </p>
                        </div>
                      </div>

                      {/* Log Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleCopyLog(log)}
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
                          title="Copy Log Entry"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        {log.details && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
                            title={isExpanded ? "Collapse payload" : "Expand JSON payload"}
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable JSON Payload Inspector */}
                    {isExpanded && log.details && (
                      <div className="mt-2 pt-2 border-t border-[#27272a]">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1 font-sans">
                          <span>Payload / Metadata:</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(log.details, null, 2))}
                            className="text-[#00e5c9] hover:underline"
                          >
                            Copy Raw JSON
                          </button>
                        </div>
                        <pre className="p-2 rounded bg-[#09090b] text-[10px] text-emerald-300 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap leading-tight border border-[#27272a]">
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
          <div className="p-2 bg-[#121215] border-t border-[#27272a] flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <div className="flex items-center gap-3">
              <span>Total: <strong className="text-white">{logs.length}</strong></span>
              <span>Errors: <strong className={errorCount > 0 ? "text-rose-400" : "text-zinc-400"}>{errorCount}</strong></span>
              <span>Filtered: <strong className="text-amber-300">{filteredLogs.length}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-teal-300">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Gemini 3.7 Flash Active</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DevLogsFloatingWidget;
