/**
 * signals.js - 8가지 시나리오 신호 판단 로직
 * PDF p.3 가격·외국인·OI 조합 해석 기반
 */
import { SCENARIOS } from './data.js';

/**
 * 현재 시장 데이터를 기반으로 시나리오 판단
 * @param {object} signal - { priceDir, foreignerAction, oiChange }
 * @returns {object} 매칭된 시나리오
 */
export function evaluateScenario(signal) {
  const { priceDir, foreignerAction, oiChange } = signal;
  return SCENARIOS.find(s =>
    s.price === priceDir &&
    s.foreigner === foreignerAction &&
    s.oi === oiChange
  ) || SCENARIOS[0];
}

/**
 * 비차익 프로그램매매 + 선물 + OI 조합 신호 (PDF p.4)
 * 4가지 조합:
 * 1. 강한 상승: 선물↑ + OI↑ + 외국인매수 + 비차익매수
 * 2. 상승 신뢰도 낮음: 선물↑ + OI↓ + 비차익매도
 * 3. 강한 하락: 선물↓ + OI↑ + 외국인매도 + 비차익매도
 * 4. 하락 신뢰도 낮음: 선물↓ + OI↓ + 비차익매수
 */
export function evaluateCompositeSignal(futureDir, oiDir, foreignerFutures, nonArbitrageNet) {
  const nonArbDir = nonArbitrageNet > 0 ? 'buy' : 'sell';

  if (futureDir === '↑' && oiDir === '↑' && foreignerFutures > 0 && nonArbDir === 'buy') {
    return { type: 'strong-bull', label: '강한 상승', emoji: '🟢🟢', detail: '선물↑ + OI↑ + 외국인매수 + 비차익매수 = 신규 상방 + 현물 확인' };
  }
  if (futureDir === '↑' && oiDir === '↓' && nonArbDir === 'sell') {
    return { type: 'weak-bull', label: '상승 신뢰도 낮음', emoji: '🟡', detail: '선물↑ + OI↓ + 비차익매도 = 숏커버 가능성 + 현물 약함' };
  }
  if (futureDir === '↓' && oiDir === '↑' && foreignerFutures < 0 && nonArbDir === 'sell') {
    return { type: 'strong-bear', label: '강한 하락', emoji: '🔴🔴', detail: '선물↓ + OI↑ + 외국인매도 + 비차익매도 = 신규 하방 + 현물 매도' };
  }
  if (futureDir === '↓' && oiDir === '↓' && nonArbDir === 'buy') {
    return { type: 'weak-bear', label: '하락 신뢰도 낮음', emoji: '🟡', detail: '선물↓ + OI↓ + 비차익매수 = 롱 청산 가능성 + 현물 받침' };
  }

  return { type: 'mixed', label: '혼조', emoji: '⚪', detail: '복합 신호 - 추가 확인 필요' };
}

/**
 * 신호 강도 클래스 반환
 */
export function getSignalStrengthClass(scenarioId) {
  const s = SCENARIOS.find(x => x.id === scenarioId);
  if (!s) return 'neutral';
  if (s.strength === 'strong') return s.signal === 'bull' ? 'bull' : 'bear';
  if (s.strength === 'weak') return 'neutral';
  return 'mixed';
}

/**
 * 외국인 포지션 방향성 판단
 */
export function foreignerDirection(futuresNet, putCallRatio) {
  if (futuresNet > 1000 && putCallRatio < 1) return { dir: 'bull', label: '상방 포지션' };
  if (futuresNet < -1000 && putCallRatio > 1) return { dir: 'bear', label: '하방 포지션' };
  if (futuresNet > 0) return { dir: 'bull-weak', label: '약한 상방' };
  if (futuresNet < 0) return { dir: 'bear-weak', label: '약한 하방' };
  return { dir: 'neutral', label: '중립' };
}

/**
 * Max Pain 계산 (옵션 매도자 손실 최소화 가격)
 * @param {number[]} strikes - 행사가 배열
 * @param {number[]} callOI - 콜 OI 배열
 * @param {number[]} putOI - 풋 OI 배열
 */
export function calculateMaxPain(strikes, callOI, putOI) {
  let minLoss = Infinity;
  let maxPainStrike = strikes[0];

  for (let i = 0; i < strikes.length; i++) {
    const s = strikes[i];
    let totalLoss = 0;

    // 콜 매도자 손실: 행사가 < s인 콜 OI × (s - 행사가)
    for (let j = 0; j < strikes.length; j++) {
      if (strikes[j] < s) {
        totalLoss += callOI[j] * (s - strikes[j]);
      }
    }
    // 풋 매도자 손실: 행사가 > s인 풋 OI × (행사가 - s)
    for (let j = 0; j < strikes.length; j++) {
      if (strikes[j] > s) {
        totalLoss += putOI[j] * (strikes[j] - s);
      }
    }

    if (totalLoss < minLoss) {
      minLoss = totalLoss;
      maxPainStrike = s;
    }
  }

  return maxPainStrike;
}

/**
 * 주요 지지/저항 구간 찾기
 * 콜 OI 최상위 = 상방 저항
 * 풋 OI 최상위 = 하방 지지
 */
export function findKeyLevels(strikes, callOI, putOI) {
  const maxCallOIIdx = callOI.indexOf(Math.max(...callOI));
  const maxPutOIIdx = putOI.indexOf(Math.max(...putOI));

  const topCallStrikes = [...callOI]
    .map((v, i) => ({ v, s: strikes[i] }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map(x => x.s);

  const topPutStrikes = [...putOI]
    .map((v, i) => ({ v, s: strikes[i] }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map(x => x.s);

  return {
    resistance: strikes[maxCallOIIdx],
    support: strikes[maxPutOIIdx],
    topResistances: topCallStrikes,
    topSupports: topPutStrikes,
  };
}
