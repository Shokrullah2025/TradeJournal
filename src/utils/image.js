// Client-side image processing helpers.
//
// Per the engineering standards, images must be resized and compressed in the
// browser before they are uploaded to Supabase Storage. This module is the one
// place that logic lives so avatars, trade screenshots, etc. all share it.

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The selected file is not a valid image."));
    img.src = src;
  });

/**
 * Resize (preserving aspect ratio) and re-encode an image file to WebP.
 *
 * @param {File} file - the user-selected image file.
 * @param {object} [options]
 * @param {number} [options.maxDimension=512] - longest edge of the output, in px.
 * @param {number} [options.quality=0.85] - WebP quality, 0–1.
 * @returns {Promise<Blob>} a WebP-encoded Blob.
 */
export async function compressImageToWebP(
  file,
  { maxDimension = 512, quality = 0.85 } = {}
) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    const scale = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is not supported in this browser.");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image conversion failed."))),
      "image/webp",
      quality
    )
  );

  return blob;
}
