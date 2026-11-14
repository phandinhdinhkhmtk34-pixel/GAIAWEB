# GAIA LAB — hướng dẫn cho Claude

Web học video cho doanh nghiệp Nhật "GAIA LAB" (90秒で学ぶ、心の教育). Chủ web (Dinh) không phải lập trình viên,
ra lệnh bằng **tiếng Việt**; khách hàng phía Nhật (anh Kusuda) góp ý bằng tiếng Nhật, thường qua ảnh chụp LINE.

## Cách làm việc với chủ web
- Luôn trả lời **tiếng Việt**, ngắn, dễ hiểu, không thuật ngữ lập trình. Tên nút/màn hình ghi đúng chữ Nhật trên web.
- Ảnh chụp có gạch chéo = bỏ; khoanh tròn = sửa chỗ đó; 「やっぱりやめた」= giữ nguyên.
- Chỗ nào chưa rõ: liệt kê câu hỏi đánh số kèm phương án đề xuất (A/B/C) **trong tin nhắn**, không dùng hộp hỏi.
- Làm xong: commit + push lên `main` (Vercel tự deploy ~1–2 phút), **kiểm tra trên web thật**, rồi báo cáo bằng bảng
  "Yêu cầu → Kết quả" và mục "Bạn cần làm" (nếu có).
- Không bao giờ xin hay nhận khoá bí mật (service_role, Stripe secret…) trong chat. Khoá chỉ dán vào Vercel.

## Địa chỉ
- Web: https://gaiaweb-beryl.vercel.app (ngôn ngữ mặc định `/ja`)
- Admin: `/ja/admin` (Super Admin phải bật 2FA) · Sửa trực tiếp trang chủ: `/ja/admin/edit`
- Supabase SQL Editor: https://supabase.com/dashboard/project/hsznlblvqodptyugoaok/sql/new
- Hướng dẫn tự sửa cho chủ web: `docs/HUONG_DAN_CHINH_SUA_WEB.md`

## Công nghệ
Next.js 15 (App Router, `src/app/[locale]/…`), TypeScript, Tailwind 4, next-intl (7 ngôn ngữ, mặc định ja),
Supabase (Auth + Postgres + Storage), Stripe (chưa bật khoá), Vercel.

- Chữ giao diện: `messages/{ja,vi,en}.json` (đầy đủ); `my,id,si,km` là bản nháp, thiếu khoá thì tự lấy tiếng Anh.
  **Sửa chữ thì sửa cả ja + vi + en.**
- Nội dung chủ web sửa trong Admin (CMS) nằm ở bảng `site_content` → `src/lib/site-content.ts`. Chữ trong CMS
  **ghi đè** chữ mặc định trong `messages/` — nếu sửa mà web không đổi, kiểm tra CMS.
- Trang chủ: `src/components/home-view.tsx` (các phần: features, characters, featured, categories, pricing),
  đầu trang `hero-intro.tsx`, bảng giá `pricing.tsx`, menu `site-header.tsx`, chân trang `site-footer.tsx`.
- Điều khoản/hợp đồng mẫu: `src/lib/legal-templates.ts` (`## ` = tiêu đề, `| a | b |` = bảng).
- Thanh toán: `src/lib/billing*.ts`, `src/components/checkout-view.tsx`. Hợp đồng: `src/lib/agreements.ts`,
  `src/components/contract-document.tsx`, trang `/contract/[number]`. 領収書: `/receipt/[number]`.
- Quyền: `src/lib/auth.ts` (`getViewer`), middleware `src/middleware.ts` (bắt đăng nhập, bắt đồng ý điều khoản).

## Quy tắc kinh doanh (đã chốt, không tự đổi)
- Tên dịch vụ: **GAIA LAB** (ガイアラボ). Tạm **không** quảng cáo 7 ngôn ngữ (nút đổi ngôn ngữ vẫn giữ).
- Giá đã gồm thuế: tháng 30.000 円 (1 tài khoản) + 3.000 円/tài khoản thêm; năm 300.000 円 + 30.000 円/tài khoản.
  Cá nhân và công ty cùng giá. Tất cả video đều trả phí.
- Nội dung: 5 chương × 20 tập, mỗi tập ~90 giây (slug `ch1`…`ch5`).
- Thanh toán: thẻ (Stripe, tự gia hạn) hoặc chuyển khoản (admin bấm 入金を確認). Huỷ: dùng tới hết kỳ.
- Đồng ý điều khoản lúc đăng ký; ký hợp đồng (có số `GL-C-YYYY-NNNNN`) lúc thanh toán.

## Thay đổi cơ sở dữ liệu
- Tạo file mới `supabase/migrations/00NN_ten.sql`, viết **chạy lại nhiều lần không lỗi** (`if not exists`,
  `on conflict`), thêm vào danh sách trong `docs/SUPABASE_SETUP.md`.
- Chủ web tự chạy SQL: luôn **dán toàn bộ đoạn SQL trong tin nhắn** kèm link SQL Editor (không bắt mở GitHub).
- Code phải chạy được cả khi chủ web chưa chạy SQL (lỗi thì bỏ qua/ghi log, không làm hỏng trang).
- Có thể thử SQL trên Postgres 16 tạm: `/usr/lib/postgresql/16/bin/initdb` (chạy bằng user `postgres`), xoá sau khi thử.

## Kiểm tra trước khi push
```bash
npx tsc --noEmit
rm -rf .next && npx next build   # lỗi font Google ("reading '1'") là do mạng: chạy lại
```
- Xem giao diện: `npx next start -p 3200` rồi chụp màn hình bằng Playwright (desktop 1280px + điện thoại 390px).
  Máy không có khoá Supabase nên chạy ở chế độ demo — bình thường.
- Sau khi push: chạy `node scripts/check-live.mjs` để kiểm tra web thật (lỗi trang, tràn ngang, chữ cần có/không có).

## Commit
Commit message tiếng Anh, ngắn gọn, mô tả điều thay đổi. Push thẳng lên `main`.
