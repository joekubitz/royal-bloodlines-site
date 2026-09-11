"use server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

const labels = { open: "Open", in_progress: "In Progress", resolved: "Resolved" };

async function context(ticketId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(ticketId)) throw new Error("Invalid ticket.");
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) throw new Error("You are no longer signed in.");
  const { data: allowed, error } = await session.from("crownlink_support_admins")
    .select("user_id").eq("user_id", user.id).maybeSingle();
  if (error || !allowed) throw new Error("You do not have permission to manage support tickets.");
  const db = createAdminClient();
  const { data: ticket, error: ticketError } = await db.from("crownlink_support_tickets")
    .select("id,user_id,status,updated_at").eq("id", ticketId).single();
  if (ticketError || !ticket) throw new Error("Ticket could not be loaded.");
  return { db, user, ticket };
}

async function notify(db: ReturnType<typeof createAdminClient>, userId: string, ticketId: string, title: string, message: string) {
  const warnings: string[] = [];
  const href = `/crownlink/support#ticket-${ticketId}`;
  try {
    const { error } = await db.from("crownlink_notifications").insert({
      user_id: userId, type: "support_reply", title, message, href, is_read: false,
    });
    if (error) throw error;
  } catch {
    warnings.push("The website notification could not be created.");
  }
  try {
    const { data: profile, error } = await db.from("crownlink_profiles")
      .select("discord_user_id").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!profile?.discord_user_id) {
      warnings.push("Discord alert skipped: the creator has not connected Discord.");
    } else {
      const token = process.env.DISCORD_BOT_TOKEN;
      if (!token) throw new Error("Missing bot configuration");
      const post = async (path: string, body: object) => {
        const response = await fetch(`https://discord.com/api/v10/${path}`, {
          method: "POST", headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`Discord returned ${response.status}`);
        return response.json();
      };
      const channel = await post("users/@me/channels", { recipient_id: profile.discord_user_id });
      if (!channel.id) throw new Error("Missing DM channel");
      await post(`channels/${channel.id}/messages`, {
        content: `**Crown Link Support**\n${title}\n${message}\n\nView your ticket: https://royalsbloodline.com${href}`,
        allowed_mentions: { parse: [] },
      });
    }
  } catch {
    warnings.push("Discord delivery could not be confirmed. Check the bot configuration and the creator's DM settings.");
  }
  return warnings.join(" ");
}

export async function replyToTicket(ticketId: string, reply: string) {
  if (typeof reply !== "string" || !reply.trim() || reply.trim().length > 4000) {
    throw new Error("Enter a reply between 1 and 4000 characters.");
  }
  const { db, user, ticket } = await context(ticketId);
  const text = reply.trim();
  const { error } = await db.from("crownlink_support_messages").insert({
    ticket_id: ticketId, sender_user_id: user.id, sender_type: "support", message: text,
    read_by_support: true, read_by_creator: false,
  });
  if (error) throw new Error("Your reply could not be saved.");
  const warning = await notify(db, ticket.user_id, ticketId, "Support replied to your ticket", text.length > 120 ? `${text.slice(0, 120)}...` : text);
  return { warning };
}

export async function updateTicket(ticketId: string, status: keyof typeof labels, priority: string, adminNotes: string) {
  if (!["open", "in_progress", "resolved"].includes(status) ||
      !["low", "normal", "high", "urgent"].includes(priority) ||
      typeof adminNotes !== "string" || adminNotes.length > 4000) throw new Error("Invalid ticket changes.");
  const { db, ticket } = await context(ticketId);
  const now = new Date().toISOString();
  const changes: Record<string, string | null> = {
    status, priority, admin_notes: adminNotes.trim() || null, updated_at: now,
  };
  if (status !== ticket.status) changes.resolved_at = status === "resolved" ? now : null;
  let query = db.from("crownlink_support_tickets").update(changes).eq("id", ticketId);
  query = ticket.updated_at ? query.eq("updated_at", ticket.updated_at) : query.is("updated_at", null);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new Error("The ticket could not be updated.");
  if (!data) throw new Error("This ticket changed while you were saving. Refresh and try again.");
  const warning = status !== ticket.status
    ? await notify(db, ticket.user_id, ticketId, "Your support ticket status changed", `Your ticket is now ${labels[status]}.`)
    : "";
  return { warning };
}
