import { images } from "@shared/schema";
import { db } from "./db";

// This function is needed to handle the case where imagePath is removed from the database
export async function createImageWithoutPath(
  userId: number,
  hashKey: string,
  initialAngles?: { angle: number; angle2: number }
): Promise<any> {
  const [image] = await db
    .insert(images)
    .values({
      userId,
      hashKey,
      isProcessed: !!initialAngles,
      processedAngle: initialAngles?.angle ?? null,
      processedAngle2: initialAngles?.angle2 ?? null,
    })
    .returning();

  return image;
}
