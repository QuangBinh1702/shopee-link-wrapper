import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LinkForm } from "@/components/link-form";
import { ResultCard } from "@/components/result-card";
import { CopyButton } from "@/components/copy-button";

describe("LinkForm", () => {
  it("renders input and button", () => {
    render(
      <LinkForm formAction={() => {}} isPending={false} error={null} />
    );
    expect(
      screen.getByPlaceholderText("Dán link Shopee của bạn vào đây...")
    ).toBeInTheDocument();
    expect(screen.getByText("Tạo link ngay")).toBeInTheDocument();
  });

  it("shows error message when error prop is set", () => {
    render(
      <LinkForm
        formAction={() => {}}
        isPending={false}
        error="Link không hợp lệ"
      />
    );
    expect(screen.getByText("Link không hợp lệ")).toBeInTheDocument();
  });

  it("disables input and button when pending", () => {
    render(
      <LinkForm formAction={() => {}} isPending={true} error={null} />
    );
    expect(screen.getByPlaceholderText("Dán link Shopee của bạn vào đây...")).toBeDisabled();
    expect(screen.getByText("Đang tạo link...")).toBeInTheDocument();
  });
});

describe("ResultCard", () => {
  it("renders short URL", () => {
    render(<ResultCard shortUrl="https://ex.com/abc123/shopee" clicks={0} />);
    expect(screen.getByText("https://ex.com/abc123/shopee")).toBeInTheDocument();
    expect(screen.getByText("Sao chép")).toBeInTheDocument();
  });
});

describe("CopyButton", () => {
  it("copies text and shows copied state", async () => {
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: clipboardWrite },
      configurable: true,
    });

    render(<CopyButton text="https://ex.com/abc" />);
    screen.getByRole("button").click();

    expect(clipboardWrite).toHaveBeenCalledWith("https://ex.com/abc");
    expect(await screen.findByText("Đã sao chép!")).toBeInTheDocument();
  });

  it("falls back to execCommand when clipboard fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error()) },
      configurable: true,
    });
    document.execCommand = vi.fn();

    render(<CopyButton text="https://ex.com/abc" />);
    screen.getByRole("button").click();

    await screen.findByText("Đã sao chép!");
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });
});
