import { Router } from "express";
import { ZodError } from "zod";
import { requireUser, getUserId, type AuthedRequest } from "../../middleware/auth";
import { AppError } from "../../lib/AppError";
import { allocateLevel2, chooseLevel2, readLevel2 } from "../../pets/level2/service";
import { petIdSchema } from "../../pets/level2/contracts";

// Local-only opt-in mount under the existing authenticated/rate-limited API.
// Production remains disabled pending separate schema/security approval.
export const level2Router = Router();
level2Router.use(requireUser);
for (const operation of ["state", "skill", "stats"] as const) {
  const method = operation === "state" ? "get" : "post";
  level2Router[method](`/:petId/${operation}`, async (req: AuthedRequest, res, next) => {
    try {
      const userId = getUserId(req);
      const petId = petIdSchema.parse(req.params.petId);
      const result = operation === "state" ? await readLevel2(userId, petId)
        : operation === "skill" ? await chooseLevel2(userId, petId, req.body)
        : await allocateLevel2(userId, petId, req.body);
      res.json(result);
    } catch (error) {
      next(error instanceof ZodError ? new AppError("Invalid Level 2 request.", 400) : error);
    }
  });
}
