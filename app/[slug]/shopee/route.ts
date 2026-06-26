import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { connectDb } from "@/lib/db/mongodb";
import { LinkMap } from "@/lib/db/models/link-map";
import { SLUG_REGEX } from "@/lib/slug";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const start = performance.now();
  const { slug } = await params;

  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Không tìm thấy link." },
      { status: 404 }
    );
  }

  try {
    await connectDb();
    const linkMap = await LinkMap.findOne({ slug });

    if (!linkMap) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Không tìm thấy link." },
        { status: 404 }
      );
    }

    const targetUrl = linkMap.affiliateUrl || linkMap.canonicalUrl;
    if (!targetUrl) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Không tìm thấy link." },
        { status: 404 }
      );
    }

    try {
      await LinkMap.updateOne(
        { slug },
        { $inc: { clicks: 1 }, $set: { lastClickedAt: new Date() } }
      );
    } catch (error) {
      console.error("Click tracking failed for slug:", slug, error);
    }

    const elapsed = (performance.now() - start).toFixed(1);
    console.log(
      JSON.stringify({
        event: "redirect",
        slug,
        status: 302,
        elapsed_ms: Number(elapsed),
      })
    );

    return NextResponse.redirect(targetUrl, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.httpStatus }
      );
    }
    console.error("Redirect error:", error);
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Không tìm thấy link." },
      { status: 404 }
    );
  }
}
