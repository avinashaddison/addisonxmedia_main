// Seeds a realistic CRM dataset for the signed-in user.
// Idempotent-ish: skips if the user already has > 5 contacts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRST = ["Priya", "Rohan", "Anika", "Vikram", "Aditi", "Karan", "Meera", "Arjun", "Sneha", "Rahul", "Isha", "Nikhil"];
const LAST = ["Mehta", "Kapoor", "Sharma", "Tandon", "Reddy", "Iyer", "Singh", "Patel", "Agarwal", "Verma"];
const SOURCES = ["Instagram Ad", "Facebook Lead", "Google Ad", "Referral", "Website", "Cold Outreach"];
const TAGS = ["hot", "hot", "warm", "warm", "warm", "cold"] as const;

const HOT_OPENERS = [
  "Hey! Saw your ad. What's the price for 100 students?",
  "Interested in your Growth plan. Can we hop on a call?",
  "Loved the demo. How fast can we onboard?",
  "Can you send pricing for our team of 12?",
  "We're ready to buy. What's the next step?",
];
const WARM_OPENERS = [
  "Just browsing — what makes you different?",
  "How does the AI work exactly?",
  "Do you support multiple WhatsApp numbers?",
  "Can I see a case study?",
];
const REPLIES = [
  "Hi! Absolutely — sharing a quick overview now ✨",
  "Great question! Our AI scores every lead in real time.",
  "Yes — and you can send pay links straight from the chat.",
  "Sending you a 90-second video walkthrough 🎥",
  "Perfect — let me grab a slot on Tuesday.",
];

