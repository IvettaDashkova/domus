import { z } from "zod";
import { NextResponse } from "next/server";

/** Request-body schemas for the API routes. */
export const matchBody = z.object({
  brief: z.string().max(2000).optional(),
  filters: z
    .object({
      minPrice: z.number().nullable().optional(),
      maxPrice: z.number().nullable().optional(),
      bedrooms: z.number().int().nullable().optional(),
      propertyType: z.string().nullable().optional(),
    })
    .optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      radiusKm: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const triageBody = z.object({ enquiry: z.string().min(1).max(4000) });
export const rerunBody = z.object({ leadId: z.string().uuid() });
export const visualSearchBody = z.object({ query: z.string().min(1).max(500) });
export const similarBody = z.object({ listingId: z.string().uuid() });
export const valuationBody = z.object({ listingId: z.string().uuid() });
export const routePlanBody = z.object({
  start: z.object({ lng: z.number(), lat: z.number() }),
  listingIds: z.array(z.string().uuid()).min(1).max(25),
  startTime: z.string().optional(),
  dwellMin: z.number().int().positive().max(300).optional(),
  returnToStart: z.boolean().optional(),
  dayEnd: z.string().optional(),
});

/** Parse + validate a JSON body; returns the data or a 400 NextResponse. */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { response: NextResponse.json({ error: "invalid JSON body" }, { status: 400 }) };
  }
  const r = schema.safeParse(body);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    return { response: NextResponse.json({ error: msg }, { status: 400 }) };
  }
  return { data: r.data };
}
