import { describe, expect, it } from "bun:test";

import type { Tool } from "../mcp-types.js";

import { toolDefinitions } from "./definitions/index.js";
import { getToolsForProfile } from "./profiles.js";
import {
  ADDITIVE_TOOL_NAMES,
  DESTRUCTIVE_TOOL_NAMES,
  getRequiredToolHints,
  IDEMPOTENT_WRITE_TOOL_NAMES,
  MUTATING_TOOL_NAMES,
  OPEN_WORLD_TOOL_NAMES,
  READ_ONLY_TOOL_NAMES,
  withRequiredToolHints,
} from "./tool-hints.js";

import { tools } from "./index.js";

const definedNames = new Set(toolDefinitions.map((tool) => tool.name));

function hintsFor(name: string) {
  return getRequiredToolHints(name);
}

describe("tool hints", () => {
  it("only classifies tools that exist", () => {
    for (const set of [
      READ_ONLY_TOOL_NAMES,
      MUTATING_TOOL_NAMES,
      ADDITIVE_TOOL_NAMES,
      OPEN_WORLD_TOOL_NAMES,
    ]) {
      expect([...set].filter((name) => !definedNames.has(name))).toEqual([]);
    }
  });

  it("rejects a tool that is not classified", () => {
    expect(() => getRequiredToolHints("unclassified_tool")).toThrow(
      'MCP tool "unclassified_tool" must be classified as exactly one of read-only or mutating.'
    );
  });

  it("treats additive tools as writes", () => {
    expect(
      [...ADDITIVE_TOOL_NAMES].filter((name) => !MUTATING_TOOL_NAMES.has(name))
    ).toEqual([]);
  });

  it("sets every hint to an explicit boolean on both profiles", () => {
    const tools = toolDefinitions.map(withRequiredToolHints);
    for (const profile of ["standard", "openai"] as const) {
      const violations = getToolsForProfile(tools, profile).flatMap((tool) =>
        (
          [
            "readOnlyHint",
            "destructiveHint",
            "idempotentHint",
            "openWorldHint",
          ] as const
        )
          .filter((hint) => typeof tool.annotations?.[hint] !== "boolean")
          .map((hint) => `${profile}:${tool.name}.${hint}`)
      );
      expect(violations).toEqual([]);
    }
  });

  it("never marks a read-only tool destructive and only promises idempotent reads and listed setters", () => {
    for (const name of definedNames) {
      const hints = hintsFor(name);
      if (hints.readOnlyHint) {
        expect(hints.destructiveHint).toBe(false);
        expect(hints.idempotentHint).toBe(true);
      } else {
        expect({ name, idempotent: hints.idempotentHint }).toEqual({
          name,
          idempotent: IDEMPOTENT_WRITE_TOOL_NAMES.has(name),
        });
      }
    }
  });

  it("only lists defined writes as idempotent", () => {
    expect(
      [...IDEMPOTENT_WRITE_TOOL_NAMES].filter(
        (name) => !MUTATING_TOOL_NAMES.has(name)
      )
    ).toEqual([]);
  });

  it("does not call the AI generators read-only because they save the design prompt", () => {
    for (const name of [
      "generate_email",
      "generate_subject_lines",
      "generate_sms",
    ]) {
      expect(hintsFor(name)).toMatchObject({
        readOnlyHint: false,
        destructiveHint: false,
      });
    }
    expect(hintsFor("generate_email").openWorldHint).toBe(true);
    expect(hintsFor("generate_sms").openWorldHint).toBe(false);
  });

  it("marks overwrites, cancellations and live-flow changes destructive", () => {
    for (const name of [
      "update_template",
      "update_subscriber",
      "upsert_account",
      "upsert_products",
      "set_frequency_cap",
      "clear_frequency_cap",
      "save_email_ai_style",
      "update_api_key",
      "mark_conversation_read",
      "pause_campaign",
      "unschedule_campaign",
      "cancel_subscriber_operation",
      "cancel_sequence_audience_enrollment",
      "insert_sequence_step",
      "create_ab_test",
      "attach_product_file",
      "create_warehouse_sync",
      // Can repoint an existing Shopify pixel away from another account.
      "activate_integration_pixel",
    ]) {
      expect({ name, ...hintsFor(name) }).toMatchObject({
        name,
        readOnlyHint: false,
        destructiveHint: true,
      });
    }
  });

  it("marks sends to real recipients destructive and open-world", () => {
    for (const name of [
      "send_email",
      "schedule_campaign",
      "send_test_email",
      "send_test_sms",
      "reply_to_conversation",
      "invite_team_member",
      "enable_sequence",
      "enroll_subscribers_in_sequence",
      "add_subscriber",
      "add_account_member",
      "trigger_subscriber_event",
      "trigger_subscriber_events",
      "trigger_account_event",
      "import_subscriber_events",
      "resume_sending",
    ]) {
      expect({ name, ...hintsFor(name) }).toMatchObject({
        name,
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      });
    }
  });

  it("marks optional sends and third-party transfers open-world", () => {
    for (const name of [
      "add_subscribers_to_list",
      "bulk_add_subscriber_tags",
      "create_subscriber_import",
      "start_subscriber_operation",
      "create_audience_sync",
      "sync_audience_now",
      "sync_products",
      "release_sms_number",
      "update_sequence",
      "edit_sequence_graph",
      "list_ad_accounts",
      "create_form",
      "update_form",
      "create_popup",
      "update_popup",
      "update_landing_page",
      "create_web_tracking_key",
      "create_campaign",
      "create_template",
      "create_transactional_email",
      "insert_sequence_step",
      "restart_ab_test",
      "realign_sequence_enrollments",
    ]) {
      expect({ name, open: hintsFor(name).openWorldHint }).toEqual({
        name,
        open: true,
      });
    }
  });

  it("marks public links open-world but additive", () => {
    for (const name of [
      "share_campaign",
      "share_template",
      "upload_image_asset",
    ]) {
      expect({ name, ...hintsFor(name) }).toMatchObject({
        name,
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      });
    }
  });

  it("marks subscriber-visible lists open-world", () => {
    // Public lists appear in the email preference center.
    expect(hintsFor("create_list")).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    });
    expect(hintsFor("update_list")).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    });
  });

  it("keeps draft-only creates additive and closed-world", () => {
    for (const name of [
      "duplicate_campaign",
      "resend_campaign_to_non_openers",
      "create_template_from_example",
      "create_push_campaign",
      "duplicate_push_campaign",
    ]) {
      expect({ name, ...hintsFor(name) }).toMatchObject({
        name,
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      });
    }
  });

  it("marks reads that reach outside services open-world", () => {
    for (const name of ["check_email", "list_email_references"]) {
      expect({ name, ...hintsFor(name) }).toMatchObject({
        name,
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      });
    }
  });

  it("keeps sequence drafts additive but open-world for goal URL fetches", () => {
    for (const name of ["create_sequence", "generate_sequence"]) {
      expect({ name, ...hintsFor(name) }).toMatchObject({
        name,
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      });
    }
  });

  it("marks edits to live or shared email content destructive and open-world", () => {
    for (const name of [
      "update_template",
      "update_campaign",
      "use_campaign_variation",
      "update_sequence_node",
      "update_sequence_nodes",
      "use_sequence_email_variation",
      "update_ab_test_variant",
      "update_transactional_email",
      "set_default_email_component",
      "create_ab_test",
      "add_ab_test_variant",
    ]) {
      expect({ name, ...hintsFor(name) }).toMatchObject({
        name,
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      });
    }
  });

  it("marks writes that replace stored state or go live destructive", () => {
    for (const name of [
      "select_company",
      "create_company",
      "verify_sending_domain",
      "verify_tracking_domain",
      "add_receiving_domain",
      "verify_receiving_domain",
      "test_data_export",
      "test_warehouse_connection",
      "run_account_health_check",
      "submit_account_health_feedback",
      "accept_account_suggestions",
      "create_form",
      "create_popup",
    ]) {
      expect({ name, ...hintsFor(name) }).toMatchObject({
        name,
        readOnlyHint: false,
        destructiveHint: true,
      });
    }
  });

  it("never lists a tool as both additive and destructive", () => {
    expect(
      [...DESTRUCTIVE_TOOL_NAMES].filter((name) =>
        ADDITIVE_TOOL_NAMES.has(name)
      )
    ).toEqual([]);
  });

  it("discloses standard webhook replay delivery", () => {
    expect(hintsFor("replay_webhook_delivery")).toMatchObject({
      destructiveHint: true,
      openWorldHint: true,
    });
  });

  it("preserves custom titles and supplies readable acronym titles", () => {
    const tool: Tool = {
      name: "get_account",
      inputSchema: { type: "object", properties: {} },
      annotations: { title: "Account overview" },
    };
    expect(withRequiredToolHints(tool).annotations?.title).toBe(
      "Account overview"
    );
    expect(
      withRequiredToolHints({
        ...tool,
        name: "update_api_key",
        annotations: {},
      }).annotations?.title
    ).toBe("Update API Key");
  });

  it("omits feedback from the OpenAI profile", () => {
    const names = getToolsForProfile(tools, "openai").map((t) => t.name);
    expect(names).not.toContain("submit_feedback");
    expect(tools.map((t) => t.name)).toContain("submit_feedback");
  });
});
