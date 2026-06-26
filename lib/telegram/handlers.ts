import { sendMessage, extractCommand } from "./bot";
import { connectDb } from "@/lib/db/mongodb";
import { TelegramUser } from "@/lib/db/models/telegram-user";
import { TelegramOrder } from "@/lib/db/models/telegram-order";
import { WithdrawalRequest } from "@/lib/db/models/withdrawal-request";
import { normalizeShopeeUrl } from "@/lib/shopee/normalize";
import { createAffiliateLink } from "@/lib/accesstrade/create-affiliate-link";

const GROUP_ID = process.env.TELEGRAM_GROUP_ID;
const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_ID;
const OWNER_NAME = process.env.TELEGRAM_OWNER_NAME || "Vy Tô";

function isTargetGroup(chatId: number | string): boolean {
  return GROUP_ID ? String(chatId) === String(GROUP_ID) : true;
}

function isOwner(chatId: number | string): boolean {
  return OWNER_CHAT_ID ? String(chatId) === String(OWNER_CHAT_ID) : false;
}

function formatCurrency(vnd: number): string {
  if (vnd >= 1000) return `${(vnd / 1000).toLocaleString("vi-VN")}k`;
  return `${vnd}đ`;
}

const WELCOME_TEXT = `🌷 Chào mừng bạn đến với nhóm! 

Mình sẽ hướng dẫn mọi người cách mua sắm trên Shopee để được <b>hoàn 80% tiền hoa hồng</b> nhé 👇

<b>🔸Bước 1:</b> Gửi link sản phẩm bạn muốn mua vào nhóm.

<b>🔸Bước 2:</b> Mình sẽ tag bạn và gửi lại link của sản phẩm đó

<b>🔸Bước 3:</b>
✅ Xóa sản phẩm đó khỏi giỏ hàng (nếu có)
✅ Bấm link mình gửi có tag bạn rồi thêm giỏ hoặc mua ngay
❌ Không xem live hoặc video khi mua vì sẽ ko được hoa hồng
❌ Không bấm vào link của người khác hay áp mã giảm giá của người khác sau khi đã bấm link mình gửi

<b>🔸Bước 4:</b> Shopee đối soát đơn sau <b>2-4 tháng</b>. Khi AccessTrade duyệt, tiền tạm giữ ở mục "🔄 chờ thanh toán".

<b>🔸Bước 5:</b> AccessTrade thanh toán cho chủ nhóm vào <b>ngày 18 và 25</b> hàng tháng. Sau đó bot mới chuyển vào "💵 số dư khả dụng" để bạn rút.

<b>🔸Bước 6:</b> Dùng #ruttien để rút. Chủ nhóm chuyển khoản trong 3 ngày làm việc.

<b>💵 Cách tính:</b> HH gốc → trừ 10% thuế Shopee → bạn nhận 80%. VD: 100k → (100k - 10%) × 80% = <b>72.000đ</b>

<b>🟢 Các câu lệnh:</b>

#donhang 👉 kiểm tra những đơn hàng bạn đã mua

#vitien 👉 kiểm tra ví tiền của bạn

#thongtin 👉 xem thông tin ngân hàng đã lưu

#thongtin_tenNH_stk (VD: #thongtin_mbbank_066099)
👉 lưu stk để rút tiền

#thongtin_tenNH_stk_hoten (VD: #thongtin_vcb_0123456789_NguyenVanA)
👉 lưu stk + họ tên (để chủ nhóm chuyển khoản)

#hoten_Nguyen Van A 👉 lưu họ tên nếu trước đó mới chỉ lưu stk

#ruttien_sotien (VD: #ruttien_50000)
👉 rút số tiền bạn đang có

💡 Nếu có thắc mắc vui lòng nhắn cho trưởng nhóm ${OWNER_NAME} để được hỗ trợ. Thank you!`;

