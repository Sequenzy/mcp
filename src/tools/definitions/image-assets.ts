import type { Tool } from "../../mcp-types.js";

export const imageAssetToolDefinitions: Tool[] = [
  {
    name: "upload_image_asset",
    description:
      "Upload an image to the selected company's shared media library and return a hosted URL plus a ready-to-insert Sequenzy image block. When an email needs a new image, call this before create/update campaign, sequence, template, or transactional tools, then place the returned imageBlock in the target blocks array. Provide either filePath (local stdio MCP only) or imageBase64 (works with remote MCP when the client can supply attachment bytes), not both. PNG, JPEG, GIF, and WebP are supported up to 10MB. cropHeight with objectFit:'cover' provides a precise centered screenshot crop while displayWidthPercent keeps the image responsive.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        filePath: {
          type: "string",
          description:
            "Local path to a PNG, JPEG, GIF, or WebP image. Available only when the MCP server runs locally. Provide filePath or imageBase64, not both.",
        },
        imageBase64: {
          type: "string",
          description:
            "Raw base64 image bytes or a base64 data URL. Use this for remote MCP clients that can access attachment bytes. Provide imageBase64 or filePath, not both.",
        },
        filename: {
          type: "string",
          description:
            "File name including extension. Required with imageBase64; optional override with filePath.",
        },
        contentType: {
          type: "string",
          description:
            "Image MIME type when it cannot be inferred from filename, such as image/png.",
        },
        altText: {
          type: "string",
          description:
            "Accessible description stored with the asset and returned as imageBlock.alt. Use an empty string only for a decorative image.",
        },
        sourceWidth: {
          type: "integer",
          minimum: 1,
          maximum: 20000,
          description:
            "Optional intrinsic source width in pixels. Provide sourceWidth and sourceHeight together when known.",
        },
        sourceHeight: {
          type: "integer",
          minimum: 1,
          maximum: 20000,
          description:
            "Optional intrinsic source height in pixels. Provide sourceWidth and sourceHeight together when known.",
        },
        displayWidthPercent: {
          type: "number",
          minimum: 1,
          maximum: 100,
          description:
            "Responsive image width as a percentage of the email content area. Defaults to 100.",
        },
        cropHeight: {
          type: "integer",
          minimum: 1,
          maximum: 2000,
          description:
            "Optional fixed display height in pixels. With objectFit:'cover', the image is centered and cropped to this height.",
        },
        objectFit: {
          type: "string",
          enum: ["cover", "contain"],
          description:
            "How the image fits cropHeight. Defaults to cover when cropHeight is provided. Only valid with cropHeight.",
        },
        align: {
          type: "string",
          enum: ["left", "center", "right"],
          description: "Image alignment. Defaults to center.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "crop_image_asset",
    description:
      "Crop an image from the selected company's media library (or a Pexels or Unsplash photo) into a new hosted image and return it with a ready-to-insert Sequenzy image block. The crop is baked into the file, so Gmail, Outlook and every other client show exactly the chosen area, unlike cropHeight with objectFit:'cover', which some clients ignore. Provide either crop (fractions of the image) or aspectRatio (the largest centered crop of that shape, optionally moved toward focusX/focusY), not both. The original stays in the library and the returned imageBlock.crop records it, so the editor can re-open or undo the crop. Retrying the same crop returns the same asset. For other external images, call upload_image_asset first and crop the returned URL.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sourceUrl: {
          type: "string",
          description:
            "Hosted URL of the original image: an asset URL from the media library or upload_image_asset, or a Pexels/Unsplash photo URL. To change an existing crop, pass the original from imageBlock.crop.sourceSrc, not the cropped URL.",
        },
        crop: {
          type: "object",
          description:
            "Area to keep as fractions of the upright image: x and y are the top-left corner, width and height the size, all from 0 to 1 and inside the image. Provide crop or aspectRatio, not both.",
          properties: {
            x: { type: "number", minimum: 0, maximum: 1 },
            y: { type: "number", minimum: 0, maximum: 1 },
            width: { type: "number", minimum: 0, maximum: 1 },
            height: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["x", "y", "width", "height"],
          additionalProperties: false,
        },
        aspectRatio: {
          type: "string",
          description:
            'Width to height, such as "16:9", "1:1", "4:5" or "1.91:1", between 1:10 and 10:1. Crops the largest area of that shape. Provide aspectRatio or crop, not both.',
        },
        focusX: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "With aspectRatio only: horizontal center of the crop as a fraction of the image width. Defaults to 0.5.",
        },
        focusY: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "With aspectRatio only: vertical center of the crop as a fraction of the image height. Defaults to 0.5.",
        },
        altText: {
          type: "string",
          description:
            "Accessible description stored with the cropped asset and returned as imageBlock.alt.",
        },
        displayWidthPercent: {
          type: "number",
          minimum: 1,
          maximum: 100,
          description:
            "Responsive image width as a percentage of the email content area. Defaults to 100.",
        },
        align: {
          type: "string",
          enum: ["left", "center", "right"],
          description: "Image alignment. Defaults to center.",
        },
      },
      required: ["sourceUrl"],
      additionalProperties: false,
    },
  },
];
