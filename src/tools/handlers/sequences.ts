import { apiRequest } from "../../runtime.js";
import {
  buildUpdateSequenceBody,
  buildUpdateSequenceNodeBody,
  buildUpdateSequenceNodesBody,
  buildSequenceGraphEditBody,
  buildInsertSequenceStepBody,
  buildCancelSequenceEnrollmentBody,
  buildMoveSequenceEnrollmentBody,
  buildRealignSequenceEnrollmentBody,
  optionalString,
  requiredString,
  buildSequenceEnrollmentBody,
  validateCreateSequenceGoalArgs,
  validateUpdateSequenceGoalArgs,
  validateLabelsArg,
  validateSendingIdentityArgs,
} from "../internal.js";

const MAX_DEFAULT_SEQUENCE_NAME_LENGTH = 80;
const MAX_SEQUENCE_TEST_RECIPIENTS = 10;

function normalizeSequenceTestRecipients(args: Record<string, unknown>) {
  if (!Array.isArray(args.recipients)) {
    throw new Error(
      "`recipients` must be an array when calling `send_sequence_test_email`."
    );
  }

  if (args.recipients.length > MAX_SEQUENCE_TEST_RECIPIENTS) {
    throw new Error(
      `\`recipients\` must include no more than ${MAX_SEQUENCE_TEST_RECIPIENTS} email addresses when calling \`send_sequence_test_email\`.`
    );
  }

  const invalidRecipientValue = args.recipients.find(
    (recipient) =>
      typeof recipient !== "string" || recipient.trim().length === 0
  );
  if (invalidRecipientValue !== undefined) {
    throw new Error(
      "Every `recipients` item must be a non-empty email address when calling `send_sequence_test_email`."
    );
  }

  const recipients = Array.from(
    new Set(
      args.recipients.map((recipient) =>
        typeof recipient === "string" ? recipient.trim().toLowerCase() : ""
      )
    )
  ).filter(Boolean);

  if (recipients.length === 0) {
    throw new Error(
      "`recipients` must include at least one email address when calling `send_sequence_test_email`."
    );
  }

  const invalidRecipient = recipients.find(
    (recipient) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
  );
  if (invalidRecipient) {
    throw new Error(
      `Invalid test recipient email address: \`${invalidRecipient}\`.`
    );
  }

  return recipients;
}

function defaultSequenceName(goal: string): string {
  const normalizedGoal = goal.trim().replace(/\s+/g, " ");

  if (normalizedGoal.length <= MAX_DEFAULT_SEQUENCE_NAME_LENGTH) {
    return normalizedGoal;
  }

  return `${normalizedGoal.slice(0, MAX_DEFAULT_SEQUENCE_NAME_LENGTH - 3).trimEnd()}...`;
}

