import { apiRequest } from "../runtime.js";

import { buildUpdateCompanyBody } from "./argument-validation.js";
import { readFounderPhotoUpload } from "./media-assets.js";

/**
 * Runs `update_company`: the settings as one PATCH, then an uploaded founder
 * photo, if any, to PUT /companies/:id/founder-photo, which crops it to the
 * square the personal footer shows. Returns the company as the last request
 * left it.
 */
export async function sendUpdateCompany(
  companyId: string,
  args: Record<string, unknown>,
  request: typeof apiRequest = apiRequest
): Promise<unknown> {
  const body = buildUpdateCompanyBody(args);
  const filePath = args["founderPhotoFilePath"];
  const imageBase64 = args["founderPhotoBase64"];
  const photo =
    typeof filePath === "string" || typeof imageBase64 === "string"
      ? readFounderPhotoUpload({
          filePath: typeof filePath === "string" ? filePath : undefined,
          imageBase64:
            typeof imageBase64 === "string" ? imageBase64 : undefined,
        })
      : undefined;

  let result: unknown;
  if (Object.keys(body).length > 0) {
    result = await request("PATCH", `/api/v1/companies/${companyId}`, body);
  }
  if (photo !== undefined) {
    result = await request(
      "PUT",
      `/api/v1/companies/${companyId}/founder-photo`,
      { imageBase64: photo }
    );
  }
  return result;
}
