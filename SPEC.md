# Kế hoạch triển khai - Trendy Shopee Link Wrapper Tool

> Phiên bản: 3.0  
> Ngày cập nhật: 25/06/2026  
> Trạng thái: Execution plan theo SRS có User Stories và Acceptance Criteria

## 1. Tổng quan

### 1.1 Mục tiêu sản phẩm

Xây dựng một công cụ web một trang giúp Creator/KOL/KOC dán link sản phẩm Shopee và nhận lại link rút gọn đẹp, dễ chia sẻ, có gắn affiliate của chủ sở hữu tool. Khi End-User click vào link rút gọn, hệ thống redirect nhanh sang Shopee qua affiliate link và âm thầm ghi nhận lượt click.

Luồng MVP hoàn chỉnh:

1. Creator dán link Shopee web dài hoặc mobile short link.
2. Hệ thống normalize link, bóc tách `shopId` và `itemId`, loại bỏ tracking query.
3. Nếu là short link, hệ thống expand ngầm để lấy link Shopee dài.
4. Hệ thống gửi canonical Shopee URL sang affiliate provider để tạo affiliate link.
5. Hệ thống sinh slug duy nhất và lưu mapping vào database.
6. UI hiển thị short URL dạng `{APP_BASE_URL}/{slug}/shopee` kèm nút sao chép.
7. End-User click short URL, server tăng click counter và redirect HTTP 302 sang affiliate link.

### 1.2 Personas

| Persona | Nhu cầu chính | Thành công khi |
| --- | --- | --- |
| Creator/KOL/KOC | Dán link Shopee và lấy link ngắn đẹp để chia sẻ nhanh | Nhận link rút gọn rõ ràng, copy được trong 1 click, không cần hiểu kỹ thuật |
| End-User | Click link social và tới đúng sản phẩm Shopee nhanh nhất | Không thấy trang trung gian phiền, redirect nhanh, mobile có cơ hội mở app Shopee |
| Chủ sở hữu tool | Gắn affiliate và theo dõi hiệu suất link | Affiliate token an toàn, click được ghi nhận, hệ thống ổn định |

### 1.3 Phạm vi MVP

MVP bao gồm:

- Single-page web tool.
- Core link processing engine cho link Shopee web và mobile short.
- Affiliate transformation qua AccessTrade.
- Short URL generation và redirect route.
- Click tracking.
- Trendy UI/UX theo phong cách hiện đại, tinh gọn.
- Test unit, integration, frontend, E2E, manual acceptance.

Ngoài MVP:

- Bot Telegram/Zalo.
- Cashback cho từng user.
- Cron đối soát đơn hàng.
- Ledger hoa hồng pending/approved/rejected.
- Admin dashboard thống kê nâng cao.

## 2. Kiến trúc và stack

### 2.1 Tech stack

| Layer | Công nghệ |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js Route Handlers |
| Database | MongoDB + Mongoose |
| Validation | Zod |
| Slug | nanoid/customAlphabet |
| Unit/Integration tests | Vitest |
| UI/E2E tests | Testing Library + Playwright |
| Deploy | Vercel |
| Affiliate provider | AccessTrade Vietnam |

### 2.2 Cấu trúc thư mục mục tiêu

```text
shopee-link-wrapper/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   ├── api/
│   │   └── wrap/
│   │       └── route.ts
│   └── [slug]/
│       └── shopee/
│           └── route.ts
├── components/
│   ├── link-form.tsx
│   ├── result-card.tsx
│   ├── copy-button.tsx
│   └── footer-contact.tsx
├── lib/
│   ├── accesstrade/
│   │   ├── client.ts
│   │   ├── campaigns.ts
│   │   └── create-affiliate-link.ts
│   ├── db/
│   │   ├── mongodb.ts
│   │   └── models/
│   │       └── link-map.ts
│   ├── shopee/
│   │   ├── expand-short-url.ts
│   │   ├── normalize.ts
│   │   ├── parse-url.ts
│   │   └── types.ts
│   ├── device.ts
│   ├── errors.ts
│   ├── rate-limit.ts
│   └── slug.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── frontend/
│   └── e2e/
├── docs/
│   └── PLAN.md
├── .env.example
├── package.json
└── README.md
```

