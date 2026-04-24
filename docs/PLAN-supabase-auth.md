# 🔐 PLAN: Supabase Auth — Đăng Ký & Đăng Nhập

## Overview

Thêm hệ thống xác thực người dùng (register/login/logout) vào **Animez v2** bằng **Supabase Auth**.  
Dự án hiện tại: Next.js 16 App Router, TypeScript, Tailwind v4, next-intl (vi/en), không có database.

**Mục tiêu bước đầu:**
- Người dùng đăng ký bằng email + password
- Người dùng đăng nhập / đăng xuất
- Session được bảo vệ qua middleware (SSR-safe)
- UI auth tích hợp vào Navbar hiện có

---

## Project Type

**WEB** — Agent chính: `frontend-specialist` + `security-auditor`

---

## Success Criteria

- [ ] User có thể đăng ký tài khoản mới qua email/password
- [ ] User có thể đăng nhập và session được lưu (cookie httpOnly)
- [ ] User có thể đăng xuất
- [ ] Navbar hiển thị avatar/tên user khi đã đăng nhập, nút Login khi chưa
- [ ] Middleware bảo vệ route (ví dụ: `/profile`) redirect về `/login` nếu chưa auth
- [ ] i18n hỗ trợ đầy đủ (vi/en) cho toàn bộ UI auth
- [ ] Build không có lỗi TypeScript

---

## Tech Stack

| Thư viện | Lý do |
|---|---|
| `@supabase/supabase-js` | Supabase client chính |
| `@supabase/ssr` | SSR-safe cookie handling cho Next.js App Router |
| Supabase Cloud | Hosted auth + user database (free tier) |
| Next.js Middleware | Kết hợp i18n (next-intl) + auth guard |

> ⚠️ **Quan trọng:** Middleware hiện tại chỉ có next-intl. Cần chain thêm Supabase session refresh vào đây.

---

## File Structure (Mới & Sửa đổi)

```
animez_v2/
├── .env.local                              [NEW] Supabase URL + anon key
├── src/
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts                   [NEW] Browser client
│   │       └── server.ts                   [NEW] Server client (SSR)
│   ├── app/
│   │   └── [locale]/
│   │       ├── (auth)/                     [NEW] Route group - không có Navbar/Footer
│   │       │   ├── login/
│   │       │   │   └── page.tsx            [NEW] Login page
│   │       │   └── register/
│   │       │       └── page.tsx            [NEW] Register page
│   │       └── layout.tsx                  [MODIFY] Truyền session xuống
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx               [NEW] Form đăng nhập
│   │   │   ├── RegisterForm.tsx            [NEW] Form đăng ký
│   │   │   └── AuthButton.tsx              [NEW] Avatar / Login button cho Navbar
│   │   └── layout/
│   │       └── Navbar.tsx                  [MODIFY] Thêm AuthButton
│   ├── hooks/
│   │   └── useAuth.ts                      [NEW] Hook lấy session phía client
│   └── i18n/
│       ├── messages/en.json                [MODIFY] Thêm key auth
│       └── messages/vi.json                [MODIFY] Thêm key auth
└── middleware.ts                           [MODIFY] Chain next-intl + Supabase session
```

---

## Task Breakdown

### 🔵 PHASE 0 — Foundation (Blockers)

---

#### TASK-01: Setup Supabase Project & Environment
- **Agent:** `security-auditor`
- **Skill:** `deployment-procedures`
- **Priority:** P0 (Blocker)
- **Dependencies:** Không có

**INPUT:**
- Cần có tài khoản Supabase tại https://supabase.com

**OUTPUT:**
- Tạo project trên Supabase Dashboard
- Copy `SUPABASE_URL` và `SUPABASE_ANON_KEY`
- Tạo file `.env.local` tại project root

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**VERIFY:**
- `.env.local` tồn tại và có 2 biến trên
- `.env.local` được liệt kê trong `.gitignore` ✅ (đã có sẵn)

---

