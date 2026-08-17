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

function validateBranchConditionFields(
  conditionType: string,
  value: Record<string, unknown>,
  pathLabel: string
): void {
  if (
    (conditionType === "has_tag" || conditionType === "does_not_have_tag") &&
    !optionalString(value, "tagId") &&
    !optionalString(value, "tagName")
  ) {
    throw new Error(
      `\`${pathLabel}\` must provide \`tagId\` or \`tagName\` for ${conditionType} when calling \`insert_sequence_step\`.`
    );
  }
  if (conditionType === "in_list" && !optionalString(value, "listId")) {
    throw new Error(
      `\`${pathLabel}.listId\` is required for in_list when calling \`insert_sequence_step\`.`
    );
  }
  if (conditionType === "in_segment" && !optionalString(value, "segmentId")) {
    throw new Error(
      `\`${pathLabel}.segmentId\` is required for in_segment when calling \`insert_sequence_step\`.`
    );
  }
  if (
    conditionType === "event_received" &&
    !optionalString(value, "eventName")
  ) {
    throw new Error(
      `\`${pathLabel}.eventName\` is required for event_received when calling \`insert_sequence_step\`.`
    );
  }
  if (
    conditionType.startsWith("field_") &&
    (!optionalString(value, "fieldName") ||
      !optionalString(value, "fieldValue"))
  ) {
    throw new Error(
      `\`${pathLabel}\` must provide \`fieldName\` and \`fieldValue\` for ${conditionType} when calling \`insert_sequence_step\`.`
    );
  }
}

const RANDOM_SPLIT_CONDITION_FIELDS = [
  "conditionType",
  "tagId",
  "tagName",
  "listId",
  "segmentId",
  "segmentName",
  "eventName",
  "linkUrl",
  "activityScope",
  "fieldName",
  "fieldValue",
] as const;

