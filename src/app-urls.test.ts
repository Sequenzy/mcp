import { describe, expect, it } from "bun:test";

import { buildSequenzyAppUrls } from "./app-urls.js";

describe("buildSequenzyAppUrls", () => {
  it("builds dashboard URLs for editable resources", () => {
    const appUrls = buildSequenzyAppUrls(
      {
        companyId: "comp_123",
        campaignId: "camp_123",
        sequenceId: "seq_123",
        templateId: "email_123",
        emailSendId: "send_123",
      },
      "https://app.example.com/"
    );

    expect(appUrls.urls.campaign).toBe(
      "https://app.example.com/dashboard/company/comp_123/campaign/camp_123"
    );
    expect(appUrls.urls.campaignPreview).toBe(
      "https://app.example.com/dashboard/company/comp_123/campaign/camp_123?step=review"
    );
    expect(appUrls.urls.sequence).toBe(
      "https://app.example.com/dashboard/company/comp_123/sequences/seq_123"
    );
    expect(appUrls.urls.template).toBe(
      "https://app.example.com/dashboard/company/comp_123/emails/email_123"
    );
    expect(appUrls.urls.emailSend).toBe(
      "https://app.example.com/dashboard/company/comp_123/sent-emails/send_123"
    );
  });

  it("exposes route templates for agents that only have IDs later", () => {
    const appUrls = buildSequenzyAppUrls({}, "https://sequenzy.test");

    expect(appUrls.urls).toEqual({});
    expect(appUrls.routeTemplates.settingsTab).toBe(
      "/dashboard/company/{companyId}/settings?tab={tab}"
    );
    expect(appUrls.settingsTabValues).toContain("integrations");
  });
});
