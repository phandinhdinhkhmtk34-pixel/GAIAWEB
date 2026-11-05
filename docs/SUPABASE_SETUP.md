# Cài đặt Supabase cho bản chạy thử (Giai đoạn 2)

Làm một lần, khoảng 15 phút. Không cần gửi mật khẩu hay khoá cho ai: bạn tự dán khoá vào Vercel.
Tên các nút trên Supabase/Vercel có thể khác đôi chút theo phiên bản giao diện.

## 1. Tạo bảng dữ liệu
1. Mở project trên **supabase.com** → menu trái **SQL Editor** → **New query**.
2. Mở file [`supabase/migrations/0001_initial_schema.sql`](../supabase/migrations/0001_initial_schema.sql) trên GitHub,
   bấm **Raw**, copy toàn bộ, dán vào SQL Editor → **Run**. Phải thấy "Success".
3. Làm tương tự với [`0002_auth_onboarding.sql`](../supabase/migrations/0002_auth_onboarding.sql).
   Chạy đúng thứ tự 0001 rồi 0002, mỗi file chỉ chạy một lần.

## 2. Địa chỉ web
**Authentication → URL Configuration**
- **Site URL:** `https://gaiaweb-beryl.vercel.app`
- **Redirect URLs** → Add URL: `https://gaiaweb-beryl.vercel.app/**`

## 3. Đăng nhập bằng email và xác thực 2 bước
- **Authentication → Sign In / Providers → Email:** bật, và bật **Confirm email**.
- **Authentication → Multi-Factor (MFA):** bảo đảm **TOTP (Authenticator app)** đang bật.

## 4. Mẫu email (để link trong email mở được trên mọi thiết bị)
**Authentication → Emails → Templates.** Thay đường link trong 3 mẫu sau (giữ phần chữ, chỉ thay `href`):

| Mẫu | Link mới |
|---|---|
| **Invite user** (bắt buộc) | `{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/ja/set-password` |
| **Confirm signup** | `{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/ja/dashboard` |
| **Reset password** | `{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/ja/set-password` |

Ví dụ mẫu Invite user:
```html
<h2>GAIA LEARNING への招待</h2>
<p>下のリンクからパスワードを設定してください。 / Bấm link dưới để đặt mật khẩu.</p>
<p><a href="{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/ja/set-password">招待を受ける / Nhận lời mời</a></p>
```

## 5. Dán khoá vào Vercel
1. Supabase: **Project Settings → API Keys** (hoặc **API**). Copy 3 giá trị:
   - **Project URL**
   - **anon / publishable key** (khoá công khai)
   - **service_role / secret key** (khoá bí mật — chỉ dán vào Vercel, không gửi cho ai, không đưa lên GitHub)
2. Vercel: project **gaiaweb** → **Settings → Environment Variables**, thêm 4 biến (Environment: Production, Preview):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
| `NEXT_PUBLIC_SITE_URL` | `https://gaiaweb-beryl.vercel.app` |

3. **Deployments** → bản mới nhất → **⋯ → Redeploy**. (Bắt buộc: biến mới chỉ có hiệu lực sau khi deploy lại.)

## 6. Tạo tài khoản Super Admin và bật 2 bước
1. Mở `https://gaiaweb-beryl.vercel.app/ja/signup`, đăng ký bằng **phandinhdinhkhmtk34@gmail.com**.
2. Mở email xác nhận → bấm link → vào Trang cá nhân.
3. Mở menu **管理センター** → hệ thống chuyển sang trang **2 段階認証**:
   quét QR bằng Google Authenticator (hoặc app tương tự) → nhập mã 6 số.
4. Từ lần sau, mỗi lần vào Admin chỉ cần nhập mã 6 số trong app.

## Giới hạn của gói miễn phí cần biết
- Email do Supabase gửi mặc định **bị giới hạn rất ít email mỗi giờ**. Đủ để thử vài tài khoản; nếu báo
  "quá nhiều lần", đợi một lúc. Khi cần thử nhiều hơn sẽ nối dịch vụ email riêng (Resend, miễn phí).
- Project miễn phí **tự tạm dừng sau 1 tuần không ai dùng**: vào Supabase bấm **Restore** là chạy lại, dữ liệu vẫn còn.
