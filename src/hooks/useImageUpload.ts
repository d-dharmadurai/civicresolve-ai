import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { MAX_UPLOAD_FILE_BYTES, prepareImageForUpload } from "../utils/image";

export interface UploadedImage {
  /** Data URL used both for the on-screen preview and the API payload. */
  dataUrl: string;
  mimeType: string;
  fileName: string;
}

/**
 * Manages a single citizen photo: file-picker + drag-and-drop intake, validation,
 * client-side downscaling, and clearing.
 */
export function useImageUpload(onError: (message: string) => void) {
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        onError("Please upload a valid image file (PNG, JPG, or WEBP).");
        return;
      }
      if (file.size > MAX_UPLOAD_FILE_BYTES) {
        onError("Image file must be smaller than 10 MB.");
        return;
      }

      try {
        const prepared = await prepareImageForUpload(file);
        setImage({ ...prepared, fileName: file.name });
      } catch {
        onError("Could not read that image. Please try a different file.");
      }
    },
    [onError]
  );

  const clear = useCallback(() => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const preventAndSetDragging = (e: DragEvent<HTMLLabelElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };

  const dropZoneHandlers = {
    onDragOver: (e: DragEvent<HTMLLabelElement>) => preventAndSetDragging(e, true),
    onDragLeave: (e: DragEvent<HTMLLabelElement>) => preventAndSetDragging(e, false),
    onDrop: (e: DragEvent<HTMLLabelElement>) => {
      preventAndSetDragging(e, false);
      const file = e.dataTransfer.files?.[0];
      if (file) void processFile(file);
    },
  };

  return { image, setImage, isDragging, fileInputRef, handleFileChange, dropZoneHandlers, clear };
}
