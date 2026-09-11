const gameUrl = process.env.JAYBUG_GAME_URL ?? "http://localhost:4000";
const healthUrl = `${gameUrl.replace(/\/$/, "")}/health`;

try {
  const response = await fetch(healthUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.ok) {
    console.error("Jaybug alert: DeltaPets health check failed", {
      url: healthUrl,
      status: response.status,
      body,
    });
    process.exitCode = 1;
  } else {
    console.log("Jaybug: DeltaPets is healthy", {
      url: healthUrl,
      database: body.database,
      uptime: body.uptime,
    });
  }
} catch (error) {
  console.error("Jaybug alert: DeltaPets could not be reached", {
    url: healthUrl,
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
}
