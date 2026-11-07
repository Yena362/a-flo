// Firebase 연결: Google 로그인 + 사용자 기록(store.js)을 클라우드에 백업·동기화
//
// 쓰는 법 (자세한 건 docs/FIREBASE.md)
//   import { initCloud, signIn, signOut, getUser } from './js/cloud.js';
//   initCloud(user => { /* user가 null이면 로그아웃 상태, 아니면 { uid, name, email, photo } */ });
//   로그인 버튼 → signIn()    로그아웃 버튼 → signOut()    지금 로그인한 사람 → getUser()
//
// 로그인하지 않아도 앱은 지금처럼 localStorage로만 동작해요.
// Firebase 코드는 용량이 커서, 로그인한 적이 있는 기기에서만 앱 시작 때 불러오고
// 그 외에는 "로그인" 버튼을 누를 때 처음 불러와요.
import { firebaseConfig } from './firebase-config.js';
import * as store from './store.js';
import { mergeState, toCloud } from './merge.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';
const PUSH_DELAY_MS = 1500;
const HINT_KEY = 'aflo:signedin'; // 이 기기에서 로그인한 적 있다는 표시

let fb = null; // { auth, db, authMod, fsMod }
let watching = false;
let unsubscribeStore = null;
let pushTimer = null;
let currentUser = null;
let listener = () => {};

export function isConfigured() {
  return !Object.values(firebaseConfig).some(v => !v || String(v).startsWith('YOUR_'));
}

export const getUser = () => currentUser;

const hint = {
  has: () => { try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return false; } },
  set: () => { try { localStorage.setItem(HINT_KEY, '1'); } catch { /* 저장 불가 환경 */ } },
  clear: () => { try { localStorage.removeItem(HINT_KEY); } catch { /* 저장 불가 환경 */ } },
};

async function load() {
  if (fb) return fb;
  if (!isConfigured()) throw new Error('js/firebase-config.js 의 설정값을 먼저 채워 주세요.');
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  fb = { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
  return fb;
}

const publicUser = u => (u ? { uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL } : null);

// 로그인 상태 감시 시작 (한 번만)
async function watch() {
  if (watching) return;
  watching = true;
  const { auth, authMod } = await load();
  authMod.onAuthStateChanged(auth, async user => {
    stopSync();
    if (user) {
      hint.set();
      try {
        await syncOnLogin(user.uid);
        startSync(user.uid);
      } catch (e) {
        console.error('[A-Flo] 클라우드 동기화 실패 (기기 저장은 계속 동작해요)', e);
      }
    } else {
      hint.clear();
    }
    currentUser = publicUser(user);
    listener(currentUser);
  });
}

// 앱 시작 시 한 번 부르면 돼요. 로그인 상태가 바뀔 때마다 onUser가 호출돼요.
export async function initCloud(onUser = () => {}) {
  listener = onUser;
  if (!isConfigured() || !hint.has()) {
    onUser(null);
    return { enabled: isConfigured() };
  }
  try {
    await watch();
  } catch (e) {
    console.error('[A-Flo] Firebase를 불러오지 못했어요 (기기 저장은 계속 동작해요)', e);
    onUser(null);
  }
  return { enabled: true };
}

export async function signIn() {
  const { auth, authMod } = await load();
  await watch();
  const result = await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider());
  return publicUser(result.user);
}

export async function signOut() {
  const { auth, authMod } = await load();
  await authMod.signOut(auth);
}

// 클라우드에 백업된 내 기록 지우기 (마이 화면의 "모든 기록 초기화"에서 사용)
export async function clearCloud() {
  if (!currentUser || !fb) return;
  stopSync();
  await fb.fsMod.deleteDoc(docRef(currentUser.uid));
}

const docRef = uid => fb.fsMod.doc(fb.db, 'users', uid);

// 로그인 직후: 클라우드 기록과 기기 기록을 합친 뒤 양쪽에 반영
async function syncOnLogin(uid) {
  const snap = await fb.fsMod.getDoc(docRef(uid));
  // 받은 값에도 같은 필터를 적용해서, 문서가 직접 고쳐져도 기기의 요금제·과제 원문은 덮어쓰지 못하게 해요
  const cloud = snap.exists() ? toCloud(snap.data().state || {}) : null;
  const merged = mergeState(toCloud(store.get()), cloud);
  store.replace({ ...store.get(), ...merged }); // draft·plan은 기기 값 유지
  await push(uid);
}

async function push(uid) {
  await fb.fsMod.setDoc(docRef(uid), {
    state: toCloud(store.get()),
    updatedAt: fb.fsMod.serverTimestamp(),
  });
}

// 로그인 중에는 기록이 바뀔 때마다 잠깐 기다렸다가(여러 번 바뀌면 한 번만) 올려요
function startSync(uid) {
  unsubscribeStore = store.subscribe(() => {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      push(uid).catch(e => console.error('[A-Flo] 클라우드 저장 실패', e));
    }, PUSH_DELAY_MS);
  });
}

function stopSync() {
  clearTimeout(pushTimer);
  if (unsubscribeStore) unsubscribeStore();
  unsubscribeStore = null;
}
