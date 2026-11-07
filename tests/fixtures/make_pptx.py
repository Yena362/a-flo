"""테스트용 .pptx 만들기 (python3 tests/fixtures/make_pptx.py, python-pptx 필요)
슬라이드 순서가 10번을 넘어도 숫자 순서대로 읽는지, 발표자 노트를 붙이는지 확인용."""
import os
from pptx import Presentation

HERE = os.path.dirname(os.path.abspath(__file__))
prs = Presentation()
for i in range(1, 12):
    s = prs.slides.add_slide(prs.slide_layouts[1])
    s.shapes.title.text = f'{i}주차 핵심 개념'
    s.placeholders[1].text = '통화승수 = 1 / 지급준비율\n지급준비율이 낮을수록 통화량 증가 & 신용창조' if i == 1 else f'내용 {i}'
    if i in (1, 11):
        s.notes_slide.notes_text_frame.text = f'시험에 꼭 나옴 ({i})'
prs.save(os.path.join(HERE, 'sample.pptx'))
