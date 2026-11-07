// Firebase 연결: Google 로그인 + 사용자 기록(store.js)을 클라우드에 백업·동기화
//
// 쓰는 법 (화면 담당자용, 자세한 건 docs/FIREBASE.md)
//   import { initCloud, signIn, signOut } from './js/cloud.js';
//   initCloud(user => { /* user가 null이면 로그아웃 상태, 아니면 { uid, name, email, photo } */ });
//   로그인 버튼 → signIn()    로그아웃 버튼 → signOut()
//
// 로그인하지 않아도 앱은 지금처럼 localStorage로만 동작해요.
import { firebaseConfig } from './firebase-config.js';
import * as store from './store.js';
import { mergeState, toCloud } from './merge.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';
const PUSH_DELAY_MS = 1500;

let fb = null; // { auth, db, authMod, fsMod } — 처음 필요할 때 한 번만 불러와요
let unsubscribeStore = null;
let pushTimer = null;

export function isConfigured() {
  return !Object.values(firebaseConfig).some(v => !v || String(v).startsWith('YOUR_'));
}

async function load() {
  if (fb) return fb;
  if (!isConfigured()) {
    throw new Error('js/firebase-config.js 의 YOUR_ 값을 먼저 채워 주세요.');
  }
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

export async function signIn() {
  const { auth, authMod } = await load();
  const result = await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider());
  return publicUser(result.user);
}

export async function signOut() {
  const { auth, authMod } = await load();
  await authMod.signOut(auth);
}

// 앱 시작 시 한 번 부르면 돼요. 로그인 상태가 바뀔 때마다 onUser가 호출돼요.
export async function initCloud(onUser = () => {}) {
  if (!isConfigured()) {
    onUser(null);
    return { enabled: false };
  }
  const { auth, authMod } = await load();
  authMod.onAuthStateChanged(auth, async user => {
    stopSync();
    if (user) {
      try {
        await syncOnLogin(user.uid);
        startSync(user.uid);
      } catch (e) {
        console.error('[A-Flo] 클라우드 동기화 실패 (기기 저장은 계속 동작해요)', e);
      }
    }
    onUser(publicUser(user));
  });
  return { enabled: true };
}

const docRef = uid => {
  const { db, fsMod } = fb;
  return fsMod.doc(db, 'users', uid);
};

// 로그인 직후: 클라우드 기록과 기기 기록을 합친 뒤 양쪽에 반영
async function syncOnLogin(uid) {
  const snap = await fb.fsMod.getDoc(docRef(uid));
  const cloud = snap.exists() ? snap.data().state : null;
  const merged = mergeState(toCloud(store.get()), cloud);
  store.replace({ ...store.get(), ...merged }); // draft는 기기 값 유지
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
