import {
  validateHtmlOrBlocksArgs,
  validateSequenceEmailStepIdentityArgs,
  validateSequencePathStepIdentityArgs,
} from "./argument-validation.js";
import {
  isRecord,
  optionalString,
  requiredString,
} from "./common-primitives.js";

export function buildSequenceNodeUpdateEntry(
  toolName: string,
  value: Record<string, unknown>,
  location: string
): Record<string, unknown> {
  const nodeId = requiredString(toolName, value, "nodeId");
  if (!isRecord(value.changes) || Object.keys(value.changes).length === 0) {
    throw new Error(
      `\`changes\` must be a non-empty object for ${location} when calling \`${toolName}\`.`
    );
  }

  const expectedUpdatedAt = requiredString(
    toolName,
    value,
    "expectedUpdatedAt"
  );
  return {
    nodeId,
    changes: value.changes,
    expectedUpdatedAt,
  };
}

export function buildUpdateSequenceNodeBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const update = buildSequenceNodeUpdateEntry(
    "update_sequence_node",
    args,
    "the node update"
  );
  return {
    ...(args.confirmLiveChange !== undefined && {
      confirmLiveChange: args.confirmLiveChange,
    }),
    nodeUpdates: [update],
  };
}

export function buildUpdateSequenceNodesBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  if (!Array.isArray(args.updates) || args.updates.length === 0) {
    throw new Error(
      "`updates` must be a non-empty array when calling `update_sequence_nodes`."
    );
  }

  const seenNodeIds = new Set<string>();
  const nodeUpdates = args.updates.map((value, index) => {
    if (!isRecord(value)) {
      throw new Error(
        `\`updates[${index}]\` must be an object when calling \`update_sequence_nodes\`.`
      );
    }
    const update = buildSequenceNodeUpdateEntry(
      "update_sequence_nodes",
      value,
      `updates[${index}]`
    );
    const nodeId = String(update.nodeId);
    if (seenNodeIds.has(nodeId)) {
      throw new Error(
        `\`updates[${index}]\` targets duplicate nodeId '${nodeId}' when calling \`update_sequence_nodes\`.`
      );
    }
    seenNodeIds.add(nodeId);
    return update;
  });

  return {
    ...(args.confirmLiveChange !== undefined && {
      confirmLiveChange: args.confirmLiveChange,
    }),
    nodeUpdates,
  };
}

export function buildSequenceGraphEditBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const action = requiredString("edit_sequence_graph", args, "action");
  const graphRevision = requiredString(
    "edit_sequence_graph",
    args,
    "graphRevision"
  );
  const allowedActions = new Set([
    "move_node",
    "delete_node",
    "duplicate_node",
    "replace_edges",
  ]);
  if (!allowedActions.has(action)) {
    throw new Error(
      "`action` must be `move_node`, `delete_node`, `duplicate_node`, or `replace_edges` when calling `edit_sequence_graph`."
    );
  }

  const nodeId = optionalString(args, "nodeId");
  const afterNodeId = optionalString(args, "afterNodeId");
  const beforeNodeId = optionalString(args, "beforeNodeId");
  const edgesValue = args.edges;

  if (action !== "replace_edges" && !nodeId) {
    throw new Error(
      `\`nodeId\` is required for ${action} when calling \`edit_sequence_graph\`.`
    );
  }
  if (action === "replace_edges" && nodeId) {
    throw new Error(
      "`nodeId` is not used with `replace_edges` when calling `edit_sequence_graph`."
    );
  }

  const isPositionedAction =
    action === "move_node" || action === "duplicate_node";
  if (
    isPositionedAction &&
    (afterNodeId ? 1 : 0) + (beforeNodeId ? 1 : 0) !== 1
  ) {
    throw new Error(
      `Provide exactly one of \`afterNodeId\` or \`beforeNodeId\` for ${action} when calling \`edit_sequence_graph\`.`
    );
  }
  if (!isPositionedAction && (afterNodeId || beforeNodeId)) {
    throw new Error(
      `\`afterNodeId\` and \`beforeNodeId\` are not used with ${action} when calling \`edit_sequence_graph\`.`
    );
  }
  if (
    (action === "replace_edges" ||
      (action === "delete_node" && edgesValue !== undefined)) &&
    (!Array.isArray(edgesValue) || edgesValue.length === 0)
  ) {
    throw new Error(
      `\`edges\` must contain the complete replacement topology for ${action} when calling \`edit_sequence_graph\`.`
    );
  }
  if (
    (action === "move_node" || action === "duplicate_node") &&
    edgesValue !== undefined
  ) {
    throw new Error(
      `\`edges\` is not used with ${action} when calling \`edit_sequence_graph\`.`
    );
  }

  const edges = Array.isArray(edgesValue)
    ? edgesValue.map((edge, index) => {
        if (!isRecord(edge)) {
          throw new Error(
            `\`edges\` item ${index + 1} must be an object when calling \`edit_sequence_graph\`.`
          );
        }
        const sourceNodeId = requiredString(
          "edit_sequence_graph",
          edge,
          "sourceNodeId"
        );
        const targetNodeId = requiredString(
          "edit_sequence_graph",
          edge,
          "targetNodeId"
        );
        if (
          edge.condition !== undefined &&
          edge.condition !== null &&
          !isRecord(edge.condition)
        ) {
          throw new Error(
            `\`edges\` item ${index + 1} \`condition\` must be an object when calling \`edit_sequence_graph\`.`
          );
        }
        return {
          sourceNodeId,
          targetNodeId,
          ...(isRecord(edge.condition) ? { condition: edge.condition } : {}),
        };
      })
    : undefined;

  return {
    ...(args.confirmStructuralChange !== undefined && {
      confirmStructuralChange: args.confirmStructuralChange,
    }),
    graphEdit: {
      action,
      expectedRevision: graphRevision,
      ...(nodeId ? { nodeId } : {}),
      ...(afterNodeId ? { afterNodeId } : {}),
      ...(beforeNodeId ? { beforeNodeId } : {}),
      ...(edges ? { edges } : {}),
    },
  };
}

