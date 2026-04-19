// backend/server/src/lib/logger.ts
import * as fs from "fs";
import * as path from "path";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  data?: Record<string, unknown>;
}

const logBuffer: LogEntry[] = [];

export function log(
  level: LogLevel,
  tag: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    tag,
    message,
    data,
  };

  logBuffer.push(entry);
  printToConsole(entry);
}

export const logger = {
  info: (tag: string, msg: string, data?: Record<string, unknown>) =>
    log("info", tag, msg, data),
  warn: (tag: string, msg: string, data?: Record<string, unknown>) =>
    log("warn", tag, msg, data),
  error: (tag: string, msg: string, data?: Record<string, unknown>) =>
    log("error", tag, msg, data),
  debug: (tag: string, msg: string, data?: Record<string, unknown>) =>
    log("debug", tag, msg, data),
};

function printToConsole(entry: LogEntry): void {
  const { timestamp, level, tag, message, data } = entry;
  const prefix = `[${timestamp}] [${level.toUpperCase().padEnd(5)}] [${tag}]`;
  const output = data
    ? `${prefix} ${message} ${JSON.stringify(data)}`
    : `${prefix} ${message}`;

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
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
        ? JSON.stringify(entry.data).replace(/"/g, '""')
        : "";
      const msg = entry.message.replace(/"/g, '""');
      return `"${entry.timestamp}","${entry.level}","${entry.tag}","${msg}","${dataStr}"`;
    })
    .join("\n");

  fs.writeFileSync(filePath, header + rows, "utf-8");
  console.log(
    `[logger] CSV flushed → ${filePath} (${logBuffer.length} entries)`,
  );
  return filePath;
}

export function getLogBuffer(): LogEntry[] {
  return [...logBuffer];
}

export function clearLogBuffer(): void {
  logBuffer.length = 0;
}
