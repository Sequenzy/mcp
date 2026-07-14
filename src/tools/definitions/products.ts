import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const productToolDefinitions: Tool[] = [
  // ============================================================================
  // Products & Digital Delivery
  // ============================================================================
  {
    name: "list_products",
    description:
      "List synced products (Stripe, Shopify, WooCommerce) including any attached digital delivery file. Useful before attaching a file or building a purchase sequence for a specific product.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list products for. If not provided, uses the currently selected company.",
        },
        provider: {
          type: "string",
          description:
            "Filter by provider: stripe, shopify, woocommerce, or manual.",
        },
        search: {
          type: "string",
          description: "Filter products by title.",
        },
      },
    },
  },
  {
    name: "upsert_products",
    description:
      "Create or update products in the catalog (Commerce API, keyed by your productId, stored under the api provider). Use this to add products that are not synced from Stripe/Shopify/WooCommerce, then attach a deliverable file with attach_product_file and build a purchase sequence for them.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        products: {
          type: "array",
          description: "Products to create or update (max 100).",
          items: {
            type: "object",
            properties: {
              productId: {
                type: "string",
                description:
                  "Your stable product identifier (used for upserts and order line items).",
              },
              title: { type: "string", description: "Product title." },
              description: {
                type: "string",
                description: "Product description.",
              },
              imageUrl: {
                type: "string",
                description: "Product image URL.",
              },
              url: {
                type: "string",
                description: "Product page URL.",
              },
              priceCents: {
                type: "number",
                description: "Price in the smallest currency unit.",
              },
              currency: {
                type: "string",
                description: "ISO currency code, e.g. USD.",
              },
              inStock: {
                type: "boolean",
                description: "Whether the product is in stock.",
              },
            },
            required: ["productId", "title"],
          },
        },
      },
      required: ["products"],
    },
  },
  {
    name: "delete_product",
    description:
      "Delete a product previously pushed via upsert_products (Commerce API products only), identified by your productId.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        productId: {
          type: "string",
          description: "Your productId used when upserting the product.",
        },
      },
      required: ["productId"],
    },
  },
  {
    name: "attach_product_file",
    description:
      "Attach a distributable file to a product, either by public URL or by uploading a local file (filePath, local MCP server only). After a purchase of the product, sequence emails can link to it with {{event.download.url}} and {{event.download.name}}.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        productId: {
          type: "string",
          description:
            "Product ID from list_products, or your own productId for products pushed via upsert_products.",
        },
        url: {
          type: "string",
          description:
            "Public http(s) URL of the file to deliver. Provide url or filePath, not both.",
        },
        filePath: {
          type: "string",
          description:
            "Local path of a file to upload and attach (PDF, ePub, ZIP, image, audio, video, or text, up to 100MB). Only available when the MCP server runs locally on this machine.",
        },
        fileName: {
          type: "string",
          description:
            "Display name for the file (e.g. guide.pdf). Used as {{event.download.name}}.",
        },
      },
      required: ["productId"],
    },
  },
  {
    name: "remove_product_file",
    description: "Remove the attached distributable file from a product.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        productId: {
          type: "string",
          description:
            "Product ID from list_products, or your own productId for products pushed via upsert_products.",
        },
      },
      required: ["productId"],
    },
  },
  {
    name: "sync_products",
    description:
      "Queue a sync of the Stripe product catalog into the products list. Requires an active Stripe integration.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
];
