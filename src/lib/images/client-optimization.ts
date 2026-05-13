type ImageResizeMode = "fit" | "cover-square";

interface OptimizeImageFileOptions {
  maxDimension: number;
  targetSize: number;
  quality: number;
  outputType: string;
  resizeMode?: ImageResizeMode;
  errorMessage?: string;
}

function getOptimizedImageName(fileName: string, outputType: string) {
  const extension = outputType.split("/")[1] || "webp";
  return `${fileName.replace(/\.[^.]+$/, "")}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not optimize image."));
          return;
        }

        resolve(blob);
      },
      type,
      quality
    );
  });
}

export async function optimizeImageFile(file: File, options: OptimizeImageFileOptions) {
  const bitmap = await createImageBitmap(file);

  try {
    const resizeMode = options.resizeMode ?? "fit";
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = bitmap.width;
    let sourceHeight = bitmap.height;
    let outputWidth = bitmap.width;
    let outputHeight = bitmap.height;

    if (resizeMode === "cover-square") {
      const sourceSize = Math.min(bitmap.width, bitmap.height);
      sourceX = Math.max(0, Math.floor((bitmap.width - sourceSize) / 2));
      sourceY = Math.max(0, Math.floor((bitmap.height - sourceSize) / 2));
      sourceWidth = sourceSize;
      sourceHeight = sourceSize;
      outputWidth = Math.min(options.maxDimension, sourceSize);
      outputHeight = outputWidth;
    } else {
      const scale = Math.min(1, options.maxDimension / Math.max(bitmap.width, bitmap.height));
      outputWidth = Math.max(1, Math.round(bitmap.width * scale));
      outputHeight = Math.max(1, Math.round(bitmap.height * scale));
    }

    const resized =
      sourceWidth !== bitmap.width ||
      sourceHeight !== bitmap.height ||
      outputWidth !== bitmap.width ||
      outputHeight !== bitmap.height;
    const shouldOptimize =
      file.type !== options.outputType || file.size > options.targetSize || resized;

    if (!shouldOptimize) return file;

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    const blob = await canvasToBlob(canvas, options.outputType, options.quality);
    if (blob.size >= file.size) return file;

    return new File([blob], getOptimizedImageName(file.name, options.outputType), {
      type: options.outputType,
      lastModified: Date.now(),
    });
  } catch (error) {
    if (!options.errorMessage) throw error;
    throw new Error(options.errorMessage, { cause: error });
  } finally {
    bitmap.close();
  }
}
