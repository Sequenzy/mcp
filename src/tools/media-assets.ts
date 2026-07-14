import { readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";

import {
  apiRequest,
  apiUploadRequest,
  areLocalFileUploadsEnabled,
} from "../runtime.js";

export const IMAGE_ASSET_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const IMAGE_ASSET_MAX_BASE64_LENGTH =
  Math.ceil(IMAGE_ASSET_MAX_SIZE_BYTES / 3) * 4;
const IMAGE_ASSET_MAX_BASE64_INPUT_LENGTH =
  Math.ceil(IMAGE_ASSET_MAX_BASE64_LENGTH * 1.05) + 256;

const IMAGE_CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const ALLOWED_IMAGE_CONTENT_TYPES = new Set(
  Object.values(IMAGE_CONTENT_TYPE_BY_EXTENSION)
);

export interface UploadedImageAsset {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: string;
  width: string | null;
  height: string | null;
  altText: string | null;
  companyId: string;
  createdAt: string;
}

export interface UploadImageAssetInput {
  companyId?: string | undefined;
  filePath?: string | undefined;
  imageBase64?: string | undefined;
  filename?: string | undefined;
  contentType?: string | undefined;
  altText?: string | undefined;
  sourceWidth?: number | undefined;
  sourceHeight?: number | undefined;
}

interface PreparedImageUpload {
  bytes: Buffer;
  filename: string;
  contentType: string;
  altText: string;
}

function normalizeContentType(contentType?: string): string | undefined {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase();
  return normalized || undefined;
}

function contentTypeFromFilename(filename: string): string | undefined {
  return IMAGE_CONTENT_TYPE_BY_EXTENSION[extname(filename).toLowerCase()];
}

function defaultAltText(filename: string): string {
  const extension = extname(filename);
  const withoutExtension = extension
    ? filename.slice(0, -extension.length)
    : filename;
  return withoutExtension.replace(/[-_]+/g, " ").trim() || "Image";
}

function assertBase64ImageInputLength(value: string): void {
  if (value.length > IMAGE_ASSET_MAX_BASE64_INPUT_LENGTH) {
    throw new Error("Image assets must be 5MB or smaller.");
  }
}

function assertBase64ImageSize(value: string): void {
  let encodedLength = 0;
  let paddingLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const characterCode = value.charCodeAt(index);
    const isAsciiWhitespace =
      characterCode === 9 ||
      characterCode === 10 ||
      characterCode === 11 ||
      characterCode === 12 ||
      characterCode === 13 ||
      characterCode === 32;
    if (isAsciiWhitespace) continue;

    encodedLength += 1;
    paddingLength = characterCode === 61 ? paddingLength + 1 : 0;
  }

  const decodedLength =
    Math.floor((encodedLength * 3) / 4) - Math.min(paddingLength, 2);
  if (decodedLength > IMAGE_ASSET_MAX_SIZE_BYTES) {
    throw new Error("Image assets must be 5MB or smaller.");
  }
}

function decodeBase64Image(value: string): {
  bytes: Buffer;
  dataUrlContentType?: string | undefined;
} {
  assertBase64ImageInputLength(value);
  const trimmed = value.trim();
  const dataUrlMatch = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(trimmed);
  const encodedSource = dataUrlMatch?.[2] ?? trimmed;
  assertBase64ImageSize(encodedSource);
  const encoded = encodedSource.replace(/\s+/g, "");

  if (
    encoded.length === 0 ||
    encoded.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
  ) {
    throw new Error("`imageBase64` must contain valid base64 image bytes.");
  }

  return {
    bytes: Buffer.from(encoded, "base64"),
    ...(dataUrlMatch?.[1]
      ? { dataUrlContentType: normalizeContentType(dataUrlMatch[1]) }
      : {}),
  };
}

function assertUploadSize(fileSizeBytes: number): void {
  if (fileSizeBytes <= 0) {
    throw new Error("The image file is empty.");
  }
  if (fileSizeBytes > IMAGE_ASSET_MAX_SIZE_BYTES) {
    throw new Error("Image assets must be 5MB or smaller.");
  }
}

function resolveSupportedContentType(input: {
  filename: string;
  explicitContentType?: string | undefined;
  dataUrlContentType?: string | undefined;
}): string {
  const contentType =
    contentTypeFromFilename(input.filename) ??
    normalizeContentType(input.explicitContentType) ??
    normalizeContentType(input.dataUrlContentType);

  if (!contentType || !ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
    throw new Error("Unsupported image type. Use PNG, JPEG, GIF, or WebP.");
  }

  return contentType;
}

function prepareImageUpload(input: UploadImageAssetInput): PreparedImageUpload {
  let bytes: Buffer;
  let filename: string;
  let dataUrlContentType: string | undefined;

  if (input.filePath !== undefined) {
    if (!areLocalFileUploadsEnabled()) {
      throw new Error(
        "`filePath` is only supported when the MCP server runs locally on your machine. For a remote MCP connection, pass `imageBase64` and `filename` instead."
      );
    }

    const fileSizeBytes = statSync(input.filePath).size;
    assertUploadSize(fileSizeBytes);
    bytes = readFileSync(input.filePath);
    filename = input.filename ?? basename(input.filePath);
  } else {
    if (!input.imageBase64) {
      throw new Error(
        "Provide either `filePath` or `imageBase64` when uploading an image asset."
      );
    }
    if (!input.filename) {
      throw new Error(
        "`filename` is required with `imageBase64` when uploading an image asset."
      );
    }

    const decoded = decodeBase64Image(input.imageBase64);
    bytes = decoded.bytes;
    dataUrlContentType = decoded.dataUrlContentType;
    filename = input.filename;
    assertUploadSize(bytes.byteLength);
  }

  const contentType = resolveSupportedContentType({
    filename,
    explicitContentType: input.contentType,
    dataUrlContentType,
  });

  return {
    bytes,
    filename,
    contentType,
    altText: input.altText ?? defaultAltText(filename),
  };
}

export async function uploadImageAsset(
  input: UploadImageAssetInput
): Promise<UploadedImageAsset> {
  const prepared = prepareImageUpload(input);
  const fileSizeBytes = prepared.bytes.byteLength;

  const presigned = await apiRequest<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
    fileName: string;
  }>(
    "POST",
    "/api/v1/media/upload-url",
    {
      filename: prepared.filename,
      contentType: prepared.contentType,
      fileSizeBytes,
    },
    input.companyId
  );

  await apiUploadRequest(
    presigned.uploadUrl,
    prepared.bytes,
    prepared.contentType,
    input.companyId
  );

  const completed = await apiRequest<{
    asset: UploadedImageAsset;
  }>(
    "POST",
    "/api/v1/media/complete-upload",
    {
      key: presigned.key,
      filename: presigned.fileName,
      contentType: prepared.contentType,
      fileSizeBytes,
      ...(input.sourceWidth !== undefined && { width: input.sourceWidth }),
      ...(input.sourceHeight !== undefined && { height: input.sourceHeight }),
      altText: prepared.altText,
    },
    input.companyId
  );

  return completed.asset;
}
