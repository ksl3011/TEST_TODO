# 배포 가이드 — Todo 앱

이 앱은 **순수 정적 파일** (HTML/CSS/JS)로 구성되어 있어 별도 서버가 필요 없습니다.  
백엔드는 Supabase가 담당하므로 파일 4개(`index.html`, `style.css`, `app.js`, `SUPABASE.md`)만 어디든 올리면 됩니다.

---

## 배포 전 필수: Supabase URL 설정

이메일 인증 링크 및 **소셜 로그인(Google/GitHub) 리다이렉트**가 올바른 주소로 돌아오려면 반드시 설정해야 합니다.

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: 배포된 주소로 변경 (예: `https://ksl3011.github.io/TEST_TODO`)
3. **Redirect URLs**: 아래 주소를 **모두** 추가 후 **Save**
   - 배포 URL: `https://ksl3011.github.io/TEST_TODO`
   - 로컬 테스트 URL: `http://localhost:8765`

> **중요**: 이 설정을 빠뜨리면 소셜 로그인 후 Site URL(기본값 localhost)로 강제 리다이렉트됩니다.  
> Redirect URLs에 없는 주소는 Supabase가 보안상 거부하고 Site URL로 대체합니다.

---

## 옵션 A — Netlify Drop (가장 빠름, 로그인 불필요)

1. [https://app.netlify.com/drop](https://app.netlify.com/drop) 접속
2. `todo/` 폴더 전체를 브라우저에 **끌어다 놓기**
3. 수 초 뒤 `https://랜덤이름.netlify.app` URL 발급
4. 위의 Supabase URL 설정에 이 주소 등록

> 폴더를 드래그할 때 `todo` 폴더 **안의 파일들**이 아닌, 폴더 자체를 드롭하면 됩니다.  
> URL을 고정하려면 Netlify 계정을 만들고 Site name을 변경하세요.

---

## 옵션 B — Netlify + GitHub 연동 (자동 배포, 권장)

코드를 push할 때마다 자동으로 재배포됩니다.

1. [netlify.com](https://netlify.com) 가입 → **Add new site → Import an existing project**
2. GitHub 연동 후 `kosa-vibecoding-2026-2nd` 저장소 선택
3. 아래와 같이 설정:

   | 항목 | 값 |
   |------|----|
   | Base directory | `src/exercise/ksl3011/day03/todo` |
   | Publish directory | `src/exercise/ksl3011/day03/todo` |
   | Build command | (비워두기) |

4. **Deploy site** 클릭
5. Supabase URL 설정에 발급된 주소 등록

---

## 옵션 C — Vercel (GitHub 연동)

1. [vercel.com](https://vercel.com) 가입 → **Add New Project**
2. GitHub 저장소 선택
3. 아래와 같이 설정:

   | 항목 | 값 |
   |------|----|
   | Root Directory | `src/exercise/ksl3011/day03/todo` |
   | Framework Preset | Other |
   | Build Command | (비워두기) |
   | Output Directory | `.` |

4. **Deploy** 클릭
5. Supabase URL 설정에 발급된 `*.vercel.app` 주소 등록

---

## 옵션 D — GitHub Pages (GitHub Actions)

모노레포 구조상 서브폴더를 Pages로 배포하려면 Actions 워크플로우가 필요합니다.

저장소 루트에 아래 파일을 생성하세요:  
`.github/workflows/deploy-todo.yml`

```yaml
name: Deploy Todo App

on:
  push:
    branches: [main]
    paths:
      - 'src/exercise/ksl3011/day03/todo/**'

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: src/exercise/ksl3011/day03/todo
```

워크플로우 파일을 push한 뒤:

1. 저장소 → **Settings → Pages → Source**: `gh-pages` 브랜치, `/` (root) 선택
2. 배포 URL: `https://weable-kosa.github.io/kosa-vibecoding-2026-2nd/`
3. Supabase URL 설정에 이 주소 등록

---

## 배포 후 확인

| 확인 항목 | 방법 |
|-----------|------|
| 앱 로드 | 배포 URL 접속 → 로그인 화면 표시 확인 |
| 로그인 | 기존 계정으로 로그인 → 할일 목록 표시 확인 |
| 할일 추가 | 추가 후 Supabase Table Editor에서 `user_id` 확인 |
| 계정 분리 | 다른 계정으로 로그인 → 서로 다른 할일 목록 확인 |
| 회원가입 | 새 이메일로 가입 → 이메일 확인 링크가 배포 URL로 오는지 확인 |

---

## 구조 요약

```
todo/
├── index.html   ← 진입점
├── style.css    ← Material Design 3 스타일
├── app.js       ← Supabase 연동 로직 (SUPABASE_URL, SUPABASE_ANON_KEY 포함)
├── SUPABASE.md  ← Supabase 설정 가이드
└── DEPLOY.md    ← 이 파일
```

> **anon 키 보안**: `app.js`에 포함된 `SUPABASE_ANON_KEY`는 공개해도 안전한 키입니다.  
> RLS 정책이 인증된 사용자의 본인 데이터만 허용하므로 키가 노출되어도 데이터는 보호됩니다.  
> `service_role` 키는 절대 프론트엔드 코드에 포함하지 마세요.
