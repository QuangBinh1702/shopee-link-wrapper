import { accessTradeGet } from "./client";
import { connectDb } from "@/lib/db/mongodb";
import { TelegramOrder } from "@/lib/db/models/telegram-order";
import { TelegramUser } from "@/lib/db/models/telegram-user";
import { sendMessage } from "@/lib/telegram/bot";

interface AccessTradeOrder {
  transaction_id: string;
  commission: number;
  status: number;
  merchant: string;
  product_name: string;
  transaction_value: number;
  click_time: string;
  transaction_time: string;
  confirmed_time: string;
  is_confirmed: number;
  sub1?: string;
  sub2?: string;
  sub3?: string;
}

interface OrderListResponse {
  total: number;
  data: AccessTradeOrder[];
}

const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_ID;
const GROUP_ID = process.env.TELEGRAM_GROUP_ID;

const TAX_RATE = 0.1;
const USER_SHARE_RATE = 0.8;
const OWNER_SHARE_RATE = 0.2;

function calcShares(commission: number) {
  const tax = Math.round(commission * TAX_RATE);
  const afterTax = commission - tax;
  return {
    tax,
    userShare: Math.round(afterTax * USER_SHARE_RATE),
    ownerShare: Math.round(afterTax * OWNER_SHARE_RATE),
  };
}

export async function syncOrders() {
  await connectDb();

  const now = new Date();
  const since = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const sinceStr = since.toISOString().replace(/\.\d+Z$/, "Z");
  const untilStr = now.toISOString().replace(/\.\d+Z$/, "Z");

  let page = 1;
  let newApprovedCount = 0;
  let newPendingCount = 0;
  const newApprovedDetails: string[] = [];

  while (true) {
    const response = await accessTradeGet<OrderListResponse>(
      "/v1/order-list",
      {
        since: sinceStr,
        until: untilStr,
        page: String(page),
        limit: "300",
        merchant: "shopee",
      }
    );

    const orders = response.data;
    if (!orders || orders.length === 0) break;

    for (const order of orders) {
      const exists = await TelegramOrder.findOne({
        transactionId: order.transaction_id,
      });
      if (exists) {
        if (exists.accessTradeStatus !== order.status) {
          exists.accessTradeStatus = order.status;
          exists.isConfirmed = order.is_confirmed;

          if (order.status === 1) {
            exists.status = "approved";
            exists.confirmedTime = order.confirmed_time
              ? new Date(order.confirmed_time)
              : undefined;

            if (exists.userId) {
              await TelegramUser.findOneAndUpdate(
                { userId: exists.userId },
                {
                  $inc: {
                    pendingBalance: -exists.userShare,
                    balance: exists.userShare,
                    totalEarned: exists.userShare,
                  },
                }
              );
            }
          } else if (order.status === 2) {
            exists.status = "rejected";
            if (exists.userId) {
              await TelegramUser.findOneAndUpdate(
                { userId: exists.userId },
                { $inc: { pendingBalance: -exists.userShare } }
              );
            }
          }

          await exists.save();
        }
        continue;
      }

      const sub1 = order.sub1 || "web_anonymous";
      const userId = sub1 !== "web_anonymous" ? parseInt(sub1, 10) : undefined;

      const shares = calcShares(order.commission);
      const orderStatus: "pending" | "approved" | "rejected" =
        order.status === 0
          ? "pending"
          : order.status === 1
          ? "approved"
          : "rejected";

      const doc = await TelegramOrder.create({
        userId: userId || undefined,
        sub1,
        transactionId: order.transaction_id,
        merchant: order.merchant,
        itemName: order.product_name,
        transactionValue: order.transaction_value,
        commission: order.commission,
        ...shares,
        accessTradeStatus: order.status,
        isConfirmed: order.is_confirmed,
        status: orderStatus,
        clickTime: order.click_time ? new Date(order.click_time) : undefined,
        transactionTime: order.transaction_time
          ? new Date(order.transaction_time)
          : undefined,
        confirmedTime: order.confirmed_time
          ? new Date(order.confirmed_time)
          : undefined,
      });

      if (orderStatus === "approved" && userId) {
        newApprovedCount++;
        newApprovedDetails.push(
          `• <b>${order.product_name || "SP #" + order.transaction_id}</b>`
        );

        await TelegramUser.findOneAndUpdate(
          { userId },
          {
            $inc: {
              balance: shares.userShare,
              totalEarned: shares.userShare,
            },
          },
          { upsert: true }
        );

        doc.notified = true;
        await doc.save();
      } else if (orderStatus === "pending" && userId) {
        newPendingCount++;

        await TelegramUser.findOneAndUpdate(
          { userId },
          { $inc: { pendingBalance: shares.userShare } },
          { upsert: true }
        );
      }
    }

    if (orders.length < 300) break;
    page++;
  }

  if ((newApprovedCount > 0 || newPendingCount > 0) && OWNER_CHAT_ID) {
    const lines: string[] = ["📊 <b>Báo cáo đồng bộ đơn hàng AccessTrade</b>", ""];

    if (newApprovedCount > 0) {
      lines.push(`✅ <b>Đơn mới được duyệt: ${newApprovedCount}</b>`);
      lines.push(...newApprovedDetails);
      lines.push("");
      lines.push("💡 Vào group thông báo để member gõ #donhang kiểm tra.");
    }

    if (newPendingCount > 0) {
      lines.push(`⏳ Đơn chờ xử lý: ${newPendingCount}`);
    }

    await sendMessage(OWNER_CHAT_ID, lines.join("\n"));
  }

  if (newApprovedCount > 0 && GROUP_ID) {
    await sendMessage(
      GROUP_ID,
      `🛎 <b>Có đơn hàng mới được duyệt!</b>\n\nCác bạn gõ #donhang để kiểm tra đơn của mình nhé.\nGõ #vitien để xem số dư đã được cập nhật.`
    );
  }

  return { newApprovedCount, newPendingCount };
}
