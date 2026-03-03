import { z } from "zod";

export const coerceBoolean = z.preprocess((val) => {
  if (typeof val === "string") {
    if (val === "true") return true;
    if (val === "false") return false;
  }
  return val;
}, z.boolean());

export const coerceUuidArray = z.preprocess((val) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}, z.array(z.string().uuid()));