const rand = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const phone = () => `+9198${Math.floor(10000000 + Math.random() * 89999999)}`;
const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const daysAhead = (d: number) => new Date(Date.now() + d * 86400 * 1000).toISOString();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ownerId = userData.user.id;

    // Skip if already seeded
    const { count: existingContacts } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId);

    if ((existingContacts ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, message: "Demo data already loaded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ----- Contacts -----
    const contactsPayload = Array.from({ length: 12 }).map((_, i) => {
      const tag = TAGS[i % TAGS.length];
      const score = tag === "hot" ? 75 + Math.floor(Math.random() * 25) : tag === "warm" ? 45 + Math.floor(Math.random() * 25) : 15 + Math.floor(Math.random() * 25);
      return {
        owner_id: ownerId,
        name: `${rand(FIRST)} ${rand(LAST)}`,
        phone: phone(),
        email: `lead${i + 1}@example.com`,
        tag,
        score,
        source: rand(SOURCES),
        notes: tag === "hot" ? "High intent — follow up today" : null,
      };
    });

    const { data: contacts, error: cErr } = await supabase.from("contacts").insert(contactsPayload).select();
    if (cErr) throw cErr;

    // ----- Conversations + Messages -----
    const conversationsPayload = contacts!.slice(0, 8).map((c, i) => ({
      owner_id: ownerId,
      contact_id: c.id,
      status: "open" as const,
      unread_count: i < 4 ? Math.floor(Math.random() * 3) + 1 : 0,
      last_message_at: minutesAgo(i * 12 + 2),
      last_message_preview: c.tag === "hot" ? rand(HOT_OPENERS) : rand(WARM_OPENERS),
    }));

    const { data: convs, error: convErr } = await supabase.from("conversations").insert(conversationsPayload).select();
    if (convErr) throw convErr;

    const messagesPayload: any[] = [];
    convs!.forEach((conv, idx) => {
      const contact = contacts!.find((c) => c.id === conv.contact_id)!;
      const opener = contact.tag === "hot" ? rand(HOT_OPENERS) : rand(WARM_OPENERS);
      const baseAge = idx * 30 + 10;

      messagesPayload.push({
        owner_id: ownerId,
        conversation_id: conv.id,
        body: opener,
        direction: "inbound" as const,
        status: "delivered" as const,
        created_at: minutesAgo(baseAge + 8),
      });
      messagesPayload.push({
        owner_id: ownerId,
        conversation_id: conv.id,
        body: rand(REPLIES),
        direction: "outbound" as const,
        status: "read" as const,
        created_at: minutesAgo(baseAge + 5),
      });
      if (idx < 5) {
        messagesPayload.push({
          owner_id: ownerId,
          conversation_id: conv.id,
          body: contact.tag === "hot" ? "Sounds good — when can we start?" : "Got it, will let you know!",
          direction: "inbound" as const,
          status: "delivered" as const,
          created_at: minutesAgo(baseAge + 2),
        });
      }
    });

    if (messagesPayload.length > 0) {
      const { error: mErr } = await supabase.from("messages").insert(messagesPayload);
      if (mErr) throw mErr;
    }

    // ----- Deals -----
    const wonContacts = contacts!.filter((c) => c.tag === "hot").slice(0, 3);
    const dealsPayload = [
      ...wonContacts.map((c) => ({
        owner_id: ownerId,
        contact_id: c.id,
        title: `Growth Plan — ${c.name}`,
        stage: "won" as const,
        value: 24990 + Math.floor(Math.random() * 50000),
        probability: 100,
        closed_at: hoursAgo(Math.floor(Math.random() * 240)),
      })),
      ...contacts!.filter((c) => c.tag === "warm").slice(0, 2).map((c) => ({
        owner_id: ownerId,
        contact_id: c.id,
        title: `Proposal — ${c.name}`,
        stage: "proposal" as const,
        value: 18000 + Math.floor(Math.random() * 30000),
        probability: 60,
      })),
    ];
    if (dealsPayload.length > 0) {
      const { error: dErr } = await supabase.from("deals").insert(dealsPayload);
      if (dErr) throw dErr;
    }

    // ----- Tasks -----
    const tasksPayload = [
      { title: "Send pricing PDF to Priya", priority: "urgent", due_in: 0.5, contact_id: contacts![0].id },
      { title: "Schedule demo with Rohan", priority: "high", due_in: 1, contact_id: contacts![1].id },
      { title: "Follow up on proposal", priority: "high", due_in: 2, contact_id: contacts![2].id },
      { title: "Send case study link", priority: "medium", due_in: 3, contact_id: contacts![3].id },
      { title: "Quarterly check-in call", priority: "low", due_in: 7, contact_id: contacts![4].id },
    ].map((t) => ({
      owner_id: ownerId,
      contact_id: t.contact_id,
      title: t.title,
      priority: t.priority as any,
      status: "pending" as const,
      due_at: daysAhead(t.due_in),
    }));
    const { error: tErr } = await supabase.from("tasks").insert(tasksPayload);
    if (tErr) throw tErr;

    // ----- Campaigns -----
    const campaignsPayload = [
      {
        owner_id: ownerId,
        name: "Diwali Mega Sale 2024",
        description: "Festive 30% off promotion to all warm leads",
        channel: "whatsapp" as const,
        status: "active" as const,
        audience_size: 1240,
        sent_count: 1240,
        opened_count: 982,
        replied_count: 287,
        conversion_count: 64,
        budget: 25000,
      },
      {
        owner_id: ownerId,
        name: "New Course Launch",
        description: "Announce the new Advanced track to past customers",
        channel: "multi" as const,
        status: "scheduled" as const,
        audience_size: 540,
        budget: 10000,
        scheduled_at: daysAhead(2),
      },
    ];
    const { error: campErr } = await supabase.from("campaigns").insert(campaignsPayload);
    if (campErr) throw campErr;

    // ----- Broadcasts -----
    const broadcastsPayload = [
      {
        owner_id: ownerId,
        title: "Weekly check-in",
        body: "Hi {{name}}! Just checking in — any questions about your plan? We're here to help 🙌",
        status: "sent" as const,
        audience_tag: "warm" as const,
        recipient_count: 320,
        delivered_count: 312,
        read_count: 248,
        failed_count: 8,
        sent_at: hoursAgo(18),
      },
      {
        owner_id: ownerId,
        title: "Friday Flash Offer",
        body: "🔥 Last chance! 20% off ends tonight at 11:59 PM. Tap to claim → ",
        status: "scheduled" as const,
        audience_tag: "hot" as const,
        recipient_count: 84,
        scheduled_at: daysAhead(1),
      },
    ];
    const { error: bErr } = await supabase.from("broadcasts").insert(broadcastsPayload);
    if (bErr) throw bErr;

    return new Response(
      JSON.stringify({
        ok: true,
        seeded: {
          contacts: contacts!.length,
          conversations: convs!.length,
          messages: messagesPayload.length,
          deals: dealsPayload.length,
          tasks: tasksPayload.length,
          campaigns: campaignsPayload.length,
          broadcasts: broadcastsPayload.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("seed-demo-data error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