export async function handleMessage(
  chatId: number,
  userId: number,
  text: string,
  username?: string,
  fullName?: string,
  replyToMessageId?: number
) {
  if (!isTargetGroup(chatId)) return;

  const reply = (msg: string) =>
    sendMessage(chatId, msg, { reply_to_message_id: replyToMessageId });

  const cmd = extractCommand(text);

  if (!cmd) {
    await handleShopeeLink(chatId, text, userId, username, replyToMessageId);
    return;
  }

  await connectDb();

  switch (cmd.command) {
    case "donhang":
      return handleDonHang(reply, userId);
    case "vitien":
      return handleViTien(reply, userId);
    case "thongtin":
      if (cmd.args) {
        return handleSaveBankInfo(reply, userId, cmd.args);
      }
      return handleThongTin(reply, userId);
    case "hoten":
      return handleSaveFullName(reply, userId, cmd.args);
    case "ruttien":
      return handleRutTien(reply, userId, cmd.args);
    case "xacnhan":
      if (isOwner(chatId)) {
        return handleConfirmWithdrawal(reply, cmd.args);
      }
      return reply("❌ Lệnh này chỉ dành cho chủ nhóm.");
    default:
      return reply(
        "❌ Lệnh không hợp lệ. Gõ #donhang, #vitien, #thongtin, #ruttien"
      );
  }
}

export async function handleNewChatMembers(
  chatId: number,
  members: Array<{ id: number; first_name?: string; username?: string }>
) {
  if (!isTargetGroup(chatId)) return;

  for (const member of members) {
    const name = member.first_name || member.username || "bạn";
    try {
      await sendMessage(
        chatId,
        `Chào mừng <b>${name}</b> đã tham gia nhóm! 🎉\n\n${WELCOME_TEXT}`
      );
    } catch (error) {
      console.error("Welcome message failed:", error);
    }
  }
}

async function handleShopeeLink(
  chatId: number,
  text: string,
  userId: number,
  username?: string,
  replyToMessageId?: number
) {
  const urlRegex =
    /https?:\/\/(?:[a-z0-9-]+\.)?(?:shopee\.vn|shp\.ee|s\.shopee\.vn|vn\.shp\.ee|shope\.ee)\/[^\s<>"]+/i;
  const match = text.match(urlRegex);

  if (!match) return;

  const link = match[0];

  try {
    const normalized = await normalizeShopeeUrl(link);
    const tag = username ? `@${username}` : `bạn`;

    let targetUrl: string;
    try {
      targetUrl = await createAffiliateLink(
        normalized.canonicalUrl,
        String(userId)
      );
    } catch {
      targetUrl = normalized.canonicalUrl;
    }

    const msg = `${tag} đây là link sản phẩm của bạn 👇\n${targetUrl}\n\n✅ Bấm vào link trên để mua hàng nhé!`;

    await sendMessage(chatId, msg, { reply_to_message_id: replyToMessageId });
  } catch {
    // silently ignore if link can't be processed
  }
}

async function handleDonHang(
  reply: (msg: string) => Promise<unknown>,
  userId: number
) {
  const orders = await TelegramOrder.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10);

  if (orders.length === 0) {
    return reply("📭 Bạn chưa có đơn hàng nào.");
  }

  const lines = orders.map((o, i) => {
    const date = o.createdAt.toLocaleDateString("vi-VN");
    const statusText =
      o.status === "approved"
        ? "✅ Hoàn thành"
        : o.status === "pending"
        ? "⏳ Chờ duyệt"
        : "❌ Đã hủy";
    return `${i + 1}. [${date}] ${o.itemName || "SP #" + o.transactionId} — ${formatCurrency(o.userShare)} — ${statusText}`;
  });

  return reply(`📦 <b>Đơn hàng của bạn:</b>\n\n${lines.join("\n")}`);
}

