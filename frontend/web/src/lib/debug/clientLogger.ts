import { getAuthHeaders } from "../api/baseClient";

type ClientLogLevel = "info" | "warn" | "error" | "debug";

export function clientLog(
  tag: string,
  message: string,
  level: ClientLogLevel = "info",
  data?: unknown,
) {
  void (async () => {
    const headers = await getAuthHeaders({
      "Content-Type": "application/json",
    });

    await fetch("/api/debug/client-log", {
      method: "POST",
      headers,
      body: JSON.stringify({
        level,
        tag,
        message,
        data,
      }),
    });
  })().catch(() => {
    // non-fatal debug logging only
  });
}
