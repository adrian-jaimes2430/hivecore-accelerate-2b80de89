import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ImpulsorLevel } from "@/lib/levels";

export interface MarelThread {
  id: string;
  title: string;
  last_message_at: string;
}
export interface MarelMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export const listMarelThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("marel_threads")
      .select("id, title, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return { threads: (data ?? []) as MarelThread[] };
  });

export const getMarelThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: messages, error } = await context.supabase
      .from("marel_messages")
      .select("id, role, content, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { messages: (messages ?? []) as MarelMessage[] };
  });

export const deleteMarelThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("marel_threads").delete().eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sends a message to Marel; creates the thread when none is given. */
export const sendMarelMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { threadId?: string | null; message: string }) => {
    const message = (data.message ?? "").trim();
    if (!message) throw new Error("Escribe un mensaje para Marel.");
    if (message.length > 4000) throw new Error("El mensaje es demasiado largo.");
    return { threadId: data.threadId ?? null, message };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { buildCatalogContext, buildSystemPrompt, askMarel, titleFrom } = await import(
      "@/lib/marel.server"
    );

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("full_name, level").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const isStaff = (roles ?? []).some(
      (r: { role: string }) => r.role === "super_admin" || r.role === "collaborator",
    );
    const level = ((profile?.level as ImpulsorLevel) ?? "junior") as ImpulsorLevel;

    let threadId = data.threadId;
    if (!threadId) {
      const { data: created, error } = await supabase
        .from("marel_threads")
        .insert({ user_id: userId, title: titleFrom(data.message) })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      threadId = created.id as string;
    }

    const { data: history } = await supabase
      .from("marel_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(24);

    const { error: userMsgError } = await supabase
      .from("marel_messages")
      .insert({ thread_id: threadId, user_id: userId, role: "user", content: data.message });
    if (userMsgError) throw new Error(userMsgError.message);

    const ctx = await buildCatalogContext(supabase, level, isStaff);
    const system = buildSystemPrompt({
      name: profile?.full_name ?? null,
      level,
      isStaff,
      ...ctx,
    });

    const turns = [
      ...((history ?? []) as { role: "user" | "assistant"; content: string }[]),
      { role: "user" as const, content: data.message },
    ];

    const reply = await askMarel(system, turns);

    const { data: saved, error: replyError } = await supabase
      .from("marel_messages")
      .insert({ thread_id: threadId, user_id: userId, role: "assistant", content: reply })
      .select("id, role, content, created_at")
      .single();
    if (replyError) throw new Error(replyError.message);

    await supabase
      .from("marel_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);

    return { threadId, reply: saved as MarelMessage };
  });
