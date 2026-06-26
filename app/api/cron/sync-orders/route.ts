import { NextResponse } from "next/server";
import { syncOrders } from "@/lib/accesstrade/order-sync";

export const maxDuration = 120;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncOrders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Cron sync-orders error:", error);
    return NextResponse.json(
      { ok: false, error: "Sync failed" },
      { status: 500 }
    );
  }
}
