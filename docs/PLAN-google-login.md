# 🔐 PLAN: Đăng nhập bằng Google (Google OAuth)

## Overview

Thêm tính năng đăng nhập bằng tài khoản Google (Google OAuth) vào **Animez v2** sử dụng **Supabase Auth**.
Dự án hiện tại: Next.js 16 App Router, TypeScript, Tailwind v4, next-intl (vi/en), đã có hệ thống auth email/password với `@supabase/ssr`.

**Mục tiêu bước đầu:**
- Người dùng có thể đăng nhập bằng Google (Option A: Server-Side Flow với Route Handler).
- Nút "Đăng nhập bằng Google" chỉ xuất hiện ở trang `/[locale]/login`.
- Đăng nhập thành công sẽ chuyển thẳng về trang chủ (không qua bước cập nhật thông tin).
- Tự động tạo tài khoản (nếu chưa có) và đồng bộ session an toàn qua cookie httpOnly.

---

## Project Type

**WEB** — Agent chính: `frontend-specialist` + `backend-specialist`

---

## Success Criteria

- [ ] Lấy được Client ID và Client Secret từ Google Cloud Console.
- [ ] Cấu hình thành công Provider Google trên Supabase Dashboard.
- [ ] Nút "Đăng nhập bằng Google" hiển thị đúng ở trang `/[locale]/login`.
- [ ] OAuth flow hoạt động: Click nút -> Chuyển hướng sang Google -> Xác thực -> Quay về callback route -> Tạo session cookie -> Redirect về trang chủ.
- [ ] Chống CSRF/Fix Hydration issues với Route Handler `/auth/callback/route.ts` (Option A).
- [ ] i18n hỗ trợ text cho nút đăng nhập Google.

---

## Tech Stack

| Thư viện | Lý do |
|---|---|
| `@supabase/supabase-js`, `@supabase/ssr` | Tái sử dụng hệ thống Auth hiện tại |
| Next.js Route Handlers | Cấp đổi `code` lấy session an toàn phía Server (Option A) đảm bảo Cookie httpOnly |
| Google Cloud Console | Cung cấp OAuth 2.0 Client credentials |

---

## File Structure (Mới & Sửa đổi)

```
animez_v2/
├── .env.local                              [MODIFY] (Có thể cần thêm biến cục bộ nếu cần URL cụ thể, nhưng thường dùng auth callback)
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts                [NEW] Route Handler để xử lý Auth Code -> Session
│   │   └── [locale]/
│   │       └── (auth)/
│   │           └── login/
│   │               └── page.tsx            [MODIFY] Trang Login hiện tại (nếu cần thay cấu trúc)
│   ├── components/
│   │   └── auth/
│   │       └── LoginForm.tsx               [MODIFY] Thêm nút "Đăng nhập bằng Google"
│   └── i18n/
│       ├── messages/en.json                [MODIFY] Thêm text nút Google
│       └── messages/vi.json                [MODIFY] Thêm text nút Google
```

---

## Task Breakdown

### 🔵 PHASE 0 — Setup Google Provider (Manual block)

---

#### TASK-01: Tạo Google Cloud OAuth Credentials
- **Agent:** `project-planner` (Hướng dẫn)
- **Priority:** P0 (Blocker)
- **Dependencies:** Không có

