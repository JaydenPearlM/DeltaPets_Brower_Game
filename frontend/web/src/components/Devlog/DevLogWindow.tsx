// frontend/web/src/components/Devlog/DevLogWindow.tsx

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { logManager, type LogEntry } from "./windowLogs";
import "./windowLogs.css";

interface DevLogWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevLogWindow: React.FC<DevLogWindowProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const contentRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    if (!hasInitialized.current) {
      logManager.interceptConsole();
      hasInitialized.current = true;
    }

    const unsubscribe = logManager.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    setLogs(logManager.getLogs());

    return unsubscribe;
  }, [isOpen]);

  useEffect(() => {
    if (contentRef.current && logs.length > 0) {
      contentRef.current.scrollTop = 0;
    }
  }, [logs]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".devlog-header")) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const clearLogs = () => {
    logManager.clearLogs();
  };

  const popOut = () => {
    const logData = JSON.stringify(logs);
    const popupWindow = window.open(
      "",
      "DeltaLogs",
      "width=1000,height=800,resizable=yes,scrollbars=yes",
    );

    if (popupWindow) {
      popupWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Delta Logs</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                margin: 0;
                padding: 0;
                background: linear-gradient(180deg, #0a0f1a 0%, #0f1824 48%, #16213e 100%);
                color: #e0e0e0;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                min-height: 100vh;
              }
              
              .container {
                padding: 30px;
                max-width: 1200px;
                margin: 0 auto;
              }
              
              .header {
                background: linear-gradient(180deg, rgba(22, 33, 62, 0.8) 0%, rgba(15, 24, 36, 0.9) 100%);
                padding: 20px 30px;
                border-radius: 22px;
                border: 3px solid #547ab2;
                box-shadow: 
                  0 0 18px rgba(84, 122, 178, 0.3),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
                margin-bottom: 30px;
                position: relative;
              }
              
              .header::before {
                content: "";
                position: absolute;
                inset: 10px;
                border-radius: 14px;
                border: 2px solid rgba(124, 92, 219, 0.3);
                pointer-events: none;
              }
              
              h1 {
                font-family: 'VT323', monospace;
                font-size: 3rem;
                font-weight: 900;
                color: #f3d63f;
                text-shadow:
                  0 1px 0 rgba(255, 250, 217, 0.95),
                  0 2px 0 #b23a24,
                  0 3px 0 #b23a24,
                  0 4px 0 #8d2b1d,
                  0 8px 14px rgba(44, 25, 10, 0.2);
                margin: 0;
                position: relative;
                z-index: 1;
              }
              
              .logs-container {
                background: rgba(10, 10, 20, 0.6);
                border-radius: 18px;
                border: 2px solid rgba(84, 122, 178, 0.3);
                padding: 20px;
                box-shadow: 
                  0 8px 20px rgba(8, 18, 38, 0.3),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05);
              }
              
              .log-entry {
                padding: 12px 14px;
                margin-bottom: 10px;
                background: rgba(15, 52, 96, 0.3);
                border: 1px solid rgba(124, 92, 219, 0.2);
                border-left: 3px solid transparent;
                border-radius: 8px;
                transition: all 0.2s ease;
              }
              
              .log-entry:hover {
                background: rgba(15, 52, 96, 0.5);
                border-left-color: #00fff2;
                box-shadow: 0 0 12px rgba(0, 255, 242, 0.2);
              }
              
              .log-header {
                display: flex;
                gap: 14px;
                margin-bottom: 8px;
                align-items: baseline;
              }
              
              .log-timestamp {
                color: #888;
                font-size: 11px;
              }
              
              .log-type {
                font-weight: bold;
                text-transform: uppercase;
                font-size: 11px;
                padding: 4px 10px;
                border-radius: 5px;
                border: 1px solid currentColor;
              }
              
              .log-type.log { 
                color: #00fff2; 
                background: rgba(0, 255, 242, 0.1);
                border-color: #00fff2;
              }
              
              .log-type.error { 
                color: #ff4444; 
                background: rgba(255, 68, 68, 0.1);
                border-color: #ff4444;
              }
              
              .log-type.warn { 
                color: #ffaa00; 
                background: rgba(255, 170, 0, 0.1);
                border-color: #ffaa00;
              }
              
              .log-type.info { 
                color: #00d4c4; 
                background: rgba(0, 212, 196, 0.1);
                border-color: #00d4c4;
              }
              
              .log-message { 
                margin: 0; 
                white-space: pre-wrap; 
                word-break: break-word;
                color: #e0e0e0;
                line-height: 1.6;
              }
              
              .log-stack { 
                color: #888; 
                margin-top: 10px; 
                padding-left: 20px; 
                border-left: 3px solid #444; 
                font-size: 11px;
                white-space: pre-wrap;
              }
              
              .empty-state {
                text-align: center;
                padding: 60px 20px;
                color: #666;
                font-family: 'VT323', monospace;
                font-size: 24px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Delta Logs</h1>
              </div>
              <div class="logs-container" id="logs"></div>
            </div>
            <script>
              const logs = ${logData};
              const container = document.getElementById('logs');
              
              function formatTime(dateString) {
                const date = new Date(dateString);
                return date.toLocaleTimeString('en-US', { 
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
              }
              
              if (logs.length === 0) {
                container.innerHTML = '<div class="empty-state">No logs captured yet</div>';
              } else {
                logs.forEach(log => {
                  const entry = document.createElement('div');
                  entry.className = 'log-entry';
                  entry.innerHTML = \`
                    <div class="log-header">
                      <span class="log-timestamp">\${formatTime(log.timestamp)}</span>
                      <span class="log-type \${log.type}">\${log.type}</span>
                    </div>
                    <p class="log-message">\${log.message}</p>
                    \${log.stack ? \`<pre class="log-stack">\${log.stack}</pre>\` : ''}
                  \`;
                  container.appendChild(entry);
                });
              }
            </script>
          </body>
        </html>
      `);
      popupWindow.document.close();

      // Close the in-browser window after popping out
      onClose();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="devlog-window"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="devlog-header">
        <h2 className="devlog-title">Delta Logs</h2>
        <div className="devlog-controls">
          <button
            className="devlog-btn"
            onClick={popOut}
            title="Pop out window"
          >
            Pop Out
          </button>
          <button className="devlog-btn" onClick={clearLogs} title="Clear logs">
            Clear
          </button>
          <button className="devlog-btn" onClick={onClose} title="Close">
            X
          </button>
        </div>
      </div>

      <div ref={contentRef} className="devlog-content">
        {logs.length === 0 ? (
          <div className="devlog-empty">No logs captured yet</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="log-entry">
              <div className="log-header">
                <span className="log-timestamp">
                  {formatTime(log.timestamp)}
                </span>
                <span className={`log-type ${log.type}`}>{log.type}</span>
              </div>
              <p className="log-message">{log.message}</p>
              {log.stack && <pre className="log-stack">{log.stack}</pre>}
            </div>
          ))
        )}
      </div>
    </div>,
    document.body,
  );
};