### 2.3 Environment variables

```env
# App
APP_BASE_URL=http://localhost:3000
OWNER_CONTACT_TEXT=Zalo/SĐT: 09xxxxxxxx
DEFAULT_SUB1=web_anonymous

# Database
MONGODB_URI=mongodb://localhost:27017/shopee-link-wrapper

# AccessTrade
ACCESS_TRADE_TOKEN=
ACCESS_TRADE_CAMPAIGN_ID=
ACCESS_TRADE_API_BASE_URL=https://api.accesstrade.vn

# Limits and performance budgets
WRAP_RATE_LIMIT_PER_MINUTE=20
SHORT_URL_EXPAND_TIMEOUT_MS=2000
SHORT_URL_EXPAND_MAX_REDIRECTS=10
REDIRECT_RESPONSE_BUDGET_MS=500
```

Không tạo biến `NEXT_PUBLIC_*` cho token, campaign id, database URI hoặc secret.

## 3. Giai đoạn triển khai theo User Stories

### Giai đoạn 1 - Core Link Processing Engine

Mục tiêu: nhận, parse, expand và normalize mọi link Shopee hợp lệ trước khi gửi sang affiliate provider.

#### User Story 1.1 - Làm sạch liên kết bản Web

Là một Creator/KOL/KOC, tôi muốn dán link Shopee dài từ trình duyệt desktop để hệ thống tự động lọc bỏ tracking query và giữ lại đúng định danh sản phẩm.

Acceptance Criteria:

- AC 1.1.1: Parser nhận diện được link chứa `i.ShopID.ProductID`, ví dụ `https://shopee.vn/Ten-san-pham-i.123.456?...`.
- AC 1.1.2: Parser nhận diện được link dạng `/product/ShopID/ProductID`, ví dụ `https://shopee.vn/product/123/456?...`.
- AC 1.1.3: Parser hỗ trợ query `shopid/itemid` hoặc `shop_id/item_id` nếu Shopee trả về dạng này.
- AC 1.1.4: Tất cả query tracking sau dấu `?`, ví dụ `sp_atk`, `xptdk`, `utm_*`, bị loại khỏi canonical output.
- AC 1.1.5: Link có ký tự tiếng Việt bị URL-encoded như `%E1%BA...` không làm crash parser; parser chỉ cần extract ID và không cần decode tên sản phẩm để tạo canonical URL.
- AC 1.1.6: Canonical output luôn là `https://shopee.vn/product/{shopId}/{itemId}`.

Implementation notes:

- Dùng `new URL(input)` để parse thay vì regex toàn chuỗi khi có thể.
- Regex chỉ dùng để extract ID từ pathname.
- Validate `shopId` và `itemId` là chuỗi số dương.
- Không lưu raw query tracking vào database.

#### User Story 1.2 - Giải mã liên kết rút gọn bản Mobile

Là một Creator thường dùng điện thoại, tôi muốn dán link `shope.ee/...` hoặc `s.shopee.vn/...` để hệ thống tự tìm sản phẩm mà không bắt tôi mở desktop.

Acceptance Criteria:

- AC 1.2.1: Short domains được hỗ trợ: `shope.ee`, `s.shopee.vn`, `shp.ee`, `vn.shp.ee`.
- AC 1.2.2: Khi nhận short link, hệ thống thực hiện server-side request để follow redirect và lấy final Shopee URL.
- AC 1.2.3: Thời gian expand mục tiêu dưới 2 giây; timeout mặc định `SHORT_URL_EXPAND_TIMEOUT_MS=2000`.
- AC 1.2.4: Hệ thống follow tối đa 10 redirects và chặn redirect loop.
- AC 1.2.5: Nếu link rút gọn lỗi, hết hạn, timeout hoặc bị chặn, API trả message đúng: `Không thể giải mã liên kết rút gọn này, vui lòng kiểm tra lại liên kết sản phẩm`.
- AC 1.2.6: Nếu final URL không thuộc domain Shopee hợp lệ, hệ thống reject với lỗi `UNSUPPORTED_DOMAIN`.

