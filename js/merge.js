// 기기 안 기록(local)과 클라우드 기록(cloud)을 하나로 합치는 규칙.
// Firebase 없이도 돌아가는 순수 함수라서 npm test로 확인할 수 있어요.
//
// 규칙
// - 기본값은 "더 최근에 바뀐 쪽"(updatedAt이 큰 쪽)을 따라가요. (연속 일수·검사권·마스코트·마지막 날짜)
// - 최고 기록(best)은 둘 중 큰 값.
// - 검사 기록(history)은 두 쪽을 합쳐 중복을 없애고 최신순 20개.
// - 오늘의 퀴즈 기록(quizToday)은 둘을 합쳐요. 겹치면 최근 쪽이 이겨요.

const HISTORY_LIMIT = 20;

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
    history,
    quizToday: { ...(older.quizToday || {}), ...(newer.quizToday || {}) },
    updatedAt: Math.max(local.updatedAt || 0, cloud.updatedAt || 0),
  };
}

// 클라우드에 올릴 모양: 과제 원문(draft)은 크고 개인적이라 기기에만 둬요.
export function toCloud(state) {
  const { draft, ...rest } = state; // eslint-disable-line no-unused-vars
  return rest;
}