async function handleViTien(
  reply: (msg: string) => Promise<unknown>,
  userId: number
) {
  let user = await TelegramUser.findOne({ userId });
  if (!user) {
    user = await TelegramUser.create({ userId });
  }

  const pendingWithdrawals = await WithdrawalRequest.countDocuments({
    userId,
    status: "pending",
  });

  const msg = [
    "💰 <b>Ví tiền của bạn:</b>",
    "",
    `💵 Số dư khả dụng: <b>${formatCurrency(user.balance)}</b>`,
    `⏳ Hoa hồng chờ duyệt: <b>${formatCurrency(user.pendingBalance)}</b>`,
    `🔄 Hoa hồng chờ thanh toán từ AccessTrade: <b>${formatCurrency(user.holdBalance)}</b>`,
    `📈 Tổng đã nhận: <b>${formatCurrency(user.totalEarned)}</b>`,
  ];

  if (pendingWithdrawals > 0) {
    msg.push(
      "",
      `🔄 Đang chờ chủ nhóm chuyển: <b>${pendingWithdrawals} yêu cầu</b>`
    );
  }

  if (user.bankName && user.bankAccount) {
    const namePart = user.fullName ? ` - ${user.fullName}` : "";
    msg.push(
      "",
      `🏦 TK: ${user.bankName.toUpperCase()} - ${user.bankAccount}${namePart}`
    );
  }

  return reply(msg.join("\n"));
}

async function handleThongTin(
  reply: (msg: string) => Promise<unknown>,
  userId: number
) {
  const user = await TelegramUser.findOne({ userId });

  if (!user || (!user.bankName && !user.bankAccount && !user.fullName)) {
    return reply(
      "ℹ️ Bạn chưa lưu thông tin.\n\nGửi #thongtin_tenNH_stk để lưu STK.\nVD: #thongtin_mbbank_066099\n\nHoặc gửi #thongtin_tenNH_stk_hoten để lưu cả họ tên.\nVD: #thongtin_vcb_0123456789_NguyenVanA"
    );
  }

  const parts: string[] = ["ℹ️ <b>Thông tin của bạn:</b>\n"];
  if (user.bankName && user.bankAccount) {
    parts.push(`🏦 Ngân hàng: ${user.bankName.toUpperCase()}`);
    parts.push(`💳 STK: ${user.bankAccount}`);
  }
  if (user.fullName) {
    parts.push(`👤 Họ tên: ${user.fullName}`);
  }
  if (!user.fullName) {
    parts.push("");
    parts.push(
      "⚠️ Bạn chưa lưu họ tên. Gửi #hoten_Nguyen Van A để chủ nhóm chuyển khoản."
    );
  }

  return reply(parts.join("\n"));
}

async function handleSaveBankInfo(
  reply: (msg: string) => Promise<unknown>,
  userId: number,
  args: string
) {
  const parts = args.split(/[_\s]/);
  if (parts.length < 2) {
    return reply(
      "❌ Sai cú pháp. Gửi #thongtin_tenNH_stk\nVD: #thongtin_mbbank_066099\n\nHoặc gửi kèm họ tên:\n#thongtin_vcb_0123456789_NguyenVanA"
    );
  }

  const bankName = parts[0];
  const bankAccount = parts[1];

  let fullName: string | undefined;
  if (parts.length >= 3) {
    fullName = parts.slice(2).join(" ");
  }

  const update: Record<string, unknown> = { bankName, bankAccount };
  if (fullName) {
    update.fullName = fullName;
  }

  await TelegramUser.findOneAndUpdate({ userId }, update, { upsert: true });

  const msg = [`✅ Đã lưu thông tin ngân hàng:`];
  msg.push(`🏦 ${bankName.toUpperCase()} - ${bankAccount}`);
  if (fullName) {
    msg.push(`👤 Họ tên: ${fullName}`);
  } else {
    msg.push("");
    msg.push(
      `Gửi #hoten_HoVaTen để lưu họ tên (cần để chủ nhóm chuyển khoản).`
    );
  }

  return reply(msg.join("\n"));
}

async function handleSaveFullName(
  reply: (msg: string) => Promise<unknown>,
  userId: number,
  args: string
) {
  if (!args || args.length < 3) {
    return reply(
      "❌ Sai cú pháp. Gửi #hoten_HoVaTen\nVD: #hoten_Nguyen Van A"
    );
  }

  await TelegramUser.findOneAndUpdate(
    { userId },
    { fullName: args },
    { upsert: true }
  );

  return reply(`✅ Đã lưu họ tên: <b>${args}</b>`);
}

