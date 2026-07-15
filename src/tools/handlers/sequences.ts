import { apiRequest } from "../../runtime.js";
import {
  buildUpdateSequenceBody,
  buildUpdateSequenceNodeBody,
  buildUpdateSequenceNodesBody,
  buildSequenceGraphEditBody,
  buildInsertSequenceStepBody,
  buildCancelSequenceEnrollmentBody,
  requiredString,
  buildSequenceEnrollmentBody,
} from "../internal.js";

const MAX_DEFAULT_SEQUENCE_NAME_LENGTH = 80;

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
      result = await apiRequest(
        "GET",
        "/api/v1/sequences",
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

    case "create_sequence": {
      const companyId = args.companyId as string | undefined;
      if (args.fromEmail !== undefined && args.senderProfileId !== undefined) {
        throw new Error(
          "Provide either `fromEmail` or `senderProfileId` when calling `create_sequence`, not both."
        );
      }
      if (args.replyTo !== undefined && args.replyProfileId !== undefined) {
        throw new Error(
          "Provide either `replyTo` or `replyProfileId` when calling `create_sequence`, not both."
        );
      }
      if (args.fromName !== undefined && args.fromEmail === undefined) {
        throw new Error(
          "`fromName` requires `fromEmail` when calling `create_sequence`."
        );
      }
      if (args.replyToName !== undefined && args.replyTo === undefined) {
        throw new Error(
          "`replyToName` requires `replyTo` when calling `create_sequence`."
        );
      }
      const hasExplicitSteps =
        Array.isArray(args.steps) && args.steps.length > 0;
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

      if (hasExplicitSteps) {
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
            message: `Sequence "${finalResult.sequence.name}" created with explicit steps. Review it before enabling.${
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
      result = await apiRequest(
        "PUT",
        `/api/v1/sequences/${args.sequenceId}`,
        body,
        companyId
      );
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
