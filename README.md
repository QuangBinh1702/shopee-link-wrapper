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
  db/                # MongoDB connection + models
  errors.ts          # Typed error system
  response.ts        # API response helpers
  rate-limit.ts      # IP rate limiter
  slug.ts            # Slug generation
app/
  api/wrap/route.ts  # POST /api/wrap
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
