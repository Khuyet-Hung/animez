# Todo chuẩn hóa theme và App UI components

Ngày tạo: 2026-05-14

Tài liệu kế hoạch chi tiết: `docs/PLAN-app-ui-system.md`

## Trạng thái tổng quan

- [x] Giai đoạn 1: Theme tokens
- [x] Giai đoạn 2: Helper `cn`
- [x] Giai đoạn 3: App UI core components
- [x] Giai đoạn 4: App UI overlay/state components
- [x] Giai đoạn 5: Refactor module
- [x] Giai đoạn 6: Cleanup hard-code và kiểm tra cuối

## Giai đoạn 1: Theme tokens

- [x] Mở rộng `@theme` trong `src/app/globals.css`
- [x] Thêm token màu nền: `bg`, `bg-muted`
- [x] Thêm token surface: `surface`, `surface-muted`, `surface-elevated`
- [x] Thêm token border: `border`, `border-strong`, `border-soft`
- [x] Thêm token text: `fg`, `fg-soft`, `fg-muted`, `fg-subtle`, `fg-disabled`
- [x] Thêm token brand: `brand`, `brand-hover`, `brand-soft`, `brand-fg`
- [x] Thêm token bo góc: `radius-ui-xs/sm/md/lg/xl/pill`
- [x] Đổi `body` và loader global sang token mới nếu phù hợp
- [x] Giữ token cũ tạm thời để tránh phá code đang dùng

## Giai đoạn 2: Helper `cn`

- [x] Tạo `src/lib/cn.ts`
- [x] Dùng `clsx` làm implementation ban đầu
- [x] Import `cn` trong các App UI component mới

## Giai đoạn 3: App UI core components

- [x] Tạo thư mục `src/components/ui`
- [x] Tạo `src/components/ui/AppButton.tsx`
- [x] Tạo `src/components/ui/AppIconButton.tsx`
- [x] Tạo `src/components/ui/AppInput.tsx`
- [x] Tạo `src/components/ui/AppTextarea.tsx`
- [x] Tạo `src/components/ui/AppSelect.tsx`
- [x] Tạo `src/components/ui/AppPanel.tsx`
- [x] Tạo `src/components/ui/AppBadge.tsx`
- [x] Tạo `src/components/ui/AppAvatar.tsx`
- [x] Tạo `src/components/ui/AppSpinner.tsx`
- [x] Tạo `src/components/ui/AppSkeleton.tsx`
- [x] Tạo `src/components/ui/index.ts`
- [x] Kiểm tra các component export/import sạch
- [x] Chạy `npm run lint`

## Giai đoạn 4: App UI overlay/state components

- [x] Tạo `src/components/ui/AppDialog.tsx`
- [x] Tạo `src/components/ui/AppAlertDialog.tsx`
- [x] Tạo `src/components/ui/AppTooltip.tsx`
- [x] Tạo `src/components/ui/AppEmptyState.tsx`
- [x] Tạo `src/components/ui/AppErrorState.tsx`
- [x] Tạo `src/components/ui/AppSectionHeader.tsx`
- [x] Cập nhật `src/components/ui/index.ts`
- [x] Chạy `npm run lint`

## Giai đoạn 5: Refactor module Auth

- [x] Refactor `src/components/auth/LoginForm.tsx`
- [x] Refactor `src/components/auth/RegisterForm.tsx`
- [x] Refactor `src/components/auth/ForgotPasswordForm.tsx`
- [x] Refactor `src/components/auth/ResetPasswordForm.tsx`
- [x] Refactor `src/app/[locale]/(auth)/login/page.tsx`
- [x] Refactor `src/app/[locale]/(auth)/register/page.tsx`
- [x] Refactor `src/app/[locale]/(auth)/forgot-password/page.tsx`
- [x] Refactor `src/app/[locale]/(auth)/reset-password/page.tsx`
- [x] Chạy `npm run lint`
- [x] Ghi chú vấn đề còn lại nếu có

