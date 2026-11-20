const brainImage = '../concept-02-assets/hero-thought-brain-v2.png';

const stories = [
  {
    label: '다음 연락', focus: [0.64, 0.30],
    question: '다음 연락,\n언제였지?',
    passing: ['다음 달에 연락드리기로 했는데', '언제였더라?', '메모는 어디에?', '이미 날짜가 지났나?'],
    problemTitle: '다시 연락하기로 한 고객이,\n약속한 날짜가 지나서야 떠오릅니다.',
    problemBody: '새 고객을 만나는 동안 후속 연락이 머릿속과 메모 뒤로 밀립니다.',
    fragments: ['다음 연락', '확인할 일', '상담 후 약속'],
    solutionTitle: '만남의 맥락에서\n다음 연락을 이어갑니다.',
    solutionBody: '등록된 맥락을 바탕으로 생성된 후속 일정과 할 일을 캘린더에서 확인합니다.',
    mock: 'calendar',
    returnTitle: '다음 연락은\n일정에서 다시 만납니다.',
    returnBody: '머릿속에만 두었던 후속 행동을 눈에 보이는 일정으로 확인합니다.'
  },
  {
    label: '지난 상담', focus: [0.36, 0.31],
    transitionTitle: '다시 연락하려는데,\n지난번에 무슨 얘기를 했지?',
    transitionBody: '연락할 고객은 정해졌지만, 지난 대화는 흩어진 기록 속에 남아 있습니다.',
    question: '지난 상담,\n무슨 얘기였지?',
    passing: ['이 고객의 고민이 뭐였지?', '어떤 제안을 했지?', '카톡에 적었나?', '다시 처음부터 물어볼까?'],
    problemTitle: '연락할 때가 됐는데,\n지난 상담을 찾느라 대화를 바로 시작하지 못합니다.',
    problemBody: '대화와 메모가 여러 곳에 남으면 고객의 상황을 매번 다시 훑어야 합니다.',
    fragments: ['카카오톡 대화', '수첩 메모', '기억 속 약속'],
    solutionTitle: '고객이 했던 말을,\n말하듯 다시 찾습니다.',
    solutionBody: '일상적인 질문으로 등록된 대화와 만남의 맥락에서 고객을 찾아 확인합니다.',
    mock: 'search',
    returnTitle: '지난 대화는\n필요할 때 다시 찾습니다.',
    returnBody: '기억을 더듬는 대신, 남겨둔 만남의 맥락을 확인합니다.'
  },
  {
    label: '보낼 자료', focus: [0.37, 0.64],
    transitionTitle: '고객이 부탁한 자료,\n뭐부터 준비해야 하지?',
    transitionBody: '지난 상담 내용을 다시 모아 고객에게 보낼 문서로 정리해야 합니다.',
    question: '보낼 자료,\n뭐였지?',
    passing: ['어떤 내용을 부탁했지?', '상담 메모는 어디에?', '어떤 제안을 담아야 하지?', '초안을 다시 처음부터 써야 하나?'],
    problemTitle: '고객에게 자료를 보내기 전,\n흩어진 상담 내용을 모아 문서 초안을 다시 작성합니다.',
    problemBody: '고객이 말한 고민과 제안할 내용을 확인하고 문장으로 정리하는 데 시간이 듭니다.',
    fragments: ['고객의 요청', '상담 기록', '문서 초안'],
    solutionTitle: '상담의 맥락을 바탕으로,\n보낼 문서의 초안을 정리합니다.',
    solutionBody: '등록된 만남의 기록을 토대로 고객에게 전달할 문서의 초안을 준비합니다.',
    mock: 'draft',
    returnTitle: '보낼 문서의 시작도\n상담의 맥락에서.',
    returnBody: '지난 대화를 다시 조합하는 시간을 줄이고, 전달할 내용을 검토합니다.'
  },
  {
    label: '오늘 누구부터', focus: [0.63, 0.65],
    transitionTitle: '챙길 고객이 많은데,\n오늘 누구부터 연락하지?',
    transitionBody: '만난 시기와 관계를 떠올리며 연락 순서를 정해야 합니다.',
    question: '오늘,\n누구부터?',
    passing: ['아직 연락 못 한 고객은?', '최근 만난 사람은?', '중요한 관계는?', '오늘 누구부터 볼까?'],
    problemTitle: '챙길 고객은 많은데,\n오늘 누구부터 연락할지 정하기 어렵습니다.',
    problemBody: '이름만 나열된 연락처로는 만난 시기와 관계의 중요도를 함께 보기 어렵습니다.',
    fragments: ['연락처 목록', '만남의 시기', '관계의 중요도'],
    solutionTitle: '관계 지도에서\n오늘 살펴볼 고객을 찾습니다.',
    solutionBody: '만난 시기·장소, 중요도와 카테고리를 살펴보고 연락할 사람을 고릅니다.',
    mock: 'map',
    returnTitle: '이제, 시선을\n고객에게 돌립니다.',
    returnBody: '고객과의 관계를 살피며, 지금 할 영업에 집중합니다.'
  }
];

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const lines = value => value.split('\n').map(escapeHtml).join('<br>');
const pad = number => String(number).padStart(2, '0');

function mockup(kind) {
  const top = '<div class="app-top"><span>Persnapse</span><small>가상 화면 예시</small></div>';
  if (kind === 'calendar') return `${top}<div class="calendar-view"><span class="calendar-day">MON <b>16</b></span><div><small>등록한 만남에서 이어진 후속 할 일</small><strong>고객에게 다시 연락하기</strong><span>상담 이후 확인할 내용 살피기</span></div><i>✓</i></div>`;
  if (kind === 'draft') return `${top}<div class="draft-view"><div class="draft-source"><small>등록된 상담 맥락</small><strong>고객의 고민 · 요청한 내용</strong><span>가상 입력 예시</span></div><div class="draft-arrow" aria-hidden="true">→</div><div class="draft-paper"><small>가상 문서 초안 예시</small><strong>고객에게 전달할 내용</strong><i></i><i></i><i></i></div></div>`;
  if (kind === 'map') return `${top}<div class="map-view"><svg viewBox="0 0 620 180" aria-hidden="true"><path d="M85 84 L232 43 L315 97 L470 46 M85 84 L194 142 L315 97 L508 134"/><circle cx="85" cy="84" r="18"/><circle cx="232" cy="43" r="13"/><circle class="map-active" cx="315" cy="97" r="24"/><circle cx="470" cy="46" r="15"/><circle cx="194" cy="142" r="12"/><circle cx="508" cy="134" r="14"/></svg><div><small>관계 지도 · 중요도</small><strong>오늘 볼 고객을 확인합니다</strong></div></div>`;
  return `${top}<div class="question">“지난번 상담한 고객, 어떤 고민을 말했지?” <b>↗</b></div><div class="answer"><span>✦</span><div><small>등록된 맥락에서 찾은 기록</small><strong>지난 상담의 대화를 다시 확인합니다</strong></div></div>`;
}