Implementation notes:

- Dùng browser-like `User-Agent`.
- Ưu tiên `redirect: "manual"` và tự follow từng hop để kiểm soát domain, max redirect và timeout.
- Có thể cache in-memory final URL theo short URL trong runtime để giảm request lặp, nhưng không bắt buộc cho MVP.

API nội bộ:

```ts
export interface ParsedShopeeUrl {
  shopId: string;
  itemId: string;
  originalUrl: string;
  canonicalUrl: string;
  wasShortUrl: boolean;
}

export async function normalizeShopeeUrl(input: string): Promise<ParsedShopeeUrl>;
```

User-facing errors:

| Code | HTTP | Message |
| --- | --- | --- |
| `INVALID_URL` | 400 | Link không hợp lệ. Vui lòng dán link Shopee. |
| `UNSUPPORTED_DOMAIN` | 400 | Link không phải của Shopee. |
| `PRODUCT_ID_NOT_FOUND` | 400 | Không tìm thấy mã sản phẩm trong link. |
| `SHORT_URL_EXPAND_FAILED` | 422 | Không thể giải mã liên kết rút gọn này, vui lòng kiểm tra lại liên kết sản phẩm. |

### Giai đoạn 2 - Affiliate Network Integration

Mục tiêu: tự động chuyển canonical Shopee URL thành affiliate link hợp lệ, dùng credential server-side.

#### User Story 2.1 - Tự động chuyển đổi liên kết tiếp thị

Là một Creator, tôi muốn hệ thống tự gửi link đã làm sạch sang đối tác affiliate để nhận link đã gắn mã kiếm tiền.

Acceptance Criteria:

- AC 2.1.1: Hệ thống xác thực AccessTrade bằng `Authorization: Token <ACCESS_TRADE_TOKEN>` ở server-side.
- AC 2.1.2: Token, campaign id và database URI không xuất hiện trong client bundle, HTML hoặc response JSON.
- AC 2.1.3: Nếu `ACCESS_TRADE_CAMPAIGN_ID` có giá trị, hệ thống dùng trực tiếp campaign này.
- AC 2.1.4: Nếu campaign id trống, hệ thống gọi `GET /v1/campaigns?approval=successful`, lọc campaign Shopee đã được duyệt và cache trong runtime.
- AC 2.1.5: Tạo tracking link bằng `POST /v1/product_link/create` với `campaign_id`, `urls`, `sub1`, `sub2`, `utm_source`.
- AC 2.1.6: Redirect target của hệ thống là `data.success_link[0].aff_link`, không dùng `short_link` của AccessTrade.
- AC 2.1.7: Nếu AccessTrade trả `error_link` hoặc `suspend_url`, API wrap trả lỗi dễ hiểu thay vì lưu link hỏng.
- AC 2.1.8: Affiliate conversion chạy ngầm ngay sau khi normalize thành công, không yêu cầu thao tác thêm từ Creator.

Implementation notes:

- Retry tối đa 2 lần cho network error hoặc HTTP 5xx.
- Không retry HTTP 400/401/403 vì thường là lỗi input/token/campaign.
- Map lỗi cấu hình sang `CONFIG_ERROR`, lỗi provider tạm thời sang `AFFILIATE_CREATE_FAILED`.

Payload AccessTrade:

```json
{
  "campaign_id": "<campaign-id>",
  "urls": ["https://shopee.vn/product/{shopId}/{itemId}"],
  "sub1": "web_anonymous",
  "sub2": "web",
  "utm_source": "shopee-link-wrapper"
}
```

### Giai đoạn 3 - Trendy UI/UX & Frontend

