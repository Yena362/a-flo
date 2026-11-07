# AI 엔진(Gemini) 연결 가이드 — 비전공자용

## 한눈에 보기

```
[사용자 브라우저]  ──과제 글──▶  [Vercel 서버: api/analyze.js]  ──▶  [Google Gemini]
       ▲                              (API 키는 여기에만 보관)              │
       └──────────── 점수·감점·총평 ◀───────────────────────────────────────┘
```

- **왜 서버가 필요해요?** API 키는 "카드 비밀번호"와 같아요. 화면 코드에 넣으면 누구나 볼 수 있어서, 키는 Vercel 서버에만 숨겨 두고 서버가 대신 Gemini를 불러요.
- **규칙 엔진과 AI는 역할이 달라요.**
  - 규칙 엔진: APA 형식, 분량, 출처 표기 같은 **형식** 검사 (빠르고 정확, 무료)
  - Gemini: 주제에 맞는지, 논리가 맞는지, 교수님 지시를 지켰는지 같은 **내용** 평가
  - 둘을 합쳐 최종 점수를 내요. AI가 실패하면 규칙 엔진 결과만이라도 보여 줘요.

## 1. Gemini 키 받기 (5분)

1. [Google AI Studio](https://aistudio.google.com/apikey)에 구글 계정으로 로그인
2. **Create API key** 클릭 → 만들어진 키(`AQ.…` 또는 `AIza…`로 시작) 복사
3. 키는 카톡·GitHub·노션에 **절대 붙여 넣지 마세요.** 아래 Vercel 설정에만 넣어요.

## 2. 내 컴퓨터에서 키가 되는지 확인 (선택)

Node.js가 설치되어 있다면, 저장소 폴더에서:

```bash
# 맥
GEMINI_API_KEY=여기에키 npm run try-ai

# 윈도우 (명령 프롬프트)
set GEMINI_API_KEY=여기에키
npm run try-ai
```

예시 과제를 AI로 채점해서 "규칙 엔진만: 75점 C+ → AI 반영: ○○점" 같은 결과가 나오면 성공이에요.

## 3. Vercel에 올리기 (10분)

1. [vercel.com](https://vercel.com)에 **GitHub 계정으로 로그인**
2. **Add New → Project** → `a-flo` 저장소 **Import**
3. **Environment Variables** 칸에 추가
   | Name | Value |
   |---|---|
   | `GEMINI_API_KEY` | 1번에서 복사한 키 |
   | `GEMINI_MODEL` | (선택) 비워 두면 `gemini-3.5-flash-lite` |
4. **Deploy** 클릭 → 1~2분 뒤 `https://a-flo-○○○.vercel.app` 주소가 생겨요
5. 확인: 그 주소 뒤에 `/api/analyze`를 붙여 브라우저로 열어 보세요. `"ok": true, "keySet": true`가 보이면 서버와 키 설정이 끝난 거예요. (`keySet: false`면 3번의 키 설정을 다시 확인 후 Redeploy)

> 이후로는 GitHub에 코드를 올릴 때마다 Vercel이 **자동으로 다시 배포**해요. 브랜치마다 미리보기 주소도 따로 생겨요.

### 다른 사이트에서 우리 서버를 못 쓰게 막기 (권장)

배포 주소가 정해지면 환경 변수를 하나 더 넣어요:

| Name | Value |
|---|---|
| `ALLOWED_ORIGINS` | `https://a-flo-○○○.vercel.app` (여러 개면 쉼표로) |

## 4. 화면에서 쓰는 법 (화면 담당자에게 전달)

```js
import { analyzeWithAI, reapply } from './js/ai.js';

const { result, error } = await analyzeWithAI(input);   // input 모양은 docs/ENGINE.md와 같아요
// result: 결과 화면에 쓰는 값 (모양은 docs/ENGINE.md의 analyze() 결과와 같음)
// result.source === 'ai'    → AI까지 반영됨
// result.source === 'rules' → AI 실패, 규칙 엔진만 (error에 이유가 들어 있음)
```

- 분석 대기 화면은 AI 응답(보통 5~20초)을 기다리도록 해 주세요.
- 교정 에디터에서 수정안을 적용한 뒤에는 `reapply(새input, 이전ai결과)`를 쓰면 AI를 다시 부르지 않고 점수를 갱신해요(비용 절약).
- 새로 추가된 값: 지시사항 체크 항목마다 `met`(지켰는지)과 `evidence`(근거), 루브릭 항목에 `comment`(AI 한마디), AI가 찾은 감점은 `source: 'ai'`.

## 5. 꼭 알아야 할 것

| 항목 | 내용 |
|---|---|
| **개인정보** | 무료 요금제에서는 보낸 글이 **구글 제품 개선에 쓰여요.** 결제 계정을 연결한 유료 요금제는 쓰지 않아요. 시연·테스트는 예시 과제로 하고, 실제 학생 과제를 받기 전에는 유료로 바꾸고 서비스 약관에 안내 문구를 넣으세요. |
| **무료 한도** | 무료 한도는 구글 사정에 따라 예고 없이 줄어들 수 있어요. 발표·시연 날에는 미리 유료 전환을 고려하세요. 한도에 걸리면 앱은 "AI 사용량 한도" 안내 후 규칙 엔진 결과만 보여 줘요. |
| **비용 감각** | `gemini-3.5-flash-lite` 기준 입력 100만 토큰당 $0.30, 출력 $2.50이에요. 과제 1건(약 3천 자, 지시문 포함 입력 약 6천 토큰)은 대략 10원 안팎이에요. 정확한 금액은 [가격표](https://ai.google.dev/gemini-api/docs/pricing)에서 확인하세요. |
| **채점 품질** | 더 꼼꼼한 채점이 필요하면 `GEMINI_MODEL`을 `gemini-3.8-flash`로 바꾸세요 (더 비싸고 조금 느림). |
| **AI 점수는 예상치** | AI도 틀릴 수 있어요. 화면에 "예상 점수"라고 표시하고, 표절 의심률은 실제 표절 검사가 아니라고 안내해 주세요. |

## 6. 채점 기준 고치기

- AI에게 주는 지시문: `js/ai-prompt.js`의 `SYSTEM`
- AI 점수와 규칙 점수를 합치는 방식: `js/ai-merge.js` (맨 위에 규칙이 한국어로 적혀 있어요)
- 고친 뒤에는 `npm test`로 확인하세요. 진짜 Gemini 대신 가짜 답변으로 시험해서 키 없이도 돌아가요.

## 문제 해결

| 증상 | 원인과 해결 |
|---|---|
| "서버에 GEMINI_API_KEY가 설정되지 않았어요" | Vercel 환경 변수에 키를 넣고 **Redeploy** |
| "AI 요청이 거절됐어요 (키·모델 이름 확인)" | 키를 잘못 복사했거나 모델 이름 오타. `GEMINI_MODEL`을 지워 기본값으로 |
| "AI 사용량 한도에 걸렸어요" | 무료 한도 초과. 잠시 기다리거나 유료 전환 |
| "AI 응답이 너무 오래 걸려요" | 글이 매우 길거나 서버 혼잡. 다시 시도 |
| 화면에서 계속 규칙 엔진 결과만 나옴 | 브라우저 개발자 도구(F12) → Network 탭에서 `/api/analyze` 응답의 `error` 확인 |
