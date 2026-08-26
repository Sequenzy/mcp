import type { Tool } from "../../mcp-types.js";

export const imageAssetToolDefinitions: Tool[] = [
  {
    name: "upload_image_asset",
    description:
      "Upload an image to the selected company's shared media library and return a hosted URL plus a ready-to-insert Sequenzy image block. Call this before create/update campaign, sequence, template, or transactional tools, then place the returned imageBlock in the target blocks array. Provide either filePath (local stdio MCP only) or imageBase64 (works with remote MCP when the client can supply attachment bytes), not both. PNG, JPEG, GIF, and WebP are supported up to 5MB. cropHeight with objectFit:'cover' provides a precise centered screenshot crop while displayWidthPercent keeps the image responsive.",
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
];
