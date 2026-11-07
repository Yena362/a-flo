// 내 컴퓨터에서 Gemini 키가 잘 되는지 확인하는 스크립트 (배포 없이)
//
//   맥/리눅스:  GEMINI_API_KEY=내키 npm run try-ai
//   윈도우:     set GEMINI_API_KEY=내키 && npm run try-ai
//
// 예시 과제(js/sample.js)를 AI로 채점하고 결과를 보여 줘요.
import { gradeWithGemini, DEFAULT_MODEL } from '../api/analyze.js';
import { analyze } from '../js/analyzer.js';
import { mergeAI } from '../js/ai-merge.js';
import { SAMPLE } from '../js/sample.js';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
if (!apiKey) {
  console.error('GEMINI_API_KEY가 없어요. docs/AI.md의 "1. 키 받기"를 먼저 해 주세요.');
  process.exit(1);
}

console.log(`모델: ${model}\n예시 과제를 채점하는 중... (10~30초)`);
const t = Date.now();
try {
  const ai = await gradeWithGemini(SAMPLE, { apiKey, model });
  const rule = analyze(SAMPLE);
  const r = mergeAI(rule, ai, SAMPLE.text);
  console.log(`\n완료 (${((Date.now() - t) / 1000).toFixed(1)}초)`);
  console.log(`규칙 엔진만: ${rule.score}점 ${rule.grade}  →  AI 반영: ${r.score}점 ${r.grade}`);
  console.log(`AI 총평: ${ai.summary}`);
  console.log(`주제 부합 ${ai.topicFit.score}/30 — ${ai.topicFit.comment}`);
  console.log(`논리 ${ai.logic.score}/30 — ${ai.logic.comment}`);
  console.log(`AI 생성 의심: ${ai.aiLikelihood}%`);
  console.log('\n지시사항 체크:');
  ai.instructionChecks.forEach(c => console.log(`  ${c.met ? 'O' : 'X'} ${c.instruction} — ${c.evidence}`));
  console.log('\nAI가 찾은 감점:');
  r.issues.filter(i => i.source === 'ai').forEach(i => console.log(`  [${i.severity}] ${i.title}: ${i.reason}`));
} catch (e) {
  console.error(`\n실패: ${e.message}`);
  process.exit(1);
}
