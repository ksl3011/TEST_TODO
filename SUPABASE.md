# Supabase 연동 가이드 — Todo 앱

Supabase는 PostgreSQL 기반의 오픈소스 BaaS(Backend-as-a-Service)입니다.  
Firebase 대안으로, 무료 플랜에서도 데이터베이스·인증·실시간 구독을 제공합니다.

---

## 1. 가입 & 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 접속 → **Start your project** 클릭
2. GitHub 계정 또는 이메일로 가입
3. 대시보드에서 **New project** 클릭
4. 아래 항목 입력:
   | 항목 | 권장값 |
   |------|--------|
   | Organization | 기본값 (자동 생성) |
   | Name | `todo-app` (자유) |
   | Database Password | 안전한 비밀번호 (반드시 저장해두기) |
   | Region | **Northeast Asia (Tokyo)** |
5. **Create new project** 클릭 → 프로비저닝 약 1분 대기

---

## 2. 테이블 생성

프로젝트 대시보드 좌측 메뉴 → **SQL Editor** → **New query**  
아래 SQL을 전체 복사해서 붙여넣고 **Run** (또는 `Ctrl+Enter`):

```sql
-- todos 테이블
CREATE TABLE todos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  text        text        NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  done        boolean     NOT NULL DEFAULT false,
  priority    text        NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('high', 'medium', 'low')),
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS 활성화 (학습용: 전체 공개)
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON todos FOR ALL USING (true) WITH CHECK (true);

-- 조회 성능 인덱스
CREATE INDEX ON todos (priority, sort_order);
```

### 컬럼 설명

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | 기본키, 자동 생성 |
| `text` | text | 할일 내용 (1~500자) |
| `done` | boolean | 완료 여부 |
| `priority` | text | `'high'` / `'medium'` / `'low'` |
| `sort_order` | integer | 같은 우선순위 그룹 내 표시 순서 |
| `created_at` | timestamptz | 생성 시각 (자동) |
| `updated_at` | timestamptz | 수정 시각 (트리거로 자동 갱신) |

---

## 3. API 키 확인

프로젝트 대시보드 → **Project Settings** (좌측 하단 톱니바퀴) → **API** 탭

| 항목 | 위치 | 용도 |
|------|------|------|
| **Project URL** | "Project URL" 섹션 | Supabase 엔드포인트 |
| **anon public** | "Project API keys" 섹션 | 프론트엔드용 공개 키 |
| service_role | "Project API keys" 섹션 | ⚠️ 절대 노출 금지 |

> **보안 주의**  
> `anon` 키는 RLS 정책을 통해 제한되므로 프론트엔드 코드에 포함해도 안전합니다.  
> `service_role` 키는 RLS를 무시하므로 서버사이드에서만 사용하고 절대 공개하지 마세요.

---

## 4. 앱에 연동

### 4-1. `index.html` — Supabase JS SDK 추가

`app.js` `<script>` 태그 바로 앞에 다음을 추가합니다:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="app.js" defer></script>
```

### 4-2. `app.js` 최상단 — 연결 정보 설정

`app.js` 첫 두 줄을 실제 값으로 교체합니다:

```js
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co'; // 3번에서 복사한 Project URL
const SUPABASE_ANON_KEY = 'eyJ...';                               // 3번에서 복사한 anon public 키
```

---

## 5. 기존 localStorage 데이터 이전 (선택)

브라우저 콘솔(`F12` → Console)에서 기존 데이터를 확인합니다:

```js
JSON.parse(localStorage.getItem('ksl3011-todos'))
```

Supabase SQL Editor에서 직접 INSERT로 이전할 수 있습니다:

```sql
INSERT INTO todos (text, done, priority, sort_order) VALUES
  ('기존 할일 1', false, 'high',   1),
  ('기존 할일 2', true,  'medium', 1),
  ('기존 할일 3', false, 'low',    1);
```

---

## 6. 동작 확인

1. 앱 실행:
   ```bash
   python3 -m http.server 8765
   # 브라우저: http://localhost:8765/index.html
   ```

2. 할일 추가 → Supabase 대시보드 **Table Editor** → `todos` 테이블에서 행 확인

3. 체크박스 클릭 → `done` 컬럼이 `true`로 변경되는지 확인

4. 드래그앤드롭 → `sort_order` / `priority` 컬럼 변경 확인

5. 브라우저 새로고침 → 데이터가 Supabase에서 불러와져 유지되는지 확인

6. 다른 기기나 탭에서 같은 URL 접속 → 동일한 할일 목록 표시

---

## 7. 향후 확장 옵션

| 기능 | 방법 |
|------|------|
| 사용자별 할일 분리 | Supabase Auth 활성화 + RLS에 `auth.uid()` 조건 추가 |
| 실시간 동기화 | `supabase.channel()` 구독으로 다른 탭/기기 즉시 반영 |
| 배포 | GitHub Pages, Netlify, Vercel 등에 정적 파일 배포 |
