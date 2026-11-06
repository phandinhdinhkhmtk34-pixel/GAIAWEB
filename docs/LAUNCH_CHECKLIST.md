# Danh sách trước khi chạy chính thức (GAIA LEARNING)

Đánh dấu từng mục khi xong. Mục có ⚠️ là bắt buộc theo luật hoặc để không mất tiền / dữ liệu.

## A. Nội dung và pháp lý
- [ ] ⚠️ **特定商取引法に基づく表記**: thay hết 【要入力】 (Admin → サイト編集 → 規約とポリシー)
- [ ] ⚠️ **プライバシーポリシー** và **利用規約**: thay 【要入力】, nhờ luật sư / chuyên gia kiểm tra
- [ ] Logo, ảnh banner, ảnh 8 nhân vật chính thức (đang có ✅ logo, banner)
- [ ] Thông tin công ty ở footer, email liên hệ thật
- [ ] Thông tin chuyển khoản thật + người phát hành 領収書, mã インボイス (Admin → 入金確認 → 振込先と領収書の設定)
- [ ] Bản dịch tiếng Myanmar / Indonesia / Sinhala / Khmer: nhờ người bản xứ kiểm tra (hiện là bản nháp AI)
- [ ] Bỏ dòng "プロトタイプ / デモデータ" và dữ liệu demo còn lại (mình làm, khi bạn báo)

## B. Dịch vụ trả phí (theo tháng)
- [ ] Mua **tên miền** (ví dụ xxxxx.com)
- [ ] Nơi chạy web: **Vercel Pro** (dễ nhất) hoặc **Hostinger VPS** (xem docs/DEPLOYMENT.md)
- [ ] ⚠️ **Supabase Pro**: nâng cấp project hiện tại (giữ nguyên dữ liệu; không còn tự tạm dừng; có backup)
- [ ] **Email**: dịch vụ gửi email (ví dụ Resend) + xác minh tên miền → cài vào Supabase (SMTP) để gửi email tiếng Nhật, không giới hạn vài email/giờ
- [ ] **Video**: chuyển sang Cloudflare Stream (mình làm phần code + chuyển video)
- [ ] ⚠️ **Stripe**: xác minh doanh nghiệp → chuyển sang live → thay khoá `sk_live_` + webhook mới (docs/STRIPE_SETUP.md)

## C. Cài đặt sau khi có tên miền
- [ ] Vercel: gắn tên miền, đổi `NEXT_PUBLIC_SITE_URL`
- [ ] Supabase: Site URL + Redirect URLs = tên miền mới
- [ ] Stripe: webhook trỏ về tên miền mới
- [ ] Bật lại chặn công cụ tìm kiếm → cho Google index (mình làm)

## D. Kiểm tra cuối (chạy như khách thật)
- [ ] Đăng ký cá nhân + công ty, xác nhận email
- [ ] Thanh toán thẻ (thẻ thật, số tiền nhỏ rồi huỷ) và chuyển khoản → video mở
- [ ] Mời nhân viên, nhân viên xem video, quản lý thấy tiến độ
- [ ] Huỷ gói → dùng đến hết kỳ → khoá; lịch sử học còn
- [ ] 領収書 hiển thị đúng thông tin công ty, thuế 10%
- [ ] Admin: 2 bước, duyệt chuyển khoản, upload video, sửa trang chủ
- [ ] Điện thoại (iPhone + Android) và máy tính; 7 ngôn ngữ

## Đã làm trong giai đoạn kiểm tra (Phase 7)
- Sửa 2 lỗ hổng: tự gia nhập công ty bằng mã giả; quyền Admin trước khi xác nhận email (migration 0008)
- Chặn ghi tiến độ học trực tiếp; ẩn tiêu đề video nháp
- Thư viện hết nhảy bố cục trên điện thoại (CLS 0.84 → 0); giảm font tải về (46 → 20 file)
- Trang 特定商取引法 / プライバシーポリシー / 利用規約 có mẫu soạn sẵn, sửa trong サイト編集
