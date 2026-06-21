import { eq, and, desc, asc, sql, not, isNull, inArray, or } from "drizzle-orm";
import { db } from "../db/client";
import {
  user,
  contact,
  conversation,
  message,
  metaConfig,
  webhookOrphan,
  adminAuditLog,
  deal,
  task,
  profile,
  upgradeRequest
} from "../db/schema";
import OpenAI from "openai";

const getOpenAIClient = (): OpenAI => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured on the server.");
  return new OpenAI({ apiKey: key });
};

/**
 * 1. Tool Implementations
 */

// Lists active and trial client workspaces, their recent usage (chats/messages), and connectivity
async function listWorkspacesActivityTool() {
  try {
    const clients = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        trialEndsAt: user.trialEndsAt,
        mrrInr: user.mrrInr,
      })
      .from(user)
      .where(eq(user.isStaff, false))
      .orderBy(desc(user.createdAt))
      .limit(50);

    const [convCounts, msgCounts, metas] = await Promise.all([
      db.select({ ownerId: conversation.ownerId, n: sql<number>`count(${conversation.id})` })
        .from(conversation).groupBy(conversation.ownerId),
      db.select({ ownerId: message.ownerId, n: sql<number>`count(${message.id})` })
        .from(message).groupBy(message.ownerId),
      db.select({ userId: metaConfig.userId, displayPhoneNumber: metaConfig.displayPhoneNumber, enabled: metaConfig.enabled })
        .from(metaConfig)
    ]);

    const convsMap = new Map(convCounts.map(c => [c.ownerId, Number(c.n)]));
    const msgsMap = new Map(msgCounts.map(m => [m.ownerId, Number(m.n)]));
    const metasMap = new Map(metas.map(m => [m.userId, { displayPhoneNumber: m.displayPhoneNumber, enabled: m.enabled }]));

    const summary = clients.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      plan: c.plan,
      status: c.accountStatus,
      createdAt: c.createdAt,
      trialEndsAt: c.trialEndsAt,
      mrrInr: Number(c.mrrInr),
      chatsCount: convsMap.get(c.id) ?? 0,
      messagesCount: msgsMap.get(c.id) ?? 0,
      metaPhone: metasMap.get(c.id) ?? null,
    }));

    return { success: true, count: summary.length, workspaces: summary };
  } catch (err: any) {
    return { error: err.message || String(err) };
  }
}

// Inspect unclaimed WhatsApp webhooks (orphans) to recommend mapping to users
async function inspectDiagnosticOrphansTool() {
  try {
    const groups = await db
      .select({
        phoneNumberId: webhookOrphan.phoneNumberId,
        displayPhoneNumber: webhookOrphan.displayPhoneNumber,
        total: sql<number>`count(${webhookOrphan.id})`,
        lastAt: sql<string>`max(${webhookOrphan.createdAt})`,
      })
      .from(webhookOrphan)
      .where(isNull(webhookOrphan.claimedUserId))
      .groupBy(webhookOrphan.phoneNumberId, webhookOrphan.displayPhoneNumber)
      .orderBy(desc(sql`max(${webhookOrphan.createdAt})`));

    const recent = await db
      .select({
        id: webhookOrphan.id,
        phoneNumberId: webhookOrphan.phoneNumberId,
        displayPhoneNumber: webhookOrphan.displayPhoneNumber,
        fromPhone: webhookOrphan.fromPhone,
        fromName: webhookOrphan.fromName,
        messagePreview: webhookOrphan.messagePreview,
        createdAt: webhookOrphan.createdAt
      })
      .from(webhookOrphan)
      .where(isNull(webhookOrphan.claimedUserId))
      .orderBy(desc(webhookOrphan.createdAt))
      .limit(20);

    return { success: true, groups, recentSamples: recent };
  } catch (err: any) {
    return { error: err.message || String(err) };
  }
}

