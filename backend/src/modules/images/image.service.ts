
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import { cloudinary } from "../../config/cloudinary";

export class ImageError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "ImageError";
  }
}

interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

function uploadBufferToCloudinary(
  buffer: Buffer,
  propertyId: string,
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "boardmate/properties",
        public_id: `${propertyId}-${randomUUID()}`,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary returned no upload result"));
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

async function verifyPropertyOwnership(
  propertyId: string,
  ownerId: string,
) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      ownerId: true,
      status: true,
    },
  });

  if (!property) {
    throw new ImageError("Property not found", 404);
  }

  if (property.ownerId !== ownerId) {
    throw new ImageError(
      "You do not have permission to manage these images",
      403,
    );
  }

  if (
    property.status === "ARCHIVED" ||
    property.status === "SUSPENDED"
  ) {
    throw new ImageError(
      "Images cannot be managed for this property",
      409,
    );
  }

  return property;
}

export async function uploadPropertyImages(
  propertyId: string,
  ownerId: string,
  files: UploadedImage[],
  roomId: string | null = null,
) {
  await verifyPropertyOwnership(propertyId, ownerId);

  if (files.length === 0) {
    throw new ImageError("Please select at least one image", 400);
  }

  // A room photo must belong to a room of this same property.
  if (roomId) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, propertyId },
      select: { id: true },
    });

    if (!room) {
      throw new ImageError("Room not found in this property", 404);
    }
  }

  const uploaded: Array<{
    secure_url: string;
    public_id: string;
  }> = [];

  try {
    for (const file of files) {
      const result = await uploadBufferToCloudinary(
        file.buffer,
        propertyId,
      );

      uploaded.push(result);
    }

    const highestOrder = await prisma.propertyImage.aggregate({
      where: { propertyId },
      _max: { sortOrder: true },
    });

    const firstOrder = (highestOrder._max.sortOrder ?? -1) + 1;

    const images = await prisma.$transaction(
      uploaded.map((image, index) =>
        prisma.propertyImage.create({
          data: {
            propertyId,
            roomId,
            imageUrl: image.secure_url,
            sortOrder: firstOrder + index,
          },
        }),
      ),
    );

    return images;
  } catch (error) {
    // Clean up files already uploaded if database persistence fails.
    await Promise.allSettled(
      uploaded.map((image) =>
        cloudinary.uploader.destroy(image.public_id, {
          resource_type: "image",
        }),
      ),
    );

    throw error;
  }
}

export async function listPropertyImages(propertyId: string) {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      status: "PUBLISHED",
      verificationStatus: "VERIFIED",
    },
    select: { id: true },
  });

  if (!property) {
    throw new ImageError(
      "Property not found or is not publicly available",
      404,
    );
  }

  return prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listOwnerPropertyImages(
  propertyId: string,
  ownerId: string,
) {
  await verifyPropertyOwnership(propertyId, ownerId);

  return prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function deletePropertyImage(
  propertyId: string,
  imageId: string,
  ownerId: string,
) {
  await verifyPropertyOwnership(propertyId, ownerId);

  const image = await prisma.propertyImage.findFirst({
    where: {
      id: imageId,
      propertyId,
    },
  });

  if (!image) {
    throw new ImageError("Property image not found", 404);
  }

  // Resolve the Cloudinary public ID from its stored URL.
  const url = new URL(image.imageUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  const uploadIndex = segments.indexOf("upload");

  if (
    url.hostname !== "res.cloudinary.com" ||
    uploadIndex === -1 ||
    segments.length <= uploadIndex + 1
  ) {
    throw new ImageError(
      "Stored image URL is not a valid Cloudinary upload URL",
      500,
    );
  }

  let publicIdSegments = segments.slice(uploadIndex + 1);

  // Remove a version segment such as v1234567890.
  if (/^v\d+$/.test(publicIdSegments[0])) {
    publicIdSegments = publicIdSegments.slice(1);
  }

  const lastIndex = publicIdSegments.length - 1;
  publicIdSegments[lastIndex] = publicIdSegments[lastIndex].replace(
    /\.[^.]+$/,
    "",
  );

  const publicId = decodeURIComponent(
    publicIdSegments.join("/"),
  );

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new ImageError(
      "Unable to delete the image from storage",
      502,
    );
  }

  await prisma.propertyImage.delete({
    where: { id: imageId },
  });

  return { success: true };
}
