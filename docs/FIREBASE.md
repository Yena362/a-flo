# Firebase 연동 안내

로그인(Google)과 기록 백업을 Firebase로 처리해요. **로그인하지 않아도 앱은 지금처럼 기기(localStorage)에만 저장하며 동작해요.** 로그인하면 연속 학습·검사권·검사 기록이 클라우드에 백업되고, 다른 기기에서도 이어져요.

Firebase 프로젝트 ID: `a-flo-e02b3`

## 1. 처음 한 번: Firebase 콘솔 설정

1. **웹 앱 등록**: 프로젝트 설정(톱니바퀴) → 일반 → 내 앱 → 웹 앱(`</>`) 추가. 나오는 `firebaseConfig` 값을 `js/firebase-config.js`의 `YOUR_` 3곳(`apiKey`, `messagingSenderId`, `appId`)에 붙여넣기.
2. **로그인 켜기**: Authentication → 시작하기 → 로그인 방법 → **Google** 사용 설정.
3. **승인된 도메인 추가**: Authentication → 설정 → 승인된 도메인에 `a-flo.vercel.app` 추가. (`localhost`는 기본으로 들어 있어요.)
4. **데이터베이스 만들기**: Firestore Database → 데이터베이스 만들기 (프로덕션 모드, 서울 `asia-northeast3` 추천).
5. **보안 규칙 적용**: Firestore → 규칙 탭에 이 저장소의 `firestore.rules` 내용을 붙여넣고 게시. (본인 문서만 읽고 쓸 수 있어요.)

## 2. 화면에서 쓰는 법

```js
import { initCloud, signIn, signOut } from './js/cloud.js';

// 앱 시작할 때 한 번. 로그인 상태가 바뀔 때마다 호출돼요.
initCloud(user => {
  // user === null          → 로그아웃 상태 ("Google로 로그인" 버튼 보이기)
  // user = { uid, name, email, photo } → 로그인 상태 (이름·사진 보이기)
});

loginButton.onclick  = () => signIn();
logoutButton.onclick = () => signOut();
```

그 뒤로는 기존처럼 `store.js`(`recordCorrect()`, `addHistory()` 등)만 쓰면 돼요. 로그인 중이면 기록이 바뀐 뒤 약 1.5초 뒤에 자동으로 클라우드에 올라가요.

## 3. 어떻게 저장되나요

- 위치: Firestore `users/{내 uid}` 문서 하나에 `state`로 저장
- 올라가는 것: 연속 학습, 최고 기록, 검사권, 검사 기록(최근 20개), 오늘의 퀴즈 기록, 마스코트
- **안 올라가는 것: 과제 원문(`draft`)** — 크고 개인적이라 기기에만 둬요.
- 로그인 직후 합치기 규칙은 `js/merge.js` 위쪽 주석 참고 (더 최근에 바뀐 쪽을 따르고, 최고 기록·검사 기록은 합쳐요).

## 4. 확인하기

```bash
npm test      # 합치기 규칙 포함, 모두 ok면 정상
npm start     # 로컬 화면 확인용 서버 (http://localhost:8080)
```

Firebase 로그인 자체는 실제 설정값이 있어야 해서 자동 테스트에 넣지 않았어요. 설정값을 채운 뒤 화면에서 로그인 → Firebase 콘솔 Firestore에 `users/...` 문서가 생기는지 확인해 주세요.
