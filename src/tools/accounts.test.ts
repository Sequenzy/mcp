import { afterAll, afterEach, expect, it, spyOn } from "bun:test";

import * as runtime from "../runtime.js";

import { accountToolDefinitions } from "./definitions/accounts.js";
import { handleAccountTools } from "./handlers/accounts.js";

const request = spyOn(runtime, "apiRequest");
afterEach(() => request.mockClear());
afterAll(() => request.mockRestore());
request.mockResolvedValue({ success: true });

it("publishes occurredAt as an optional string on the account event tool", () => {
  const tool = accountToolDefinitions.find(
    ({ name }) => name === "trigger_account_event"
  );
  expect(tool?.inputSchema.properties?.["occurredAt"]).toMatchObject({
    type: "string",
  });
  expect(tool?.inputSchema.required).not.toContain("occurredAt");
});

it("forwards the original timestamp to the REST API and preserves structured output", async () => {
  const response = {
    success: true,
    event: { id: "evt-1", name: "plan_changed", time: "2026-09-01T10:00:00Z" },
  };
  request.mockResolvedValueOnce(response);
  const result = await handleAccountTools("trigger_account_event", {
    companyId: "tenant-1",
    externalId: "org/1",
    event: "plan_changed",
    occurredAt: "2026-09-01T10:00:00Z",
    eventId: "evt-1",
    recipients: "none",
  });
  expect(request).toHaveBeenCalledWith(
    "POST",
    "/api/v1/accounts/org%2F1/events",
    {
      event: "plan_changed",
      occurredAt: "2026-09-01T10:00:00Z",
      eventId: "evt-1",
      recipients: "none",
    },
    "tenant-1"
  );
  expect(result).toEqual({ handled: true, result: response });
});

it("leaves the timestamp absent for live events", async () => {
  await handleAccountTools("trigger_account_event", {
    externalId: "org-1",
    event: "plan_changed",
  });
  expect(request).toHaveBeenCalledWith(
    "POST",
    "/api/v1/accounts/org-1/events",
    { event: "plan_changed" },
    undefined
  );
});

it("lists account suggestions with optional query parameters", async () => {
  await handleAccountTools("list_account_suggestions", {
    companyId: "tenant-1",
    minContacts: 5,
    limit: 10,
  });
  expect(request).toHaveBeenCalledWith(
    "GET",
    "/api/v1/account-suggestions?minContacts=5&limit=10",
    undefined,
    "tenant-1"
  );

  await handleAccountTools("list_account_suggestions", {});
  expect(request).toHaveBeenLastCalledWith(
    "GET",
    "/api/v1/account-suggestions",
    undefined,
    undefined
  );
});

it("accepts confirmed suggestion domains", async () => {
  const response = { success: true, accountsCreated: 1, results: [] };
  request.mockResolvedValueOnce(response);
  const result = await handleAccountTools("accept_account_suggestions", {
    domains: ["acme.com", "globex.com"],
  });
  expect(request).toHaveBeenCalledWith(
    "POST",
    "/api/v1/account-suggestions",
    { domains: ["acme.com", "globex.com"] },
    undefined
  );
  expect(result).toEqual({ handled: true, result: response });
});