## Giai đoạn 5: Refactor module Profile

- [x] Refactor `src/app/[locale]/profile/page.tsx`
- [x] Refactor `src/app/[locale]/u/[username]/page.tsx`
- [x] Refactor `src/components/profile/ProfileDashboard.tsx`
- [x] Refactor `src/components/profile/ProfileStats.tsx`
- [x] Refactor `src/components/profile/ProfileSettingsForm.tsx`
- [x] Refactor `src/components/profile/ProfilePostsList.tsx`
- [x] Refactor `src/components/profile/ProfileAvatar.tsx`
- [x] Chạy `npm run lint`
- [x] Ghi chú vấn đề còn lại nếu có

## Giai đoạn 5: Refactor module Recommendations

- [x] Refactor `src/app/[locale]/profile/recommendations/page.tsx`
- [x] Refactor `src/app/[locale]/profile/recommendations/loading.tsx`
- [x] Refactor `src/components/recommendations/RecommendationLoading.tsx`
- [x] Refactor `src/components/recommendations/RecommendationSessionPanel.tsx`
- [x] Chạy `npm run lint`
- [x] Ghi chú vấn đề còn lại nếu có

## Giai đoạn 5: Refactor module Layout

- [x] Refactor `src/components/layout/Navbar.tsx`
- [x] Refactor `src/components/layout/Footer.tsx`
- [x] Refactor `src/components/auth/AuthButton.tsx`
- [x] Chạy `npm run lint`
- [x] Ghi chú vấn đề còn lại nếu có

## Giai đoạn 5: Refactor module Search

- [x] Refactor `src/components/search/SearchBar.tsx`
- [x] Refactor `src/components/search/FilterPanel.tsx`
- [x] Chạy `npm run lint`
- [x] Ghi chú vấn đề còn lại nếu có

## Giai đoạn 5: Refactor module Anime và Anime List

- [x] Refactor `src/components/anime/AnimeCard.tsx`
- [x] Refactor `src/components/anime/HeroSection.tsx`
- [x] Refactor `src/components/anime/TrailerModalButton.tsx`
- [x] Refactor `src/app/[locale]/anime/[id]/page.tsx`
- [x] Refactor `src/components/anime-list/AnimeListButton.tsx`
- [x] Refactor `src/components/anime-list/AnimeListEditor.tsx`
- [x] Refactor `src/lib/anime-list/constants.ts`
- [x] Chạy `npm run lint`
- [x] Ghi chú vấn đề còn lại nếu có

## Giai đoạn 5: Refactor module Social

- [x] Refactor `src/components/social/CreatePostButton.tsx`
- [x] Refactor `src/components/social/feed/SocialFeedPage.tsx`
- [x] Refactor `src/components/social/feed/SocialFeedList.tsx`
- [x] Refactor `src/components/social/feed/SocialPostCard.tsx`
- [x] Refactor `src/components/social/feed/SocialPostCommentsModal.tsx`
- [x] Refactor `src/components/social/feed/SocialPostImageViewer.tsx`
- [x] Refactor `src/components/social/feed/SocialPostImages.tsx`
- [x] Refactor `src/components/social/feed/SocialPostAnime.tsx`
- [x] Chạy `npm run lint`
- [x] Ghi chú vấn đề còn lại nếu có

## Giai đoạn 6: Cleanup hard-code

- [x] Search `#[0-9a-fA-F]{3,8}` trong `src`
- [x] Search `bg-[#` trong `src`
- [x] Search `text-[#` trong `src`
- [x] Search `border-[#` trong `src`
- [x] Search `rounded-` trong các component đã refactor
- [x] Phân loại hard-code hợp lệ: SVG/logo/status/API dynamic color
- [x] Refactor hard-code không hợp lệ còn sót
- [x] Chạy `npm run lint`
- [x] Chạy `npm run build` nếu phạm vi thay đổi lớn (không cần chạy vì phạm vi cleanup hẹp)

