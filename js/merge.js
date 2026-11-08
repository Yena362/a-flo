// 기기 안 기록(local)과 클라우드 기록(cloud)을 하나로 합치는 규칙.
// Firebase 없이도 돌아가는 순수 함수라서 npm test로 확인할 수 있어요.
//
// 규칙
// - 기본값은 "더 최근에 바뀐 쪽"(updatedAt이 큰 쪽)을 따라가요. (연속 일수·검사권·다이아·마스코트·마지막 날짜·오늘 검사 횟수)
// - 최고 연속(best)과 경험치(xp)는 줄어들 일이 없어서 둘 중 큰 값.
// - 검사 기록(history)은 두 쪽을 합쳐 중복을 없애고 최신순 20개.
// - 오늘의 퀴즈 기록(quizToday)과 오늘 보상 받은 퀴즈(rewarded)는 둘을 합쳐요. 겹치면 최근 쪽이 이겨요.

const HISTORY_LIMIT = 20;
const WRONG_LIMIT = 50;
const missedAt = w => w.lastMissedAt || w.addedAt || 0;

// 오답 노트는 두 쪽을 합쳐요 (한쪽이 통째로 덮어쓰면 다른 기기에서 틀린 문제가 사라져요).
// 같은 문제는 더 최근에 틀린 쪽, "노트에서 빼기"(wrongRemoved) 이후에 다시 틀리지 않은 문제는 빼요.
function mergeWrong(local, cloud) {
  const removed = { ...(cloud.wrongRemoved || {}) };
  for (const [id, t] of Object.entries(local.wrongRemoved || {})) removed[id] = Math.max(removed[id] || 0, t);
  const byId = new Map();
  for (const w of [...(cloud.wrongNote || []), ...(local.wrongNote || [])]) {
    const prev = byId.get(w.id);
    if (!prev || missedAt(w) >= missedAt(prev)) byId.set(w.id, w);
  }
  const wrongNote = [...byId.values()]
    .filter(w => !(removed[w.id] >= missedAt(w)))
    .sort((a, b) => missedAt(b) - missedAt(a))
    .slice(0, WRONG_LIMIT);
  return { wrongNote, wrongRemoved: removed };
}

export function mergeState(local, cloud) {
  if (!cloud) return local;
  if (!local) return cloud;

  const localNewer = (local.updatedAt || 0) >= (cloud.updatedAt || 0);
  const newer = localNewer ? local : cloud;
  const older = localNewer ? cloud : local;

  const seen = new Set();
  const history = [...(newer.history || []), ...(older.history || [])]
    .filter(e => {
      const key = `${e.date}|${e.title}|${e.score}|${e.grade}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, HISTORY_LIMIT);

  return {
    ...older,
    ...newer,
    best: Math.max(local.best || 0, cloud.best || 0),
    xp: Math.max(local.xp || 0, cloud.xp || 0),
    history,
    quizToday: { ...(older.quizToday || {}), ...(newer.quizToday || {}) },
    rewarded: { ...(older.rewarded || {}), ...(newer.rewarded || {}) },
    ...mergeWrong(local, cloud),
    updatedAt: Math.max(local.updatedAt || 0, cloud.updatedAt || 0),
  };
}

// 클라우드에 올릴 모양
// - draft(과제 원문): 크고 개인적이라 기기에만 둬요.
// - plan(요금제): 지금은 시연용 체험 스위치라 계정에 묶지 않고 기기에만 둬요. (결제 연동 때 서버에서 관리하세요)
export function toCloud(state) {
  const { draft, plan, ...rest } = state; // eslint-disable-line no-unused-vars
  return rest;
}
