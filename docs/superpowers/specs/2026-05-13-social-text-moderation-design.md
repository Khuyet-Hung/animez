# Thiết kế kiểm duyệt text cho social feed

## Mục tiêu

Thêm lớp kiểm duyệt tự động đơn giản cho nội dung text trong social feed. Bản đầu chặn nội dung chửi tục/xúc phạm, 18+, link spam/quảng cáo và hate speech/phân biệt đối xử. Spoiler anime chưa nằm trong phạm vi.

## Phạm vi áp dụng

- Caption và mô tả khi tạo bài viết.
- Caption và mô tả khi sửa bài viết.
- Caption khi chia sẻ bài viết.
- Body khi tạo bình luận.

## Kiến trúc

Tạo module `src/lib/social/moderation.ts` làm lớp rule-based độc lập với server action. Module này chuẩn hóa text trước khi so khớp rule:

- Chuyển về lowercase.
- Chuẩn hóa Unicode và bỏ dấu tiếng Việt.
- Gom các ký tự lặp phổ biến để giảm né lọc đơn giản.
- So khớp theo từ/cụm từ cấm và pattern spam.

API nội bộ:

- `moderateSocialText(text)`: kiểm một đoạn text.
- `moderateSocialPostText({ caption, description })`: kiểm text của bài viết.

Kết quả trả về có dạng pass/fail, kèm field và lý do để action map sang lỗi UI.

## Luồng xử lý

Các server action gọi moderation sau bước validate độ dài/bắt buộc và trước khi ghi DB hoặc upload ảnh. Nếu vi phạm:

- Tạo/sửa bài viết trả `validationFailed` với `fieldErrors.caption` hoặc `fieldErrors.description`.
- Share trả `shareModerationBlocked`.
- Comment trả `commentModerationBlocked`.
- Không insert/update dữ liệu vi phạm.

## Mở rộng sau này

Module moderation giữ interface ổn định để sau này có thể đổi nguồn rule sang Supabase, thêm admin UI, thêm trạng thái `pending/blocked`, hoặc gọi dịch vụ AI moderation mà không phải sửa toàn bộ action.

## Kiểm thử

- Text sạch được pass.
- Text có biến thể có dấu/không dấu vẫn bị chặn.
- Link spam/quảng cáo bị chặn.
- Comment/share trả message key đúng.
- Nội dung spoiler anime không bị chặn nếu không dính rule khác.
