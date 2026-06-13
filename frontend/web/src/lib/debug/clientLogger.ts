type ClientLogLevel = "info" | "warn" | "error" | "debug";

export function clientLog(
  tag: string,
  message: string,
  level: ClientLogLevel = "info",
  data?: unknown,
) {
  fetch("/api/debug/client-log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      level,
      tag,
      message,
      data,
    }),
  }).catch(() => {
    // non-fatal debug logging only
  });
}