export function buildInsertSequenceStepBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const stepType = optionalString(args, "type") ?? "email";
  const allowedStepTypes = new Set([
    "email",
    "sms",
    "delay",
    "create_discount",
    "update_subscriber",
    "condition",
    "add_tag",
    "remove_tag",
    "add_to_list",
    "remove_from_list",
    "webhook",
    "ai",
    "logic_wait_for_event",
    "logic_branch",
  ]);
  if (!allowedStepTypes.has(stepType)) {
    throw new Error(
      "`type` is not a supported dashboard sequence step when calling `insert_sequence_step`."
    );
  }

  if (stepType === "logic_wait_for_event") {
    const eventName = requiredString("insert_sequence_step", args, "eventName");
    const timeoutDaysValue = args.timeoutDays;
    const timeoutDays = timeoutDaysValue === undefined ? 7 : timeoutDaysValue;
    if (
      typeof timeoutDays !== "number" ||
      !Number.isInteger(timeoutDays) ||
      timeoutDays < 1 ||
      timeoutDays > 365
    ) {
      throw new Error(
        "`timeoutDays` must be a whole number from 1 to 365 when inserting `logic_wait_for_event` with `insert_sequence_step`."
      );
    }
    const timeoutAction = optionalString(args, "timeoutAction") ?? "continue";
    if (timeoutAction !== "continue" && timeoutAction !== "exit") {
      throw new Error(
        "`timeoutAction` must be `continue` or `exit` when inserting `logic_wait_for_event` with `insert_sequence_step`."
      );
    }

    const insertSteps: Record<string, unknown> = {
      steps: [
        {
          nodeType: "logic_wait_for_event",
          config: {
            label: optionalString(args, "label") ?? `Wait for ${eventName}`,
            eventName,
            timeoutDays,
            timeoutAction,
          },
        },
      ],
    };
    const afterNodeId = optionalString(args, "afterNodeId");
    if (afterNodeId) {
      insertSteps.afterNodeId = afterNodeId;
    }

    return {
      ...(args.confirmStructuralChange !== undefined && {
        confirmStructuralChange: args.confirmStructuralChange,
      }),
      insertSteps,
    };
  }

  if (stepType === "logic_branch") {
    const afterNodeId = requiredString(
      "insert_sequence_step",
      args,
      "afterNodeId"
    );
    if (!Array.isArray(args.branches) || args.branches.length === 0) {
      throw new Error(
        "`branches` must contain at least one typed condition when inserting `logic_branch` with `insert_sequence_step`."
      );
    }

    const conditionTypes = new Set([
      "has_tag",
      "does_not_have_tag",
      "in_list",
      "in_segment",
      "event_received",
      "link_clicked",
      "field_equals",
      "field_contains",
      "field_greater_than",
      "field_less_than",
      "has_phone",
      "sms_subscribed",
    ]);
    const splitMode = optionalString(args, "splitMode") ?? "condition";
    if (splitMode !== "condition" && splitMode !== "random") {
      throw new Error(
        "`splitMode` must be `condition` or `random` when inserting `logic_branch` with `insert_sequence_step`."
      );
    }
    const isRandomSplit = splitMode === "random";

    if (isRandomSplit) {
      if (
        !Array.isArray(args.randomPercentages) ||
        args.randomPercentages.length !== args.branches.length
      ) {
        throw new Error(
          "`randomPercentages` must contain one percentage per entry in `branches` when `splitMode` is `random`."
        );
      }
      if (
        args.randomPercentages.some(
          (value) =>
            typeof value !== "number" || !Number.isFinite(value) || value < 0
        )
      ) {
        throw new Error(
          "`randomPercentages` must contain non-negative numbers when `splitMode` is `random`."
        );
      }
      const total = args.randomPercentages.reduce<number>(
        (sum, value) => sum + (value as number),
        0
      );
      if (Math.abs(total - 100) > 0.001) {
        throw new Error(
          `\`randomPercentages\` must sum to 100 when \`splitMode\` is \`random\`, received ${total}.`
        );
      }
      if (
        (Array.isArray(args.elseSteps) && args.elseSteps.length > 0) ||
        optionalString(args, "elseTargetNodeId")
      ) {
        throw new Error(
          "`elseSteps` and `elseTargetNodeId` are not valid when `splitMode` is `random`. Every path is weighted by `randomPercentages`, so add another entry to `branches` instead."
        );
      }
    } else if (args.randomPercentages !== undefined) {
      throw new Error(
        "`randomPercentages` is only valid when `splitMode` is `random`."
      );
    }

    const branchKeys = [
      "id",
      "label",
      "conditionType",
      "tagName",
      "tagId",
      "listId",
      "segmentId",
      "segmentName",
      "eventName",
      "linkUrl",
      "activityScope",
      "fieldName",
      "fieldValue",
      "targetNodeId",
      "steps",
    ] as const;
    const allowEmptyPaths = args.allowEmptyPaths === true;
    const branches = args.branches.map((value, index) => {
      if (!isRecord(value)) {
        throw new Error(
          `\`branches[${index}]\` must be an object when calling \`insert_sequence_step\`.`
        );
      }
      const pathLabel = `branches[${index}]`;
      if (isRandomSplit) {
        const conditionField = RANDOM_SPLIT_CONDITION_FIELDS.find(
          (field) => value[field] !== undefined
        );
        if (conditionField) {
          throw new Error(
            `\`${pathLabel}.${conditionField}\` must be omitted when \`splitMode\` is \`random\`, because the path is chosen by percentage rather than by evaluating the subscriber.`
          );
        }
      } else {
        const conditionType = requiredString(
          "insert_sequence_step",
          value,
          "conditionType"
        );
        if (!conditionTypes.has(conditionType)) {
          throw new Error(
            `\`branches[${index}].conditionType\` is not supported when calling \`insert_sequence_step\`.`
          );
        }
        validateBranchConditionFields(conditionType, value, pathLabel);
      }
      if (value.steps !== undefined && !Array.isArray(value.steps)) {
        throw new Error(
          `\`branches[${index}].steps\` must be an array when calling \`insert_sequence_step\`.`
        );
      }
      const targetNodeId = optionalString(value, "targetNodeId");
      const hasSteps = Array.isArray(value.steps) && value.steps.length > 0;
      if (!targetNodeId && !hasSteps && !allowEmptyPaths) {
        throw new Error(
          `\`branches[${index}]\` must provide \`targetNodeId\` or non-empty \`steps\` when inserting \`logic_branch\` with \`insert_sequence_step\`.`
        );
      }

      return Object.fromEntries(
        branchKeys.flatMap((key) =>
          value[key] === undefined ? [] : [[key, value[key]]]
        )
      );
    });

    if (args.elseSteps !== undefined && !Array.isArray(args.elseSteps)) {
      throw new Error(
        "`elseSteps` must be an array when calling `insert_sequence_step`."
      );
    }
    const elseTargetNodeId = optionalString(args, "elseTargetNodeId");
    const hasElseSteps =
      Array.isArray(args.elseSteps) && args.elseSteps.length > 0;
    // A random split has no else lane, so there is nothing to require here.
    if (
      !isRandomSplit &&
      !elseTargetNodeId &&
      !hasElseSteps &&
      !allowEmptyPaths
    ) {
      throw new Error(
        "Provide `elseTargetNodeId` or non-empty `elseSteps` when inserting `logic_branch` with `insert_sequence_step`."
      );
    }

    return {
      ...(args.confirmStructuralChange !== undefined && {
        confirmStructuralChange: args.confirmStructuralChange,
      }),
      branch: {
        afterNodeId,
        ...(optionalString(args, "label")
          ? { label: optionalString(args, "label") }
          : {}),
        ...(isRandomSplit
          ? { splitMode, randomPercentages: args.randomPercentages }
          : {}),
        branches,
        ...(Array.isArray(args.elseSteps) ? { elseSteps: args.elseSteps } : {}),
        ...(elseTargetNodeId ? { elseTargetNodeId } : {}),
        ...(allowEmptyPaths ? { allowEmptyPaths: true } : {}),
      },
    };
  }

  if (
    stepType === "delay" ||
    stepType === "create_discount" ||
    stepType === "update_subscriber" ||
    stepType === "condition" ||
    stepType === "add_tag" ||
    stepType === "remove_tag" ||
    stepType === "add_to_list" ||
    stepType === "remove_from_list" ||
    stepType === "webhook" ||
    stepType === "ai"
  ) {
    let step: Record<string, unknown>;
    if (stepType === "delay") {
      step = { type: "delay" };
      for (const key of ["delay", "delayMs", "waitUntil", "waitUntilWeekday"]) {
        if (args[key] !== undefined) step[key] = args[key];
      }
      if (
        step.delay === undefined &&
        step.delayMs === undefined &&
        step.waitUntil === undefined &&
        step.waitUntilWeekday === undefined
      ) {
        throw new Error(
          "Provide `delay`, `delayMs`, `waitUntil`, or `waitUntilWeekday` when inserting a delay step."
        );
      }
    } else if (stepType === "create_discount") {
      step = { type: "create_discount" };
      for (const key of [
        "discount",
        "label",
        "provider",
        "discountType",
        "percentOff",
        "amountOff",
        "currency",
        "duration",
        "durationInMonths",
        "appliesToAllPlans",
        "planIds",
        "codePrefix",
        "maxRedemptions",
        "lockToSubscriber",
        "expiresAt",
        "expiresInHours",
      ]) {
        if (args[key] !== undefined) step[key] = args[key];
      }
    } else if (stepType === "update_subscriber") {
      if (!isRecord(args.config)) {
        throw new Error(
          "`config` is required when inserting an update_subscriber step."
        );
      }
      step = {
        type: "update_subscriber",
        nodeType: "action_update_attributes",
        config: args.config,
      };
    } else if (stepType === "webhook") {
      const method = optionalString(args, "method") ?? "POST";
      if (!["POST", "GET", "PUT", "PATCH", "DELETE"].includes(method)) {
        throw new Error(
          "`method` must be one of POST, GET, PUT, PATCH, or DELETE when inserting a webhook step."
        );
      }
      if (
        args.headers !== undefined &&
        (!isRecord(args.headers) ||
          Object.values(args.headers).some(
            (value) => typeof value !== "string"
          ))
      ) {
        throw new Error(
          "`headers` must be an object with string values when inserting a webhook step."
        );
      }
      const onError = optionalString(args, "onError");
      if (onError && !["continue", "exit", "fail"].includes(onError)) {
        throw new Error(
          "`onError` must be `continue`, `exit`, or `fail` when inserting a webhook step."
        );
      }
      // optionalString drops anything that is not a string, so a caller that
      // passes an object for `body` (or a number for `resultKey`) would
      // otherwise get a step created without it and no error. The API rejects
      // a provided-but-invalid webhook field loudly; match that here.
      if (args.body !== undefined && typeof args.body !== "string") {
        throw new Error(
          "`body` must be a JSON string when inserting a webhook step."
        );
      }
      if (args.resultKey !== undefined && typeof args.resultKey !== "string") {
        throw new Error(
          "`resultKey` must be a string when inserting a webhook step."
        );
      }
      const body = optionalString(args, "body");
      const resultKey = optionalString(args, "resultKey");
      step = {
        type: "webhook",
        nodeType: "action_webhook",
        config: {
          label: optionalString(args, "label") ?? "Webhook",
          url: requiredString("insert_sequence_step", args, "url"),
          method,
          ...(args.headers !== undefined ? { headers: args.headers } : {}),
          ...(body ? { body } : {}),
          ...(resultKey ? { resultKey } : {}),
          ...(onError ? { onError } : {}),
        },
      };
    } else if (stepType === "ai") {
      const onError = optionalString(args, "onError");
      if (onError && !["continue", "exit", "fail"].includes(onError)) {
        throw new Error(
          "`onError` must be `continue`, `exit`, or `fail` when inserting an ai step."
        );
      }
      if (!Array.isArray(args.outputFields) || args.outputFields.length === 0) {
        throw new Error(
          "`outputFields` is required when inserting an ai step, e.g. [{ key: 'subject_line', fallback: 'We miss you' }]."
        );
      }
      if (args.includeAttributes !== undefined) {
        if (
          !Array.isArray(args.includeAttributes) ||
          args.includeAttributes.some((key) => typeof key !== "string")
        ) {
          throw new Error(
            "`includeAttributes` must be an array of attribute names when inserting an ai step."
          );
        }
      }
      if (
        args.recentEventLimit !== undefined &&
        typeof args.recentEventLimit !== "number"
      ) {
        throw new Error(
          "`recentEventLimit` must be a number between 1 and 50 when inserting an ai step."
        );
      }
      step = {
        type: "ai",
        nodeType: "action_ai",
        config: {
          label: optionalString(args, "label") ?? "Ask AI",
          prompt: requiredString("insert_sequence_step", args, "prompt"),
          resultKey: requiredString("insert_sequence_step", args, "resultKey"),
          outputFields: args.outputFields,
          ...(args.includeTags !== undefined
            ? { includeTags: args.includeTags === true }
            : {}),
          ...(args.includeEventProperties !== undefined
            ? { includeEventProperties: args.includeEventProperties === true }
            : {}),
          ...(args.includeRecentEvents !== undefined
            ? { includeRecentEvents: args.includeRecentEvents === true }
            : {}),
          ...(args.recentEventLimit !== undefined
            ? { recentEventLimit: args.recentEventLimit }
            : {}),
          ...(args.includeAttributes !== undefined
            ? { includeAttributes: args.includeAttributes }
            : {}),
          ...(onError ? { onError } : {}),
        },
      };
    } else if (stepType === "condition") {
      const conditionType = requiredString(
        "insert_sequence_step",
        args,
        "conditionType"
      );
      const allowedConditionTypes = new Set([
        "has_tag",
        "does_not_have_tag",
        "in_list",
        "in_segment",
        "event_received",
        "link_clicked",
        "field_equals",
        "field_contains",
        "field_greater_than",
        "field_less_than",
        "has_phone",
        "sms_subscribed",
      ]);
      if (!allowedConditionTypes.has(conditionType)) {
        throw new Error(
          "`conditionType` is not supported for condition steps."
        );
      }
      if (
        (conditionType === "has_tag" ||
          conditionType === "does_not_have_tag") &&
        !optionalString(args, "tagId") &&
        !optionalString(args, "tagName")
      ) {
        throw new Error(
          "Provide `tagId` or `tagName` for this condition step."
        );
      }
      if (conditionType === "in_list" && !optionalString(args, "listId")) {
        throw new Error("`listId` is required for an in_list condition.");
      }
      if (
        conditionType === "in_segment" &&
        !optionalString(args, "segmentId")
      ) {
        throw new Error("`segmentId` is required for an in_segment condition.");
      }
      if (
        conditionType === "event_received" &&
        !optionalString(args, "eventName")
      ) {
        throw new Error(
          "`eventName` is required for an event_received condition."
        );
      }
      if (
        conditionType.startsWith("field_") &&
        (!optionalString(args, "fieldName") ||
          !optionalString(args, "fieldValue"))
      ) {
        throw new Error(
          "`fieldName` and `fieldValue` are required for field conditions."
        );
      }
      const config: Record<string, unknown> = {
        label: optionalString(args, "label") ?? "Condition",
        conditionType,
      };
      for (const key of [
        "tagId",
        "tagName",
        "listId",
        "segmentId",
        "segmentName",
        "eventName",
        "linkUrl",
        "activityScope",
        "fieldName",
        "fieldValue",
      ]) {
        if (args[key] !== undefined) config[key] = args[key];
      }
      step = { type: "condition", nodeType: "logic_condition", config };
    } else {
      const isTagAction = stepType === "add_tag" || stepType === "remove_tag";
      const nodeType =
        stepType === "add_tag"
          ? "action_add_tag"
          : stepType === "remove_tag"
            ? "action_remove_tag"
            : stepType === "add_to_list"
              ? "action_add_to_list"
              : "action_remove_from_list";
      const config: Record<string, unknown> = {
        label:
          optionalString(args, "label") ??
          (stepType === "add_tag"
            ? "Add Tag"
            : stepType === "remove_tag"
              ? "Remove Tag"
              : stepType === "add_to_list"
                ? "Add to List"
                : "Remove from List"),
      };
      if (isTagAction) {
        const tagId = optionalString(args, "tagId");
        const tagName = optionalString(args, "tagName");
        if (!tagId && !tagName) {
          throw new Error(
            "Provide `tagId` or `tagName` when inserting a tag action."
          );
        }
        if (tagId) config.tagId = tagId;
        if (tagName) config.tagName = tagName;
      } else {
        config.listId = requiredString("insert_sequence_step", args, "listId");
        const listName = optionalString(args, "listName");
        if (listName) config.listName = listName;
      }
      step = { nodeType, config };
    }

    for (const key of ["delay", "delayMs", "waitUntil", "waitUntilWeekday"]) {
      if (stepType !== "delay" && args[key] !== undefined) {
        step[key] = args[key];
      }
    }
    const insertSteps: Record<string, unknown> = { steps: [step] };
    const afterNodeId = optionalString(args, "afterNodeId");
    if (afterNodeId) insertSteps.afterNodeId = afterNodeId;
    return {
      ...(args.confirmStructuralChange !== undefined && {
        confirmStructuralChange: args.confirmStructuralChange,
      }),
      insertSteps,
    };
  }

  const isSmsStep = stepType === "sms";

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
      "waitUntilWeekday",
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
      "waitUntilWeekday",
      "senderProfileId",
      "fromEmail",
      "fromName",
      "replyProfileId",
      "replyTo",
      "replyToName",
      "isTransactional",
      "ccEmails",
      "bccEmails",
      "attachments",
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

