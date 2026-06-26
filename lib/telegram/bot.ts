const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

interface SendMessageOptions {
  parse_mode?: "HTML" | "Markdown";
  reply_to_message_id?: number;
  disable_web_page_preview?: boolean;
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: SendMessageOptions
) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode ?? "HTML",
      reply_to_message_id: options?.reply_to_message_id,
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Telegram sendMessage failed:", body);
  }

  return res.json();
}

export async function setWebhook(url: string) {
  const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  return res.json();
}

export async function getWebhookInfo() {
  const res = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
  return res.json();
}

export function isGroupChat(chat: { type: string }): boolean {
  return chat.type === "group" || chat.type === "supergroup";
}

export function extractCommand(text: string): {
  command: string;
  args: string;
} | null {
  const match = text.match(/^#([a-zA-Z0-9]+)(?:[_\s](.*))?$/);
  if (!match) return null;
  return { command: match[1].toLowerCase(), args: (match[2] ?? "").trim() };
}
