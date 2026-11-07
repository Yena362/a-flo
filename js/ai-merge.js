// 규칙 엔진 결과 + Gemini 결과 → 최종 결과 하나로 합치기
//
// 역할 나누기
//   출처·인용 포맷, 분량      → 규칙 엔진 점수 그대로 (형식은 규칙이 더 정확)
//   지시사항 부합도           → 규칙 점수와 AI topicFit 중 낮은 쪽 (놓친 감점이 없도록)
//   문장·논리                 → 규칙 점수와 AI logic의 평균
//   AI·표절 의심률            → 규칙 추정치와 AI 판단(aiLikelihood)의 평균, 단 규칙 추정치보다 낮아지지 않음

import { gradeOf } from './analyzer.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

export function mergeAI(rule, ai, text) {
  if (!ai) return { ...rule, source: 'rules' };

  const rubric = rule.rubric.map(r => {
    if (r.key === 'instruction') return { ...r, score: Math.min(r.score, clamp(ai.topicFit?.score, 0, r.max)), comment: ai.topicFit?.comment };
    if (r.key === 'style') return { ...r, score: Math.round((r.score + clamp(ai.logic?.score, 0, r.max)) / 2), comment: ai.logic?.comment };
    return r;
  });
  const score = rubric.reduce((s, r) => s + r.score, 0);

  // AI 지적을 원문 위치에 연결. 원문에서 못 찾은 인용은 버림(이미 고쳐졌거나 AI가 잘못 인용)
  const taken = rule.issues.filter(i => i.start >= 0);
  const overlaps = (s, e) => taken.some(i => s < i.end && e > i.start);
  const aiIssues = [];
  (ai.issues || []).slice(0, 6).forEach((x, n) => {
    const quote = (x.quote || '').trim();
    let start = -1, end = -1;
    if (quote) {
      start = text.indexOf(quote);
      if (start === -1) return;
      end = start + quote.length;
      if (overlaps(start, end)) return;
    }
    aiIssues.push({
      id: `ai${n + 1}`,
      source: 'ai',
      severity: x.severity === 'danger' ? 'danger' : 'warning',
      category: x.category === 'instruction' ? 'instruction' : 'style',
      title: String(x.title || 'AI 피드백').slice(0, 20),
      reason: x.reason || '',
      suggestion: x.suggestion || '',
      fix: quote && x.fix ? x.fix : null,
      start, end,
      gain: x.severity === 'danger' ? 3 : 1,
    });
  });

  const issues = [...rule.issues, ...aiIssues]
    .sort((a, b) => (a.severity === b.severity ? b.gain - a.gain : a.severity === 'danger' ? -1 : 1));
  const fixes = [...issues].sort((a, b) => b.gain - a.gain).slice(0, 3);
  const potentialScore = Math.min(100, score + fixes.reduce((s, f) => s + f.gain, 0));

  const ruleRate = rule.plagiarism.rate;
  const rate = clamp(Math.max(ruleRate, (ruleRate + clamp(ai.aiLikelihood, 0, 100)) / 2), 0, 100);
  const plagiarism = { rate, level: rate <= 10 ? 'safe' : rate <= 20 ? 'warning' : 'danger' };

  const firstDanger = issues.find(i => i.severity === 'danger');
  const mood = firstDanger ? 'danger' : issues.length === 0 || score >= 95 ? 'safe' : 'warning';
  const message = mood === 'danger' ? rule.message.startsWith('잠깐') ? rule.message : `잠깐! ${firstDanger.reason}` : (ai.summary || rule.message);

  const checklist = (ai.instructionChecks || []).length
    ? ai.instructionChecks.map(c => ({ text: c.instruction, auto: true, met: !!c.met, evidence: c.evidence }))
    : rule.checklist;

  return {
    ...rule,
    source: 'ai',
    score, grade: gradeOf(score), rubric, issues, fixes, plagiarism, mood, message, checklist,
    potential: { score: potentialScore, grade: gradeOf(potentialScore), gain: potentialScore - score },
  };
}
