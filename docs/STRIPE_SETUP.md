# Cài đặt thanh toán thẻ (Stripe) cho bản chạy thử

Chuyển khoản ngân hàng chạy được ngay, không cần Stripe. Phần này chỉ để bật **thanh toán bằng thẻ**.
Làm ở chế độ **Sandbox / Test mode**: không có tiền thật. Không gửi khoá bí mật cho ai, chỉ dán vào Vercel.

## 1. Lấy khoá bí mật
Stripe Dashboard (đang ở Sandbox) → **Developers → API keys** → **Secret key** (`sk_test_...`) → Reveal → copy.

## 2. Tạo webhook (để Stripe báo cho web khi khách trả tiền)
1. Stripe → **Developers → Webhooks** (hoặc **Workbench → Webhooks**) → **Add endpoint / Add destination**.
2. **Endpoint URL:** `https://gaiaweb-beryl.vercel.app/api/webhooks/stripe`
3. **Events** — chọn đúng 4 sự kiện:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Lưu → mở endpoint vừa tạo → **Signing secret** (`whsec_...`) → Reveal → copy.

## 3. Dán vào Vercel
Vercel → gaiaweb → **Environment Variables**, thêm 2 biến, Type **Secret**:

| Key | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

Rồi **Deployments → ⋯ → Redeploy**.

## 4. Thử thanh toán
Thẻ test của Stripe: số `4242 4242 4242 4242`, ngày hết hạn bất kỳ trong tương lai (ví dụ 12/30),
CVC bất kỳ 3 số, tên bất kỳ. Không trừ tiền thật.

## Khi chạy chính thức
Hoàn tất xác minh doanh nghiệp trên Stripe → chuyển sang **live** → thay `sk_test_` bằng `sk_live_`,
tạo lại webhook ở chế độ live với tên miền chính thức, thay `whsec_`.
