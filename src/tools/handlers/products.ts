import { apiRequest } from "../../runtime.js";
import {
  optionalString,
  requiredString,
  uploadLocalDeliveryFile,
} from "../internal.js";

export async function handleProductTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "list_products": {
      const companyId = args.companyId as string | undefined;
      const params = new URLSearchParams();
      if (typeof args.provider === "string" && args.provider.trim()) {
        params.set("provider", args.provider.trim());
      }
      if (typeof args.search === "string" && args.search.trim()) {
        params.set("search", args.search.trim());
      }
      const query = params.size > 0 ? `?${params.toString()}` : "";
      result = await apiRequest(
        "GET",
        `/api/v1/products${query}`,
        undefined,
        companyId
      );
      break;
    }

    case "upsert_products": {
      const companyId = args.companyId as string | undefined;
      if (!Array.isArray(args.products) || args.products.length === 0) {
        throw new Error(
          "`products` must be a non-empty array when calling `upsert_products`."
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/products",
        { products: args.products },
        companyId
      );
      break;
    }

    case "delete_product": {
      const companyId = args.companyId as string | undefined;
      const productId = requiredString("delete_product", args, "productId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/products/${encodeURIComponent(productId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "attach_product_file": {
      const companyId = args.companyId as string | undefined;
      const productId = requiredString(
        "attach_product_file",
        args,
        "productId"
      );
      const url = optionalString(args, "url");
      const filePath = optionalString(args, "filePath");

      if ((url === undefined) === (filePath === undefined)) {
        throw new Error(
          "Provide either `url` or `filePath` (not both) when calling `attach_product_file`."
        );
      }

      let body: Record<string, unknown>;
      if (filePath !== undefined) {
        const uploaded = await uploadLocalDeliveryFile(filePath, companyId);
        body = {
          url: uploaded.url,
          source: "upload",
          fileName: optionalString(args, "fileName") ?? uploaded.fileName,
          fileSizeBytes: uploaded.fileSizeBytes,
          mimeType: uploaded.mimeType,
        };
      } else {
        body = { url };
        const fileName = optionalString(args, "fileName");
        if (fileName) {
          body.fileName = fileName;
        }
      }

      result = await apiRequest(
        "PUT",
        `/api/v1/products/${encodeURIComponent(productId)}/delivery`,
        body,
        companyId
      );
      break;
    }

    case "remove_product_file": {
      const companyId = args.companyId as string | undefined;
      const productId = requiredString(
        "remove_product_file",
        args,
        "productId"
      );
      result = await apiRequest(
        "DELETE",
        `/api/v1/products/${encodeURIComponent(productId)}/delivery`,
        undefined,
        companyId
      );
      break;
    }

    case "sync_products": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        "/api/v1/products/sync",
        undefined,
        companyId
      );
      break;
    }

    // Tags, Lists, Segments
    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
