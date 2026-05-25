import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { contact, conversation, message, deal, task, campaign, broadcast, orderTbl, booking, profile } from '../db/schema';
import { requireAuth, type AuthVariables } from '../middleware/auth';
import { logActivity } from '../lib/activity-log';

const app = new Hono<{ Variables: AuthVariables }>();
app.use('*', requireAuth);

// GET /export/my-data — DPDP compliance data portability endpoint
app.get('/export/my-data', async (c) => {
  const userId = c.var.userId;

  const [userProfile] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  const contacts = await db.select().from(contact).where(eq(contact.ownerId, userId));
  const conversations = await db.select().from(conversation).where(eq(conversation.ownerId, userId));
  const messages = await db.select().from(message).where(eq(message.ownerId, userId));
  const deals = await db.select().from(deal).where(eq(deal.ownerId, userId));
  const tasks = await db.select().from(task).where(eq(task.ownerId, userId));
  const campaigns = await db.select().from(campaign).where(eq(campaign.ownerId, userId));
  const broadcasts = await db.select().from(broadcast).where(eq(broadcast.ownerId, userId));
  const orders = await db.select().from(orderTbl).where(eq(orderTbl.ownerId, userId));
  const bookings = await db.select().from(booking).where(eq(booking.ownerId, userId));

  logActivity(userId, 'data_export', {
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
  });

  return c.json({
    exported_at: new Date().toISOString(),
    user_id: userId,
    email: c.var.userEmail,
    profile: userProfile ?? null,
    contacts,
    conversations,
    messages,
    deals,
    tasks,
    campaigns,
    broadcasts,
    orders,
    bookings,
  });
});

export default app;