export async function handleSequenceTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "generate_sequence": {
      const goal = requiredString("generate_sequence", args, "goal");
      const providedName =
        typeof args.name === "string" && args.name.trim().length > 0
          ? args.name.trim()
          : undefined;

      const createResponse = await handleSequenceTools("create_sequence", {
        ...args,
        goal,
        name: providedName ?? defaultSequenceName(goal),
        trigger: "contact_added",
        durationDays: args.durationDays ?? 14,
      });
      const createResult = createResponse.result;

      return {
        handled: true,
        result:
          typeof createResult === "object" && createResult !== null
            ? {
                ...(createResult as Record<string, unknown>),
                deprecated: true,
                deprecationMessage:
                  "generate_sequence is deprecated. Use create_sequence for new integrations.",
              }
            : createResult,
      };
    }

    case "list_sequences": {
      const companyId = args.companyId as string | undefined;
      const query = new URLSearchParams();
      for (const field of ["status", "search", "limit", "offset"] as const) {
        if (args[field] !== undefined) query.set(field, String(args[field]));
      }
      if (Array.isArray(args.labels) && args.labels.length > 0) {
        query.set("labels", args.labels.join(","));
      }
      const suffix = query.size > 0 ? `?${query.toString()}` : "";
      result = await apiRequest(
        "GET",
        `/api/v1/sequences${suffix}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_sequence": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        `/api/v1/sequences/${args.sequenceId}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_sequence_enrollments": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(name, args, "sequenceId");
      const query = new URLSearchParams();
      // The API reads these as comma-separated lists, so an agent can pass one
      // node ID or several without switching argument shape.
      for (const field of [
        "currentNodeId",
        "status",
        "subscriberId",
      ] as const) {
        const value = args[field];
        if (Array.isArray(value)) {
          if (value.length > 0) query.set(field, value.join(","));
        } else if (value !== undefined) {
          query.set(field, String(value));
        }
      }
      for (const field of ["email", "sort", "limit", "offset"] as const) {
        if (args[field] !== undefined) query.set(field, String(args[field]));
      }
      const suffix = query.size > 0 ? `?${query.toString()}` : "";
      result = await apiRequest(
        "GET",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/enrollments${suffix}`,
        undefined,
        companyId
      );
      break;
    }

    case "send_sequence_test_email": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(name, args, "sequenceId");
      const nodeId = requiredString(name, args, "nodeId");
      const recipients = normalizeSequenceTestRecipients(args);
      result = await apiRequest(
        "POST",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/nodes/${encodeURIComponent(nodeId)}/test`,
        { recipients },
        companyId
      );
      break;
    }

    case "create_sequence": {
      const companyId = args.companyId as string | undefined;
      validateLabelsArg("create_sequence", args);
      validateSendingIdentityArgs("create_sequence", args, {
        hasEmailSteps: true,
      });
      const hasExplicitSteps = Array.isArray(args.steps);
      const createsBlankDraft =
        args.goal === undefined && args.steps === undefined;
      // Create the sequence - this queues AI enrichment
      const createSeqResult = await apiRequest<{
        success: boolean;
        sequence: {
          id: string;
          name: string;
          status: string;
          trigger?: string;
          emailCount: number;
          discountCount?: number;
          subscriberUpdateCount?: number;
          nodeCount?: number;
          enrichmentStatus?: string;
        };
        message: string;
        eventTrackingCode?: string;
        eventTracking?: Record<string, unknown>;
        requiredEvents?: string[];
      }>("POST", "/api/v1/sequences", args, companyId);

      if (!createSeqResult.success) {
        result = createSeqResult;
        break;
      }

      const sequenceId = createSeqResult.sequence.id;

      if (hasExplicitSteps || createsBlankDraft) {
        const finalResult = await apiRequest<{
          success: boolean;
          sequence: {
            id: string;
            name: string;
            status: string;
            enrichmentStatus: string;
            emailCount: number;
            discountCount?: number;
            subscriberUpdateCount?: number;
            enrichedCount: number;
            nodes: unknown[];
          };
        }>("GET", `/api/v1/sequences/${sequenceId}`, undefined, companyId);

        if (finalResult.success) {
          result = {
            ...createSeqResult,
            success: true,
            sequence: finalResult.sequence,
            message: `Sequence "${finalResult.sequence.name}" created ${
              createsBlankDraft ? "as a blank draft" : "with explicit steps"
            }. Review it before enabling.${
              createSeqResult.eventTrackingCode
                ? " Add the custom event feed using eventTrackingCode and eventTracking before enabling."
                : ""
            }`,
          };
        } else {
          result = finalResult;
        }
        break;
      }

      // Poll immediately once, then at 20 second intervals for up to 2 minutes.
      // Fast jobs can complete before the first readback, so an unconditional
      // initial sleep only adds latency and makes compatibility callers wait.
      const maxPolls = 7;
      let pollCount = 0;
      let enrichmentStatus = "pending";

      while (enrichmentStatus !== "complete" && pollCount < maxPolls) {
        const statusResult = await apiRequest<{
          success: boolean;
          sequence: {
            id: string;
            name: string;
            status: string;
            enrichmentStatus: string;
            emailCount: number;
            enrichedCount: number;
          };
        }>("GET", `/api/v1/sequences/${sequenceId}`, undefined, companyId);

        if (statusResult.success) {
          enrichmentStatus = statusResult.sequence.enrichmentStatus;
        }

        pollCount++;
        if (enrichmentStatus !== "complete" && pollCount < maxPolls) {
          await new Promise((resolve) => setTimeout(resolve, 20000));
        }
      }

      // Return final status
      const finalResult = await apiRequest<{
        success: boolean;
        sequence: {
          id: string;
          name: string;
          status: string;
          enrichmentStatus: string;
          emailCount: number;
          enrichedCount: number;
          nodes: unknown[];
        };
      }>("GET", `/api/v1/sequences/${sequenceId}`, undefined, companyId);

      if (finalResult.success) {
        result = {
          ...createSeqResult,
          success: true,
          sequence: finalResult.sequence,
          message:
            finalResult.sequence.enrichmentStatus === "complete"
              ? `Sequence "${finalResult.sequence.name}" created with ${finalResult.sequence.emailCount} AI-generated emails. The sequence is ready to review and enable.${
                  createSeqResult.eventTrackingCode
                    ? " Add the custom event feed using eventTrackingCode and eventTracking before enabling."
                    : ""
                }`
              : `Sequence "${finalResult.sequence.name}" created. Email enrichment is still in progress (${finalResult.sequence.enrichedCount}/${finalResult.sequence.emailCount} emails generated). You can check status with get_sequence.${
                  createSeqResult.eventTrackingCode
                    ? " Add the custom event feed using eventTrackingCode and eventTracking before enabling."
                    : ""
                }`,
        };
      } else {
        result = finalResult;
      }
      break;
    }

    case "update_sequence": {
      const companyId = args.companyId as string | undefined;
      const body = buildUpdateSequenceBody(args);
      result = await apiRequest(
        "PUT",
        `/api/v1/sequences/${args.sequenceId}`,
        body,
        companyId
      );
      break;
    }

    case "update_sequence_node": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(
        "update_sequence_node",
        args,
        "sequenceId"
      );
      const body = buildUpdateSequenceNodeBody(args);
      result = await apiRequest(
        "PUT",
        `/api/v1/sequences/${sequenceId}`,
        body,
        companyId
      );
      break;
    }

    case "update_sequence_nodes": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(
        "update_sequence_nodes",
        args,
        "sequenceId"
      );
      const body = buildUpdateSequenceNodesBody(args);
      result = await apiRequest(
        "PUT",
        `/api/v1/sequences/${sequenceId}`,
        body,
        companyId
      );
      break;
    }

    case "edit_sequence_graph": {
      const companyId = args.companyId as string | undefined;
      const body = buildSequenceGraphEditBody(args);
      result = await apiRequest(
        "PUT",
        `/api/v1/sequences/${args.sequenceId}`,
        body,
        companyId
      );
      break;
    }

    case "insert_sequence_step": {
      const companyId = args.companyId as string | undefined;
      const body = buildInsertSequenceStepBody(args);
      const insertResult = await apiRequest(
        "PUT",
        `/api/v1/sequences/${args.sequenceId}`,
        body,
        companyId
      );
      if (typeof insertResult === "object" && insertResult !== null) {
        const insertRecord = insertResult as Record<string, unknown>;
        const sequence = insertRecord["sequence"];
        if (typeof sequence === "object" && sequence !== null) {
          const sequenceRecord = sequence as Record<string, unknown>;
          result = {
            ...insertRecord,
            ...(sequenceRecord["insertedNodeIds"] !== undefined
              ? { insertedNodeIds: sequenceRecord["insertedNodeIds"] }
              : {}),
            ...(sequenceRecord["insertedEmailIds"] !== undefined
              ? { insertedEmailIds: sequenceRecord["insertedEmailIds"] }
              : {}),
            ...(sequenceRecord["insertedEmailCount"] !== undefined
              ? { insertedEmailCount: sequenceRecord["insertedEmailCount"] }
              : {}),
            ...(sequenceRecord["addedBranchNodeId"] !== undefined
              ? { addedBranchNodeId: sequenceRecord["addedBranchNodeId"] }
              : {}),
            ...(sequenceRecord["addedBranchPathNodeIds"] !== undefined
              ? {
                  addedBranchPathNodeIds:
                    sequenceRecord["addedBranchPathNodeIds"],
                }
              : {}),
          };
          break;
        }
      }
      result = insertResult;
      break;
    }

    case "enable_sequence": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        `/api/v1/sequences/${args.sequenceId}/enable`,
        undefined,
        companyId
      );
      break;
    }

    case "disable_sequence": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        `/api/v1/sequences/${args.sequenceId}/disable`,
        undefined,
        companyId
      );
      break;
    }

    case "duplicate_sequence": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(
        "duplicate_sequence",
        args,
        "sequenceId"
      );
      const name = optionalString(args, "name");
      result = await apiRequest(
        "POST",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/duplicate`,
        name === undefined ? undefined : { name },
        companyId
      );
      break;
    }

    case "archive_sequence":
    case "unarchive_sequence": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(name, args, "sequenceId");
      const action = name === "archive_sequence" ? "archive" : "unarchive";
      result = await apiRequest(
        "POST",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/${action}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_sequence_goals": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(name, args, "sequenceId");
      result = await apiRequest(
        "GET",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/goals`,
        undefined,
        companyId
      );
      break;
    }

    case "create_sequence_goal":
    case "update_sequence_goal": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(name, args, "sequenceId");
      if (name === "create_sequence_goal") {
        requiredString(name, args, "name");
        validateCreateSequenceGoalArgs(args);
      } else {
        validateUpdateSequenceGoalArgs(args);
      }
      const goalId =
        name === "update_sequence_goal"
          ? requiredString(name, args, "goalId")
          : undefined;
      const body = { ...args };
      delete body.companyId;
      delete body.sequenceId;
      delete body.goalId;
      result = await apiRequest(
        name === "create_sequence_goal" ? "POST" : "PATCH",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/goals${
          goalId ? `/${encodeURIComponent(goalId)}` : ""
        }`,
        body,
        companyId
      );
      break;
    }

    case "delete_sequence_goal": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(name, args, "sequenceId");
      const goalId = requiredString(name, args, "goalId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/goals/${encodeURIComponent(goalId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_sequence_inbound_webhook":
    case "configure_sequence_inbound_webhook":
    case "rotate_sequence_inbound_webhook_secret": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(name, args, "sequenceId");
      if (args.clearFieldMapping === true && args.fieldMapping !== undefined) {
        throw new Error(
          "Provide either `fieldMapping` or `clearFieldMapping`, not both."
        );
      }
      if (
        args.clearSamplePayload === true &&
        args.samplePayload !== undefined
      ) {
        throw new Error(
          "Provide either `samplePayload` or `clearSamplePayload`, not both."
        );
      }
      const isConfigure = name === "configure_sequence_inbound_webhook";
      const isRotate = name === "rotate_sequence_inbound_webhook_secret";
      const body = isConfigure
        ? {
            ...(args.clearFieldMapping === true
              ? { fieldMapping: null }
              : args.fieldMapping !== undefined
                ? { fieldMapping: args.fieldMapping }
                : {}),
            ...(args.clearSamplePayload === true
              ? { samplePayload: null }
              : args.samplePayload !== undefined
                ? { samplePayload: args.samplePayload }
                : {}),
          }
        : undefined;
      result = await apiRequest(
        isRotate ? "POST" : isConfigure ? "PUT" : "GET",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/inbound-webhook${
          isRotate ? "/rotate-secret" : ""
        }`,
        body,
        companyId
      );
      break;
    }

    case "pause_sequence_enrollments": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        `/api/v1/sequences/${args.sequenceId}/pause-enrollments`,
        undefined,
        companyId
      );
      break;
    }

    case "resume_sequence_enrollments": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        `/api/v1/sequences/${args.sequenceId}/resume-enrollments`,
        undefined,
        companyId
      );
      break;
    }

    case "enroll_subscribers_in_sequence": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(
        "enroll_subscribers_in_sequence",
        args,
        "sequenceId"
      );
      const body = buildSequenceEnrollmentBody(args);

      result = await apiRequest(
        "POST",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/enroll`,
        body,
        companyId
      );
      break;
    }

    case "cancel_sequence_enrollments": {
      const companyId = args.companyId as string | undefined;
      const body = buildCancelSequenceEnrollmentBody(args);
      result = await apiRequest(
        "POST",
        `/api/v1/sequences/${args.sequenceId}/enrollments/cancel`,
        body,
        companyId
      );
      break;
    }

    case "move_sequence_enrollments": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(
        "move_sequence_enrollments",
        args,
        "sequenceId"
      );
      const body = buildMoveSequenceEnrollmentBody(args);
      result = await apiRequest(
        "POST",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/enrollments/move`,
        body,
        companyId
      );
      break;
    }

    case "realign_sequence_enrollments": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(
        "realign_sequence_enrollments",
        args,
        "sequenceId"
      );
      const body = buildRealignSequenceEnrollmentBody(args);
      result = await apiRequest(
        "POST",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/enrollments/realign-sending-window`,
        body,
        companyId
      );
      break;
    }

    case "get_sequence_enrollment_realignment": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(name, args, "sequenceId");
      const jobId = requiredString(name, args, "jobId");
      result = await apiRequest(
        "GET",
        `/api/v1/sequences/${encodeURIComponent(sequenceId)}/enrollments/realign-sending-window/jobs/${encodeURIComponent(jobId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "delete_sequence": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "DELETE",
        `/api/v1/sequences/${args.sequenceId}`,
        undefined,
        companyId
      );
      break;
    }

    // Transactional
    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
