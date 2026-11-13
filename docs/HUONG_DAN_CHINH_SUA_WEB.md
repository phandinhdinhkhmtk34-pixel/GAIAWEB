# Hướng dẫn tự chỉnh sửa web GAIA LEARNING

Mọi thay đổi bên dưới đều làm **trên trình duyệt**, không cần sửa code. Bạn cần đăng nhập bằng tài khoản
Super Admin và nhập mã 6 số của app Authenticator khi được hỏi.

- Admin (管理センター): https://gaiaweb-beryl.vercel.app/ja/admin
- Sửa trực tiếp trang chủ (編集モード): https://gaiaweb-beryl.vercel.app/ja/admin/edit

> **Nguyên tắc chung:** sửa xong bấm **下書きを保存** (lưu nháp, khách chưa thấy) hoặc **公開する** (đưa lên web).
> Sau khi 公開, web cập nhật ngay; nếu chưa thấy thì tải lại trang (Ctrl + F5).

---

## 1. Sửa chữ và ảnh trên trang chủ — cách nhanh nhất

1. Mở https://gaiaweb-beryl.vercel.app/ja/admin/edit (hoặc ở trang chủ bấm nút **このページを編集**).
2. Chọn ngôn ngữ cần sửa ở thanh trên cùng (日本語 / Tiếng Việt / English).
3. Chữ nào có **viền chấm vàng** là sửa được: bấm vào, gõ chữ mới.
   - Tiêu đề lớn: nhấn **Enter** để xuống dòng.
4. Ảnh: bấm **画像を変更** trên ảnh → chọn ảnh trong máy. Web tự nén ảnh, không cần thu nhỏ trước.
5. Bấm **公開する**.

Sửa được theo cách này: tiêu đề lớn, câu khẩu hiệu 「心の学びを…」, đoạn giới thiệu, logo, ảnh bìa,
ảnh và tên 8 nhân vật, thông tin công ty ở chân trang.

## 2. Các cài đặt khác — tab サイト編集

Vào **管理センター → サイト編集**:

| Mục | Dùng để |
|---|---|
| ロゴ / トップページのメイン画像 | Đổi logo, ảnh bìa, chọn hiện cả ảnh hay cắt cho vừa khung |
| トップページの構成 | Chữ bên trái / ảnh bên trái / chữ đè lên ảnh |
| セクションの順番と表示 | Kéo thả hoặc bấm mũi tên để đổi thứ tự; bấm hình con mắt để ẩn/hiện từng phần |
| トップページの文章 | Sửa chữ dạng ô nhập (giống mục 1) |
| **紹介動画（YouTube の URL）** | Dán link YouTube → nút 「紹介動画を見てみる」 sẽ phát video này |
| 8 人のキャラクター | Tên và vai trò từng nhân vật |
| 会社情報（フッター） | Tên, địa chỉ, email, điện thoại ở chân trang |
| 料金（税込） | Giá gói tháng/năm và giá mỗi tài khoản thêm (chỉ Super Admin) |
| 規約とポリシー（日本語） | Sửa 特定商取引法, プライバシーポリシー, 利用規約, **ご契約について** |

### Sửa điều khoản / hợp đồng
1. Trong **規約とポリシー**, nếu ô còn trống, bấm **ひな形を挿入** để chép bản mẫu vào.
2. Sửa các chỗ **【要入力】** (thông tin bắt buộc) và **【要確認】** (cần luật sư xem).
3. Cách viết: dòng bắt đầu bằng `## ` là tiêu đề; dòng dạng `| cột 1 | cột 2 |` là một hàng bảng.
4. Bên phải có bản xem trước. Xong bấm **公開する**.

Điều khoản mới chỉ áp dụng cho khách ký **sau** khi bạn 公開. Hợp đồng đã ký vẫn giữ nguyên bản cũ —
đúng như quy định về hợp đồng.

## 3. Thông tin in trên 領収書 và 契約書 — tab 入金確認

**管理センター → 入金確認 → 振込先と領収書の設定**:
- Tài khoản ngân hàng nhận chuyển khoản.
- **Tên công ty, địa chỉ, điện thoại, số đăng ký hóa đơn (登録番号)**: in ở phần 「甲」 của hợp đồng
  và trên 領収書. Hãy điền thông tin thật trước khi bán.

Ngay phía trên là danh sách **契約書** — bấm số hợp đồng để mở, in hoặc lưu PDF.

## 4. Video — tab 動画

- **Thêm video:** chọn file (tối đa 50 MB), điền tên, danh mục, nhân vật → bấm tải lên.
- **Đổi ảnh bìa video:** bấm **サムネイルを変更** ở video đó → chọn ảnh mới.
- **Ẩn / hiện:** 非公開にする / 公開する.

## 5. Khách hàng — tab 会員と法人

- Xem công ty, số tài khoản, gói đang dùng.
- **アカウント数**: đổi số tài khoản của công ty → **保存**. **有効化**: bật gói thủ công.
- **利用停止**: khóa công ty (không đăng nhập, không xem video). **利用再開** để mở lại.

Tab **入金確認**: bấm **入金を確認** khi đã nhận chuyển khoản → khách được dùng ngay và có 領収書.
Tab **お問い合わせ**: tin nhắn từ trang Liên hệ.

---

## Khi nào cần nhờ sửa code?

Những thay đổi **không** có trong Admin — ví dụ thêm trang mới, đổi bố cục một phần, thêm tính năng,
đổi chữ trên nút bấm hay menu — thì nhắn yêu cầu cho Claude (giống các lần trước), kèm ảnh chụp nếu có.
Claude sửa code, đưa lên GitHub, Vercel tự cập nhật web sau khoảng 1–2 phút.

Nếu sau khi cập nhật web bị lỗi: vào **vercel.com → project gaiaweb → Deployments**, chọn bản cũ
đang chạy tốt → **⋯ → Promote to Production** để quay lại ngay.