// Executes webhook orphan claim to a target user
async function executeClaimOrphanTool(actorUserId: string, phoneNumberId: string, targetUserId: string) {
  try {
    const [targetUser] = await db.select().from(user).where(eq(user.id, targetUserId)).limit(1);
    if (!targetUser) return { error: `Target user ID "${targetUserId}" not found` };

    const result = await db.update(webhookOrphan)
      .set({ claimedUserId: targetUserId, claimedAt: new Date() })
      .where(and(eq(webhookOrphan.phoneNumberId, phoneNumberId), isNull(webhookOrphan.claimedUserId)))
      .returning({ id: webhookOrphan.id });

    // Insert into audit log
    await db.insert(adminAuditLog).values({
      actorUserId,
      action: "claim_webhook_orphans",
      targetUserId,
      payload: JSON.stringify({
        phoneNumberId,
        claimedCount: result.length,
        userEmail: targetUser.email,
        claimedByAi: true
      })
    });

    return { success: true, claimedCount: result.length, phoneNumberId, targetUserEmail: targetUser.email };
  } catch (err: any) {
    return { error: err.message || String(err) };
  }
}

// Merges duplicate accounts for a given email address
async function executeMergeDuplicatesTool(actorUserId: string, email: string, canonicalUserId: string, confirmed?: boolean) {
  try {
    const normEmail = email.trim().toLowerCase();
    const matches = await db.select().from(user).where(eq(sql`lower(${user.email})`, normEmail));
    if (matches.length <= 1) {
      return { error: `Email "${email}" has ${matches.length} user rows — no duplicates to merge.` };
    }

    const canonical = matches.find(u => u.id === canonicalUserId);
    if (!canonical) {
      return { error: `Canonical user ID "${canonicalUserId}" is not among duplicate user rows for "${email}"` };
    }

    const duplicateUserIds = matches.filter(u => u.id !== canonicalUserId).map(u => u.id);

    if (!confirmed) {
      return {
        success: false,
        requiresConfirmation: true,
        message: `Merging duplicate users with email "${email}" onto canonical user ID "${canonicalUserId}" is a destructive action. This will permanently DELETE duplicate accounts: [${duplicateUserIds.join(", ")}]. Please reply with 'confirm' or 'yes' to proceed.`,
      };
    }

    const summary = await db.transaction(async (tx) => {
      const moved: Record<string, number> = {
        conversations: 0, contacts: 0, messages: 0, deals: 0, tasks: 0, campaigns: 0, broadcasts: 0, upgradeRequests: 0
      };
      let metaConfigMoves = 0;
      let profileMoves = 0;

      for (const dupId of duplicateUserIds) {
        moved.conversations += (await tx.update(conversation).set({ ownerId: canonicalUserId })
          .where(eq(conversation.ownerId, dupId)).returning({ id: conversation.id })).length;
        moved.contacts += (await tx.update(contact).set({ ownerId: canonicalUserId })
          .where(eq(contact.ownerId, dupId)).returning({ id: contact.id })).length;
        moved.messages += (await tx.update(message).set({ ownerId: canonicalUserId })
          .where(eq(message.ownerId, dupId)).returning({ id: message.id })).length;
        moved.deals += (await tx.update(deal).set({ ownerId: canonicalUserId })
          .where(eq(deal.ownerId, dupId)).returning({ id: deal.id })).length;
        moved.tasks += (await tx.update(task).set({ ownerId: canonicalUserId })
          .where(eq(task.ownerId, dupId)).returning({ id: task.id })).length;
        moved.campaigns += (await tx.update(campaign).set({ ownerId: canonicalUserId })
          .where(eq(campaign.ownerId, dupId)).returning({ id: campaign.id })).length;
        moved.broadcasts += (await tx.update(broadcast).set({ ownerId: canonicalUserId })
          .where(eq(broadcast.ownerId, dupId)).returning({ id: broadcast.id })).length;
        moved.upgradeRequests += (await tx.update(upgradeRequest).set({ userId: canonicalUserId })
          .where(eq(upgradeRequest.userId, dupId)).returning({ id: upgradeRequest.id })).length;

        // meta_config move or delete
        const [canonMeta] = await tx.select().from(metaConfig).where(eq(metaConfig.userId, canonicalUserId)).limit(1);
        if (!canonMeta) {
          metaConfigMoves += (await tx.update(metaConfig).set({ userId: canonicalUserId })
            .where(eq(metaConfig.userId, dupId)).returning({ id: metaConfig.id })).length;
        } else {
          await tx.delete(metaConfig).where(eq(metaConfig.userId, dupId));
        }

        // profile move or delete
        const [canonProfile] = await tx.select().from(profile).where(eq(profile.userId, canonicalUserId)).limit(1);
        if (!canonProfile) {
          profileMoves += (await tx.update(profile).set({ userId: canonicalUserId })
            .where(eq(profile.userId, dupId)).returning({ id: profile.id })).length;
        } else {
          await tx.delete(profile).where(eq(profile.userId, dupId));
        }

        // Delete duplicate user row
        await tx.delete(user).where(eq(user.id, dupId));
      }

      return { moved, metaConfigMoves, profileMoves, deletedUsers: duplicateUserIds.length };
    });

    // Audit log
    await db.insert(adminAuditLog).values({
      actorUserId,
      action: "merge_accounts",
      targetUserId: canonicalUserId,
      payload: JSON.stringify({
        canonicalUserId,
        canonicalEmail: canonical.email,
        duplicateUserIds,
        mergedByAi: true,
        summary
      })
    });

    return { success: true, emailNorm: normEmail, canonicalUserId, summary };
  } catch (err: any) {
    return { error: err.message || String(err) };
  }
}

