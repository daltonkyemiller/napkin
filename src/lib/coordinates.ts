/**
 * Coordinate conversion utilities for annotation positioning.
 *
 * Annotations are stored in "image-relative" coordinates (relative to the image's
 * natural dimensions), so they maintain their position on the image regardless of
 * how the canvas is scaled or positioned.
 *
 * Stage coordinates: The actual pixel position on the Konva stage
 * Image-relative coordinates: Position relative to the top-left of the image,
 *   in the image's natural coordinate system (not scaled)
 */

export interface ImageTransform {
  /** X offset of the image on the stage (where the image starts) */
  imageX: number;
  /** Y offset of the image on the stage */
  imageY: number;
  /** Scale factor applied to the image */
  imageScale: number;
}

/**
 * Convert stage coordinates to image-relative coordinates.
 * Use when creating or moving annotations.
 */
export function stageToImageCoords(
  stageX: number,
  stageY: number,
  transform: ImageTransform,
): { x: number; y: number } {
  const { imageX, imageY, imageScale } = transform;

  // Subtract image offset to get position relative to image top-left,
  // then divide by scale to get image-native coordinates
  return {
    x: (stageX - imageX) / imageScale,
    y: (stageY - imageY) / imageScale,
  };
}

/**
 * Convert image-relative coordinates to stage coordinates.
 * Use when rendering annotations.
 */
export function imageToStageCoords(
  imageRelX: number,
  imageRelY: number,
  transform: ImageTransform,
): { x: number; y: number } {
  const { imageX, imageY, imageScale } = transform;

  // Multiply by scale to get scaled position,
  // then add image offset to get stage position
  return {
    x: imageRelX * imageScale + imageX,
    y: imageRelY * imageScale + imageY,
  };
}

/**
 * Convert a distance/size from stage space to image space.
 * Use for dimensions like radius, width, height, strokeWidth.
 */
export function stageSizeToImageSize(stageSize: number, imageScale: number): number {
  return stageSize / imageScale;
}

/**
 * Convert a distance/size from image space to stage space.
 * Use when rendering dimensions.
 */
export function imageSizeToStageSize(imageSize: number, imageScale: number): number {
  return imageSize * imageScale;
}