#### TASK-02: Cài đặt dependencies
- **Agent:** `backend-specialist`
- **Priority:** P0 (Blocker)
- **Dependencies:** TASK-01

**INPUT:** `/` project root

**OUTPUT:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**VERIFY:**
- `package.json` có `@supabase/supabase-js` và `@supabase/ssr`
- `npm install` không báo lỗi

---

#### TASK-03: Tạo Supabase Client Helpers
- **Agent:** `backend-specialist`
- **Skill:** `nodejs-best-practices`
- **Priority:** P0 (Blocker)
- **Dependencies:** TASK-02

**INPUT:** `src/lib/supabase/`

**OUTPUT:**
- `client.ts` — `createBrowserClient()` dùng phía Client Component
- `server.ts` — `createServerClient()` dùng phía Server Component (đọc cookie từ Next.js `cookies()`)

**VERIFY:**
- TypeScript compile không lỗi (`npx tsc --noEmit`)
- Import được từ `@/lib/supabase/client` và `@/lib/supabase/server`

---

### 🟡 PHASE 1 — Middleware & Session (Core)

---

#### TASK-04: Cập nhật Middleware — Chain i18n + Supabase
- **Agent:** `security-auditor`
- **Skill:** `nodejs-best-practices`
- **Priority:** P1
- **Dependencies:** TASK-03

**INPUT:** `middleware.ts` (hiện tại chỉ có next-intl)

**OUTPUT:**  
Middleware mới làm 2 việc theo thứ tự:
1. Refresh Supabase session (update cookie nếu token hết hạn)
2. Chạy next-intl routing

**VERIFY:**
- Đăng nhập xong, refresh trang → vẫn còn session
- Không có lỗi 500 khi truy cập bất kỳ route nào

---

#### TASK-05: Tạo `useAuth` hook (Client-side)
- **Agent:** `frontend-specialist`
- **Priority:** P1
- **Dependencies:** TASK-03

**INPUT:** `src/hooks/`

**OUTPUT:**  
`useAuth.ts` — hook dùng `onAuthStateChange` để lắng nghe session, trả về `{ user, session, loading }`

**VERIFY:**
- Hook hoạt động trong Client Component
- Khi đăng xuất, `user` trở về `null`

---

### 🟢 PHASE 2 — UI Components

---

#### TASK-06: Tạo LoginForm Component
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P2
- **Dependencies:** TASK-03

**INPUT:** `src/components/auth/`

**OUTPUT:**  
`LoginForm.tsx` — Form với:
- Email input, Password input
- Nút Submit với loading state
- Hiển thị error message
- Link sang `/register`
- Gọi `supabase.auth.signInWithPassword()`

**VERIFY:**
- Đăng nhập đúng → redirect sang trang chủ
- Sai password → hiện thông báo lỗi đúng ngôn ngữ (vi/en)
- Loading state hiển thị khi đang gọi API

---

#### TASK-07: Tạo RegisterForm Component
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P2
- **Dependencies:** TASK-03

**INPUT:** `src/components/auth/`

**OUTPUT:**  
`RegisterForm.tsx` — Form với:
- Email, Password, Confirm Password inputs
- Validation (password match, min length 6)
- Gọi `supabase.auth.signUp()`
- Thông báo "Kiểm tra email xác nhận" sau khi đăng ký

**VERIFY:**
- Đăng ký thành công → hiển thị thông báo kiểm tra email
- Email trùng → hiện lỗi rõ ràng
- Password không khớp → lỗi client-side trước khi gọi API

---

#### TASK-08: Tạo các trang Login & Register
- **Agent:** `frontend-specialist`
- **Priority:** P2
- **Dependencies:** TASK-06, TASK-07

**INPUT:** `src/app/[locale]/(auth)/`

**OUTPUT:**
- `login/page.tsx` — Trang đăng nhập, centered layout, premium design
- `register/page.tsx` — Trang đăng ký

**VERIFY:**
- Truy cập `/{locale}/login` → render LoginForm
- Truy cập `/{locale}/register` → render RegisterForm
- Responsive trên mobile và desktop

---

