/**
 * data.js - Mock 데이터 정의 및 KRX API 연동 준비
 * Phase 1: Mock 데이터
 * Phase 2: KRX Open API 연동 (data.krx.co.kr)
 */

// ===== API 설정 =====
// Render.com 백엔드 URL ✅ 배포 완료
const BACKEND_URL = 'https://krx-dashboard-api.onrender.com';
const USE_MOCK = false; // false = 백엔드 우선, 실패 시 Mock 자동 전환

// ===== 2026년 만기일 데이터 (PDF p.5 기준) =====
export const EXPIRY_DATES = [
  { month: 1,  optionDate: '2026-01-08', futureDate: null },
  { month: 2,  optionDate: '2026-02-12', futureDate: null },
  { month: 3,  optionDate: '2026-03-12', futureDate: '2026-03-12' },
  { month: 4,  optionDate: '2026-04-09', futureDate: null },
  { month: 5,  optionDate: '2026-05-14', futureDate: null },
  { month: 6,  optionDate: '2026-06-11', futureDate: '2026-06-11' },
  { month: 7,  optionDate: '2026-07-09', futureDate: null },
  { month: 8,  optionDate: '2026-08-13', futureDate: null },
  { month: 9,  optionDate: '2026-09-10', futureDate: '2026-09-10' },
  { month: 10, optionDate: '2026-10-08', futureDate: null },
  { month: 11, optionDate: '2026-11-12', futureDate: null },
  { month: 12, optionDate: '2026-12-10', futureDate: '2026-12-10' },
];

// ===== 8가지 시나리오 (PDF p.3 가격·외국인·OI 조합) =====
export const SCENARIOS = [
  { id: 1, price: '↑', foreigner: '매수', oi: '↑', signal: 'bull', label: '신규 상방 구축 가능성 ↑', strength: 'strong' },
  { id: 2, price: '↑', foreigner: '매수', oi: '↓', signal: 'bull-weak', label: '외국인 숏커버 가능성', strength: 'weak' },
  { id: 3, price: '↑', foreigner: '매도', oi: '↑', signal: 'bull-mixed', label: '외국인 매도 중 다른 주체 매수 강함', strength: 'mixed' },
  { id: 4, price: '↑', foreigner: '매도', oi: '↓', signal: 'bull-weak', label: '외국인 롱 청산 중, 수급으로 가격 상승', strength: 'weak' },
  { id: 5, price: '↓', foreigner: '매도', oi: '↑', signal: 'bear', label: '신규 하방 구축 가능성 ↑', strength: 'strong' },
  { id: 6, price: '↓', foreigner: '매도', oi: '↓', signal: 'bear-weak', label: '기존 롱 청산 가능성', strength: 'weak' },
  { id: 7, price: '↓', foreigner: '매수', oi: '↑', signal: 'bear-mixed', label: '외국인이 하락을 받아내는지 확인 필요', strength: 'mixed' },
  { id: 8, price: '↓', foreigner: '매수', oi: '↓', signal: 'bear-weak', label: '외국인 숏커버·시장 포지션 축소 가능성', strength: 'weak' },
];

