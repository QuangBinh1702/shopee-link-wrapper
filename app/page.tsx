"use client";

import { useActionState } from "react";
import { LinkForm } from "@/components/link-form";
import { ResultCard } from "@/components/result-card";
import { FooterContact } from "@/components/footer-contact";

interface FormState {
  shortUrl: string;
  clicks: number;
  error: string | null;
}

const initialState: FormState = {
  shortUrl: "",
  clicks: 0,
  error: null,
};

async function submitAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const url = formData.get("url") as string;
  if (!url || !url.trim()) {
    return { ...initialState, error: "Vui lòng dán link Shopee của bạn." };
  }

  try {
    const res = await fetch("/api/wrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { ...initialState, error: json.message || "Lỗi hệ thống." };
    }

    return {
      shortUrl: json.data.shortUrl,
      clicks: json.data.clicks,
      error: null,
    };
  } catch {
    return {
      ...initialState,
      error: "Không thể kết nối đến server, vui lòng thử lại.",
    };
  }
}

export default function Home() {
  const [state, formAction, isPending] = useActionState(
    submitAction,
    initialState
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-8 sm:py-12">
      <main className="flex-1">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Rút gọn link Shopee
            <span className="bg-linear-to-r from-rose-400 to-rose-500 bg-clip-text text-transparent">
              {" "}xinh hơn
            </span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500 sm:text-base">
            Dán link sản phẩm, nhận link gọn đẹp để chia sẻ ngay.
          </p>
        </div>

        <LinkForm
          formAction={formAction}
          isPending={isPending}
          error={state.error}
        />

        {state.shortUrl && !isPending && (
          <ResultCard
            shortUrl={state.shortUrl}
            clicks={state.clicks}
          />
        )}
      </main>

      <FooterContact />
    </div>
  );
}
