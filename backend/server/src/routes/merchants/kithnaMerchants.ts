import { Router } from "express";

export const kithnaMerchantsRouter = Router();

type MerchantKey = "armor" | "health" | "weapons" | "food" | "farm";
