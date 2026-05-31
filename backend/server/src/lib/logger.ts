// backend/server/src/lib/logger.ts
import * as fs from "fs";
import * as path from "path";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
}

const logBuffer: LogEntry[] = [];

const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  reset: "\x1b[0m",
};

function splitTag(message: string): { tag: string; message: string } {
  const match = message.match(/^\[([^\]]+)\]\s*(.*)$/);

  if (!match) {
    return { tag: "app", message };
  }

  return { tag: match[1], message: match[2] || message };
}

export function log(level: LogLevel, message: string, data?: unknown): void {
  const parsed = splitTag(message);

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    tag: parsed.tag,
    message: parsed.message,
    data,
  };

  logBuffer.push(entry);
  // Stored for /api/debug/logs. Do not print app logs to the terminal.
}

export const logger = {
  info: (message: string, data?: unknown) => log("info", message, data),
  warn: (message: string, data?: unknown) => log("warn", message, data),
  error: (message: string, data?: unknown) => log("error", message, data),
  debug: (message: string, data?: unknown) => log("debug", message, data),
};

function serializeData(data: unknown): string {
  if (data == null) return "";

  if (data instanceof Error) {
    return data.stack ?? data.message;
  }

  if (typeof data === "string") {
    return data;
  }

  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function printToConsole(entry: LogEntry): void {
  const { timestamp, level, tag, message, data } = entry;
  const status = level === "error" ? "ERROR" : level === "warn" ? "WARN" : "OK";
  const color =
    level === "error"
      ? colors.red
      : level === "warn"
        ? colors.yellow
        : colors.green;

  const dataText = serializeData(data);
  const output = `${colors.gray}[${timestamp}]${colors.reset} ${color}[${status}]${colors.reset} [${tag}] ${message}${
    dataText ? ` ${dataText}` : ""
  }`;

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
}

export function flushLogsToCsv(outputPath?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = outputPath ?? path.join("logs", `delta_${timestamp}.csv`);

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const header = "timestamp,level,tag,message,data\n";
  const rows = logBuffer
    .map((entry) => {
      const dataStr = entry.data
        ? serializeData(entry.data).replace(/"/g, '""')
        : "";
      const msg = entry.message.replace(/"/g, '""');

      return `"${entry.timestamp}","${entry.level}","${entry.tag}","${msg}","${dataStr}"`;
    })
    .join("\n");

  fs.writeFileSync(filePath, header + rows, "utf-8");
  logger.info("[logger] CSV flushed", { filePath, entries: logBuffer.length });

  return filePath;
}

export function getLogBuffer(): LogEntry[] {
  return [...logBuffer];
}

export function clearLogBuffer(): void {
  logBuffer.length = 0;
}