Mục tiêu: tạo trải nghiệm một trang hiện đại, có gu riêng, tập trung vào tác vụ tạo link.

#### User Story 3.1 - Trải nghiệm giao diện đón đầu xu hướng

Là chủ sở hữu sản phẩm, tôi muốn UI có ngôn ngữ thiết kế thời thượng, chuyên nghiệp và có sức hút với giới sáng tạo nội dung.

Acceptance Criteria:

- AC 3.1.1: Trang chủ là single-page tool; màn hình đầu tiên phải hiển thị ngay input tạo link, không phải landing marketing dài.
- AC 3.1.2: Thiết kế nhất quán theo một direction cụ thể: pastel pink + glass surface nhẹ + bento support panels, nhưng không sao chép layout từ website khác.
- AC 3.1.3: Input và nút hành động có hover/focus/touch micro-interactions mượt, không gây layout shift.
- AC 3.1.4: Emoji chỉ dùng làm điểm nhấn tinh tế; không làm UI rối hoặc thiếu chuyên nghiệp.
- AC 3.1.5: Bố cục giữ sự tinh gọn, mọi điểm nhìn dẫn về hành động chính là dán link và tạo link.
- AC 3.1.6: Responsive tốt ở mobile 390px, tablet và desktop 1440px; không có text overlap hoặc button bị tràn.
- AC 3.1.7: Hoạt động trong in-app browsers phổ biến: Facebook, TikTok, Zalo, Instagram ở mức không phụ thuộc API trình duyệt đặc biệt.

Implementation notes:

- Dùng component thật thay vì static mockup.
- Tránh nested cards và tránh hero marketing quá lớn.
- Nếu dùng glassmorphism, đảm bảo contrast đọc được.
- Font đề xuất: `Nunito`, `Quicksand` hoặc một sans-serif mềm, hiện đại.

UI content mặc định:

- Heading: `Rút gọn link Shopee xinh hơn`
- Supporting copy: `Dán link sản phẩm, nhận link gọn đẹp để chia sẻ ngay.`
- Placeholder: `Dán link Shopee của bạn vào đây...`
- Primary button: `Tạo link ngay`
- Loading: `Đang tạo link...`
- Error area: hiển thị message từ API.

#### User Story 3.2 - Khối kết quả động và Sao chép nhanh

Là một Creator bận rộn, tôi muốn kết quả xuất hiện mượt mà và copy được bằng một cú bấm.

Acceptance Criteria:

- AC 3.2.1: Sau khi API success, UI hiển thị short URL đúng cấu trúc `{APP_BASE_URL}/{slug}/shopee`.
- AC 3.2.2: Result block chỉ xuất hiện sau khi xử lý xong, có fade-in hoặc slide-up nhẹ.
- AC 3.2.3: Có nút `Sao chép` cạnh short URL.
- AC 3.2.4: Click nút copy ghi short URL vào clipboard.
- AC 3.2.5: Sau khi copy thành công, nút đổi trạng thái trong 2 giây, ví dụ `Đã sao chép!` hoặc icon check.
- AC 3.2.6: Nếu Clipboard API không hoạt động trong in-app browser, UI cung cấp fallback chọn link thủ công.

Implementation notes:

- Không hiển thị click analytics nâng cao trong MVP; nếu hiển thị thì chỉ là `0 lượt click` sau khi tạo.
- Không reload trang sau submit.
- Disable submit trong lúc loading để tránh tạo nhiều link ngoài ý muốn.

### Giai đoạn 4 - Redirect Engine & Tracking Analytics

Mục tiêu: redirect nhanh cho End-User và ghi nhận click ổn định.

#### User Story 4.1 - Chuyển hướng tốc độ cao và Mobile Deep Linking

Là End-User click link rút gọn, tôi muốn được chuyển thẳng tới sản phẩm Shopee nhanh nhất, không qua trang trung gian.

Acceptance Criteria:

- AC 4.1.1: `GET /[slug]/shopee` trả HTTP 302 server-side redirect tới `affiliateUrl`.
- AC 4.1.2: Thời gian xử lý trung gian mục tiêu dưới 0.5 giây trong điều kiện database hoạt động bình thường.
- AC 4.1.3: Response redirect có `Cache-Control: no-store`.
- AC 4.1.4: Slug không tồn tại trả 404 rõ ràng, không redirect về homepage gây hiểu nhầm.
- AC 4.1.5: Cấu trúc redirect target dùng affiliate link do provider trả về; nếu provider link hỗ trợ mobile deep linking/app open thì hệ thống không được làm mất các tham số đó.
- AC 4.1.6: Với mobile User-Agent, hệ thống vẫn dùng server-side 302 trực tiếp; không chèn trang trung gian. Nếu cần app deep link nâng cao ngoài affiliate link, ghi vào backlog vì phụ thuộc chính sách Shopee/AccessTrade.

Implementation notes:

- Không tự chế schema deep link Shopee nếu chưa xác minh provider hỗ trợ, vì có thể làm mất tracking affiliate.
- Có thể lưu `userAgent`/`referer` dạng aggregate sau này, nhưng MVP chỉ cần clicks.

#### User Story 4.2 - Tự động ghi nhận click counter

Là chủ sở hữu tool, tôi muốn mỗi lượt click tăng counter để theo dõi hiệu suất từng link.

Acceptance Criteria:

- AC 4.2.1: Mỗi request hợp lệ vào `/{slug}/shopee` tăng `clicks` thêm 1 trong database.
- AC 4.2.2: Update click dùng atomic `$inc` để tránh mất số khi nhiều người click cùng lúc.
- AC 4.2.3: `lastClickedAt` được cập nhật cùng lúc với click.
- AC 4.2.4: Click tracking không được làm chậm redirect quá ngân sách 0.5 giây.
- AC 4.2.5: Nếu update click lỗi nhưng lookup link thành công, hệ thống vẫn ưu tiên redirect để không làm mất khách mua hàng, đồng thời log lỗi để điều tra.

Data model:

```ts
export interface LinkMap {
  slug: string;
  shopId: string;
  itemId: string;
  canonicalUrl: string;
  affiliateUrl: string;
  source: 'web';
  sub1: string;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
  lastClickedAt?: Date;
}
```

Indexes:

- `slug` unique.
- `{ createdAt: -1 }`.
- Optional `{ shopId: 1, itemId: 1 }` để hỗ trợ thống kê sau này.

## 4. API contracts

### 4.1 `POST /api/wrap`

Request:

```json
{
  "url": "https://s.shopee.vn/..."
}
```

Success `200`:

```json
{
  "shortUrl": "https://your-domain.com/abc12X/shopee",
  "slug": "abc12X",
  "clicks": 0
}
```

Error:

```json
{
  "code": "SHORT_URL_EXPAND_FAILED",
  "message": "Không thể giải mã liên kết rút gọn này, vui lòng kiểm tra lại liên kết sản phẩm"
}
```

Flow:

1. Rate limit theo IP.
2. Validate body bằng Zod: `url` là string 1-2048 ký tự.
3. Normalize Shopee URL.
4. Tạo affiliate link.
5. Sinh unique slug.
6. Lưu `LinkMap`.
7. Trả `shortUrl`.

### 4.2 `GET /[slug]/shopee`

Flow:

1. Validate slug chỉ gồm ký tự trong alphabet cho phép.
2. Lookup `LinkMap`.
3. Nếu không có record, trả 404.
4. Tăng `clicks` bằng `$inc` và set `lastClickedAt`.
5. Redirect 302 sang `affiliateUrl`.

Slug rules:

- Alphabet: `23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz`.
- Độ dài mặc định: 6.
- Retry collision tối đa 5 lần.
- Mỗi lần Creator tạo link thành công sẽ tạo slug mới; MVP không dedup theo sản phẩm.