function normalizeCancelStringArray(
  args: Record<string, unknown>,
  key: "fieldValues" | "subscriberIds"
): string[] {
  const raw = args[key];
  if (raw === undefined) {
    return [];
  }

  if (!Array.isArray(raw)) {
    throw new Error(
      `\`${key}\` must be an array when calling \`cancel_sequence_enrollments\`.`
    );
  }

  const normalized = raw
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  if (
    raw.some((value) => typeof value !== "string") ||
    normalized.length === 0
  ) {
    throw new Error(
      `\`${key}\` must contain at least one non-empty string when calling \`cancel_sequence_enrollments\`.`
    );
  }

  return normalized;
}

function normalizeRealignStringArray(
  args: Record<string, unknown>,
  key: "nodeIds" | "subscriberIds"
): string[] {
  const raw = args[key];
  if (raw === undefined) {
    return [];
  }

  if (!Array.isArray(raw)) {
    throw new Error(
      `\`${key}\` must be an array when calling \`realign_sequence_enrollments\`.`
    );
  }

  const normalized = raw
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  if (
    raw.some((value) => typeof value !== "string") ||
    normalized.length === 0
  ) {
    throw new Error(
      `\`${key}\` must contain at least one non-empty string when calling \`realign_sequence_enrollments\`.`
    );
  }

  return normalized;
}

export function buildRealignSequenceEnrollmentBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const nodeIds = normalizeRealignStringArray(args, "nodeIds");
  const subscriberIds = normalizeRealignStringArray(args, "subscriberIds");
  const cursor = optionalString(args, "cursor");

  if (args.dryRun !== undefined && typeof args.dryRun !== "boolean") {
    throw new Error(
      "`dryRun` must be a boolean when calling `realign_sequence_enrollments`."
    );
  }

  return {
    ...(nodeIds.length > 0 && { nodeIds }),
    ...(subscriberIds.length > 0 && { subscriberIds }),
    ...(cursor !== undefined && { cursor }),
    ...(typeof args.dryRun === "boolean" && { dryRun: args.dryRun }),
  };
}

export function buildCancelSequenceEnrollmentBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const subscriberId = optionalString(args, "subscriberId");
  const subscriberIds = normalizeCancelStringArray(args, "subscriberIds");
  const fieldValues = normalizeCancelStringArray(args, "fieldValues");

  if (args.cancelAll !== undefined && typeof args.cancelAll !== "boolean") {
    throw new Error(
      "`cancelAll` must be a boolean when calling `cancel_sequence_enrollments`."
    );
  }
  const cancelAll = args.cancelAll === true;

  const targetCount =
    (subscriberId !== undefined ? 1 : 0) +
    (subscriberIds.length > 0 ? 1 : 0) +
    (fieldValues.length > 0 ? 1 : 0) +
    (cancelAll ? 1 : 0);

  if (targetCount !== 1) {
    throw new Error(
      "Provide exactly one target when calling `cancel_sequence_enrollments`: `cancelAll`, `subscriberId`, `subscriberIds`, or `fieldValues`."
    );
  }

  const fieldPath = optionalString(args, "fieldPath");
  const reason = optionalString(args, "reason");

  return {
    ...(cancelAll && { cancelAll: true }),
    ...(subscriberId !== undefined && { subscriberId }),
    ...(subscriberIds.length > 0 && { subscriberIds }),
    ...(fieldPath !== undefined && { fieldPath }),
    ...(fieldValues.length > 0 && { fieldValues }),
    ...(typeof args.dryRun === "boolean" && { dryRun: args.dryRun }),
    ...(reason !== undefined && { reason }),
  };
}

