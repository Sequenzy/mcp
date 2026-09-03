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
        computedLists: [
          { name: "patients", filter: { diagnosis: "asthma" } },
        ],
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
