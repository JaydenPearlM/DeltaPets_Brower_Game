// frontend/web/src/components/Devlog/windowLogs.ts

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "log" | "error" | "warn" | "info";
  message: string;
  stack?: string;
}

class LogManager {
  private logs: LogEntry[] = [];
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();
  private maxLogs = 1000;
  private isIntercepting = false;

  interceptConsole() {
    if (this.isIntercepting) return;
    this.isIntercepting = true;

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = (...args: any[]) => {
      this.addLog("log", args.map((a) => String(a)).join(" "));
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.addLog("error", args.map((a) => String(a)).join(" "));
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.addLog("warn", args.map((a) => String(a)).join(" "));
      originalWarn.apply(console, args);
    };

    console.info = (...args: any[]) => {
      this.addLog("info", args.map((a) => String(a)).join(" "));
      originalInfo.apply(console, args);
    };

    window.addEventListener("error", (event) => {
      this.addLog("error", event.message, event.error?.stack);
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.addLog("error", `Unhandled Promise: ${event.reason}`);
    });
  }

  private addLog(type: LogEntry["type"], message: string, stack?: string) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      message,
      stack,
    };

    this.logs.unshift(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.notifyListeners();
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(callback: (logs: LogEntry[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach((callback) => callback(this.getLogs()));
  }
}

export const logManager = new LogManager();
