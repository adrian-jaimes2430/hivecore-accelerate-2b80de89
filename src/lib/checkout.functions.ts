import { createServerFn } from "@tanstack/react-start";
import {
  createPublicOrder,
  getPublicOrderStatus,
  publicOrderSchema,
} from "./checkout.server";

export const submitPublicOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => publicOrderSchema.parse(input))
  .handler(async ({ data }) => createPublicOrder(data));

export const readPublicOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => {
    const { z } = require("zod") as typeof import("zod");
    return z.object({ reference: z.string().min(3).max(60) }).parse(input);
  })
  .handler(async ({ data }) => getPublicOrderStatus(data.reference));