## 5. Non-functional requirements

| Nhóm | Yêu cầu | Cách kiểm chứng |
| --- | --- | --- |
| Reliability | Redirect route hoạt động ổn định, ưu tiên không làm mất lượt mua | E2E redirect + manual test production |
| Security | Secret chỉ ở server-side | Build inspection, không dùng `NEXT_PUBLIC_`, test response không lộ secret |
| Compatibility | UI chạy tốt trên responsive và in-app browsers | Playwright viewport + manual mobile/in-app browser |
| Performance | Expand short link mục tiêu dưới 2 giây | Integration test timeout + log timing |
| Performance | Redirect trung gian mục tiêu dưới 0.5 giây | Integration/E2E đo response time trong môi trường local/preview |
| UX | Lỗi rõ ràng, không đổ stack trace ra client | API error tests |
| Accessibility | Input, button, result có label/focus state rõ | Frontend tests + manual keyboard check |

## 6. Phase implementation checklist

### Phase 0 - Foundation

Deliverables:

- Scaffold Next.js + TypeScript + Tailwind.
- Cài `mongoose`, `nanoid`, `zod`.
- Cài test stack `vitest`, Testing Library, Playwright.
- Tạo `.env.example`.
- Tạo MongoDB singleton.
- Tạo typed errors và API response helper.
- Tạo README setup local.

Acceptance:

- `npm run lint` pass.
- `npm run typecheck` pass.
- App start local.
- `.env.example` không chứa secret thật.

### Phase 1 - Core Link Processing Engine

Deliverables:

- `parseShopeeUrl`.
- `expandShortUrl`.
- `normalizeShopeeUrl`.
- Error mapping theo SRS.
- Unit tests đầy đủ cho desktop/mobile links.

Acceptance:

- Đạt toàn bộ AC của User Story 1.1 và 1.2.
- Short URL timeout dưới 2 giây theo config.
- Link URL-encoded tiếng Việt không crash.

### Phase 2 - Affiliate Integration

Deliverables:

- AccessTrade server client.
- Campaign resolver.
- `createAffiliateLink`.
- Mock tests cho success/error/retry.

Acceptance:

- Đạt toàn bộ AC của User Story 2.1.
- Token không lộ ra client.
- `aff_link` được lưu làm redirect target.

### Phase 3 - Wrap API, Database và Slug

Deliverables:

- `LinkMap` model.
- Unique slug service.
- `POST /api/wrap`.
- Integration tests API + DB.

Acceptance:

- Valid web Shopee link tạo short URL.
- Valid short Shopee link tạo short URL sau expand.
- Invalid link trả đúng code/message.
- Slug collision được retry.

### Phase 4 - Trendy UI/UX

Deliverables:

- Landing page.
- Link form.
- Result card fade/slide animation.
- Copy button với trạng thái `Đã sao chép!` trong 2 giây.
- Footer contact và câu chúc/châm ngôn ngắn.
- Responsive polish.

Acceptance:

- Đạt toàn bộ AC của User Story 3.1 và 3.2.
- UI không overlap ở 390px, tablet và 1440px.
- Form không reload trang.

### Phase 5 - Redirect Engine & Tracking

Deliverables:

- `GET /[slug]/shopee`.
- Atomic click tracking.
- Redirect tests.
- Basic timing instrumentation/logging.

Acceptance:

- Đạt toàn bộ AC của User Story 4.1 và 4.2.
- Redirect 302 đúng target.
- Click counter tăng đúng khi click nhiều lần.
- Click update lỗi vẫn ưu tiên redirect nếu lookup thành công.

### Phase 6 - End-to-end verification và deploy readiness

Deliverables:

- Playwright E2E flow.
- Manual test checklist.
- README deploy Vercel.
- Production env checklist.

Acceptance:

- Unit, integration, frontend, E2E đều pass.
- Manual test với link Shopee web thật pass.
- Manual test với link short mobile thật pass hoặc ghi blocker rõ nếu Shopee chặn server-side expand.
- Production build pass.

