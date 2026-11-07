# 역할 분담과 GitHub 작업 순서

## 누가 무엇을 하나요

| 역할 | 맡는 일 | 주로 고치는 곳 |
|---|---|---|
| **채점 엔진** | 감점 규칙 추가·수정, PDF·HWP 읽기, 나중에 AI API 연결 | `js/analyzer.js`, `js/docx.js`, `tests/` |
| **화면 개발** | 기획안 STEP 1~5 화면 만들기, 엔진 연결, 디자인 PNG 적용 | 화면 파일들 (`demo` 브랜치 참고) |
| **디자인** | 캐릭터 4종 × 9장, 로고·아이콘, 화면 시안 (PNG) | `assets/` (화면 담당이 대신 올려도 됨) |
| **기획·콘텐츠** | 퀴즈 문제 추가, 실제 과제로 테스트, 발표 자료 | `js/quiz-bank.js`, GitHub Issues |

## 처음 한 번만: 내 컴퓨터에 받기

```bash
git clone https://github.com/Yena362/a-flo.git
cd a-flo
```

## 매번 작업할 때 (5단계)

```bash
# 1) 최신 상태로 맞추기
git switch main
git pull

# 2) 내 작업용 브랜치 만들기 (이름은 하는 일로)
git switch -c feat/quiz-30

# 3) 작업 후 저장(커밋)
git add .
git commit -m "퀴즈 문제 20개 추가"

# 4) GitHub에 올리기
git push -u origin feat/quiz-30
```

5) GitHub 사이트에서 **Compare & pull request** 버튼 → 설명 적기 → 다른 팀원이 확인하고 **Merge**

> 명령어가 어렵다면 [GitHub Desktop](https://desktop.github.com) 프로그램으로 같은 일을 버튼으로 할 수 있어요.

## 브랜치 이름 규칙

| 앞에 붙이는 말 | 뜻 | 예 |
|---|---|---|
| `feat/` | 새 기능 | `feat/pdf-reader` |
| `fix/` | 고장 수리 | `fix/apa-year` |
| `design/` | 디자인 파일 반영 | `design/mascot-png` |
| `content/` | 퀴즈·문구 | `content/exam-quiz` |

## 다음에 할 일 (Issues로 올릴 목록)

- [x] **엔진** PDF 파일 읽기 (pdf.js, 글자 있는 PDF)
- [x] **엔진** HWP·HWPX 파일 읽기
- [ ] **엔진** 스캔 PDF 글자 인식(OCR)
- [ ] **엔진** AI API 연결해서 "주제 부합도"를 내용 기준으로 평가
- [ ] **엔진** 강의계획서 업로드 → 평가 기준 자동 추출
- [ ] **화면** STEP 1~5 화면 (디자인 시안 반영)
- [ ] **화면** 분석 대기 화면 Lottie 애니메이션
- [ ] **디자인** 캐릭터 4종 × 9장 PNG (규격은 `assets/mascot/README.md`)
- [ ] **콘텐츠** 퀴즈 모드별 30문제 이상
