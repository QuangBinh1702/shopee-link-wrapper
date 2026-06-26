"use client";

import { useRef, useState } from "react";

interface LinkFormProps {
  formAction: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
}

export function LinkForm({ formAction, isPending, error }: LinkFormProps) {
  const ref = useRef<HTMLFormElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <form
      ref={ref}
      action={formAction}
      className="relative mx-auto max-w-xl"
    >
      <div
        className={`group relative flex items-center gap-2 rounded-2xl border-2 bg-white/75 p-1.5 pl-5 shadow-lg shadow-rose-200/20 backdrop-blur-xl transition-all duration-300 focus-within:border-rose-300 focus-within:bg-white/90 focus-within:shadow-rose-300/25 ${
          focused ? "border-rose-300 bg-white/90 shadow-rose-300/25" : "border-white/60"
        }`}
      >
        <svg
          className="size-5 shrink-0 text-rose-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>

        <input
          name="url"
          type="text"
          placeholder="Dán link Shopee của bạn vào đây..."
          disabled={isPending}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-w-0 flex-1 bg-transparent py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
          autoComplete="off"
          autoFocus
        />

        <button
          type="submit"
          disabled={isPending}
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-rose-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-300/40 transition-all duration-200 hover:bg-rose-500 hover:shadow-md hover:shadow-rose-300/50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none sm:px-6 sm:py-3 sm:text-base"
        >
          {isPending ? (
            <>
              <svg
                className="size-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Đang tạo link...</span>
            </>
          ) : (
            "Tạo link ngay"
          )}
        </button>
      </div>

      {error && (
        <p className="mt-3 animate-fade-slide-up rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
