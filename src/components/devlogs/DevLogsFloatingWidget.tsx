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
  AlertTriangle,
  CheckCircle2,
  Info,
  Radio,
} from "lucide-react";
import { devLog, DevLogEntry, LogLevel, LogSource } from "../../lib/devLogger";

export const DevLogsFloatingWidget: React.FC = () => {
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

  // Floating Bubble Position (Default bottom-right)
  const [bubblePos, setBubblePos] = useState({
    x: typeof window !== "undefined" ? Math.max(20, window.innerWidth - 80) : 1000,
    y: typeof window !== "undefined" ? Math.max(20, window.innerHeight - 80) : 700,
  });

  // Popup Window Position (Default anchored next to bubble)
  const [windowPos, setWindowPos] = useState({
    x: typeof window !== "undefined" ? Math.max(20, window.innerWidth - 560) : 700,
    y: typeof window !== "undefined" ? Math.max(20, window.innerHeight - 620) : 200,
  });

  const isDraggingBubble = useRef(false);
  const bubbleDragStart = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0, hasMoved: false });

  const isDraggingWindow = useRef(false);
  const windowDragStart = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0 });

  const logListRef = useRef<HTMLDivElement>(null);

  // Subscribe to devLogger events
  useEffect(() => {
    const unsubscribe = devLog.subscribe((currentLogs, newEntry) => {
      setLogs(currentLogs);
      if (newEntry) {
        setHasNewPulse(true);
        setTimeout(() => setHasNewPulse(false), 1500);
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-scroll to top of list (newest logs are at index 0, or bottom if reversed)
  useEffect(() => {
    if (autoScroll && logListRef.current) {
      logListRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  // Adjust coordinates on window resize
  useEffect(() => {
    const handleResize = () => {
      setBubblePos((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 70),
        y: Math.min(prev.y, window.innerHeight - 70),
      }));
      setWindowPos((prev) => ({
        x: Math.max(10, Math.min(prev.x, window.innerWidth - 520)),
        y: Math.max(10, Math.min(prev.y, window.innerHeight - 400)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleBubblePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBubble.current) return;
    const dx = e.clientX - bubbleDragStart.current.x;
    const dy = e.clientY - bubbleDragStart.current.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      bubbleDragStart.current.hasMoved = true;
    }

    const newX = Math.max(10, Math.min(window.innerWidth - 65, bubbleDragStart.current.startPosX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 65, bubbleDragStart.current.startPosY + dy));

    setBubblePos({ x: newX, y: newY });
  };

  const handleBubblePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBubble.current) return;
    isDraggingBubble.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    // If it was a click (not a drag), toggle popup
    if (!bubbleDragStart.current.hasMoved) {
      setIsOpen((prev) => !prev);
      // Auto-position window next to bubble
      const optimalWindowX = Math.max(20, Math.min(window.innerWidth - 540, bubblePos.x - 480));
      const optimalWindowY = Math.max(20, Math.min(window.innerHeight - 560, bubblePos.y - 480));
      setWindowPos({ x: optimalWindowX, y: optimalWindowY });
    }
  };

  // --- Window Header Dragging Handlers ---
  const handleWindowPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingWindow.current = true;
    windowDragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: windowPos.x,
      startPosY: windowPos.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleWindowPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWindow.current) return;
    const dx = e.clientX - windowDragStart.current.x;
    const dy = e.clientY - windowDragStart.current.y;

    const newX = Math.max(10, Math.min(window.innerWidth - 300, windowDragStart.current.startPosX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 150, windowDragStart.current.startPosY + dy));

    setWindowPos({ x: newX, y: newY });
  };

  const handleWindowPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingWindow.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // --- Filter and Search ---
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
    const text = `[${log.formattedTime}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}\nDetails: ${
      log.details ? JSON.stringify(log.details, null, 2) : "None"
    }`;
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
        return <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-mono text-[10px]">API</span>;
      case "success":
        return <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-mono text-[10px]">SUCCESS</span>;
      case "warn":
        return <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-mono text-[10px]">WARN</span>;
      case "error":
        return <span className="px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800 font-mono text-[10px]">ERROR</span>;
      case "telemetry":
        return <span className="px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800 font-mono text-[10px]">TELEM</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded bg-[#1e2260] text-[#a2a5ff] border border-[#2e3488] font-mono text-[10px]">INFO</span>;
    }
  };

  const getSourceIcon = (source: LogSource) => {
    switch (source) {
      case "AI Scanner":
        return <Sparkles className="w-3 h-3 text-yellow-300 shrink-0" />;
      case "PELP Database":
        return <Database className="w-3 h-3 text-[#8183fc] shrink-0" />;
      case "Telemetry":
        return <Radio className="w-3 h-3 text-emerald-400 shrink-0" />;
      case "Calculator":
        return <Zap className="w-3 h-3 text-amber-300 shrink-0" />;
      case "Calendar":
        return <Activity className="w-3 h-3 text-cyan-300 shrink-0" />;
      default:
        return <Terminal className="w-3 h-3 text-slate-400 shrink-0" />;
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
          className={`relative w-14 h-14 rounded-full bg-[#0b0c2e] border-2 shadow-2xl flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95 ${
            isOpen
              ? "border-[#8183fc] ring-4 ring-[#5c68db]/40 bg-[#14164a]"
              : hasNewPulse
              ? "border-emerald-400 ring-4 ring-emerald-500/40"
              : errorCount > 0
              ? "border-rose-500 ring-2 ring-rose-500/30"
              : "border-[#383d8a] hover:border-[#6c7ae0]"
          }`}
        >
          {/* Glowing background halo */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#5c68db]/30 to-transparent blur-xs pointer-events-none" />

          {/* Icon */}
          <div className="relative text-white flex items-center justify-center">
            {errorCount > 0 ? (
              <Bug className="w-6 h-6 text-rose-400" />
            ) : hasNewPulse ? (
              <Sparkles className="w-6 h-6 text-yellow-300 animate-spin" />
            ) : (
              <Terminal className="w-6 h-6 text-[#8183fc] group-hover:text-white transition-colors" />
            )}
          </div>

          {/* Badge Counter */}
          <span
            className={`absolute -top-1.5 -right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border shadow-md font-mono ${
              errorCount > 0
                ? "bg-rose-600 border-rose-400 text-white animate-pulse"
                : "bg-[#5c68db] border-[#8183fc] text-white"
            }`}
          >
            {logs.length > 99 ? "99+" : logs.length}
          </span>

          {/* Live Activity Blinking Dot */}
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#090933] animate-pulse" />
        </div>
      </div>

      {/* 2. FLOATING DRAGGABLE DEV LOGS POPUP WINDOW */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            left: isExpandedFull ? "20px" : `${windowPos.x}px`,
            top: isExpandedFull ? "20px" : `${windowPos.y}px`,
            width: isExpandedFull ? "calc(100vw - 40px)" : "530px",
            height: isExpandedFull ? "calc(100vh - 40px)" : "540px",
            zIndex: 9998,
          }}
          className="rounded-2xl bg-[#090a2a]/95 backdrop-blur-xl border border-[#343a8c] shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10"
        >
          {/* Header (Draggable Handle) */}
          <div
            onPointerDown={isExpandedFull ? undefined : handleWindowPointerDown}
            onPointerMove={isExpandedFull ? undefined : handleWindowPointerMove}
            onPointerUp={isExpandedFull ? undefined : handleWindowPointerUp}
            className={`p-3 bg-[#101242] border-b border-[#22255e] flex items-center justify-between select-none ${
              isExpandedFull ? "cursor-default" : "cursor-move"
            }`}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-slate-500" />
              <div className="p-1.5 rounded-lg bg-[#1c1f57] border border-[#2e3382] text-yellow-300">
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
                <p className="text-[10px] text-slate-400">
                  Google Gemini 3.7 Flash • OCR • Local State • Tariff Traces
                </p>
              </div>
            </div>

            {/* Window Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-1.5 rounded-md transition-colors ${
                  autoScroll ? "text-emerald-400 hover:bg-[#1a1c54]" : "text-slate-400 hover:text-white"
                }`}
                title={autoScroll ? "Auto-scroll ON (Click to pause)" : "Auto-scroll PAUSED (Click to resume)"}
              >
                {autoScroll ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button
                onClick={handleExportDump}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1a1c54] rounded-md transition-colors"
                title="Export Logs Dump (.json)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => devLog.clear()}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#1a1c54] rounded-md transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsExpandedFull(!isExpandedFull)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1a1c54] rounded-md transition-colors"
                title={isExpandedFull ? "Restore Window Size" : "Maximize Fullscreen"}
              >
                {isExpandedFull ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-rose-600/80 rounded-md transition-colors"
                title="Close Dev Logs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-2.5 bg-[#0d0e33] border-b border-[#22255e] space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter logs by keyword, model, or payload..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#151745] border border-[#2d317a] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#5c68db]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Source Dropdown */}
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="bg-[#151745] border border-[#2d317a] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#5c68db] cursor-pointer"
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
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    filterLevel === pill.id
                      ? "bg-[#5c68db] text-white font-semibold shadow-xs"
                      : "bg-[#14164a] text-slate-400 hover:text-white border border-[#22255e]"
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
              <div className="py-16 text-center text-slate-400 space-y-1">
                <Terminal className="w-8 h-8 mx-auto text-slate-500 opacity-50" />
                <p className="text-xs">No log entries matching your current filters.</p>
                <p className="text-[11px] text-slate-500">Interact with the app to generate live telemetry.</p>
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
                        ? "bg-rose-950/30 border-rose-900/60"
                        : log.level === "warn"
                        ? "bg-amber-950/30 border-amber-900/60"
                        : log.level === "api"
                        ? "bg-cyan-950/20 border-cyan-900/40"
                        : log.level === "success"
                        ? "bg-emerald-950/20 border-emerald-900/40"
                        : "bg-[#10123f]/70 border-[#22255e]/80 hover:border-[#383d8a]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="mt-0.5">{getSourceIcon(log.source)}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-sans">{log.formattedTime}</span>
                            {getLevelBadge(log.level)}
                            <span className="text-[10px] font-semibold text-[#a2a5ff] font-sans">[{log.source}]</span>
                            {log.durationMs !== undefined && (
                              <span className="text-[10px] text-yellow-300 font-sans font-medium">
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
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f225e] transition-colors"
                          title="Copy Log Entry"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        {log.details && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f225e] transition-colors"
                            title={isExpanded ? "Collapse payload" : "Expand JSON payload"}
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable JSON Payload Inspector */}
                    {isExpanded && log.details && (
                      <div className="mt-2 pt-2 border-t border-[#22255e]/70">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-sans">
                          <span>Payload / Metadata:</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(log.details, null, 2))}
                            className="text-[#8183fc] hover:underline"
                          >
                            Copy Raw JSON
                          </button>
                        </div>
                        <pre className="p-2 rounded bg-[#06071e] text-[10px] text-emerald-300 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap leading-tight border border-[#1b1e4f]">
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
          <div className="p-2 bg-[#0d0e33] border-t border-[#22255e] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-3">
              <span>Total: <strong className="text-white">{logs.length}</strong></span>
              <span>Errors: <strong className={errorCount > 0 ? "text-rose-400" : "text-slate-400"}>{errorCount}</strong></span>
              <span>Filtered: <strong className="text-yellow-300">{filteredLogs.length}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-[#a2a5ff]">
              <Sparkles className="w-3 h-3 text-yellow-300" />
              <span>Gemini 3.7 Flash Active</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
