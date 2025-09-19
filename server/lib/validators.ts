import { z } from "zod";

export const handoffSchema = z.object({
  customer_name: z.string().min(1).max(120).optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().min(7).max(32).optional(),
  channel: z.string().min(1).max(60).optional(),
  message: z.string().min(1).max(1000),
  page_url: z.string().url().optional(),
  conversation_url: z.string().url().optional(),
  conversation_id: z.string().min(3).max(120).optional(), // use this to de-dupe
  timestamp: z.string().datetime().optional()
});