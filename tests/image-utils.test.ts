// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_DIMENSION, fitWithin, prepareImageForUpload } from "../src/utils/image.ts";

describe("image utilities", () => {
  it("keeps images that already fit and scales larger ones preserving aspect ratio", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(4000, 3000)).toEqual({ width: MAX_UPLOAD_DIMENSION, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: MAX_UPLOAD_DIMENSION });
    expect(fitWithin(5000, 100, 1000)).toEqual({ width: 1000, height: 20 });
  });

  it("falls back to the original bytes when the browser cannot decode or resize", async () => {
    // jsdom has no createImageBitmap, which exercises the graceful-degradation path.
    const blob = new Blob(["hello"], { type: "image/png" });
    const prepared = await prepareImageForUpload(blob);

    expect(prepared.mimeType).toBe("image/png");
    expect(prepared.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });
});
