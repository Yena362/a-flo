// Firebase 웹 앱 설정값
// 이 값들은 비밀번호가 아니라 "이 앱이 어느 Firebase 프로젝트인지" 알려 주는 이름표예요.
// (접근 제한은 firestore.rules가 담당해요.) 그래서 코드에 그대로 올려도 괜찮아요.
//
// YOUR_ 로 시작하는 3곳을 채워 주세요:
// Firebase 콘솔 → 프로젝트 설정(톱니바퀴) → 일반 → 내 앱 → 웹 앱 → SDK 설정 및 구성 → "구성"
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'a-flo-e02b3.firebaseapp.com',
  projectId: 'a-flo-e02b3',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
