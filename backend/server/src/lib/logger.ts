// backend/server/src/lib/logger.ts
import * as fs from "fs";
import * as path from "path";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  color: string;
  data?: unknown;
}

const logBuffer: LogEntry[] = [];

const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  white: "\x1b[97m",
  reset: "\x1b[0m",
};

const elementColors = new Set([
  "fire",
  "water",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
]);

function splitTag(message: string): { tag: string; message: string } {
  const match = message.match(/^\[([^\]]+)\]\s*(.*)$/);

  if (!match) {
    return { tag: "app", message };
  }

  return { tag: match[1], message: match[2] || message };
}

function readDataField(data: unknown, key: string): string | null {
  if (!data || typeof data !== "object") return null;

  const value = (data as Record<string, unknown>)[key];

  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();

  return normalized || null;
}

function getElementColor(data: unknown): string | null {
  const element = readDataField(data, "element");
  const line = readDataField(data, "line");

  if (element && elementColors.has(element)) return element;
  if (line && elementColors.has(line)) return line;

  return null;
}

function getLogColor(level: LogLevel, tag: string, data: unknown): string {
  if (level === "error") return "error";
  if (level === "warn") return "warn";

  if (tag === "hatch") {
    return getElementColor(data) ?? "normal";
  }

  return "normal";
}

export function log(level: LogLevel, message: string, data?: unknown): void {
  const parsed = splitTag(message);

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    tag: parsed.tag,
    message: parsed.message,
    color: getLogColor(level, parsed.tag, data),
    data,
  };

  const MAX_LOG_BUFFER = 500;

  logBuffer.push(entry);

  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }

  printToConsole(entry);
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

function getConsoleColor(entry: LogEntry): string {
  if (entry.color === "error") return colors.red;
  if (entry.color === "warn") return colors.yellow;
  if (entry.color === "fire") return colors.red;
  if (entry.color === "water") return colors.blue;
  if (entry.color === "earth") return colors.green;
  if (entry.color === "air") return colors.cyan;
  if (entry.color === "ice") return colors.cyan;
  if (entry.color === "storm") return colors.magenta;
  if (entry.color === "light") return colors.white;
  if (entry.color === "shadow") return colors.magenta;

  return colors.green;
}

function printToConsole(entry: LogEntry): void {
  const { timestamp, level, tag, message, data } = entry;
  const status = level === "error" ? "ERROR" : level === "warn" ? "WARN" : "OK";
  const color = getConsoleColor(entry);

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
