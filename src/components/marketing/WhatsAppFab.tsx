import { waHref } from "@/lib/whatsapp";

/** Botón flotante circular de WhatsApp (solo icono), lateral inferior derecho. */
export function WhatsAppFab({ phone, message }: { phone?: string | null; message: string }) {
  return (
    <a
      href={waHref(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      title="Escríbenos por WhatsApp"
      className="fixed right-4 z-[70] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-2xl shadow-emerald-900/40 ring-1 ring-black/10 transition-transform hover:scale-110 active:scale-95"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#fff" aria-hidden="true">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.23-.45-2.35-1.45-.87-.78-1.46-1.74-1.63-2.04-.17-.3-.02-.47.13-.62.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.34 5.07 4.55 2.98 1.21 2.98.81 3.52.76.54-.05 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
        <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.45 3.37 1.25 4.79L2 22l5.5-1.42a9.8 9.8 0 0 0 4.54 1.13h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.48 2 12.04 2Zm0 17.94h-.01a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.06.79.82-2.98-.19-.31a8.08 8.08 0 0 1-1.24-4.29c0-4.5 3.66-8.15 8.16-8.15 2.18 0 4.22.85 5.76 2.39a8.1 8.1 0 0 1 2.39 5.77c0 4.5-3.66 8.15-8.2 8.15Z" />
      </svg>
    </a>
  );
}
