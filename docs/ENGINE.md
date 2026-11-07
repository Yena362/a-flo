# 채점 엔진 사용법 (화면 담당자용)

화면에서는 **함수 하나만 부르면 돼요**: `analyze()` (규칙 엔진만) 또는 `analyzeWithAI()` (규칙 + Gemini, 서버 필요).

> AI까지 쓰려면 [docs/AI.md](AI.md)를 보세요. 돌려받는 결과 모양은 둘 다 같아요.
과제 글과 교수님 정보를 넣으면, 결과 화면에 필요한 숫자와 문장을 전부 돌려줘요.

## 1. 불러오기

```js
import { analyze, applyFix, TAGS } from './js/analyzer.js';
```

## 2. 넣는 값 (입력 화면에서 모은 것)

```js
const result = analyze({
  text: '서론\n최근 금리 인상이…\n\n참고문헌\n김철수. 2021. …',   // 과제 본문 (필수)
  tags: ['cite', 'structure'],          // 고른 교수님 성향 태그의 id
  instructions: '참고문헌 APA 필수, 서론에 뉴스 기사 인용할 것, 2,000자 이상', // 구두 지시사항
  targetLength: 0,                      // 요구 분량(자). 0이면 지시사항에서 찾아요
});
```

성향 태그 id 목록 (`TAGS`로도 받을 수 있어요):

| id | 화면에 보이는 이름 |
|---|---|
| `strict` | 깐깐한 팩트폭행파 |
| `logic` | 논리·창의성 중시 |
| `cite` | 인용/출처 필수 |
| `structure` | 서론-본론-결론파 |
| `length` | 분량 엄수 |

## 3. 돌려받는 값 → 화면 어디에 쓰나

| 값 | 예시 | 화면 위치 (기획안) |
|---|---|---|
| `score` | `75` | STEP 4 예상 득점 배너 |
| `grade` | `'C+'` | STEP 4 유력 학점 (대형) |
| `mood` | `'danger'` / `'warning'` / `'safe'` | 캐릭터 표정 고르기 |
| `message` | `'잠깐! 수업 때 교수님이…'` | 캐릭터 말풍선 총평 |
| `plagiarism.rate` / `.level` | `18` / `'warning'` | AI 표절 의심률 바 (안전 0~10 / 주의 11~20 / 위험 21+) |
| `rubric[]` | `{ label: '분량 충족도', score: 13, max: 20 }` | 루브릭 항목별 평가 |
| `fixes[]` | 점수를 가장 많이 올리는 감점 3개 | "이것만 고치면" 카드 |
| `potential` | `{ score: 89, grade: 'B+', gain: 14 }` | "이것만 고치면 **B+** 가능!" |
| `checklist[]` | `{ text: '400자 이상', auto: true }` | 지시사항 체크리스트 |
| `issues[]` | 아래 참고 | STEP 5 교정 에디터 |

### `issues[]` 한 개의 모양

```js
{
  id: 'i3',
  severity: 'danger',          // 'danger'(🔴 빨강) 또는 'warning'(🟡 주황)
  category: 'citation',        // instruction | citation | length | style
  title: 'APA 양식 아님',
  reason: '교수님이 말한 APA 7판 형식…과 달라요.',   // 오류 이유
  suggestion: '김철수. (2021). 거시경제학 원론. 박영사.',
  fix: '김철수. (2021). 거시경제학 원론. 박영사.',  // [원문 자동 적용]에 쓸 문장. null이면 버튼 숨기기
  start: 412, end: 438,        // 원문에서 하이라이트할 위치 (글자 순번). -1이면 글 전체에 대한 지적
  gain: 2,                     // 고치면 오르는 점수
}
```

- 왼쪽 원문 하이라이트: `text.slice(start, end)` 부분에 색을 칠하면 돼요.
- `[원문 자동 적용]` 버튼: `const newText = applyFix(text, issue);` → 다시 `analyze()` 하면 점수가 갱신돼요.

## 4. 그 밖에 쓸 수 있는 것

| 파일 | 함수 | 용도 |
|---|---|---|
| `docx.js` | `readAssignmentFile(file)` | 업로드한 DOCX·TXT에서 글자 뽑기 (PDF·HWP는 준비 중이라 오류 메시지를 돌려줌) |
| `quiz-bank.js` | `dailyQuestion(mode, '2026-11-07')` | 오늘의 퀴즈 1문제 (`mode`: `'assignment'` 또는 `'exam'`) |
| `store.js` | `currentStreak()`, `recordCorrect()` | 불꽃 연속 일수, 정답 시 불꽃·검사권 +1 |
| `mascot.js` | `mascot('chick', 'danger', 96)` | 캐릭터 그림 HTML (디자인 PNG가 있으면 PNG 사용) |

실제로 연결한 예시는 `demo` 브랜치의 `js/views/` 폴더에 있어요.
