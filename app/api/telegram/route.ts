import { NextRequest, NextResponse } from "next/server";
import { handleMessage, handleNewChatMembers } from "@/lib/telegram/handlers";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot?: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    new_chat_members?: Array<{
      id: number;
      is_bot?: boolean;
      first_name?: string;
      username?: string;
    }>;
    new_chat_member?: {
      id: number;
      is_bot?: boolean;
      first_name?: string;
      username?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Bot token not configured" },
      { status: 500 }
    );
  }

  const secretToken = process.env.TELEGRAM_SECRET_TOKEN;
  if (secretToken) {
    const headerToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (headerToken !== secretToken) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const msg = update.message;
  if (!msg || msg.from?.is_bot) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (msg.new_chat_members && msg.new_chat_members.length > 0) {
      const realMembers = msg.new_chat_members.filter((m) => !m.is_bot);
      if (realMembers.length > 0) {
        await handleNewChatMembers(msg.chat.id, realMembers);
      }
      return NextResponse.json({ ok: true });
    }

    if (msg.new_chat_member && !msg.new_chat_member.is_bot) {
      await handleNewChatMembers(msg.chat.id, [msg.new_chat_member]);
      return NextResponse.json({ ok: true });
    }

    if (msg.text) {
      await handleMessage(
        msg.chat.id,
        msg.from.id,
        msg.text,
        msg.from.username,
        msg.from.first_name,
        msg.message_id
      );
    }
  } catch (error) {
    console.error("Telegram handler error:", error);
  }

  return NextResponse.json({ ok: true });
}
