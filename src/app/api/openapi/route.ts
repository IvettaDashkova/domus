import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi";

// Static: the spec is a constant, safe to cache at the edge.
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(openApiSpec);
}
