import express from "express";
import "dotenv/config";

const app = express();
app.disable("x-powered-by");
app.use(express.json());

app.get("/", (_req, res) => {
  res
    .status(200)
    .type("text")
    .send(
      [
        "DeltaPets Backend ✅",
        "",
        "Try:",
        "  GET /api/health",
        "  GET /api/me  (requires Authorization: Bearer <token>)",
        "",
      ].join("\n")
    );
});

// ALWAYS-ON health endpoint (does NOT depend on Supabase env)
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "deltapets-backend",
    ts: new Date().toISOString(),
  });
});

// Optional auth test endpoint (only works if Supabase env is present)
app.get("/api/me", async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    return res.status(500).json({
      error:
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/server/.env.local",
    });
  }

  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ")
    ? auth.slice("Bearer ".length)
    : null;
  if (!token) return res.status(401).json({ error: "Missing Bearer token" });

  const { createClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user)
    return res.status(401).json({ error: "Invalid token" });

  res.json({ user: { id: data.user.id, email: data.user.email ?? null } });
});

const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