// ===== Mock 데이터 생성 =====
function generateMockData() {
  const baseKospi = 1096.25;
  const baseFut = 1099.70;
  const now = new Date();
  const isMarketOpen = now.getHours() >= 9 && now.getHours() < 15 && now.getDay() > 0 && now.getDay() < 6;

  // 약간의 랜덤 변동
  const jitter = () => (Math.random() - 0.48) * 2;

  return {
    timestamp: now.toISOString(),
    marketOpen: isMarketOpen,

    // ===== 선물 현황 =====
    kospi200: {
      current: +(baseKospi + jitter()).toFixed(2),
      prev: 1081.00,
      change: +15.27,
      changePct: +1.41,
    },
    futures: [
      {
        code: 'F202609',
        label: '26년 9월물 (근월)',
        current: +(baseFut + jitter()).toFixed(2),
        prev: 1082.25,
        change: +17.45,
        changePct: +1.61,
        oi: 152658,
        oiChange: -320,
        volume: 124576,
        volumeChange: +6552,
        basis: +3.45,
        theoBasis: +1.73,
        theoreticalPrice: 1097.98,
        high: 1103.80,
        low: 1063.52,
        isNearMonth: true,
      },
      {
        code: 'F202612',
        label: '26년 12월물 (원월)',
        current: +(1102.80 + jitter()).toFixed(2),
        prev: 1084.05,
        change: +18.75,
        changePct: +1.73,
        oi: 8797,
        oiChange: -536,
        volume: 117863,
        volumeChange: -43493,
        basis: +6.55,
        theoBasis: +8.85,
        theoreticalPrice: 1105.10,
        high: 1105.25,
        low: 1061.55,
        isNearMonth: false,
      },
      {
        code: 'F202703',
        label: '27년 3월물',
        current: +(1085.95 + jitter()).toFixed(2),
        prev: 1094.75,
        change: -8.80,
        changePct: -0.80,
        oi: 3763,
        oiChange: +408,
        volume: 2361,
        volumeChange: +2361,
        basis: -10.30,
        theoBasis: +14.48,
        theoreticalPrice: 1110.73,
        high: 1085.95,
        low: 1085.95,
        isNearMonth: false,
      },
    ],

    // ===== 투자자별 매매동향 (억원 기준) =====
    investorFlow: {
      date: now.toLocaleDateString('ko-KR'),
      data: [
        {
          name: '개인',
          kospi: -8631, kosdaq: +7276,
          futures: -1395, callOpt: -19, putOpt: -5,
          class: 'individual',
        },
        {
          name: '외국인',
          kospi: -5492, kosdaq: -3749,
          futures: +3174, callOpt: +17, putOpt: -1,
          class: 'foreigner',
        },
        {
          name: '기관계',
          kospi: +3667, kosdaq: -3586,
          futures: -1991, callOpt: 0, putOpt: +6,
          class: 'institution',
        },
        {
          name: '금융투자',
          kospi: +2130, kosdaq: -1820,
          futures: -1240, callOpt: +12, putOpt: +8,
          class: 'sub',
        },
        {
          name: '투신',
          kospi: +890, kosdaq: -540,
          futures: -320, callOpt: -8, putOpt: -2,
          class: 'sub',
        },
      ],
    },

    // ===== 프로그램매매 (비차익이 핵심) =====
    programTrading: {
      arbitrage: {
        buy: { volume: 2271, amount: 434183 },
        sell: { volume: 2769, amount: 544253 },
        net: -110070,
      },
      nonArbitrage: {
        buy: { volume: 103682, amount: 8707631 },
        sell: { volume: 122803, amount: 10108411 },
        net: -1312326,
      },
      total: {
        buy: { volume: 106768, amount: 9340338 },
        sell: { volume: 125074, amount: 10542595 },
        net: -1202256,
      },
    },

    // ===== 옵션 OI 분포 (Max Pain 계산용) =====
    optionOI: {
      currentIndex: 1096.25,
      strikes: [1020, 1040, 1060, 1080, 1090, 1100, 1110, 1120, 1130, 1140, 1150, 1160, 1170, 1180, 1200],
      callOI:   [  12,   28,   65,  234,  610, 1828, 1387, 4956,  501,  246,  199,   88,   37,   14,    5],
      putOI:    [   8,   15,   45,  183,  480, 2504, 1417,  246,   93,   48,   22,   11,    4,    2,    1],
      // Max Pain: 1120 (콜 OI 최대 = 상방저항, 풋 OI 최대(1100) = 하방지지)
      maxPain: 1120,
      callResist: 1120,  // 콜 OI 상위 = 상방 저항
      putSupport: 1100,  // 풋 OI 상위 = 하방 지지
    },

    // ===== 투자자별 만기손익 분기점 =====
    investorPnL: {
      baseIndex: 1096.25,
      investors: [
        {
          name: '외국인',
          breakeven: 1168.50,
          direction: 'bull',
          futuresNet: +12695,
          callOI: 98,
          putOI: 2,
          note: '손익 기준점 1,168.50 넘어야 플러스',
          class: 'foreigner',
        },
        {
          name: '개인',
          breakeven: 1050.00,
          direction: 'bear',
          futuresNet: -4109,
          callOI: 27,
          putOI: 1987,
          note: '하락에 유리한 포지션',
          class: 'individual',
        },
        {
          name: '금융투자',
          breakeven: 1080.00,
          direction: 'bear',
          futuresNet: -4659,
          callOI: 118,
          putOI: 151,
          note: '하락 시 이익 구조',
          class: 'institution',
        },
      ],
    },

    // ===== 현재 신호 계산 (자동) =====
    // 외국인 선물 매수 +3174, 가격 상승, OI 감소(-320) → 시나리오 2
    currentSignal: {
      priceDir: '↑',
      foreignerAction: '매수',
      oiChange: '↓',
      scenarioId: 2,
      nonArbitrageDir: 'sell', // 비차익 매도 (-1조)
      rolloverActive: true,    // 만기 14일 전 (롤오버 진행중)
    },
  };
}

// ===== KRX API 호출 (Phase 2) =====
async function fetchKrxFuturesData() {
  try {
    // KRX 선물 현재가 (참고: CORS 이슈 있을 수 있어 프록시 필요)
    const params = new URLSearchParams({
      bld: 'dbms/MDC/STAT/standard/MDCSTAT12301',
      mktId: 'F',
      trdDd: new Date().toISOString().slice(0,10).replace(/-/g,''),
    });
    const res = await fetch(`${KRX_API_BASE}?${params}`, {
      headers: { 'Referer': 'https://data.krx.co.kr/' }
    });
    if (!res.ok) throw new Error('KRX API error');
    return await res.json();
  } catch (e) {
    console.warn('KRX API 실패, Mock 데이터 사용:', e.message);
    return null;
  }
}

// ===== 메인 데이터 조회 함수 =====
export async function fetchDashboardData() {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    return generateMockData();
  }

  // 백엔드 API 호출 (Render.com), 실패 시 Mock으로 자동 폴백
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${BACKEND_URL}/api/dashboard`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    console.log('✅ 백엔드 API 수신:', data.source || 'live');
    return data;
  } catch (e) {
    console.warn('⚠️ 백엔드 실패, Mock 사용:', e.message);
    return generateMockData();
  }
}

// ===== 유틸리티 =====
export function formatNumber(n, digits = 0) {
  if (n === null || n === undefined) return '-';
  return n.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatChange(n, digits = 2) {
  if (n === null || n === undefined) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function getSignalClass(n) {
  if (n > 0) return 'up';
  if (n < 0) return 'down';
  return 'neutral';
}

export function getScenarioById(id) {
  return SCENARIOS.find(s => s.id === id);
}
