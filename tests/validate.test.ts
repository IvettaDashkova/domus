import { describe, it, expect } from "vitest";
import {
  matchBody,
  routePlanBody,
  visualSearchBody,
  createListingBody,
  valuationBody,
} from "../src/lib/api/validate";

const UUID = "7353f36e-ef61-4c3a-b951-3baa547e69c2";

describe("matchBody", () => {
  it("accepts a brief + located query", () => {
    const r = matchBody.safeParse({
      brief: "bright studio near the centre",
      location: { lat: 52.2297, lng: 21.0122, radiusKm: 10 },
      limit: 5,
    });
    expect(r.success).toBe(true);
  });
  it("rejects a non-positive limit", () => {
    expect(matchBody.safeParse({ brief: "x", limit: 0 }).success).toBe(false);
  });
  it("rejects a location missing lat", () => {
    expect(matchBody.safeParse({ location: { lng: 21.0 } }).success).toBe(false);
  });
});

describe("routePlanBody", () => {
  it("accepts a start + at least one listing", () => {
    const r = routePlanBody.safeParse({
      start: { lng: 21.0122, lat: 52.2297 },
      listingIds: [UUID],
      startTime: "09:00",
    });
    expect(r.success).toBe(true);
  });
  it("rejects an empty listingIds array", () => {
    const r = routePlanBody.safeParse({
      start: { lng: 21, lat: 52 },
      listingIds: [],
    });
    expect(r.success).toBe(false);
  });
  it("rejects a malformed HH:MM start time", () => {
    const r = routePlanBody.safeParse({
      start: { lng: 21, lat: 52 },
      listingIds: [UUID],
      startTime: "25:99",
    });
    expect(r.success).toBe(false);
  });
  it("rejects a non-UUID listing id", () => {
    const r = routePlanBody.safeParse({
      start: { lng: 21, lat: 52 },
      listingIds: ["nope"],
    });
    expect(r.success).toBe(false);
  });
});

describe("visualSearchBody", () => {
  it("rejects an empty query", () => {
    expect(visualSearchBody.safeParse({ query: "" }).success).toBe(false);
  });
  it("accepts a non-empty query", () => {
    expect(visualSearchBody.safeParse({ query: "modern kitchen" }).success).toBe(
      true,
    );
  });
});

describe("createListingBody", () => {
  it("rejects an unknown property type and a non-positive price", () => {
    const r = createListingBody.safeParse({
      address: "ul. Testowa 1",
      city: "Wrocław",
      price: -5,
      propertyType: "castle",
    });
    expect(r.success).toBe(false);
  });
  it("accepts a well-formed listing", () => {
    const r = createListingBody.safeParse({
      address: "ul. Testowa 1",
      city: "Wrocław",
      price: 650000,
      propertyType: "apartment",
      bedrooms: 2,
    });
    expect(r.success).toBe(true);
  });
});

describe("valuationBody", () => {
  it("requires a UUID listingId", () => {
    expect(valuationBody.safeParse({ listingId: "123" }).success).toBe(false);
    expect(valuationBody.safeParse({ listingId: UUID }).success).toBe(true);
  });
});
