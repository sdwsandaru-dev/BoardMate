
import { z } from "zod";

const optionalCoordinate = (min: number, max: number) =>
  z.number().min(min).max(max).nullable().optional();

// Students click this link, so only accept HTTPS links to Google Maps.
export function isGoogleMapsUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    return false;
  }

  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  return (
    host === "maps.app.goo.gl" ||
    host === "maps.google.com" ||
    (host === "goo.gl" && path.startsWith("/maps")) ||
    // google.com, google.lk, google.co.uk ... with a /maps path
    (/^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host) &&
      path.startsWith("/maps"))
  );
}

const optionalMapUrl = z
  .string()
  .trim()
  .max(500, "Map link is too long")
  .refine(isGoogleMapsUrl, {
    message:
      "Enter a Google Maps link, e.g. https://maps.app.goo.gl/... or https://www.google.com/maps/...",
  })
  .nullable()
  .optional();

export const createPropertySchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must contain at least 5 characters")
    .max(150, "Title cannot exceed 150 characters"),

  slug: z
    .string()
    .trim()
    .min(3)
    .max(180)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers, and hyphens only",
    ),

  description: z
    .string()
    .trim()
    .min(20, "Description must contain at least 20 characters")
    .max(5000),

  propertyType: z.enum([
    "BOARDING_HOUSE",
    "ANNEX",
    "HOSTEL",
    "APARTMENT",
    "SHARED_ROOM",
    "PRIVATE_ROOM",
  ]),

  address: z.string().trim().max(255).nullable().optional(),

  city: z.string().trim().min(2).max(100),

  monthlyRent: z.number().positive().max(10000000),

  securityDeposit: z
    .number()
    .min(0)
    .max(10000000)
    .nullable()
    .optional(),

  latitude: optionalCoordinate(-90, 90),

  longitude: optionalCoordinate(-180, 180),

  universityId: z.string().uuid().nullable().optional(),

  mapUrl: optionalMapUrl,
});

export const updatePropertySchema = createPropertySchema
  .omit({ slug: true })
  .partial()
  .extend({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const propertySearchSchema = z
  .object({
    search: z.string().trim().max(150).optional(),

    city: z.string().trim().min(1).max(100).optional(),

    propertyType: z
      .enum([
        "BOARDING_HOUSE",
        "ANNEX",
        "HOSTEL",
        "APARTMENT",
        "SHARED_ROOM",
        "PRIVATE_ROOM",
      ])
      .optional(),

    universityId: z.string().uuid().optional(),

    minRent: z.coerce.number().min(0).optional(),

    maxRent: z.coerce.number().min(0).optional(),

    sortBy: z
      .enum(["newest", "price_asc", "price_desc"])
      .default("newest"),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine(
    (data) =>
      data.minRent === undefined ||
      data.maxRent === undefined ||
      data.minRent <= data.maxRent,
    {
      message: "Minimum rent cannot exceed maximum rent",
      path: ["maxRent"],
    },
  );

export const deletePropertySchema = z.object({
  reason: z
    .string({ error: "Tell the admin why you are deleting this listing" })
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(1000, "Reason must be at most 1000 characters"),
});

export type CreatePropertyInput = z.infer<
  typeof createPropertySchema
>;

export type UpdatePropertyInput = z.infer<
  typeof updatePropertySchema
>;

export type PropertySearchInput = z.infer<
  typeof propertySearchSchema
>;