// Suspends/unsuspends a workspace or adjusts plan / MRR
async function suspendOrUpdateWorkspaceTool(
  actorUserId: string,
  targetUserId: string,
  updates: { accountStatus?: "active" | "suspended" | "trial"; plan?: "starter" | "growth" | "enterprise"; mrrInr?: number; suspendedReason?: string },
  confirmed?: boolean
) {
  try {
    const [targetUser] = await db.select().from(user).where(eq(user.id, targetUserId)).limit(1);
    if (!targetUser) return { error: `Workspace user ID "${targetUserId}" not found` };

    if (updates.accountStatus === "suspended" && !confirmed) {
      return {
        success: false,
        requiresConfirmation: true,
        message: `Suspending the workspace "${targetUser.name}" (${targetUser.email}) is a disruptive action. Please reply with 'confirm' or 'yes' to proceed.`,
      };
    }

    const set: Record<string, any> = { updatedAt: new Date() };

    if (updates.accountStatus) {
      set.accountStatus = updates.accountStatus;
      if (updates.accountStatus === "suspended") {
        set.suspendedAt = new Date();
        set.suspendedReason = updates.suspendedReason || "Suspended by AI Admin Manager";
        set.suspendedBy = actorUserId;
      } else {
        set.suspendedAt = null;
        set.suspendedReason = null;
        set.suspendedBy = null;
      }
    }

    if (updates.plan) {
      set.plan = updates.plan;
    }

    if (updates.mrrInr !== undefined) {
      set.mrrInr = String(updates.mrrInr);
    }

    await db.update(user).set(set).where(eq(user.id, targetUserId));

    // Audit log
    const actionType = updates.accountStatus === "suspended" ? "suspend"
      : updates.accountStatus === "active" ? "unsuspend"
      : "change_plan";

    await db.insert(adminAuditLog).values({
      actorUserId,
      action: actionType,
      targetUserId,
      payload: JSON.stringify({
        updatedByAi: true,
        updates
      })
    });

    return { success: true, targetUserId, updates };
  } catch (err: any) {
    return { error: err.message || String(err) };
  }
}

/**
 * 2. OpenAI System Instructions & Tools
 */