#### TASK-09: Tạo AuthButton & Cập nhật Navbar
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P2
- **Dependencies:** TASK-05

**INPUT:** `src/components/auth/AuthButton.tsx`, `src/components/layout/Navbar.tsx`

**OUTPUT:**  
`AuthButton.tsx`:
- Nếu chưa login → nút "Đăng nhập" → navigate tới `/{locale}/login`
- Nếu đã login → hiển thị avatar (initials của email), dropdown với "Đăng xuất"
- Gọi `supabase.auth.signOut()` khi logout → redirect về trang chủ

**VERIFY:**
- Navbar hiển thị đúng trạng thái auth
- Đăng xuất → Navbar cập nhật ngay lập tức (real-time với `onAuthStateChange`)

---

### 🔵 PHASE 3 — i18n & Bảo vệ Route

---

#### TASK-10: Thêm i18n keys cho Auth UI
- **Agent:** `frontend-specialist`
- **Skill:** `i18n-localization`
- **Priority:** P2
- **Dependencies:** TASK-06, TASK-07

**INPUT:** `messages/en.json`, `messages/vi.json`

**OUTPUT:**  
Thêm namespace `auth` vào cả 2 file:
```json
{
  "auth": {
    "login": "Login",
    "register": "Register",
    "logout": "Logout",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "loginButton": "Sign In",
    "registerButton": "Create Account",
    "checkEmail": "Check your email to confirm registration",
    "invalidCredentials": "Invalid email or password",
    "passwordMismatch": "Passwords do not match"
  }
}
```

**VERIFY:**
- Switch sang tiếng Việt → tất cả UI auth hiển thị tiếng Việt
- Switch sang tiếng Anh → hiển thị tiếng Anh

---

#### TASK-11: (Tùy chọn) Route Guard cho trang Profile
- **Agent:** `security-auditor`
- **Priority:** P3
- **Dependencies:** TASK-04

**INPUT:** `middleware.ts`

**OUTPUT:**  
Thêm logic: nếu user truy cập `/profile` (hoặc các protected routes) mà chưa login → redirect về `/{locale}/login`

**VERIFY:**
- Truy cập `/{locale}/profile` khi chưa login → tự redirect sang login page

---

## Dependency Graph

```
TASK-01 ──► TASK-02 ──► TASK-03 ──┬──► TASK-04 ──► TASK-11
                                   ├──► TASK-05 ──► TASK-09
                                   ├──► TASK-06 ──► TASK-08
                                   └──► TASK-07 ──► TASK-08
TASK-08 + TASK-10 ──► ✅ DONE
```

---

## ⚠️ Rủi ro & Lưu ý

| Rủi ro | Giải pháp |
|---|---|
| Middleware chain next-intl + Supabase phức tạp | Dùng pattern từ docs Supabase SSR chính thức |
| Email xác nhận khi đăng ký | Có thể tắt trong Supabase Dashboard > Auth > Email Confirmations để test nhanh |
| Cookie vs JWT session | Dùng `@supabase/ssr` để đảm bảo cookie httpOnly, không lộ token |
| `useAuth` re-render Navbar | Wrap trong `useMemo` hoặc dùng React Context nếu cần |

---

## Phase X: Verification Checklist

```bash
# 1. TypeScript check
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Build
npm run build

# 4. Security scan
python .agent/skills/vulnerability-scanner/scripts/security_scan.py .

# 5. UX Audit
python .agent/skills/frontend-design/scripts/ux_audit.py .
```

**Manual Tests:**
- [ ] Đăng ký tài khoản mới → nhận email xác nhận → xác nhận → đăng nhập được
- [ ] Đăng nhập sai password → hiển thị lỗi
- [ ] Đăng nhập đúng → Navbar cập nhật → refresh trang vẫn còn session
- [ ] Đăng xuất → Navbar quay về trạng thái guest
- [ ] Switch ngôn ngữ → UI auth hiển thị đúng ngôn ngữ được chọn

---

*Plan created: 2026-02-25 | Agent: project-planner*
