import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { broadcast, contact, conversation, message, metaConfig } from '../db/schema';
import { sendTemplateMessage } from '../integrations/meta';
import { decrypt } from '../crypto';
import logger from '../lib/logger';

export async function handleBroadcastSend(payload: { broadcastId: string; userId: string }) {
  const { broadcastId, userId } = payload;

  const [bc] = await db.select().from(broadcast)
    .where(and(eq(broadcast.id, broadcastId), eq(broadcast.ownerId, userId))).limit(1);
  if (!bc) {
    logger.error({ broadcastId, userId }, 'Broadcast not found for job');
    return;
  }
  if (!bc.templateName) {
    logger.error({ broadcastId }, 'Broadcast missing template_name');
    return;
  }

  const [meta] = await db.select().from(metaConfig)
    .where(eq(metaConfig.userId, userId)).limit(1);
  if (!meta || !meta.enabled) {
    await db.update(broadcast).set({ status: 'failed', updatedAt: new Date() }).where(eq(broadcast.id, broadcastId));
    logger.error({ broadcastId, userId }, 'WhatsApp not connected for broadcast job');
    return;
  }

  // Pick audience
  const audienceWhere = bc.audienceTag
    ? and(eq(contact.ownerId, userId), eq(contact.tag, bc.audienceTag))
    : eq(contact.ownerId, userId);
  const recipients = await db.select({
    id: contact.id, phone: contact.phone, name: contact.name,
  }).from(contact).where(audienceWhere);

  if (recipients.length === 0) {
    await db.update(broadcast).set({ status: 'failed', updatedAt: new Date() }).where(eq(broadcast.id, broadcastId));
    return;
  }

  const recipientIds = recipients.map((r) => r.id);

  // Find or create a conversation per recipient
  const existingConvs = await db.select().from(conversation)
    .where(and(eq(conversation.ownerId, userId), inArray(conversation.contactId, recipientIds)));
  const convByContact = new Map(existingConvs.map((cv) => [cv.contactId, cv]));

  const missingContactIds = recipientIds.filter((cid) => !convByContact.has(cid));
  if (missingContactIds.length > 0) {
    const newConvs = await db.insert(conversation).values(
      missingContactIds.map((cid) => ({
        contactId: cid,
        ownerId: userId,
        status: "open" as const,
        unreadCount: 0,
      }))
    ).returning();
    for (const cv of newConvs) convByContact.set(cv.contactId, cv);
  }

  let delivered = 0;
  let failed = 0;

  for (const r of recipients) {
    try {
      const sent = await sendTemplateMessage(
        {
          accessToken: decrypt(meta.accessToken),
          phoneNumberId: meta.phoneNumberId,
          businessAccountId: meta.businessAccountId,
        },
        r.phone.replace(/^\+/, ""),
        bc.templateName,
        bc.templateLanguage ?? "en",
        [r.name]
      );
      const metaMsgId = sent.messages?.[0]?.id ?? null;
      const conv = convByContact.get(r.id)!;
      await db.insert(message).values({
        conversationId: conv.id,
        ownerId: userId,
        senderId: userId,
        direction: "outbound",
        body: bc.body,
        status: "sent",
        externalMessageId: metaMsgId,
      });
      await db.update(conversation).set({
        lastMessageAt: new Date(),
        lastMessagePreview: bc.body.slice(0, 200),
        updatedAt: new Date(),
      }).where(eq(conversation.id, conv.id));
      delivered++;
    } catch (err) {
      logger.error({ broadcastId, phone: r.phone, err }, 'Broadcast send to recipient failed');
      failed++;
    }
  }

  // Final status
  const finalStatus = failed === recipients.length ? "failed" : "sent";
  await db.update(broadcast).set({
    status: finalStatus,
    sentAt: new Date(),
    deliveredCount: delivered,
    failedCount: failed,
    updatedAt: new Date(),
  }).where(eq(broadcast.id, broadcastId));

  logger.info({ broadcastId, delivered, failed, total: recipients.length }, 'Broadcast send completed');
}