const SYSTEM_PROMPT = `You are the Addison SaaS AI Platform Manager (Admin Copilot). Your target is to help the platform owners (Vikash / Avinash) manage users, workspaces, billing, and routing diagnostics smoothly.
You run directly inside the Super Admin Dashboard.

Capabilities:
- You can query workspace usage activities to detect active or churn-risk accounts.
- You can inspect webhook orphans (unrouted WhatsApp messages) and suggest who they belong to.
- You can merge duplicate accounts or assign orphaned numbers automatically using your tools.
- You can edit plans, MRR, or suspend workspaces when commanded by the super admin.

Guidelines:
- Explain findings professionally and concisely.
- For claims/merges, identify candidate users logically. For example: if orphan messages contain 'Avinash' or purchase details matching user registration emails, point that out and suggest a claim target.
- Confirm any destructive updates (like merges or workspace suspension) clearly.`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_workspaces_activity",
      description: "List workspaces, their plans, status, message/chat activity in the last 7 days, and meta configuration details to analyze platform activity and churn risk.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "inspect_diagnostic_orphans",
      description: "Retrieve unrouted WhatsApp webhook groups (unclaimed numbers) and flat sample message previews to diagnose routing errors.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_claim_orphan",
      description: "Route all unclaimed webhook events for a specific phone number ID to a target user's account.",
      parameters: {
        type: "object",
        properties: {
          phoneNumberId: { type: "string", description: "The WhatsApp phone number ID to claim." },
          targetUserId: { type: "string", description: "The database user ID who should receive these chats." }
        },
        required: ["phoneNumberId", "targetUserId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_merge_duplicates",
      description: "Consolidate duplicate account rows sharing the same email onto a single canonical target user ID.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "The duplicate email address." },
          canonicalUserId: { type: "string", description: "The target user ID to keep (canonical)." },
          confirmed: { type: "boolean", description: "Set to true ONLY if the super admin has explicitly typed/given permission to perform this specific destructive operation. Otherwise, you must ask them first." }
        },
        required: ["email", "canonicalUserId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suspend_or_update_workspace",
      description: "Update plan, suspend/unsuspend, or adjust MRR of a client workspace.",
      parameters: {
        type: "object",
        properties: {
          targetUserId: { type: "string", description: "The ID of the user workspace to modify." },
          accountStatus: { type: "string", enum: ["active", "suspended", "trial"], description: "Toggle account status." },
          plan: { type: "string", enum: ["starter", "growth", "enterprise"], description: "Change subscription tier." },
          mrrInr: { type: "number", description: "Monthly Recurring Revenue value in INR." },
          suspendedReason: { type: "string", description: "Why the workspace is being suspended (if applicable)." },
          confirmed: { type: "boolean", description: "Set to true ONLY if the super admin has explicitly typed/given permission to perform this specific destructive operation. Otherwise, you must ask them first." }
        },
        required: ["targetUserId"]
      }
    }
  }
];

export async function processAdminAgentMessage(
  actorUserId: string,
  userMessageText: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const openai = getOpenAIClient();

  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT }
  ];

  if (history && history.length > 0) {
    const cutHistory = history.slice(-10); // Keep last 10 messages
    for (const msg of cutHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        openaiMessages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  // Ensure the latest message is added to messages
  if (openaiMessages.length === 1 || openaiMessages[openaiMessages.length - 1].content !== userMessageText) {
    openaiMessages.push({ role: "user", content: userMessageText });
  }

  let runnerCount = 0;
  const maxIterations = 5;

  while (runnerCount < maxIterations) {
    runnerCount++;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0.5
    });

    const choice = response.choices[0];
    const assistantMsg = choice.message;

    openaiMessages.push(assistantMsg);

    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      for (const call of assistantMsg.tool_calls) {
        const { name, arguments: argsText } = call.function;
        let args: any = {};
        try {
          args = JSON.parse(argsText);
        } catch {}

        let toolResult: any;

        if (name === "list_workspaces_activity") {
          toolResult = await listWorkspacesActivityTool();
        } else if (name === "inspect_diagnostic_orphans") {
          toolResult = await inspectDiagnosticOrphansTool();
        } else if (name === "execute_claim_orphan") {
          toolResult = await executeClaimOrphanTool(actorUserId, args.phoneNumberId, args.targetUserId);
        } else if (name === "execute_merge_duplicates") {
          toolResult = await executeMergeDuplicatesTool(actorUserId, args.email, args.canonicalUserId, args.confirmed);
        } else if (name === "suspend_or_update_workspace") {
          toolResult = await suspendOrUpdateWorkspaceTool(actorUserId, args.targetUserId, {
            accountStatus: args.accountStatus,
            plan: args.plan,
            mrrInr: args.mrrInr,
            suspendedReason: args.suspendedReason
          }, args.confirmed);
        } else {
          toolResult = { error: "Unknown tool" };
        }

        openaiMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(toolResult)
        });
      }
    } else {
      return assistantMsg.content || "I have analyzed your request but found no recommendations. Let me know what to check next.";
    }
  }

  return "The operations completion flow timed out. Please specify your admin request again.";
}
