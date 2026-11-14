---
name: kiem-tra-web
description: Kiểm tra toàn bộ web GAIA LAB đang chạy thật (lỗi, điện thoại, tốc độ, nội dung) và báo cáo bằng tiếng Việt. Dùng khi chủ web gõ /kiem-tra-web hoặc hỏi web có ổn không.
---

# /kiem-tra-web — kiểm tra web thật

Phạm vi thêm (nếu có): $ARGUMENTS

1. `node scripts/check-live.mjs` (thêm `--has`/`--not` nếu chủ web muốn kiểm tra chữ cụ thể).
2. Chụp màn hình trang chủ (1280px và 390px) bằng Playwright, tự xem: bố cục, chữ bị vỡ dòng, ảnh lỗi,
   nội dung còn sót (tên cũ, danh mục cũ, chữ 【要入力】, chữ demo).
3. Đo nhanh dung lượng tải trang chủ và thời gian hiện nội dung chính (LCP) trên điện thoại.
4. Đối chiếu với quy tắc kinh doanh trong `CLAUDE.md` (giá, tên GAIA LAB, 5 chương…).
5. Báo cáo tiếng Việt: bảng tiêu chí → kết quả (✅/⚠️/❌), rồi danh sách việc nên sửa xếp theo mức quan trọng,
   ghi rõ việc nào chủ web tự làm trong Admin, việc nào cần /sua-web. Không tự sửa code nếu chưa được yêu cầu.
