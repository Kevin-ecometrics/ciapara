export type ImageOrientation = "horizontal" | "vertical" | "square";

export interface StoredImage {
  id: string;
  name: string;
  orientation: ImageOrientation;
  url: string;
  created_at: string;
}
