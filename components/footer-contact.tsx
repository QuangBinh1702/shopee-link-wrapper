"use client";

const CONTACT_TEXT =
  process.env.NEXT_PUBLIC_OWNER_CONTACT_TEXT || "Zalo/SĐT: 09xxxxxxxx";

export function FooterContact() {
  return (
    <footer className="mt-10 border-t border-white/50 pt-6 text-center sm:mt-16">
      <p className="text-xs leading-relaxed text-gray-400 sm:text-sm">
        Cần hỗ trợ? Liên hệ{" "}
         <span className="font-medium text-gray-500">{CONTACT_TEXT}</span>
      </p>
      <p className="mt-1 text-xs text-gray-400">
        Làm đẹp từng link, lan tỏa từng sản phẩm ♡
      </p>
    </footer>
  );
}
