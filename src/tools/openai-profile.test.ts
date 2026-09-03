import { describe, expect, it } from "bun:test";

import { toolDefinitions } from "./definitions/index.js";
import {
  assertOpenAiInputPolicy,
  OPENAI_EXCLUDED_TOOL_NAMES,
  OPENAI_RESTRICTED_DATA_NOTICE,
  projectOpenAiToolResult,
  withOpenAiToolProfile,
} from "./openai-profile.js";
import { withToolOutputSchema } from "./output-schemas.js";
import { withRequiredToolHints } from "./tool-hints.js";

function openAiTools() {
  return toolDefinitions
    .map(withToolOutputSchema)
    .map(withRequiredToolHints)
    .map(withOpenAiToolProfile)
    .filter((tool): tool is NonNullable<typeof tool> => tool !== null);
}

function findSchemaKeyword(value: unknown, keyword: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => findSchemaKeyword(item, keyword));
  }
  if (value === null || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    Object.prototype.hasOwnProperty.call(record, keyword) ||
    Object.values(record).some((item) => findSchemaKeyword(item, keyword))
  );
}

describe("OpenAI MCP profile", () => {
  it("keeps every standard tool except the narrow reviewed-route denylist", () => {
    const standardNames = new Set(toolDefinitions.map((tool) => tool.name));
    const openAiNames = new Set(openAiTools().map((tool) => tool.name));

    for (const toolName of standardNames) {
      expect(openAiNames.has(toolName)).toBe(
        !OPENAI_EXCLUDED_TOOL_NAMES.has(toolName)
      );
    }

    for (const toolName of OPENAI_EXCLUDED_TOOL_NAMES) {
      expect(standardNames.has(toolName)).toBe(true);
      expect(openAiNames.has(toolName)).toBe(false);
    }

    expect(openAiNames.size).toBe(
      standardNames.size - OPENAI_EXCLUDED_TOOL_NAMES.size
    );
    expect(openAiNames.has("create_api_key")).toBe(false);
    expect(openAiNames.has("create_webhook")).toBe(false);
    expect(openAiNames.has("list_api_keys")).toBe(true);
    expect(openAiNames.has("list_integrations")).toBe(true);
    expect(openAiNames.has("submit_feedback")).toBe(true);
  });

  it("publishes plain object schemas without unsupported composition", () => {
    const unsupportedRootKeywords = ["anyOf", "oneOf", "allOf", "enum", "not"];

    for (const tool of openAiTools()) {
      for (const schema of [tool.inputSchema, tool.outputSchema]) {
        if (!schema) continue;
        expect(schema.type).toBe("object");
        for (const keyword of unsupportedRootKeywords) {
          expect(Object.prototype.hasOwnProperty.call(schema, keyword)).toBe(
            false
          );
        }
        expect(findSchemaKeyword(schema, "anyOf")).toBe(false);
      }
    }
  });

  it("adds the restriction only to protected OpenAI inputs", () => {
    const standardCampaign = toolDefinitions.find(
      (tool) => tool.name === "update_campaign"
    );
    const standardSubscriber = toolDefinitions.find(
      (tool) => tool.name === "add_subscriber"
    );
    expect(standardCampaign).toBeDefined();
    expect(standardSubscriber).toBeDefined();

    const openAiCampaign = withOpenAiToolProfile(
      withToolOutputSchema(
        standardCampaign as NonNullable<typeof standardCampaign>
      )
    );
    const openAiSubscriber = withOpenAiToolProfile(
      withToolOutputSchema(
        standardSubscriber as NonNullable<typeof standardSubscriber>
      )
    );

    expect(openAiCampaign?.inputSchema.description ?? "").not.toContain(
      OPENAI_RESTRICTED_DATA_NOTICE
    );
    expect(
      (
        openAiSubscriber?.inputSchema.properties?.customAttributes as
          | { description?: string }
          | undefined
      )?.description
    ).toContain(OPENAI_RESTRICTED_DATA_NOTICE);
  });

  it("reduces OpenAI feedback to generalized, explicitly disclosed fields", () => {
    const standard = toolDefinitions.find(
      (tool) => tool.name === "submit_feedback"
    );
    expect(standard).toBeDefined();

    const openAi = withOpenAiToolProfile(
      withToolOutputSchema(standard as NonNullable<typeof standard>)
    );
    expect(Object.keys(openAi?.inputSchema.properties ?? {})).toEqual([
      "companyId",
      "message",
      "category",
      "context",
    ]);
    expect(openAi?.inputSchema.additionalProperties).toBe(false);
    expect(standard?.inputSchema.properties).toHaveProperty("message");
    expect(standard?.inputSchema.properties).toHaveProperty("resourceIds");
  });

  it("scans protected data fields but leaves campaign copy alone", () => {
    expect(() =>
      assertOpenAiInputPolicy("add_subscriber", {
        customAttributes: { ssn: "111-22-3333" },
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("update_form", {
        blocks: [
          {
            id: "field-1",
            kind: "form-field",
            name: "medical_condition",
            label: "Medical condition",
          },
        ],
      })
    ).toThrow("health or medical data");

    expect(() =>
      assertOpenAiInputPolicy("create_popup", {
        blocks: [
          {
            id: "field-1",
            kind: "form-field",
            name: "card_number",
            label: "Payment card number",
          },
        ],
      })
    ).toThrow("payment or financial-account data");

    expect(() =>
      assertOpenAiInputPolicy("create_sequence", {
        steps: [
          {
            type: "update_subscriber",
            config: {
              customAttributeUpdates: [{ name: "ssn", value: "{{event.ssn}}" }],
            },
          },
        ],
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("update_sequence", {
        subscriberUpdateSteps: [
          {
            nodeId: "node-1",
            config: {
              customAttributeUpdates: [
                { name: "diagnosis", value: "{{event.diagnosis}}" },
              ],
            },
          },
        ],
      })
    ).toThrow("health or medical data");

    for (const toolName of [
      "create_landing_page",
      "update_landing_page",
      "publish_landing_page",
      "unpublish_landing_page",
    ]) {
      expect(() =>
        assertOpenAiInputPolicy(toolName, {
          content: {
            blocks: [
              {
                kind: "form",
                form: {
                  customFields: [
                    { name: "ssn", label: "Social Security number" },
                  ],
                },
              },
            ],
          },
        })
      ).toThrow("government identifiers");
    }

    expect(() =>
      assertOpenAiInputPolicy("update_campaign", {
        subject: "Medical marketing trends",
        html: "<p>Health teams are invited.</p>",
      })
    ).not.toThrow();
  });

  it("blocks restricted merge-tag selectors without blocking authored prose", () => {
    expect(() =>
      assertOpenAiInputPolicy("create_campaign", {
        blocks: [
          {
            id: "block-1",
            type: "text",
            content: "Your reference is {{ subscriber.ssn }}",
          },
        ],
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("update_campaign", {
        html: "<p>Condition: {{subscriber.profile.diagnosis}}</p>",
      })
    ).toThrow("health or medical data");

    expect(() =>
      assertOpenAiInputPolicy("create_template", {
        blocks: [
          {
            id: "repeat-1",
            type: "repeat",
            source: "subscriber.diagnosis",
            itemAlias: "record",
            children: [],
          },
        ],
      })
    ).toThrow("health or medical data");

    expect(() =>
      assertOpenAiInputPolicy("create_campaign", {
        blocks: [
          {
            id: "block-1",
            type: "text",
            content: "Medical condition: awareness month",
          },
        ],
      })
    ).not.toThrow();
  });

  it("does not let the reviewed profile render an uninspected stored subscriber", () => {
    const standard = toolDefinitions.find(
      (tool) => tool.name === "render_email"
    );
    expect(standard).toBeDefined();

    const openAi = withOpenAiToolProfile(
      withToolOutputSchema(standard as NonNullable<typeof standard>)
    );
    expect(openAi?.inputSchema.properties).not.toHaveProperty("subscriberId");
    expect(openAi?.inputSchema.properties).toHaveProperty("subscriber");
    expect(openAi?.inputSchema.properties).toHaveProperty("variables");
  });

  it("blocks restricted custom attributes in audience filters", () => {
    expect(() =>
      assertOpenAiInputPolicy("create_segment", {
        filters: [
          {
            id: "filter-1",
            field: "attribute",
            operator: "is",
            value: "ssn:111-22-3333",
          },
        ],
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("update_segment", {
        root: {
          kind: "group",
          joinOperator: "and",
          children: [
            {
              kind: "filter",
              field: "attribute",
              operator: "is_not_empty",
              value: "profile.medical_condition:",
            },
          ],
        },
      })
    ).toThrow("health or medical data");

    expect(() =>
      assertOpenAiInputPolicy("search_subscribers", {
        attribute: "diagnosis",
        attributeValue: "asthma",
      })
    ).toThrow("health or medical data");

    expect(() =>
      assertOpenAiInputPolicy("search_subscribers", {
        attribute: "profile.ssn:111-22-3333",
      })
    ).toThrow("government identifiers");

    for (const toolName of [
      "create_campaign",
      "update_campaign",
      "schedule_campaign",
    ] as const) {
      expect(() =>
        assertOpenAiInputPolicy(toolName, {
          targetLists: {
            type: "filtered",
            filters: [
              {
                field: "attribute",
                operator: "is_not_empty",
                value: "passport_number:",
              },
            ],
          },
        })
      ).toThrow("government identifiers");
    }

    expect(() =>
      assertOpenAiInputPolicy("search_subscribers", {
        attribute: "plan",
        attributeValue: "pro",
      })
    ).not.toThrow();
  });

  it("blocks restricted attribute selectors in goals and sequences", () => {
    for (const toolName of [
      "create_campaign_goal",
      "update_campaign_goal",
      "create_sequence_goal",
      "update_sequence_goal",
    ] as const) {
      expect(() =>
        assertOpenAiInputPolicy(toolName, {
          attributePath: "profile.diagnosis",
        })
      ).toThrow("health or medical data");
    }

    expect(() =>
      assertOpenAiInputPolicy("create_sequence", {
        enrollmentFieldPath: "identity.passport_number",
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("update_sequence", {
        stopCondition: {
          type: "field_changed",
          value: "profile.ssn",
        },
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("create_sequence", {
        propertyFilters: [
          { path: "diagnosis", operator: "equals", value: "asthma" },
        ],
      })
    ).toThrow("health or medical data");

    expect(() =>
      assertOpenAiInputPolicy("update_sequence", {
        stopCondition: {
          type: "event_received",
          matchConfig: {
            mode: "event_property",
            rules: [
              {
                entryFieldPath: "profile.ssn",
                eventFieldPath: "checkout.ssn",
              },
            ],
          },
        },
      })
    ).toThrow("government identifiers");
  });

  it("blocks restricted attribute conditions in every block-bearing write shape", () => {
    const restrictedBlock = {
      id: "block-1",
      type: "text",
      content: "General marketing copy",
      conditions: [
        {
          id: "condition-1",
          field: "attribute",
          operator: "is",
          value: "ssn:111-22-3333",
        },
      ],
    };

    for (const toolName of [
      "create_campaign",
      "update_campaign",
      "create_template",
      "update_template",
      "set_template_localization",
      "set_default_email_component",
      "create_email_component",
      "update_email_component",
      "update_ab_test_variant",
      "add_ab_test_variant",
      "create_transactional_email",
      "update_transactional_email",
    ]) {
      expect(() =>
        assertOpenAiInputPolicy(toolName, { blocks: [restrictedBlock] })
      ).toThrow("government identifiers");
    }

    expect(() =>
      assertOpenAiInputPolicy("create_ab_test", {
        variants: [{ name: "A", blocks: [restrictedBlock] }],
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("insert_sequence_step", {
        type: "email",
        subject: "Welcome",
        blocks: [restrictedBlock],
      })
    ).toThrow("government identifiers");

    for (const field of ["emails", "steps"] as const) {
      expect(() =>
        assertOpenAiInputPolicy("update_sequence", {
          [field]: [{ nodeId: "node-1", blocks: [restrictedBlock] }],
        })
      ).toThrow("government identifiers");
    }

    expect(() =>
      assertOpenAiInputPolicy("create_campaign", {
        blocks: [
          {
            id: "block-1",
            type: "text",
            content: "Diagnosis: early detection matters.",
          },
        ],
      })
    ).not.toThrow();
  });

  it("blocks restricted data in alternate personalization and sequence-step shapes", () => {
    for (const toolName of [
      "create_campaign_goal",
      "update_campaign_goal",
      "create_sequence_goal",
      "update_sequence_goal",
    ] as const) {
      expect(() =>
        assertOpenAiInputPolicy(toolName, {
          eventPropertyName: "patient.diagnosis",
        })
      ).toThrow("health or medical data");
    }

    expect(() =>
      assertOpenAiInputPolicy("create_campaign", {
        campaignData: { customer: { ssn: "111-22-3333" } },
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("update_campaign", {
        computedLists: [{ name: "patients", filter: { diagnosis: "asthma" } }],
      })
    ).toThrow("health or medical data");

    expect(() =>
      assertOpenAiInputPolicy("insert_sequence_step", {
        type: "condition",
        fieldName: "profile.ssn",
        fieldValue: "111-22-3333",
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("insert_sequence_step", {
        type: "logic_branch",
        branches: [
          {
            conditionType: "field_equals",
            fieldName: "diagnosis",
            fieldValue: "asthma",
            targetNodeId: "node-1",
          },
        ],
        elseSteps: [
          {
            type: "update_subscriber",
            config: {
              customAttributeUpdates: [
                { name: "passport_number", value: "{{event.passport}}" },
              ],
            },
          },
        ],
      })
    ).toThrow();

    expect(() =>
      assertOpenAiInputPolicy("insert_sequence_step", {
        type: "ai",
        prompt: "Personalize the message",
        outputFields: [
          { key: "diagnosis", description: "The contact's diagnosis" },
        ],
      })
    ).toThrow("health or medical data");

    expect(() =>
      assertOpenAiInputPolicy("update_sequence_node", {
        changes: {
          config: {
            outputFields: [{ key: "ssn" }],
          },
        },
      })
    ).toThrow("government identifiers");
  });

  it("blocks credentials embedded in writable webhook URLs", () => {
    expect(() =>
      assertOpenAiInputPolicy("update_webhook", {
        url: "https://hooks.example.test/receive?access_token=private-token",
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("insert_sequence_step", {
        type: "webhook",
        url: "https://user:private-password@hooks.example.test/receive",
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("create_sequence", {
        steps: [
          {
            type: "webhook",
            url: "https://hooks.example.test/receive?api_key=private-key",
          },
        ],
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("update_sequence_node", {
        changes: {
          url: "https://hooks.example.test/receive?token=private-token",
        },
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("update_webhook", {
        url: "https://hooks.example.test/receive?source=sequenzy",
      })
    ).not.toThrow();
  });

  it("blocks restricted attribute keys written as dotted or bracketed paths", () => {
    // Custom attribute keys may be nested paths. Flattening `profile.ssn` to
    // `profilessn` matches no rule, so every path segment must be checked on
    // both ingress and egress.
    expect(() =>
      assertOpenAiInputPolicy("add_subscriber", {
        customAttributes: { "profile.ssn": "111-22-3333" },
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("update_subscriber", {
        attributes: { "billing[cardNumber]": "4111111111111111" },
      })
    ).toThrow("payment or financial-account data");

    expect(() =>
      assertOpenAiInputPolicy("trigger_subscriber_event", {
        properties: { "account.profile.plan": "pro" },
      })
    ).not.toThrow();

    const projected = projectOpenAiToolResult("get_subscriber", {
      subscriber: {
        email: "person@example.com",
        customAttributes: {
          "profile.ssn": "111-22-3333",
          "billing[cardNumber]": "4111111111111111",
          "profile.plan": "pro",
        },
      },
    }) as { subscriber: { customAttributes: Record<string, unknown> } };
    expect(projected.subscriber.customAttributes).toEqual({
      "profile.plan": "pro",
    });
  });

  it("blocks common coordinate key shapes as precise geolocation", () => {
    for (const attributes of [
      { lat: 38.7223, lng: -9.1393 },
      { lat: 38.7223, lon: -9.1393 },
      { latitude: 38.7223, long: -9.1393 },
      { coords: "38.7223,-9.1393" },
      { geopoint: { lat: 38.7223, lng: -9.1393 } },
    ]) {
      expect(() =>
        assertOpenAiInputPolicy("add_subscriber", {
          customAttributes: attributes,
        })
      ).toThrow("precise geolocation");
    }

    expect(() =>
      assertOpenAiInputPolicy("add_subscriber", {
        customAttributes: { platform: "ios", latency_ms: 12, country: "PT" },
      })
    ).not.toThrow();

    const projected = projectOpenAiToolResult("get_subscriber", {
      subscriber: {
        customAttributes: { lat: 38.7223, lng: -9.1393, city: "Lisbon" },
      },
    }) as { subscriber: { customAttributes: Record<string, unknown> } };
    expect(projected.subscriber.customAttributes).toEqual({ city: "Lisbon" });
  });

  it("blocks credentials embedded in any URL argument, not only protected inputs", () => {
    expect(() =>
      assertOpenAiInputPolicy("create_form", {
        name: "Signup",
        redirectUrl: "https://example.test/done?access_token=private-token",
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("update_form", {
        id: "form-1",
        redirectUrl: "https://user:private-password@example.test/done",
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("create_popup", {
        name: "Welcome",
        redirectUrl: "https://example.test/done?api_key=private-key",
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("update_popup", {
        id: "popup-1",
        settings: {
          redirectUrl: "https://example.test/done?token=private-token",
        },
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("update_company", {
        logoUrl: "https://cdn.example.test/logo.png?secret=private-secret",
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("create_form", {
        name: "Signup",
        redirectUrl: "https://example.test/thanks?utm_source=sequenzy",
      })
    ).not.toThrow();

    expect(() =>
      assertOpenAiInputPolicy("update_company", {
        logoUrl:
          "https://cdn.example.test/logo.png?X-Amz-Credential=AKIAEXAMPLE%2F20260903%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=0123456789abcdef",
      })
    ).toThrow("authentication credentials or secrets");
  });

  it("blocks subscriber and account identifiers in OpenAI feedback", () => {
    expect(() =>
      assertOpenAiInputPolicy("submit_feedback", {
        message: "Campaign for person@example.com failed",
      })
    ).toThrow("an email address");

    expect(() =>
      assertOpenAiInputPolicy("submit_feedback", {
        message: "Scheduling failed",
        context: "Tried update_campaign on tz4a98xxat96iws9zmbrgj3a",
      })
    ).toThrow("a resource ID");

    expect(() =>
      assertOpenAiInputPolicy("submit_feedback", {
        message: "Subscriber 6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f was skipped",
      })
    ).toThrow("a UUID");

    expect(() =>
      assertOpenAiInputPolicy("submit_feedback", {
        message:
          "schedule_campaign rejected a 2026-09-03 send even though the campaign was ready.",
        category: "bug",
        context: "Tried schedule_campaign then update_campaign.",
      })
    ).not.toThrow();

    // Standard MCP keeps its structured resourceIds field; only the OpenAI
    // profile promises identifier-free feedback.
    const standard = toolDefinitions.find(
      (tool) => tool.name === "submit_feedback"
    );
    expect(standard?.inputSchema.properties).toHaveProperty("resourceIds");
  });

  it("blocks demographic and geolocation prose in free text on input and output", () => {
    // Field-name rules already cover these categories, but labelled prose in
    // notes, replies, and variables had no text rule at all.
    expect(() =>
      assertOpenAiInputPolicy("add_subscriber_note", {
        body: "Religion: Catholic",
      })
    ).toThrow("sensitive demographic data");

    expect(() =>
      assertOpenAiInputPolicy("add_subscriber_note", {
        body: "Sexual orientation - gay",
      })
    ).toThrow("sensitive demographic data");

    expect(() =>
      assertOpenAiInputPolicy("add_subscriber_note", {
        body: "GPS coordinates: 38.7223, -9.1393",
      })
    ).toThrow("precise geolocation");

    expect(() =>
      assertOpenAiInputPolicy("reply_to_conversation", {
        type: "outbound",
        subject: "Password: hunter2",
        bodyText: "Ordinary account follow-up",
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("reply_to_conversation", {
        type: "note",
        bodyText: "Diagnosis: leukemia",
      })
    ).toThrow("health or medical data");

    expect(() =>
      assertOpenAiInputPolicy("reply_to_conversation", {
        type: "outbound",
        bodyHtml: "<p>Religion: Catholic</p>",
      })
    ).toThrow("sensitive demographic data");

    expect(() =>
      assertOpenAiInputPolicy("render_email", {
        variables: { where: "Last seen near 38.7223,-9.1393" },
      })
    ).toThrow("precise geolocation");

    expect(() =>
      assertOpenAiInputPolicy("add_subscriber_note", {
        body: "Runs the marathon race every year. Political news reader. Meeting at 10:30, budget 12.5 vs 14.25.",
      })
    ).not.toThrow();

    const projected = projectOpenAiToolResult("list_subscriber_notes", {
      notes: [
        { id: "n1", body: "Religion: Catholic" },
        { id: "n2", body: "Latitude: 38.7223" },
        { id: "n3", body: "Loves the onboarding flow" },
      ],
    }) as { notes: Array<{ body: string }> };
    expect(projected.notes.map((note) => note.body)).toEqual([
      "[redacted restricted data]",
      "[redacted restricted data]",
      "Loves the onboarding flow",
    ]);
  });

  it("blocks credentials carried in URL paths, fragments, and query values", () => {
    for (const url of [
      "https://hooks.example.test/access_token/private-secret",
      "https://hooks.example.test/#access_token=private-secret",
      "https://hooks.example.test/receive?next=https%3A%2F%2Fother.test%2F%3Ftoken%3Dprivate-token",
      "https://hooks.example.test/receive?state=seq_user_abcdefghijklmnop",
      "https://hooks.example.test/receive?session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    ]) {
      expect(() =>
        assertOpenAiInputPolicy("update_webhook", { id: "wh-1", url })
      ).toThrow("authentication credentials or secrets");
    }

    for (const url of [
      "https://api.example.test/health",
      "https://hooks.example.test/oauth/token",
      "https://example.test/blog/secret-sauce",
      "https://hooks.example.test/receive?source=sequenzy#section",
    ]) {
      expect(() =>
        assertOpenAiInputPolicy("update_webhook", { id: "wh-1", url })
      ).not.toThrow();
    }
  });

  it("redacts credential-bearing URLs from output but keeps ordinary and preview URLs", () => {
    const sequence = projectOpenAiToolResult("get_sequence", {
      sequence: {
        steps: [
          {
            type: "webhook",
            url: "https://hooks.example.test/?access_token=private-secret",
          },
          {
            type: "webhook",
            url: "https://user:private-password@hooks.example.test/receive",
          },
          {
            type: "webhook",
            url: "https://hooks.example.test/receive?source=sequenzy",
          },
        ],
      },
    }) as { sequence: { steps: Array<{ url: string }> } };
    expect(sequence.sequence.steps.map((step) => step.url)).toEqual([
      "[redacted restricted data]",
      "[redacted restricted data]",
      "https://hooks.example.test/receive?source=sequenzy",
    ]);

    // The landing-page preview URL is a Sequenzy-signed unlisted link that the
    // tool exists to hand back, not a third-party credential. The exemption
    // is scoped to landing-page tools and the /lp/preview/ path: a stored
    // attribute that happens to be named previewUrl gets no such pass.
    const landingPage = projectOpenAiToolResult("render_landing_page", {
      previewUrl: "https://sequenzy.com/lp/preview/page-1?token=signed-preview",
      publicUrl: null,
    }) as { previewUrl: string };
    expect(landingPage.previewUrl).toBe(
      "https://sequenzy.com/lp/preview/page-1?token=signed-preview"
    );

    expect(
      projectOpenAiToolResult("render_landing_page", {
        previewUrl: "https://hooks.example.test/receive?token=private-token",
      })
    ).toEqual({ previewUrl: "[redacted restricted data]" });

    expect(
      projectOpenAiToolResult("get_subscriber", {
        subscriber: {
          customAttributes: {
            previewUrl: "https://example.test/?access_token=private-token",
          },
        },
      })
    ).toEqual({
      subscriber: {
        customAttributes: { previewUrl: "[redacted restricted data]" },
      },
    });

    expect(
      projectOpenAiToolResult("get_company", {
        company: {
          logoUrl:
            "https://cdn.example.test/logo.png?X-Amz-Signature=0123456789abcdef",
        },
      })
    ).toEqual({ company: { logoUrl: "[redacted restricted data]" } });
  });

  it("recognizes restricted words inside compound field names without over-matching metadata", () => {
    for (const [attributes, category] of [
      [{ passport_id: "AB123456" }, "government identifiers"],
      [{ ssn_number: "111-22-3333" }, "government identifiers"],
      [{ socialSecurityNumber: "111-22-3333" }, "government identifiers"],
      [{ api_secret: "private" }, "authentication credentials or secrets"],
      [{ userPassword: "hunter2" }, "authentication credentials or secrets"],
      [{ session_token: "abc" }, "authentication credentials or secrets"],
      [{ stripe_api_key: "sk_live" }, "authentication credentials or secrets"],
      [{ patient_id: "p-1" }, "health or medical data"],
      [{ primaryDiagnosis: "asthma" }, "health or medical data"],
      [{ credit_card_number: "4111" }, "payment or financial-account data"],
      [{ religious_affiliation: "x" }, "sensitive demographic data"],
      [{ geo_lat: 38.7 }, "precise geolocation"],
    ] as const) {
      expect(() =>
        assertOpenAiInputPolicy("add_subscriber", {
          customAttributes: attributes,
        })
      ).toThrow(category);
    }

    // Ambiguous words only match as a whole field name, and metadata about a
    // credential or card is not the credential itself.
    expect(() =>
      assertOpenAiInputPolicy("add_subscriber", {
        customAttributes: {
          pin_code: "1000-001",
          race_id: "lisbon-half-2026",
          health_score: 82,
          device_fingerprint: "fp_123",
          long_description: "Runs marathons",
          card_last4: "4242",
          credit_card_brand: "visa",
          api_key_id: "key_123",
          tokenExpiresAt: "2026-09-03",
          hasPassword: true,
          nextToken: "cursor-1",
          replaceApiKeyId: "current",
        },
      })
    ).not.toThrow();

    const projected = projectOpenAiToolResult("get_subscriber", {
      subscriber: {
        customAttributes: {
          passport_id: "AB123456",
          api_secret: "private",
          credit_card_brand: "visa",
          pin_code: "1000-001",
        },
      },
    }) as { subscriber: { customAttributes: Record<string, unknown> } };
    expect(projected.subscriber.customAttributes).toEqual({
      credit_card_brand: "visa",
      pin_code: "1000-001",
    });
  });

  it("finds credential-bearing URLs embedded in HTML and prose, in and out", () => {
    expect(() =>
      assertOpenAiInputPolicy("create_campaign", {
        html: '<p>Claim it at <a href="https://example.test/claim?a=1&amp;access_token=private-token">this link</a>.</p>',
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("add_subscriber_note", {
        body: "Portal: https://user:private-password@portal.example.test/home, then call.",
      })
    ).toThrow("authentication credentials or secrets");

    expect(() =>
      assertOpenAiInputPolicy("create_campaign", {
        html: '<p>Read more at <a href="https://example.test/blog?utm_source=sequenzy&amp;utm_medium=email">our blog</a>.</p>',
      })
    ).not.toThrow();

    expect(
      projectOpenAiToolResult("get_campaign", {
        campaign: {
          html: '<p>Go to <a href="https://example.test/claim?access_token=private-token">the portal</a> or <a href="https://example.test/help">help</a>.</p>',
        },
      })
    ).toEqual({
      campaign: {
        html: '<p>Go to <a href="[redacted restricted data]">the portal</a> or <a href="https://example.test/help">help</a>.</p>',
      },
    });
  });

  it("checks includeAttributes wherever an AI step is nested", () => {
    expect(() =>
      assertOpenAiInputPolicy("create_sequence", {
        steps: [
          {
            type: "ai",
            prompt: "Personalize",
            includeAttributes: ["plan", "profile.ssn"],
          },
        ],
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("update_sequence_node", {
        changes: { config: { includeAttributes: ["diagnosis"] } },
      })
    ).toThrow("health or medical data");

    expect(() =>
      assertOpenAiInputPolicy("update_sequence", {
        steps: [
          {
            nodeId: "node-1",
            branches: [
              {
                steps: [{ type: "ai", includeAttributes: ["passport_number"] }],
              },
            ],
          },
        ],
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("create_sequence", {
        steps: [{ type: "ai", includeAttributes: ["plan", "company"] }],
      })
    ).not.toThrow();

    expect(
      projectOpenAiToolResult("get_sequence", {
        sequence: {
          steps: [
            {
              type: "ai",
              config: { includeAttributes: ["plan", "profile.ssn"] },
            },
          ],
        },
      })
    ).toEqual({
      sequence: {
        steps: [{ type: "ai", config: { includeAttributes: ["plan"] } }],
      },
    });
  });

  it("blocks restricted enrollment cancellation selectors and reasons", () => {
    const standard = toolDefinitions.find(
      (tool) => tool.name === "cancel_sequence_enrollments"
    );
    const openAi = withOpenAiToolProfile(
      withToolOutputSchema(standard as NonNullable<typeof standard>)
    );
    expect(
      (
        openAi?.inputSchema.properties?.fieldValues as
          | { description?: string }
          | undefined
      )?.description
    ).toContain("fieldPath is required");

    expect(() =>
      assertOpenAiInputPolicy("cancel_sequence_enrollments", {
        fieldPath: "profile.ssn",
        fieldValues: ["111-22-3333"],
        dryRun: false,
      })
    ).toThrow("government identifiers");

    expect(() =>
      assertOpenAiInputPolicy("cancel_sequence_enrollments", {
        fieldValues: ["111-22-3333"],
        dryRun: false,
      })
    ).toThrow("`fieldPath` is required");

    expect(() =>
      assertOpenAiInputPolicy("cancel_sequence_enrollments", {
        subscriberIds: ["subscriber-1"],
        reason: "Diagnosis: asthma",
        dryRun: false,
      })
    ).toThrow("health or medical data");
  });

  it("projects account identity and strips nested secrets and diagnostics", () => {
    expect(
      projectOpenAiToolResult("get_account", {
        success: true,
        user: { id: "user-private", email: "owner@example.com" },
        companies: [
          {
            id: "company-1",
            name: "Acme",
            role: "owner",
            ownerEmail: "owner@example.com",
          },
        ],
        apiKeyPermissions: {
          scopes: ["account:read"],
          activeKey: { id: "key-private", prefix: "seq_123" },
          manageUrl: "https://www.sequenzy.com/acme/settings/api-keys",
        },
        currentCompanyId: "company-1",
        selectedCompanyId: "company-1",
        requestId: "request-private",
      })
    ).toEqual({
      success: true,
      companies: [{ id: "company-1", name: "Acme", role: "owner" }],
      currentCompanyId: "company-1",
      selectedCompanyId: "company-1",
      apiKeyPermissions: {
        scopes: ["account:read"],
        manageUrl: "https://www.sequenzy.com/acme/settings/api-keys",
      },
    });

    expect(
      projectOpenAiToolResult("get_sequence", {
        sequence: {
          id: "sequence-1",
          createdByUserId: "user-private",
          headers: { Authorization: "Bearer private-token" },
          debug: { traceId: "trace-private" },
          customAttributes: { plan: "pro", ssn: "111-22-3333" },
        },
      })
    ).toEqual({
      sequence: {
        id: "sequence-1",
        customAttributes: { plan: "pro" },
      },
    });
  });

  it("preserves authored output copy while scanning data-bearing values", () => {
    expect(
      projectOpenAiToolResult("get_campaign", {
        campaign: {
          subject: "Medical condition: awareness month",
          html: "<p>Diagnosis: early detection matters.</p>",
        },
      })
    ).toEqual({
      campaign: {
        subject: "Medical condition: awareness month",
        html: "<p>Diagnosis: early detection matters.</p>",
      },
    });

    expect(
      projectOpenAiToolResult("get_subscriber", {
        subscriber: {
          customAttributes: {
            plan: "pro",
            importNote: "SSN: 111-22-3333",
          },
        },
      })
    ).toEqual({
      subscriber: {
        customAttributes: {
          plan: "pro",
          importNote: "[redacted restricted data]",
        },
      },
    });
  });

  it("redacts restricted text from embedded notes and individual survey answers", () => {
    expect(
      projectOpenAiToolResult("get_subscriber", {
        subscriber: {
          id: "subscriber-1",
          notes: [{ id: "note-1", body: "Diagnosis: asthma" }],
        },
      })
    ).toEqual({
      subscriber: {
        id: "subscriber-1",
        notes: [{ id: "note-1", body: "[redacted restricted data]" }],
      },
    });

    expect(
      projectOpenAiToolResult("list_poll_responses", {
        responses: [
          {
            subscriberId: "subscriber-1",
            attributeKey: "diagnosis",
            question: "Diagnosis?",
            answers: ["Asthma"],
            values: ["asthma"],
          },
        ],
      })
    ).toEqual({ responses: [] });
  });

  it("removes restricted semantic field records from OpenAI output", () => {
    expect(
      projectOpenAiToolResult("get_sequence", {
        sequence: {
          nodes: [
            {
              config: {
                customAttributeUpdates: [
                  { name: "plan", value: "pro" },
                  { name: "ssn", value: "111-22-3333" },
                ],
              },
            },
          ],
        },
        forms: [
          { kind: "form-field", name: "company", label: "Company" },
          { kind: "form-field", name: "diagnosis", label: "Diagnosis" },
        ],
        landingPage: {
          content: {
            blocks: [
              {
                kind: "form",
                form: {
                  customFields: [
                    { name: "company", label: "Company" },
                    { name: "ssn", label: "Social Security number" },
                  ],
                },
              },
            ],
          },
        },
      })
    ).toEqual({
      sequence: {
        nodes: [
          {
            config: {
              customAttributeUpdates: [{ name: "plan", value: "pro" }],
            },
          },
        ],
      },
      forms: [{ kind: "form-field", name: "company", label: "Company" }],
      landingPage: {
        content: {
          blocks: [
            {
              kind: "form",
              form: {
                customFields: [{ name: "company", label: "Company" }],
              },
            },
          ],
        },
      },
    });
  });

  it("removes restricted attribute goals from OpenAI reads", () => {
    expect(
      projectOpenAiToolResult("list_campaign_goals", {
        goals: [
          {
            id: "goal-safe",
            triggerType: "attribute_change",
            attributePath: "profile.plan",
            attributeValue: "pro",
          },
          {
            id: "goal-private",
            triggerType: "attribute_change",
            attributePath: "profile.diagnosis",
            attributeValue: "asthma",
          },
        ],
      })
    ).toEqual({
      goals: [
        {
          id: "goal-safe",
          triggerType: "attribute_change",
          attributePath: "profile.plan",
          attributeValue: "pro",
        },
      ],
    });

    expect(
      projectOpenAiToolResult("list_sequence_goals", {
        goals: [
          {
            id: "goal-private",
            triggerType: "event_property",
            eventPropertyName: "patient.ssn",
          },
        ],
      })
    ).toEqual({ goals: [] });
  });

  it("redacts restricted merge-tag selectors from existing authored content", () => {
    expect(
      projectOpenAiToolResult("get_campaign", {
        campaign: {
          blocks: [
            {
              id: "block-1",
              type: "text",
              content: "Reference: {{subscriber.ssn}}",
            },
          ],
        },
      })
    ).toEqual({
      campaign: {
        blocks: [
          {
            id: "block-1",
            type: "text",
            content: "[redacted restricted data]",
          },
        ],
      },
    });
  });

  it("filters restricted enrollment property names but preserves safe context", () => {
    expect(
      projectOpenAiToolResult("get_sequence_enrollment", {
        enrollment: {
          entryContext: {
            eventName: "checkout.completed",
            eventPropertyKeys: ["plan", "diagnosis", "profile.ssn"],
            fieldSnapshotKeys: ["company", "profile.passport_number"],
          },
        },
      })
    ).toEqual({
      enrollment: {
        entryContext: {
          eventName: "checkout.completed",
          eventPropertyKeys: ["plan"],
          fieldSnapshotKeys: ["company"],
        },
      },
    });
  });

  it("preserves provider account IDs while removing internal account IDs", () => {
    expect(
      projectOpenAiToolResult("get_integration", {
        integration: {
          id: "integration-1",
          providerAccountId: "acct_123",
          accountId: "internal-account-1",
        },
      })
    ).toEqual({
      integration: {
        id: "integration-1",
        providerAccountId: "acct_123",
      },
    });
  });

  it("removes inbound webhook secrets and credential-bearing URLs", () => {
    expect(
      projectOpenAiToolResult("get_sequence_inbound_webhook", {
        webhook: {
          id: "inbound-1",
          secret: "private-secret",
          url: "https://api.sequenzy.com/inbound/private-secret",
          samplePayload: {
            product: { url: "https://shop.example/products/widget" },
          },
          status: "active",
        },
        dashboardUrl: "https://www.sequenzy.com/sequences/sequence-1",
      })
    ).toEqual({
      webhook: {
        id: "inbound-1",
        samplePayload: {
          product: { url: "https://shop.example/products/widget" },
        },
        status: "active",
      },
      dashboardUrl: "https://www.sequenzy.com/sequences/sequence-1",
    });
  });
});