const SEQUENCE_ENROLLMENT_MOVE_SORTS = [
  "wait_until_asc",
  "wait_until_desc",
  "enrolled_at_asc",
  "enrolled_at_desc",
] as const;

function optionalPositiveInteger(
  args: Record<string, unknown>,
  key: "limit" | "dailyLimit"
): number | undefined {
  const raw = args[key];
  if (raw === undefined || raw === null) {
    return undefined;
  }

  const value = typeof raw === "string" ? Number(raw) : raw;
  const floor = key === "dailyLimit" ? 0 : 1;
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < floor
  ) {
    throw new Error(
      `\`${key}\` must be an integer of at least ${floor} when calling \`move_sequence_enrollments\`.`
    );
  }

  return value;
}

function optionalStringArray(
  args: Record<string, unknown>,
  key: "subscriberIds" | "tags"
): string[] {
  const raw = args[key];
  if (raw === undefined) {
    return [];
  }

  if (!Array.isArray(raw) || raw.some((value) => typeof value !== "string")) {
    throw new Error(
      `\`${key}\` must be an array of strings when calling \`move_sequence_enrollments\`.`
    );
  }

  const normalized = raw
    .map((value) => (value as string).trim())
    .filter((value) => value.length > 0);

  if (normalized.length === 0) {
    throw new Error(
      `\`${key}\` must contain at least one non-empty string when calling \`move_sequence_enrollments\`.`
    );
  }

  return normalized;
}

export function buildMoveSequenceEnrollmentBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const fromNodeId = requiredString(
    "move_sequence_enrollments",
    args,
    "fromNodeId"
  );
  const targetNodeId = optionalString(args, "targetNodeId");
  const reason = optionalString(args, "reason");
  const sort = optionalString(args, "sort");

  if (
    sort !== undefined &&
    !(SEQUENCE_ENROLLMENT_MOVE_SORTS as readonly string[]).includes(sort)
  ) {
    throw new Error(
      `\`sort\` must be one of ${SEQUENCE_ENROLLMENT_MOVE_SORTS.join(", ")} when calling \`move_sequence_enrollments\`.`
    );
  }

  const subscriberIds = optionalStringArray(args, "subscriberIds");
  const tags = optionalStringArray(args, "tags");

  const limit = optionalPositiveInteger(args, "limit");
  const dailyLimit = optionalPositiveInteger(args, "dailyLimit");

  return {
    fromNodeId,
    ...(targetNodeId !== undefined && { targetNodeId }),
    ...(limit !== undefined && { limit }),
    ...(dailyLimit !== undefined && { dailyLimit }),
    ...(sort !== undefined && { sort }),
    ...(subscriberIds.length > 0 && { subscriberIds }),
    ...(tags.length > 0 && { tags }),
    ...(reason !== undefined && { reason }),
    ...(typeof args.dryRun === "boolean" && { dryRun: args.dryRun }),
  };
}
