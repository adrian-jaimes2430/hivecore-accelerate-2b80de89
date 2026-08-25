import { createServerFn } from "@tanstack/react-start";

/** Chat público de Marel para clientes del catálogo (sin sesión). */
export const askMarelGuest = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: { role: "user" | "assistant"; content: string }[]; ref?: string | null }) => {
    const messages = (d.messages ?? []).slice(-12).filter((m) => typeof m.content === "string" && m.content.trim());
    if (messages.length === 0) throw new Error("Escribe tu pregunta.");
    return { messages, ref: d.ref ?? null };
  })
  .handler(async ({ data }) => {
    const {
      buildPublicCatalog,
      resolveHandoff,
      publicSystemPrompt,
      askMarelPublic,
      buildWhatsAppLink,
    } = await import("@/lib/marel-public.server");

    const [{ funnelList, luxuryList }, advisor] = await Promise.all([
      buildPublicCatalog(),
      resolveHandoff(data.ref),
    ]);

    const raw = await askMarelPublic(
      publicSystemPrompt({ funnelList, luxuryList, advisorName: advisor.name }),
      data.messages,
    );

    const handoff = raw.includes("[HANDOFF]");
    const reply = raw.replace(/\[HANDOFF\]/g, "").trim();
    const lastUser = [...data.messages].reverse().find((m) => m.role === "user")?.content ?? "un producto del catálogo";

    return {
      reply,
      handoff: handoff
        ? { name: advisor.name, url: buildWhatsAppLink(advisor.phone, lastUser) }
        : null,
    };
  });