async function handleRutTien(
  reply: (msg: string) => Promise<unknown>,
  userId: number,
  args: string
) {
  if (!args || !/^\d+$/.test(args)) {
    return reply("❌ Sai cú pháp. Gửi #ruttien_sotien\nVD: #ruttien_50000");
  }

  const amount = parseInt(args, 10);
  const user = await TelegramUser.findOne({ userId });

  if (!user) {
    return reply("❌ Bạn chưa có tài khoản.");
  }

  if (!user.bankName || !user.bankAccount) {
    return reply(
      "❌ Bạn chưa lưu thông tin ngân hàng.\nGửi #thongtin_tenNH_stk trước.\nVD: #thongtin_mbbank_066099"
    );
  }

  if (!user.fullName) {
    return reply(
      "❌ Bạn chưa lưu họ tên.\nGửi #hoten_HoVaTen để lưu.\nVD: #hoten_Nguyen Van A"
    );
  }

  if (amount < 50000) {
    return reply("❌ Số tiền rút tối thiểu là 50.000đ.");
  }

  if (amount > user.balance) {
    return reply(
      `❌ Số dư không đủ. Bạn chỉ có ${formatCurrency(user.balance)} khả dụng.`
    );
  }

  const pendingCount = await WithdrawalRequest.countDocuments({
    userId,
    status: "pending",
  });
  if (pendingCount >= 3) {
    return reply(
      "❌ Bạn đã có 3 yêu cầu rút đang chờ. Vui lòng đợi chủ nhóm xử lý."
    );
  }

  user.balance -= amount;
  await user.save();

  await WithdrawalRequest.create({
    userId,
    amount,
    bankName: user.bankName,
    bankAccount: user.bankAccount,
    fullName: user.fullName,
  });

  await reply(
    `✅ Yêu cầu rút ${formatCurrency(amount)} đã được ghi nhận.\n🏦 ${user.bankName.toUpperCase()} - ${user.bankAccount}\n👤 ${user.fullName}\n\n⏳ Chủ nhóm ${OWNER_NAME} sẽ chuyển khoản cho bạn sớm nhất!`
  );

  if (OWNER_CHAT_ID) {
    await sendMessage(
      OWNER_CHAT_ID,
      `💰 <b>Yêu cầu rút tiền mới!</b>\n\n👤 User ID: ${userId}\n💵 Số tiền: ${formatCurrency(amount)}\n🏦 ${user.bankName.toUpperCase()} - ${user.bankAccount}\n👤 ${user.fullName}\n\n📌 Gửi #xacnhan_${userId}_${amount} sau khi đã chuyển khoản.`
    );
  }
}

async function handleConfirmWithdrawal(
  reply: (msg: string) => Promise<unknown>,
  args: string
) {
  const match = args.match(/^(\d+)_(\d+)$/);
  if (!match) {
    return reply(
      "❌ Sai cú pháp. Gửi #xacnhan_userId_sotien\nVD: #xacnhan_123456789_50000"
    );
  }

  const targetUserId = parseInt(match[1], 10);
  const amount = parseInt(match[2], 10);

  const req = await WithdrawalRequest.findOne({
    userId: targetUserId,
    amount,
    status: "pending",
  }).sort({ createdAt: -1 });

  if (!req) {
    return reply("❌ Không tìm thấy yêu cầu rút nào khớp.");
  }

  req.status = "completed";
  req.completedAt = new Date();
  await req.save();

  await reply(
    `✅ Đã xác nhận chuyển ${formatCurrency(amount)} cho user ${targetUserId}.`
  );

  await sendMessage(
    GROUP_ID || OWNER_CHAT_ID!,
    `✅ <b>${OWNER_NAME} đã chuyển ${formatCurrency(amount)} cho bạn!</b>\n\nVui lòng kiểm tra tài khoản ngân hàng. Nếu có thắc mắc hãy liên hệ chủ nhóm.`
  );
}
