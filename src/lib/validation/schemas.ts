import { z } from "zod";
export const messageSchema = z.object({ text: z.string().trim().min(1).max(2000) });
export const memorySchema = z.object({ caption: z.string().trim().min(1).max(240) });
export const letterSchema = z.object({ title: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(5000) });
export const eventSchema = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(1000), date: z.string().max(10) });
export const planSchema = z.object({ text: z.string().trim().min(1).max(240) });
