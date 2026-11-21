import { Router } from "express";
import { ZodError } from "zod";
import { requireUser, getUserId, type AuthedRequest } from "../../middleware/auth";
import { AppError } from "../../lib/AppError";
import { allocateLevel2, chooseLevel2, readLevel2, resolveSkillEquipment } from "../../pets/level2/service";
import { petIdSchema } from "../../pets/level2/contracts";

// Existing authenticated API; persistence is provided by the Level 2 migration.
export const level2Router = Router();
level2Router.use(requireUser);
for (const operation of ["state", "skill", "stats", "equipment-decision"] as const) {
  const method = operation === "state" ? "get" : "post";
  level2Router[method](`/:petId/${operation}`, async (req: AuthedRequest, res, next) => {
    try {
      const userId = getUserId(req);
      const petId = petIdSchema.parse(req.params.petId);
      const result = operation === "state" ? await readLevel2(userId, petId)
        : operation === "skill" ? await chooseLevel2(userId, petId, req.body)
        : operation === "equipment-decision" ? await resolveSkillEquipment(userId, petId, req.body)
        : await allocateLevel2(userId, petId, req.body);
      res.json(result);
    } catch (error) {
      next(error instanceof ZodError ? new AppError("Invalid Level 2 request.", 400) : error);
    }
  });
}
