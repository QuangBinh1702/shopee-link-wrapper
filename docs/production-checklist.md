# Production Checklist

Checklist kiểm tra trước khi launch.

## MongoDB

- [ ] Dùng production cluster (Atlas M0+ hoặc tự host)
- [ ] Network Access chỉ cho phép IP của Vercel (hoặc 0.0.0.0/0 nếu tạm)
- [ ] Database user có password mạnh
- [ ] `MONGODB_URI` trong Vercel env đã cập nhật

## AccessTrade

- [ ] `ACCESS_TRADE_TOKEN` đã điền trên Vercel
- [ ] Token có quyền tạo affiliate link
- [ ] Campaign Shopee đã được duyệt
- [ ] Test thử tạo affiliate link thành công

## Domain & URL

- [ ] `APP_BASE_URL` là production domain
- [ ] Domain đã trỏ đúng tới Vercel
- [ ] SSL/HTTPS hoạt động (Vercel auto)
- [ ] Short link redirect đúng target

## Performance & Rate Limit

- [ ] `WRAP_RATE_LIMIT_PER_MINUTE` phù hợp (20 là an toàn)
- [ ] `SHORT_URL_EXPAND_TIMEOUT_MS` không quá lớn (2s)
- [ ] `SHORT_URL_EXPAND_MAX_TOTAL_MS` hạn chế DoS (8s)

## Build & Deploy

- [ ] `npm run build` không lỗi
- [ ] `npm run typecheck` pass
- [ ] `npm run lint` pass
- [ ] `npm run test` pass

## Manual Test

- [ ] Paste link Shopee web → nhận short URL
- [ ] Paste link Shopee short (`s.shopee.vn/...`, `shp.ee/...`) → nhận short URL
- [ ] Click short URL → redirect 302 đúng trang sản phẩm
- [ ] Click lại lần 2 → DB clicks tăng
- [ ] Paste link không phải Shopee → báo lỗi
- [ ] Paste link rỗng → báo lỗi
- [ ] Giao diện mobile 390px không tràn
- [ ] Giao diện desktop 1440px cân đối
- [ ] Copy button hoạt động
- [ ] Footer hiển thị đúng contact text

## Monitoring (nếu cần)

- [ ] Vercel Analytics hoặc logging bên thứ 3
- [ ] Theo dõi error rate sau launch