## 7. Test matrix

### 7.1 Unit tests

| ID | Module | Scenario | Expected |
| --- | --- | --- | --- |
| UT-URL-001 | parse-url | `shopee.vn/product/123/456` | Extract `shopId=123`, `itemId=456` |
| UT-URL-002 | parse-url | `Ten-san-pham-i.123.456` | Extract đúng IDs |
| UT-URL-003 | parse-url | `shopid=123&itemid=456` | Extract đúng IDs |
| UT-URL-004 | parse-url | Link có `?sp_atk=...&utm_source=...` | Canonical không chứa query |
| UT-URL-005 | parse-url | Path có `%E1%BA...` | Không crash, extract ID nếu có |
| UT-URL-006 | parse-url | Non-Shopee domain | `UNSUPPORTED_DOMAIN` |
| UT-URL-007 | parse-url | Shopee link không có product ID | `PRODUCT_ID_NOT_FOUND` |
| UT-EXP-001 | expand-short-url | 2-hop redirect tới Shopee | Return final URL |
| UT-EXP-002 | expand-short-url | Redirect loop | `SHORT_URL_EXPAND_FAILED` |
| UT-EXP-003 | expand-short-url | Timeout > 2 giây | `SHORT_URL_EXPAND_FAILED` |
| UT-SLUG-001 | slug | Generate slug | Length 6, đúng alphabet |
| UT-SLUG-002 | slug | Collision 2 lần | Retry và return unique slug |

### 7.2 Integration tests

| ID | Area | Scenario | Expected |
| --- | --- | --- | --- |
| IT-AT-001 | AccessTrade | Product link success | Return `affLink` từ `success_link[0].aff_link` |
| IT-AT-002 | AccessTrade | `error_link` có data | Throw `AFFILIATE_CREATE_FAILED` |
| IT-AT-003 | AccessTrade | `suspend_url` có data | Throw `AFFILIATE_CREATE_FAILED` |
| IT-AT-004 | AccessTrade | 401/403 | Không retry, trả lỗi token/cấu hình |
| IT-AT-005 | AccessTrade | 5xx lần 1, success lần 2 | Retry và success |
| IT-DB-001 | MongoDB | Create LinkMap | Lưu đủ fields |
| IT-DB-002 | MongoDB | Duplicate slug | Unique index chặn, slug service retry |
| IT-API-001 | API wrap | Valid canonical Shopee link | Return `shortUrl`, save DB |
| IT-API-002 | API wrap | Valid mocked short Shopee link | Expand, return `shortUrl`, save DB |
| IT-API-003 | API wrap | Invalid body | 400 + message |
| IT-API-004 | API wrap | Short URL expand fail | 422 + exact SRS message |
| IT-API-005 | API wrap | AccessTrade fail | 502 + message |
| IT-REDIR-001 | Redirect | Slug tồn tại | 302 + click tăng |
| IT-REDIR-002 | Redirect | Slug không tồn tại | 404 |
| IT-REDIR-003 | Redirect | DB click update fail | Vẫn 302 nếu lookup thành công |

### 7.3 Frontend tests

| ID | Scenario | Expected |
| --- | --- | --- |
| FE-001 | Input rỗng bấm submit | Hiển thị lỗi yêu cầu dán link |
| FE-002 | Submit valid link | Button loading, không submit lặp |
| FE-003 | API success | Result block xuất hiện với animation nhẹ |
| FE-004 | API error | Hiển thị message tiếng Việt |
| FE-005 | Copy success | Clipboard nhận short URL, nút đổi trạng thái 2 giây |
| FE-006 | Clipboard fail | Hiển thị fallback copy thủ công |
| FE-007 | Keyboard focus | Input/button có focus state rõ |

### 7.4 E2E tests