it("rejects missing or malformed suggestion domains before calling the API", async () => {
  for (const domains of [undefined, [], ["acme.com", 7], "acme.com"]) {
    let error: unknown;
    try {
      await handleAccountTools("accept_account_suggestions", { domains });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
  }
  expect(request).not.toHaveBeenCalled();
});

it("publishes plain object schemas for the suggestion tools", () => {
  for (const name of [
    "list_account_suggestions",
    "accept_account_suggestions",
  ]) {
    const tool = accountToolDefinitions.find((entry) => entry.name === name);
    expect(tool?.inputSchema.type).toBe("object");
    expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
  }
  expect(
    accountToolDefinitions.find(
      (entry) => entry.name === "accept_account_suggestions"
    )?.inputSchema.required
  ).toEqual(["domains"]);
});

it("detects, previews, creates and checks accounts from an organization id", async () => {
  await handleAccountTools("detect_account_organization_ids", {
    companyId: "tenant-1",
  });
  expect(request).toHaveBeenLastCalledWith(
    "GET",
    "/api/v1/account-suggestions/organization-ids",
    undefined,
    "tenant-1"
  );

  await handleAccountTools("preview_accounts_from_organization_id", {
    propertyKey: "account id",
    source: "attribute",
    nameKey: " company_name ",
    limit: 20,
  });
  expect(request).toHaveBeenLastCalledWith(
    "GET",
    "/api/v1/account-suggestions/organization-ids/preview?propertyKey=account+id&source=attribute&nameKey=company_name&limit=20",
    undefined,
    undefined
  );

  await handleAccountTools("create_accounts_from_organization_id", {
    propertyKey: "workspaceId",
  });
  expect(request).toHaveBeenLastCalledWith(
    "POST",
    "/api/v1/account-suggestions/organization-ids",
    { propertyKey: "workspaceId" },
    undefined
  );

  await handleAccountTools("get_account_organization_id_job", {
    jobId: "backfill-accounts:comp_1:workspaceId",
  });
  expect(request).toHaveBeenLastCalledWith(
    "GET",
    "/api/v1/account-suggestions/organization-ids/jobs/backfill-accounts%3Acomp_1%3AworkspaceId",
    undefined,
    undefined
  );
});

it("rejects a missing key, an unknown source or a missing job id before calling the API", async () => {
  request.mockClear();
  for (const [tool, args] of [
    ["preview_accounts_from_organization_id", {}],
    ["create_accounts_from_organization_id", { propertyKey: "  " }],
    [
      "create_accounts_from_organization_id",
      { propertyKey: "workspaceId", source: "cookies" },
    ],
    ["get_account_organization_id_job", {}],
  ] as const) {
    let error: unknown;
    try {
      await handleAccountTools(tool, args);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
  }
  expect(request).not.toHaveBeenCalled();
});

it("publishes plain object schemas for the organization id tools", () => {
  for (const name of [
    "detect_account_organization_ids",
    "preview_accounts_from_organization_id",
    "create_accounts_from_organization_id",
    "get_account_organization_id_job",
  ]) {
    const tool = accountToolDefinitions.find((entry) => entry.name === name);
    expect(tool?.inputSchema.type).toBe("object");
    expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
  }
});

it("rejects member calls without an identity before calling the API", async () => {
  for (const tool of ["add_account_member", "remove_account_member"]) {
    await Promise.resolve(
      expect(
        handleAccountTools(tool, { externalId: "org-1", role: "admin" })
      ).rejects.toThrow(
        `\`email\` or \`subscriberExternalId\` is required for the member when calling \`${tool}\`.`
      )
    );
  }
  await Promise.resolve(
    expect(
      handleAccountTools("upsert_account", {
        externalId: "org-1",
        members: [{ email: "ok@example.com" }, { role: "owner" }],
      })
    ).rejects.toThrow("required for members[1]")
  );
  await Promise.resolve(
    expect(
      handleAccountTools("upsert_account", {
        externalId: "org-1",
        members: [null],
      })
    ).rejects.toThrow("required for members[0]")
  );
  expect(request).not.toHaveBeenCalled();
});

it("forwards whichever member identity is given", async () => {
  await handleAccountTools("remove_account_member", {
    externalId: "org-1",
    subscriberExternalId: "user-7",
  });
  expect(request).toHaveBeenCalledWith(
    "DELETE",
    "/api/v1/accounts/org-1/members",
    { externalId: "user-7" },
    undefined
  );
});

it("lists accounts without an owner or admin when asked", async () => {
  const tool = accountToolDefinitions.find(
    ({ name }) => name === "list_accounts"
  );
  expect(
    tool?.inputSchema.properties?.["withoutEventRecipients"]
  ).toMatchObject({ type: "boolean" });

  await handleAccountTools("list_accounts", {
    companyId: "tenant-1",
    sort: "memberCount",
    withoutEventRecipients: true,
  });
  expect(request).toHaveBeenCalledWith(
    "GET",
    "/api/v1/accounts?sort=memberCount&withoutEventRecipients=true",
    undefined,
    "tenant-1"
  );

  request.mockClear();
  await handleAccountTools("list_accounts", { withoutEventRecipients: false });
  expect(request).toHaveBeenCalledWith(
    "GET",
    "/api/v1/accounts",
    undefined,
    undefined
  );
});

it("rejects a non-boolean withoutEventRecipients before calling the API", async () => {
  await Promise.resolve(
    expect(
      handleAccountTools("list_accounts", { withoutEventRecipients: "yes" })
    ).rejects.toThrow("`withoutEventRecipients` must be a boolean")
  );
  expect(request).not.toHaveBeenCalled();
});
