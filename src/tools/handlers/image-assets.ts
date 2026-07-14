import { optionalString } from "../internal.js";
import { uploadImageAsset } from "../media-assets.js";

function optionalBoundedNumber(
  args: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
  integer: boolean
): number | undefined {
  const value = args[key];
  if (value === undefined) return undefined;

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum ||
    (integer && !Number.isInteger(value))
  ) {
    const numberKind = integer ? "integer" : "number";
    throw new Error(
      `\`${key}\` must be a ${numberKind} between ${minimum} and ${maximum} when calling \`upload_image_asset\`.`
    );
  }

  return value;
}

export async function handleImageAssetTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (name !== "upload_image_asset") {
    return { handled: false, result: undefined };
  }

  const filePath = optionalString(args, "filePath");
  const imageBase64 = optionalString(args, "imageBase64");
  if ((filePath === undefined) === (imageBase64 === undefined)) {
    throw new Error(
      "Provide either `filePath` or `imageBase64` (not both) when calling `upload_image_asset`."
    );
  }

  const filename = optionalString(args, "filename");
  if (imageBase64 !== undefined && filename === undefined) {
    throw new Error(
      "`filename` is required with `imageBase64` when calling `upload_image_asset`."
    );
  }

  const sourceWidth = optionalBoundedNumber(
    args,
    "sourceWidth",
    1,
    20000,
    true
  );
  const sourceHeight = optionalBoundedNumber(
    args,
    "sourceHeight",
    1,
    20000,
    true
  );
  if ((sourceWidth === undefined) !== (sourceHeight === undefined)) {
    throw new Error(
      "Provide both `sourceWidth` and `sourceHeight` when calling `upload_image_asset`."
    );
  }

  const displayWidthPercent =
    optionalBoundedNumber(args, "displayWidthPercent", 1, 100, false) ?? 100;
  const cropHeight = optionalBoundedNumber(args, "cropHeight", 1, 2000, true);
  const objectFit = optionalString(args, "objectFit");
  if (
    objectFit !== undefined &&
    objectFit !== "cover" &&
    objectFit !== "contain"
  ) {
    throw new Error(
      "`objectFit` must be 'cover' or 'contain' when calling `upload_image_asset`."
    );
  }
  if (objectFit !== undefined && cropHeight === undefined) {
    throw new Error(
      "`objectFit` can only be used with `cropHeight` when calling `upload_image_asset`."
    );
  }

  const align = optionalString(args, "align");
  if (align !== undefined && !["left", "center", "right"].includes(align)) {
    throw new Error(
      "`align` must be 'left', 'center', or 'right' when calling `upload_image_asset`."
    );
  }

  const altText =
    typeof args.altText === "string" ? args.altText.trim() : undefined;
  if (altText !== undefined && altText.length > 500) {
    throw new Error(
      "`altText` must be 500 characters or fewer when calling `upload_image_asset`."
    );
  }

  const asset = await uploadImageAsset({
    companyId: optionalString(args, "companyId"),
    filePath,
    imageBase64,
    filename,
    contentType: optionalString(args, "contentType"),
    altText,
    sourceWidth,
    sourceHeight,
  });

  const imageBlock = {
    type: "image",
    src: asset.url,
    alt: asset.altText ?? "",
    width: displayWidthPercent,
    widthType: "percent",
    ...(cropHeight !== undefined && {
      height: cropHeight,
      objectFit: objectFit ?? "cover",
    }),
    ...(align !== undefined && { align }),
  };

  return {
    handled: true,
    result: {
      success: true,
      asset,
      imageBlock,
      message:
        "Insert imageBlock into the target email's blocks array with its create or update tool.",
    },
  };
}
