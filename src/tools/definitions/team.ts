import type { Tool } from "../../mcp-types.js";

export const teamToolDefinitions: Tool[] = [
  // ============================================================================
  // Team
  // ============================================================================
  {
    name: "list_team_members",
    description:
      "List team members for the company, including the owner, members with their roles, and pending or expired invitations.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "invite_team_member",
    description:
      "Invite a team member by email with role admin, viewer, or restricted. Existing Sequenzy users are added to the team immediately; others receive an email invitation. Billing access (canManageBilling) can only be granted by the company owner and is not available for restricted members.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description: "Email address of the person to invite.",
        },
        role: {
          type: "string",
          enum: ["admin", "viewer", "restricted"],
          description:
            "Team role. Admins can manage the workspace; viewers have read-only access; restricted members can open direct campaign links only.",
        },
        canManageBilling: {
          type: "boolean",
          description:
            "Whether the member can manage billing. Only the company owner can grant billing access. Defaults to false.",
        },
      },
      required: ["email", "role"],
    },
  },
  {
    name: "cancel_team_invitation",
    description:
      "Cancel a pending team invitation. Invitations that have already been accepted cannot be cancelled.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        invitationId: {
          type: "string",
          description:
            "Invitation ID to cancel. Use list_team_members to find pending invitations.",
        },
      },
      required: ["invitationId"],
    },
  },
];