## Ghi chú tiến độ

### 2026-05-14

- Tạo kế hoạch tổng thể trong `docs/PLAN-app-ui-system.md`.
- Tạo todo tracking trong `docs/TODO-app-ui-system.md`.
- Hoàn thành theme token, helper `cn`, core `App*` components và refactor module Auth.
- `npm run lint` pass.
- `npm run build` pass sau khi chạy ngoài sandbox do sandbox bị `EPERM: operation not permitted, lstat 'C:\Users\phiph'`.
- Kiểm tra HTTP trên dev server có sẵn ở `http://localhost:3000`: `/vi/login`, `/vi/register`, `/vi/forgot-password`, `/vi/reset-password` đều trả `200`.
- Không chạy được `agent-browser` vì CLI chưa có trong PATH; chưa có kiểm tra browser/screenshot.
- Hoàn thành overlay/state components: `AppDialog`, `AppAlertDialog`, `AppTooltip`, `AppEmptyState`, `AppErrorState`, `AppSectionHeader`.
- Refactor một phần module Profile: public profile page, `ProfileAnimeList`, `ProfileStats`, `ProfileSettingsForm`, `ProfileAvatar`.
- `ProfileDashboard` và `ProfilePostsList` vẫn còn nhiều hard-code, cần xử lý riêng ở lượt tiếp theo.
- Hoàn thành module Profile: `src/app/[locale]/profile/page.tsx`, `ProfileDashboard`, `ProfilePostsList` đã được chuẩn hóa sang token/App UI trong phạm vi phù hợp.
- `ProfileDashboard` vẫn giữ màu chart status hard-code vì đây là màu semantic theo trạng thái, thuộc nhóm hợp lệ theo kế hoạch.
- `npm run lint` pass.
- Hoàn thành module Recommendations: page/loading và `RecommendationSessionPanel` đã chuyển sang token/App UI; không còn hard-code màu dạng hex trong module ngoài fallback text `Anime #id`.
- `npm run lint` pass.
- Hoàn thành module Layout: `Navbar`, `Footer`, `AuthButton` đã chuyển sang token theme trong phạm vi UI.
- `Footer` vẫn giữ các link placeholder `href="#"` có sẵn cho account/social vì lượt này chỉ chuẩn hóa style, không đổi behavior.
- `npm run lint` pass.
- Hoàn thành module Search: `SearchBar` và `FilterPanel` đã chuyển sang token/App UI, giữ nguyên logic query/filter/drawer hiện có.
- `npm run lint` pass.
- Hoàn thành module Anime và Anime List: `AnimeCard`, `HeroSection`, `TrailerModalButton`, trang chi tiết anime, `AnimeListButton`, `AnimeListEditor` đã chuyển sang token/App UI trong phạm vi style.
- `src/lib/anime-list/constants.ts` giữ nguyên các class màu trạng thái semantic vì thuộc nhóm hard-code hợp lệ theo kế hoạch.
- `npm run lint` pass.
- Hoàn thành module Social: create/edit post modal, feed page/list, post card, comments modal, image viewer, post images và anime chips đã chuyển sang token/App UI trong phạm vi style.
- Các text fallback `Anime #id` và `#id` trong Social được giữ nguyên vì không phải màu hard-code.
- `npm run lint` pass.
- Hoàn thành cleanup hard-code: không còn `bg-[#...]`, `text-[#...]`, `border-[#...]` trong `src`; các hex còn lại được phân loại là token CSS, OG/SEO, SVG/logo Google hoặc màu chart/status semantic hợp lệ.
- Chuẩn hóa thêm `layout.tsx`, `ToastProvider`, `MotionSection`, `HorizontalScroll`, `SearchResultsClient` và một vài radius còn sót sang token/App UI.
- `npm run lint` pass.
- Không chạy `npm run build` vì phạm vi thay đổi là cleanup style hẹp, không thay đổi luồng dữ liệu hoặc API component.
