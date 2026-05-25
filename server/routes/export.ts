import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { contact, conversation, message, deal, task, campaign, broadcast, orderTbl, booking, profile } from '../db/schema';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { logActivity } from '../lib/activity-log';

const ROW_LIMIT = 10000;

const app = new Hono<{ Variables: AuthVariables }>();
app.use('*', requireAuth);

// GET /export/my-data — DPDP compliance data portability endpoint
app.get('/export/my-data', async (c) => {
  const userId = c.var.userId;

  const [userProfile] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  const contacts = await db.select().from(contact).where(eq(contact.ownerId, userId)).limit(ROW_LIMIT);
  const conversations = await db.select().from(conversation).where(eq(conversation.ownerId, userId)).limit(ROW_LIMIT);
  const messages = await db.select().from(message).where(eq(message.ownerId, userId)).limit(ROW_LIMIT);
  const deals = await db.select().from(deal).where(eq(deal.ownerId, userId)).limit(ROW_LIMIT);
  const tasks = await db.select().from(task).where(eq(task.ownerId, userId)).limit(ROW_LIMIT);
  const campaigns = await db.select().from(campaign).where(eq(campaign.ownerId, userId)).limit(ROW_LIMIT);
  const broadcasts = await db.select().from(broadcast).where(eq(broadcast.ownerId, userId)).limit(ROW_LIMIT);
  const orders = await db.select().from(orderTbl).where(eq(orderTbl.ownerId, userId)).limit(ROW_LIMIT);
  const bookings = await db.select().from(booking).where(eq(booking.ownerId, userId)).limit(ROW_LIMIT);

  logActivity(userId, 'data_export', {
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
  });

  const tables = {
    contacts: { data: contacts, truncated: contacts.length >= ROW_LIMIT },
    conversations: { data: conversations, truncated: conversations.length >= ROW_LIMIT },
    messages: { data: messages, truncated: messages.length >= ROW_LIMIT },
    deals: { data: deals, truncated: deals.length >= ROW_LIMIT },
    tasks: { data: tasks, truncated: tasks.length >= ROW_LIMIT },
    campaigns: { data: campaigns, truncated: campaigns.length >= ROW_LIMIT },
    broadcasts: { data: broadcasts, truncated: broadcasts.length >= ROW_LIMIT },
    orders: { data: orders, truncated: orders.length >= ROW_LIMIT },
    bookings: { data: bookings, truncated: bookings.length >= ROW_LIMIT },
  };

  return c.json({
    exported_at: new Date().toISOString(),
    user_id: userId,
    email: c.var.userEmail,
    row_limit: ROW_LIMIT,
    note: "Contact support for full export if any table has more rows",
    profile: userProfile ?? null,
    ...tables,
  });
});

export default app;
