import { site } from "@/lib/seo";

/**
 * OpenAPI 3.1 description of the Domus HTTP API. Served as JSON at
 * `/api/openapi` and rendered as interactive docs at `/api/docs`. Request
 * schemas mirror the Zod schemas in `src/lib/api/validate.ts`.
 */
const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
  },
} as const;

const listingResult = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    address: { type: "string", nullable: true },
    price: { type: "number", nullable: true },
    bedrooms: { type: "integer", nullable: true },
    property_type: { type: "string", nullable: true },
    lng: { type: "number", nullable: true },
    lat: { type: "number", nullable: true },
    score: { type: "number" },
  },
};

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Domus API",
    version: "1.0.0",
    description:
      "HTTP API for Domus — AI real-estate operations: lead triage, hybrid " +
      "property search, viewing-route planning, comps valuation, visual search, " +
      "and a tool-calling assistant. All request bodies are JSON and validated " +
      "with Zod; endpoints are tenant-scoped by Postgres RLS.",
    contact: { name: site.author },
  },
  servers: [{ url: "/", description: "Same origin as this page" }],
  tags: [
    { name: "System" },
    { name: "Search" },
    { name: "Leads" },
    { name: "Listings" },
    { name: "Valuation" },
    { name: "Routing" },
    { name: "Assistant" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "Health check (DB + PostGIS)",
        responses: {
          "200": {
            description: "Healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    db: { type: "string", example: "up" },
                    time: { type: "string", format: "date-time" },
                    postgis: { type: "string" },
                  },
                },
              },
            },
          },
          "503": errorResponse,
        },
      },
    },
    "/api/match": {
      post: {
        tags: ["Search"],
        summary: "Hybrid property search (semantic + keyword + spatial, RRF)",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/MatchBody" } } },
        },
        responses: {
          "200": {
            description: "Ranked matches",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    count: { type: "integer" },
                    results: { type: "array", items: listingResult },
                  },
                },
              },
            },
          },
          "400": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/api/visual-search": {
      post: {
        tags: ["Search"],
        summary: "CLIP image-embedding search from a text query",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/VisualSearchBody" } } },
        },
        responses: {
          "200": {
            description: "Matches",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    count: { type: "integer" },
                    results: { type: "array", items: listingResult },
                  },
                },
              },
            },
          },
          "400": errorResponse,
        },
      },
    },
    "/api/leads": {
      get: {
        tags: ["Leads"],
        summary: "List leads (own agency; demo catalog if signed out)",
        responses: {
          "200": {
            description: "Leads",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    leads: { type: "array", items: { type: "object" } },
                    demo: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Leads"],
        summary: "Create a lead (requires auth)",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateLeadBody" } } },
        },
        responses: {
          "200": {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    leadId: { type: "string", format: "uuid" },
                    requirements: { type: "object" },
                  },
                },
              },
            },
          },
          "401": errorResponse,
        },
      },
    },
    "/api/leads/triage": {
      post: {
        tags: ["Leads", "Assistant"],
        summary: "Triage a free-text enquiry → structured brief → grounded matches (LLM)",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/TriageBody" } } },
        },
        responses: {
          "200": {
            description: "Brief + matches",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    brief: { type: "object" },
                    leadId: { type: "string", format: "uuid", nullable: true },
                    saved: { type: "boolean" },
                    location: { type: "object", nullable: true },
                    count: { type: "integer" },
                    results: { type: "array", items: listingResult },
                  },
                },
              },
            },
          },
          "400": errorResponse,
          "503": { ...errorResponse, description: "Gemini API key not set" },
        },
      },
    },
    "/api/leads/rerun": {
      post: {
        tags: ["Leads"],
        summary: "Re-run matching for a saved lead's stored requirements",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/RerunBody" } } },
        },
        responses: {
          "200": {
            description: "Brief + matches",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    brief: { type: "object" },
                    location: { type: "object", nullable: true },
                    count: { type: "integer" },
                    results: { type: "array", items: listingResult },
                  },
                },
              },
            },
          },
          "404": errorResponse,
        },
      },
    },
    "/api/leads/{id}": {
      patch: {
        tags: ["Leads"],
        summary: "Update a lead (requires auth)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/EditLeadBody" } } },
        },
        responses: {
          "200": {
            description: "Updated",
            content: {
              "application/json": {
                schema: { type: "object", properties: { leadId: { type: "string", format: "uuid" } } },
              },
            },
          },
          "401": errorResponse,
          "404": errorResponse,
        },
      },
      delete: {
        tags: ["Leads"],
        summary: "Delete a lead (requires auth)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Deleted",
            content: {
              "application/json": {
                schema: { type: "object", properties: { ok: { type: "boolean" } } },
              },
            },
          },
          "401": errorResponse,
          "404": errorResponse,
        },
      },
    },
    "/api/listings": {
      post: {
        tags: ["Listings"],
        summary: "Create a listing (requires auth)",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateListingBody" } } },
        },
        responses: {
          "200": {
            description: "Created",
            content: {
              "application/json": {
                schema: { type: "object", properties: { listingId: { type: "string", format: "uuid" } } },
              },
            },
          },
          "401": errorResponse,
        },
      },
    },
    "/api/listings/similar": {
      post: {
        tags: ["Listings", "Search"],
        summary: "Find listings similar to a given one (embedding kNN)",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/SimilarBody" } } },
        },
        responses: {
          "200": {
            description: "Similar listings",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    count: { type: "integer" },
                    results: { type: "array", items: listingResult },
                  },
                },
              },
            },
          },
          "400": errorResponse,
        },
      },
    },
    "/api/valuation": {
      post: {
        tags: ["Valuation"],
        summary: "Automated valuation (inverse-distance-weighted comparables)",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/ValuationBody" } } },
        },
        responses: {
          "200": {
            description: "Valuation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    subject: { type: "object" },
                    estimate: { type: "number" },
                    low: { type: "number" },
                    high: { type: "number" },
                    confidence: { type: "number" },
                    dispersion: { type: "number" },
                    compCount: { type: "integer" },
                    radiusKm: { type: "number" },
                    method: { type: "string" },
                    comps: { type: "array", items: { type: "object" } },
                    actual: { type: "number", nullable: true },
                    errorPct: { type: "number", nullable: true },
                  },
                },
              },
            },
          },
          "404": errorResponse,
          "422": { ...errorResponse, description: "No comparable sales nearby" },
        },
      },
    },
    "/api/route/plan": {
      post: {
        tags: ["Routing"],
        summary: "Optimized viewing route (TSP over OSRM driving times)",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/RoutePlanBody" } } },
        },
        responses: {
          "200": {
            description: "Ordered itinerary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    stops: { type: "array", items: { type: "object" } },
                    geojson: { type: "object" },
                    optimizedDriveSec: { type: "number" },
                    naiveDriveSec: { type: "number" },
                    savedSec: { type: "number" },
                    returnToStart: { type: "boolean" },
                    mode: { type: "string", enum: ["osrm", "estimated"] },
                    degraded: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": errorResponse,
        },
      },
    },
    "/api/agent": {
      post: {
        tags: ["Assistant"],
        summary: "Tool-calling assistant grounded in the catalog (LLM)",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/AgentBody" } } },
        },
        responses: {
          "200": {
            description: "Assistant reply + tool trace",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    steps: { type: "integer" },
                    toolCalls: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          "400": errorResponse,
          "503": { ...errorResponse, description: "Gemini API key not set" },
        },
      },
    },
  },
  components: {
    schemas: {
      MatchBody: {
        type: "object",
        properties: {
          brief: { type: "string", maxLength: 2000 },
          filters: {
            type: "object",
            properties: {
              minPrice: { type: "number", nullable: true },
              maxPrice: { type: "number", nullable: true },
              bedrooms: { type: "integer", nullable: true },
              propertyType: { type: "string", nullable: true },
            },
          },
          location: {
            type: "object",
            nullable: true,
            required: ["lat", "lng"],
            properties: {
              lat: { type: "number" },
              lng: { type: "number" },
              radiusKm: { type: "number", nullable: true },
            },
          },
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
      VisualSearchBody: {
        type: "object",
        required: ["query"],
        properties: { query: { type: "string", minLength: 1, maxLength: 500 } },
      },
      TriageBody: {
        type: "object",
        required: ["enquiry"],
        properties: { enquiry: { type: "string", minLength: 1, maxLength: 4000 } },
      },
      CreateLeadBody: {
        type: "object",
        required: ["enquiry"],
        properties: {
          enquiry: { type: "string", minLength: 1, maxLength: 4000 },
          contact: { type: "string", maxLength: 200 },
          requirements: { type: "object" },
        },
      },
      RerunBody: {
        type: "object",
        required: ["leadId"],
        properties: { leadId: { type: "string", format: "uuid" } },
      },
      EditLeadBody: {
        type: "object",
        properties: {
          contact: { type: "string", maxLength: 200, nullable: true },
          enquiry: { type: "string", minLength: 1, maxLength: 4000 },
          status: { type: "string", enum: ["new", "triaged", "contacted", "viewing", "closed"] },
        },
      },
      SimilarBody: {
        type: "object",
        required: ["listingId"],
        properties: { listingId: { type: "string", format: "uuid" } },
      },
      CreateListingBody: {
        type: "object",
        required: ["address", "city", "price", "propertyType"],
        properties: {
          address: { type: "string", minLength: 3, maxLength: 200 },
          city: { type: "string", minLength: 2, maxLength: 80 },
          price: { type: "number", exclusiveMinimum: 0, maximum: 100000000 },
          propertyType: { type: "string", enum: ["apartment", "house", "studio", "townhouse"] },
          bedrooms: { type: "integer", minimum: 0, maximum: 20 },
          description: { type: "string", maxLength: 2000 },
        },
      },
      ValuationBody: {
        type: "object",
        required: ["listingId"],
        properties: { listingId: { type: "string", format: "uuid" } },
      },
      AgentBody: {
        type: "object",
        required: ["message"],
        properties: { message: { type: "string", minLength: 1, maxLength: 2000 } },
      },
      RoutePlanBody: {
        type: "object",
        required: ["start", "listingIds"],
        properties: {
          start: {
            type: "object",
            required: ["lng", "lat"],
            properties: { lng: { type: "number" }, lat: { type: "number" } },
          },
          listingIds: {
            type: "array",
            minItems: 1,
            maxItems: 25,
            items: { type: "string", format: "uuid" },
          },
          startTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", example: "09:00" },
          dwellMin: { type: "integer", minimum: 1, maximum: 300 },
          returnToStart: { type: "boolean" },
          dayEnd: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", example: "17:00" },
        },
      },
    },
  },
} as const;
