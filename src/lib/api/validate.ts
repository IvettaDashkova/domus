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
export const createLeadBody = z.object({
  enquiry: z.string().min(1).max(4000),
  contact: z.string().max(200).optional(),
  requirements: z
    .object({
      propertyType: z.string().nullable().optional(),
      bedrooms: z.number().int().nullable().optional(),
      minPrice: z.number().nullable().optional(),
      maxPrice: z.number().nullable().optional(),
      location: z.string().nullable().optional(),
    })
    .optional(),
});
export const rerunBody = z.object({ leadId: z.string().uuid() });
export const editLeadBody = z.object({
  contact: z.string().max(200).nullable().optional(),
  enquiry: z.string().min(1).max(4000).optional(),
  status: z
    .enum(["new", "triaged", "contacted", "viewing", "closed"])
    .optional(),
});
export const visualSearchBody = z.object({ query: z.string().min(1).max(500) });
export const similarBody = z.object({ listingId: z.string().uuid() });
export const createListingBody = z.object({
  address: z.string().min(3).max(200),
  city: z.string().min(2).max(80),
  price: z.number().positive().max(100_000_000),
  propertyType: z.enum(["apartment", "house", "studio", "townhouse"]),
  bedrooms: z.number().int().min(0).max(20).optional(),
  description: z.string().max(2000).optional(),
});
export const valuationBody = z.object({ listingId: z.string().uuid() });
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");
export const routePlanBody = z.object({
  start: z.object({ lng: z.number(), lat: z.number() }),
  listingIds: z.array(z.string().uuid()).min(1).max(25),
  startTime: hhmm.optional(),
  dwellMin: z.number().int().positive().max(300).optional(),
  returnToStart: z.boolean().optional(),
  dayEnd: hhmm.optional(),
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
    return {
      response: NextResponse.json(
        { error: "invalid JSON body" },
        { status: 400 },
      ),
    };
  }
  const r = schema.safeParse(body);
  if (!r.success) {
    const msg = r.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return { response: NextResponse.json({ error: msg }, { status: 400 }) };
  }
  return { data: r.data };
}
