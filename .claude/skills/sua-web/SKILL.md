---
name: sua-web
description: Sửa web GAIA LAB theo yêu cầu của chủ web (chữ, bố cục, tính năng, góp ý từ ảnh chụp LINE), kiểm tra, đưa lên web thật và báo cáo bằng tiếng Việt. Dùng khi chủ web gõ /sua-web hoặc yêu cầu thay đổi web.
---

# /sua-web — sửa web GAIA LAB từ A đến Z

Yêu cầu của chủ web: $ARGUMENTS

Đọc `CLAUDE.md` ở gốc repo trước (quy tắc, vị trí file, quy tắc kinh doanh). Sau đó làm đủ các bước:

1. **Hiểu yêu cầu**
   - Ảnh chụp: gạch chéo = bỏ, khoanh tròn = sửa chỗ đó, 「やっぱりやめた」= giữ nguyên.
   - Góp ý tiếng Nhật: dịch ý cho đúng, giữ nguyên văn tiếng Nhật khi đưa lên web.
   - Có chỗ mơ hồ ảnh hưởng tới kết quả: hỏi bằng danh sách đánh số kèm phương án A/B/C và đề xuất,
     rồi dừng chờ trả lời. Chỗ nhỏ có cách hợp lý rõ ràng thì tự quyết và ghi lại trong báo cáo.
   - Báo trước 1 câu: sẽ làm những gì.

2. **Sửa**
   - Chữ: sửa `messages/ja.json`, `vi.json`, `en.json` cùng lúc. Kiểm tra CMS có ghi đè không (xem CLAUDE.md).
   - Thay đổi dữ liệu: migration mới, chạy lại được nhiều lần, code vẫn chạy khi chưa chạy SQL.
   - Giữ phong cách giao diện hiện có (màu navy/sun, chữ serif cho tiêu đề), phải đẹp trên điện thoại.

3. **Kiểm tra trên máy**
   - `npx tsc --noEmit`, rồi `rm -rf .next && npx next build` (lỗi font Google thì chạy lại).
   - `npx next start -p 3200` + Playwright chụp màn hình phần đã sửa (1280px và 390px), tự xem ảnh,
     sửa tới khi đẹp. Tắt server sau khi xong.

4. **Đưa lên web**
   - Commit (tiếng Anh, ngắn) và `git push origin main`.
   - Chờ Vercel deploy (lặp `curl` tới khi thấy chữ mới, tối đa ~7 phút).
   - `node scripts/check-live.mjs --has "<chữ mới>" --not "<chữ đã bỏ>"`.

5. **Báo cáo (tiếng Việt)**
   - Bảng "Yêu cầu → Kết quả", có link trang để xem.
   - Mục **"Bạn cần làm"**: SQL (dán toàn bộ trong khung code + link SQL Editor), việc trong Admin…
   - Nói rõ chỗ chưa kiểm tra được (ví dụ trang cần đăng nhập) và câu hỏi còn mở.