| ID | Flow | Expected |
| --- | --- | --- |
| E2E-001 | Landing -> paste web Shopee link -> submit | Hiển thị short URL |
| E2E-002 | Landing -> paste mocked short Shopee link -> submit | Hiển thị short URL |
| E2E-003 | Click/call short URL | Redirect 302 sang affiliate URL |
| E2E-004 | Repeat short URL click 2 lần | DB clicks tăng 2 |
| E2E-005 | Mobile viewport 390px | Không tràn text, input/button/result đọc được |
| E2E-006 | Desktop viewport 1440px | Layout cân đối, không overlap |
| E2E-007 | API timing mocked happy path | Expand dưới 2 giây, redirect dưới 0.5 giây trong test budget |

### 7.5 Manual acceptance

Trước khi go-live:

- Dán 1 link Shopee web dài thật và tạo short URL.
- Dán 1 link share mobile `s.shopee.vn` hoặc `shope.ee`.
- Click short URL trên desktop browser, xác nhận redirect sang Shopee.
- Click short URL trên điện thoại hoặc in-app browser, xác nhận không qua trang trung gian.
- Kiểm tra DB `clicks` tăng sau mỗi lần click.
- Tắt/sai `ACCESS_TRADE_TOKEN`, xác nhận UI báo lỗi dễ hiểu.
- Test production domain với `APP_BASE_URL` thật.

## 8. Definition of Done

MVP được xem là hoàn thành khi:

- Tất cả AC của User Stories 1.1, 1.2, 2.1, 3.1, 3.2, 4.1, 4.2 được đáp ứng.
- Creator dán link Shopee web/mobile và nhận short URL.
- Link đầu vào được normalize thành canonical URL không chứa tracking query.
- Affiliate link được tạo qua AccessTrade và redirect target dùng đúng `aff_link`.
- Short URL `{APP_BASE_URL}/{slug}/shopee` redirect 302 được.
- Click counter tăng đúng bằng atomic update.
- UI trendy, responsive, có micro-interactions và copy nhanh.
- Lỗi hiển thị rõ ràng bằng tiếng Việt, không lộ stack trace.
- Unit, integration, frontend và E2E tests pass.
- Manual acceptance với link Shopee thật được ghi nhận.
- README có hướng dẫn setup env, chạy local, chạy test và deploy.
- Token/secret không bị expose ra client hoặc commit vào repo.

## 9. Rủi ro và cách xử lý

| Rủi ro | Mức độ | Cách xử lý |
| --- | --- | --- |
| Shopee short link chặn server-side fetch | Cao | Timeout 2 giây, message đúng SRS, hướng dẫn dùng link đầy đủ, cache expand thành công |
| Mobile app deep linking phụ thuộc provider | Cao | Không tự phá affiliate tracking; dùng `aff_link` provider trả về, đưa deep link nâng cao vào backlog nếu cần xác minh riêng |
| AccessTrade token/campaign chưa hợp lệ | Cao | `CONFIG_ERROR`, README hướng dẫn lấy token/campaign, không tạo link giả |
| AccessTrade API down/rate limit | Trung bình | Retry 5xx, rate limit input, message thử lại sau |
| Slug collision | Thấp | Unique index + retry 5 lần |
| Spam tạo link | Trung bình | Rate limit theo IP, backlog CAPTCHA nếu bị abuse |
| Click update DB lỗi | Trung bình | Ưu tiên redirect, log lỗi tracking |
| UI quá rối vì trendy effect | Trung bình | Giữ input là trọng tâm, kiểm tra contrast/responsive bằng Playwright screenshot |

## 10. Backlog sau MVP

- Trang thống kê link và click theo slug.
- Bot Telegram/Zalo nhận link Shopee và trả short URL.
- Mapping user bằng `sub1`.
- Ước tính cashback nếu có dữ liệu commission/product price đáng tin cậy.
- Cron đối soát đơn hàng AccessTrade qua `/v1/order-list`.
- Ledger cashback pending/approved/rejected.
- Admin dashboard.
- Mobile app deep link nâng cao nếu xác minh được cách giữ affiliate tracking an toàn.

