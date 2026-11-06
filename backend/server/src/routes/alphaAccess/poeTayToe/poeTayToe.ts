import { Router, Response } from "express";
import { requireUser, type AuthedRequest } from "../../../middleware/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { logger } from "../../../lib/logger";

export const poeTayToeRouter = Router();
const LOCATIONS = [
  { key: "hatchery-back", label: "Kithna" },
  { key: "profile", label: "Profile" },
  { key: "pet", label: "Your Kith" },
  { key: "food-merchant", label: "Assanti's Groceries" },
  { key: "home", label: "Homepage" },
  { key: "hatchery", label: "Hatchery" },
  { key: "thrift-merchant", label: "Kennith's Thrift Store" },
];
const validLocation = (value: unknown): value is string =>
  typeof value === "string" && LOCATIONS.some((spot) => spot.key === value);
const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);

poeTayToeRouter.get("/", requireUser, async (req: AuthedRequest, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { data, error } = await supabaseAdmin.rpc("get_poe_tay_toe_status", { p_user_id: req.user!.id });
    if (error) throw error;
    return res.json({ ...data, locations: LOCATIONS });
  } catch (error) {
    logger.error("[poe-tay-toe] failed to load state", error);
    return res.status(503).json({ error: "Poe Tay Toe is unavailable. Please try again later." });
  }
});

poeTayToeRouter.post("/find", requireUser, async (req: AuthedRequest, res: Response) => {
  if (!validLocation(req.body?.locationKey) || !validId(req.body?.version)) {
    return res.status(400).json({ error: "Refresh the page to find Poe Tay Toe." });
  }
  try {
    const { data, error } = await supabaseAdmin.rpc("claim_poe_tay_toe_v2", {
      p_user_id: req.user!.id, p_location_key: req.body.locationKey, p_version: req.body.version,
    });
    if (error) throw error;
    if (!data?.claimed) {
      return res.status(409).json({
        error: data?.reason === "cooldown" ? "You already found Poe Tay Toe. Try again after your two-hour cooldown." : "Poe Tay Toe has already moved.",
        reason: data?.reason ?? "moved", cooldownEndsAt: data?.cooldownEndsAt ?? null,
      });
    }
    return res.json(data);
  } catch (error) {
    logger.error("[poe-tay-toe] find failed", error);
    return res.status(503).json({ error: "Unable to confirm your discovery. Refresh before trying again." });
  }
});

poeTayToeRouter.post("/hide", requireUser, async (req: AuthedRequest, res: Response) => {
  if (!validLocation(req.body?.locationKey) || !validId(req.body?.discoveryId)) {
    return res.status(400).json({ error: "Choose a valid hiding place for your discovery." });
  }
  try {
    const { data, error } = await supabaseAdmin.rpc("hide_poe_tay_toe_v2", {
      p_user_id: req.user!.id, p_location_key: req.body.locationKey, p_discovery_id: req.body.discoveryId,
    });
    if (error) throw error;
    if (!data) return res.status(409).json({ error: "Poe Tay Toe has already moved. Your discovery reward is saved." });
    return res.json({ hidden: true });
  } catch (error) {
    logger.error("[poe-tay-toe] hide failed", error);
    return res.status(503).json({ error: "Unable to move Poe Tay Toe. Your discovery reward is saved." });
  }
});