**INPUT:**
- Truy cập [Google Cloud Console](https://console.cloud.google.com).

**OUTPUT (Làm tay):**
1. Tạo project mới (hoặc dùng project cũ).
2. Thiết lập "OAuth consent screen" (Màn hình đồng ý OAuth) thành External. Cấu hình tên App, Logo, Support Email.
3. Vào "Credentials" -> Tạo "OAuth 2.0 Client IDs" (Web application).
4. **Authorized redirect URIs**: Cấu hình URL callback từ Supabase: `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`.
5. Lấy **Client ID** và **Client secret**.

**VERIFY:**
- Có Client ID và Client Secret.

---

#### TASK-02: Cấu hình Supabase Dashboard
- **Agent:** `project-planner` (Hướng dẫn)
- **Priority:** P0 (Blocker)
- **Dependencies:** TASK-01

**INPUT:**
- Supabase Dashboard -> Authentication -> Providers -> Google.

**OUTPUT (Làm tay):**
1. Bật bật Google provider.
2. Điền **Client ID** và **Client secret** lấy từ kết quả của TASK-01.
3. Bật tuỳ chọn "Skip nonce check" (tuỳ theo setup nếu dùng Next.js Server Actions, nhưng thường với standard flow thì cứ để default).
4. Save.

**VERIFY:**
- Provider Google hiển thị "Enabled" trên Supabase.

---

### 🟡 PHASE 1 — Server-Side OAuth Handler

---

#### TASK-03: Tạo Callback Route Handler
- **Agent:** `backend-specialist`
- **Skill:** `nodejs-best-practices`
- **Priority:** P1
- **Dependencies:** TASK-02

**INPUT:** `src/app/auth/callback/route.ts`

**OUTPUT:**
Route Handler (GET) nhận `code` từ URL params. Dùng `createServerClient` (từ `src/lib/supabase/server.ts`) gọi vòng đổi mã code lấy session: `supabase.auth.exchangeCodeForSession(code)`. 
Thành công thì redirect về `/` (trang chủ). Lỗi thì redirect về `/login?error=oauth_failed`.

**VERIFY:**
- Truy cập GET `/auth/callback?code=xxx` chạy đúng logic đổi Code.

---

### 🟢 PHASE 2 — UI & Tương tác

---

#### TASK-04: Thêm i18n keys cho nút Google
- **Agent:** `frontend-specialist`
- **Skill:** `i18n-localization`
- **Priority:** P2
- **Dependencies:** Không có

**INPUT:** `src/i18n/messages/en.json`, `src/i18n/messages/vi.json`

**OUTPUT:**
Thêm text (VD: `loginWithGoogle`: "Continue with Google" / "Đăng nhập bằng Google") vào namespace `auth`.

**VERIFY:**
- JSON chuẩn format syntax.

---

#### TASK-05: Cập nhật component LoginForm
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P1
- **Dependencies:** TASK-03, TASK-04

**INPUT:** `src/components/auth/LoginForm.tsx`

**OUTPUT:**
- Thêm divider (hoặc dòng chữ "Hoặc") và một nút (Button) "Đăng nhập bằng Google" có biểu tượng Google.
- Hàm `handleGoogleLogin` gọi logic Supabase:
  ```typescript
  supabase.auth.signInWithOAuth({ 
    provider: 'google', 
    options: { 
      redirectTo: `${window.location.origin}/auth/callback` 
    } 
  })
  ```
- Thêm loading state cho nút này nếu cần.

**VERIFY:**
- Nút Google chỉ hiển thị trên trang Login. Bấm vào sẽ redirect thành công sang phía Google.

---

## Dependency Graph

```
TASK-01 ──► TASK-02 ──► TASK-03 ──► TASK-05
                                  /
TASK-04 ─────────────────────────/
```

---

## ⚠️ Rủi ro & Lưu ý

| Rủi ro | Giải pháp |
|---|---|
| Redirect URI không đúng mội trường (localhost vs prod) | Đảm bảo `redirectTo` lấy linh hoạt từ `window.location.origin` (lúc run trên client) thay vì hardcode localhost. |
| Auth Code flow trả về lỗi | Kiểm tra kỹ Callback URL của Supabase nhập trên màn Credentials của Google |
| Mất trạng thái đa ngôn ngữ | Đảm bảo chuyển hướng về đúng `/[locale]/` sau khi đăng nhập thành công. Lấy locale từ next-intl middleware. |

---

## Phase X: Verification Checklist

```bash
# 1. TypeScript & Cú pháp
npx tsc --noEmit
npm run lint

# 2. Build Check
npm run build
```

**Manual Tests:**
- [ ] Bấm "Đăng nhập bằng Google", popup cấp quyền của Google hiện ra.
- [ ] Chọn tài khoản Google xong, trình duyệt redirect về `/auth/callback` với query params.
- [ ] Đổi session -> Redirect về trang chủ `/`. Navbar hiện trạng thái "Đã đăng nhập".

---

*Plan created: 2026-02-26 | Agent: project-planner*
