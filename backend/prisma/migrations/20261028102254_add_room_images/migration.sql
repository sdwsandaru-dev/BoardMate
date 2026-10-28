-- AlterTable
ALTER TABLE "property_images" ADD COLUMN     "room_id" UUID;

-- CreateIndex
CREATE INDEX "property_images_room_id_idx" ON "property_images"("room_id");

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