export function buildInsertSequenceStepBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const isSmsStep = args.type === "sms";

  let step: Record<string, unknown>;
  if (isSmsStep) {
    validateSequencePathStepIdentityArgs(
      "insert_sequence_step",
      "SMS step",
      args
    );
    const text = optionalString(args, "text");
    const hasBlocks = Array.isArray(args.blocks) && args.blocks.length > 0;
    if (text === undefined && !hasBlocks) {
      throw new Error(
        "Provide `text` (or `blocks`) when inserting an SMS step with `insert_sequence_step`."
      );
    }

    step = { type: "sms" };
    for (const key of [
      "text",
      "blocks",
      "imageUrls",
      "label",
      "name",
      "ineligibleAction",
      "delay",
      "delayMs",
      "waitUntil",
    ]) {
      if (args[key] !== undefined) {
        step[key] = args[key];
      }
    }
  } else {
    validateHtmlOrBlocksArgs("insert_sequence_step", args, {
      requireContent: true,
    });
    validateSequenceEmailStepIdentityArgs(
      "insert_sequence_step",
      "email step",
      args
    );

    step = {
      subject: requiredString("insert_sequence_step", args, "subject"),
    };
    for (const key of [
      "name",
      "previewText",
      "html",
      "blocks",
      "delay",
      "delayMs",
      "waitUntil",
      "senderProfileId",
      "fromEmail",
      "fromName",
      "replyProfileId",
      "replyTo",
      "replyToName",
    ]) {
      if (args[key] !== undefined) {
        step[key] = args[key];
      }
    }
  }

  const insertSteps: Record<string, unknown> = {
    steps: [step],
  };
  if (args.afterNodeId !== undefined) {
    insertSteps.afterNodeId = args.afterNodeId;
  }

  return {
    ...(args.confirmStructuralChange !== undefined && {
      confirmStructuralChange: args.confirmStructuralChange,
    }),
    insertSteps,
  };
}

export function buildCancelSequenceEnrollmentBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const subscriberId = optionalString(args, "subscriberId");
  const fieldValuesValue = args.fieldValues;
  const fieldValues =
    fieldValuesValue === undefined
      ? undefined
      : Array.isArray(fieldValuesValue)
        ? fieldValuesValue
        : undefined;

  if (fieldValuesValue !== undefined && fieldValues === undefined) {
    throw new Error(
      "`fieldValues` must be an array when calling `cancel_sequence_enrollments`."
    );
  }

  const normalizedFieldValues =
    fieldValues
      ?.map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0) ?? [];

  if (
    fieldValues?.some((value) => typeof value !== "string") ||
    (fieldValues !== undefined && normalizedFieldValues.length === 0)
  ) {
    throw new Error(
      "`fieldValues` must contain at least one non-empty string when calling `cancel_sequence_enrollments`."
    );
  }

  if ((subscriberId !== undefined) === normalizedFieldValues.length > 0) {
    throw new Error(
      "Provide exactly one target when calling `cancel_sequence_enrollments`: `subscriberId` or `fieldValues`."
    );
  }

  const fieldPath = optionalString(args, "fieldPath");
  const reason = optionalString(args, "reason");

  return {
    ...(subscriberId !== undefined && { subscriberId }),
    ...(fieldPath !== undefined && { fieldPath }),
    ...(normalizedFieldValues.length > 0 && {
      fieldValues: normalizedFieldValues,
    }),
    ...(typeof args.dryRun === "boolean" && { dryRun: args.dryRun }),
    ...(reason !== undefined && { reason }),
  };
}
