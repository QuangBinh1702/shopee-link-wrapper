# Shopee Link Wrapper

Rút gọn link Shopee — dán link sản phẩm, nhận link gọn đẹp kèm affiliate tracking để chia sẻ lên mạng xã hội.

## Tech Stack

- **Framework:** Next.js 15.5 (App Router)
- **Ngôn ngữ:** TypeScript 6
- **Style:** Tailwind CSS 4.3
- **Database:** MongoDB + Mongoose
- **Validation:** Zod
- **Slug:** nanoid (custom alphabet)
- **Affiliate:** AccessTrade API
- **Telegram Bot:** Webhook-based Telegram bot cho nhóm mua hộ
- **Test:** Vitest + Testing Library + Playwright

## Quick Start

### Yêu cầu

- Node.js 20+
- MongoDB đang chạy (local hoặc [MongoDB Atlas](https://www.mongodb.com/atlas))

### Cài đặt

```bash
# Clone & install
cd shopee-link-wrapper
npm install

# Tạo file env
cp .env.example .env
# Sau đó điền ACCESS_TRADE_TOKEN và MONGODB_URI
```

### Chạy local

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

### Test

```bash
npm run test          # Unit + integration + frontend (Vitest)
npm run test:e2e      # E2E (Playwright, cần MongoDB)
npm run typecheck     # TypeScript kiểm tra
npm run lint          # ESLint
```

## Deploy lên Vercel

### 1. Tạo MongoDB Atlas (nếu chưa có)

1. Vào [cloud.mongodb.com](https://cloud.mongodb.com) → Create cluster (free tier đủ dùng)
2. Network Access → Add IP `0.0.0.0/0` (hoặc IP tĩnh của Vercel)
3. Database Access → Tạo user + password
4. Connect → Drivers → Copy connection string (VD: `mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/shopee-link-wrapper?retryWrites=true&w=majority`)

### 2. Deploy

| Cách | Lệnh |
|------|------|
| **Vercel CLI** | `npx vercel --prod` |
| **GitHub** | Fork → Import repo vào [vercel.com/new](https://vercel.com/new) |

### 3. Cấu hình Environment Variables trên Vercel

Vào Vercel Dashboard → Project → Settings → Environment Variables, thêm các biến sau:

| Variable | Ví dụ | Bắt buộc |
|----------|-------|----------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/...` | ✅ |
| `ACCESS_TRADE_TOKEN` | Token từ pub2.accesstrade.vn | ✅ (nếu muốn affiliate) |
| `APP_BASE_URL` | `https://ten-site.vercel.app` | ✅ |
| `NEXT_PUBLIC_OWNER_CONTACT_TEXT` | `Zalo: 09xxxxxxxx` | ❌ |
| `WRAP_RATE_LIMIT_PER_MINUTE` | `20` | ❌ |
| `ACCESS_TRADE_CAMPAIGN_ID` | Để trống → auto-discover | ❌ |

Sau khi thêm, Redeploy project.

## Environment Variables

| Variable | Mặc định | Mô tả |
|----------|----------|-------|
| `APP_BASE_URL` | `http://localhost:3000` | Base URL cho short link |
| `NEXT_PUBLIC_OWNER_CONTACT_TEXT` | `Zalo/SĐT: 09xxxxxxxx` | Text hiển thị ở footer (client) |
| `DEFAULT_SUB1` | `web_anonymous` | sub1 mặc định cho affiliate link |
| `MONGODB_URI` | `mongodb://localhost:27017/...` | MongoDB connection string |
| `ACCESS_TRADE_TOKEN` | — | Token từ pub2.accesstrade.vn |
| `ACCESS_TRADE_CAMPAIGN_ID` | — | Để trống để auto-discover |
| `ACCESS_TRADE_API_BASE_URL` | `https://api.accesstrade.vn` | Base URL AccessTrade API |
| `WRAP_RATE_LIMIT_PER_MINUTE` | `20` | Số request tối đa/IP/phút |
| `SHORT_URL_EXPAND_TIMEOUT_MS` | `2000` | Timeout mỗi hop expand (ms) |
| `SHORT_URL_EXPAND_MAX_REDIRECTS` | `10` | Số hop tối đa khi expand |
| `SHORT_URL_EXPAND_MAX_TOTAL_MS` | `8000` | Tổng thời gian tối đa expand (ms) |
| `TELEGRAM_BOT_TOKEN` | — | Token từ @BotFather |
| `TELEGRAM_GROUP_ID` | — | Chat ID nhóm Telegram (số âm với group) |
| `TELEGRAM_OWNER_ID` | — | User ID của bạn (để nhận thông báo đơn hàng) |
| `TELEGRAM_OWNER_NAME` | `Vy Tô` | Tên chủ nhóm hiển thị trong hướng dẫn |
| `CRON_SECRET` | — | Bearer token bảo vệ cron endpoint |

## API

### `POST /api/wrap`

```json
// Request
{ "url": "https://shopee.vn/product/123456789/9876543210" }

// Response 200
{ "success": true, "data": { "shortUrl": ".../abc123/shopee", "slug": "abc123", "clicks": 0 } }

// Response 4xx/5xx
{ "success": false, "code": "INVALID_URL", "message": "..." }
```

### `GET /[slug]/shopee`

Redirect 302 tới affiliate URL + atomic click tracking.

## Telegram Bot

Bot tự động trả lời trong nhóm Telegram với các chức năng:

- **Chào mừng** thành viên mới + hướng dẫn mua hàng
- **Tự động** nhận diện link Shopee → trả link chính thức
- **#donhang** — kiểm tra đơn hàng đã mua
- **#vitien** — kiểm tra số dư + tổng đã nhận
- **#thongtin** — xem thông tin ngân hàng
- **#thongtin_tenNH_stk** — lưu thông tin ngân hàng
- **#ruttien_sotien** — yêu cầu rút tiền (tối thiểu 50k)

### Setup

1. Lên [@BotFather](https://t.me/BotFather) → `/newbot` → lấy token
2. Thêm bot vào nhóm với quyền admin (để đọc tin nhắn)
3. Lấy Group ID: thêm [@getidsbot](https://t.me/getidsbot) vào nhóm, gửi `/id`
4. Điền `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234
   TELEGRAM_GROUP_ID=-1001234567890
   TELEGRAM_OWNER_NAME=
   ```
5. Set webhook (chạy 1 lần):
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://site.com/api/telegram"
   ```

Webhook tự động nhận update từ Telegram và xử lý tại `app/api/telegram/route.ts`.

## Order Sync (AccessTrade → Telegram)

Hệ thống tự động đồng bộ đơn hàng từ AccessTrade, tính hoa hồng và thông báo qua Telegram.

### Luồng tiền

```
Shopee → AccessTrade (hoa hồng gốc)
  → Trừ 10% thuế
  → Chia 80% cho người mua, 20% cho chủ bot
  → Cộng vào số dư TelegramUser
  → Owner nhận thông báo → chuyển khoản thủ công
```

### Cách chạy đồng bộ

**Cách 1 — Vercel Cron (tự động)**: thêm vào `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-orders",
      "schedule": "0 6 * * *"
    }
  ]
}
```
Set `CRON_SECRET` trên Vercel, Vercel tự gọi mỗi ngày 6h sáng.

**Cách 2 — Gọi tay**: dùng curl mỗi khi muốn sync:
```bash
curl https://site.com/api/cron/sync-orders
```

**Cách 3 — Gọi có auth**: dùng `CRON_SECRET` để bảo vệ:
```bash
curl -H "Authorization: Bearer your-secret" https://site.com/api/cron/sync-orders
```

Khi có đơn mới được duyệt, bot sẽ:
1. Gửi thông báo riêng cho **owner** (`TELEGRAM_OWNER_ID`)
2. Gửi thông báo vào **group** để member kiểm tra `#donhang` / `#vitien`

## Production Checklist

Trước khi launch, kiểm tra:

- [ ] `MONGODB_URI` trỏ tới production DB (không phải local)
- [ ] `ACCESS_TRADE_TOKEN` đã điền
- [ ] `APP_BASE_URL` là domain thật (VD: `https://shopee-links.vercel.app`)
- [ ] `NEXT_PUBLIC_OWNER_CONTACT_TEXT` đã cập nhật thông tin liên hệ
- [ ] Vercel Production Deployment thành công
- [ ] `npm run build` không lỗi
- [ ] Test thử với link Shopee web thật
- [ ] Test thử với link Shopee short (`shp.ee/...`, `s.shopee.vn/...`)
- [ ] Kiểm tra click counter tăng sau mỗi lần redirect
- [ ] Turn off `NEXT_PUBLIC_OWNER_CONTACT_TEXT` hoặc custom domain cho production

## Cấu trúc thư mục

```
lib/
  shopee/            # Core link engine (parse, expand, normalize)
  accesstrade/       # AccessTrade affiliate client
  telegram/          # Telegram bot (client + handlers)
  db/                # MongoDB connection + models
  errors.ts          # Typed error system
  response.ts        # API response helpers
  rate-limit.ts      # IP rate limiter
  slug.ts            # Slug generation
app/
  api/wrap/route.ts  # POST /api/wrap
  api/telegram/      # POST telegram webhook
  [slug]/shopee/     # GET redirect route
  page.tsx           # Landing page
components/
  link-form.tsx      # URL input form
  result-card.tsx    # Kết quả + copy button
  copy-button.tsx
  footer-contact.tsx
tests/
  unit/              # Unit tests
  integration/       # Integration tests
  frontend/          # Component tests
  e2e/               # Playwright E2E
```
