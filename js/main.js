/**
 * main.js - 앱 초기화, DOM 렌더링, 실시간 갱신
 */
import { fetchDashboardData, formatNumber, formatChange, getSignalClass, getScenarioById, SCENARIOS, EXPIRY_DATES } from './data.js';
import { evaluateScenario, evaluateCompositeSignal, calculateMaxPain, findKeyLevels } from './signals.js';
import { getNextExpiries, getNextOptionExpiry, getNextFutureExpiry, isRolloverPeriod, isExpiryWeek, formatExpiryDate } from './expiry.js';
import { renderOptionOIChart, renderProgramChart, renderInvestorChart, renderPnLChart } from './charts.js';

const REFRESH_INTERVAL = 30000; // 30초
let refreshTimer = null;
let isLoading = false;

// ===== 시계 =====
function updateClock() {
  const el = document.getElementById('live-clock');
  if (!el) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  el.textContent = `${h}:${m}:${s}`;
}

// ===== 헤더 업데이트 =====
function updateHeader(data) {
  const { kospi200, futures, marketOpen } = data;
  const nearFut = futures[0];

  setTextAndClass('header-kospi', kospi200.current.toFixed(2), getSignalClass(kospi200.change));
  const kChange = document.getElementById('header-kospi-change');
  if (kChange) {
    kChange.textContent = `${formatChange(kospi200.change)} (${formatChange(kospi200.changePct)}%)`;
    kChange.className = `header-change ${getSignalClass(kospi200.change)}`;
  }

  setTextAndClass('header-futures', nearFut.current.toFixed(2), getSignalClass(nearFut.change));
  const fChange = document.getElementById('header-futures-change');
  if (fChange) {
    fChange.textContent = `${formatChange(nearFut.change)} (${formatChange(nearFut.changePct)}%)`;
    fChange.className = `header-change ${getSignalClass(nearFut.change)}`;
  }

  const basisEl = document.getElementById('header-basis');
  if (basisEl) {
    basisEl.textContent = `베이시스 ${formatChange(nearFut.basis, 2)}`;
    basisEl.className = `header-change ${getSignalClass(nearFut.basis)}`;
  }

  const statusEl = document.getElementById('market-status-text');
  if (statusEl) {
    statusEl.textContent = marketOpen ? '장중' : '장외';
  }
  const dotEl = document.querySelector('.market-status-dot');
  if (dotEl) {
    dotEl.style.background = marketOpen ? 'var(--up)' : 'var(--text-muted)';
  }
}

// ===== 선물 체인 =====
function updateFuturesChain(data) {
  const { futures } = data;
  const el = document.getElementById('futures-chain');
  if (!el) return;
  el.innerHTML = futures.map(f => `
    <div class="futures-month ${f.isNearMonth ? 'active' : ''}">
      <div class="futures-month-label">${f.label}</div>
      <div class="futures-month-price ${getSignalClass(f.change)}">${formatNumber(f.current, 2)}</div>
      <div class="futures-month-change ${getSignalClass(f.change)}">${formatChange(f.change, 2)} (${formatChange(f.changePct, 2)}%)</div>
      <div class="futures-month-oi">OI: <strong>${formatNumber(f.oi)}</strong> <span class="${getSignalClass(f.oiChange)}">(${formatChange(f.oiChange)})</span></div>
    </div>
  `).join('');
}

// ===== KPI 카드 =====
function updateKpiCards(data) {
  const near = data.futures[0];

  const kpis = [
    { id: 'kpi-futures', label: '선물현재가', value: formatNumber(near.current, 2), sub: `전일 ${formatNumber(near.prev, 2)}`, change: `${formatChange(near.change, 2)} (${formatChange(near.changePct, 2)}%)`, cls: getSignalClass(near.change) },
    { id: 'kpi-oi', label: '미결제약정', value: formatNumber(near.oi), sub: `전일대비 OI`, change: formatChange(near.oiChange), cls: getSignalClass(near.oiChange) },
    { id: 'kpi-basis', label: '시장베이시스', value: formatChange(near.basis, 2), sub: `이론 ${formatChange(near.theoBasis, 2)}`, change: near.basis > 0 ? '콘탱고' : '백워데이션', cls: getSignalClass(near.basis) },
    { id: 'kpi-volume', label: '거래량', value: formatNumber(near.volume), sub: `전일대비`, change: formatChange(near.volumeChange), cls: getSignalClass(near.volumeChange) },
  ];

  kpis.forEach(kpi => {
    const card = document.getElementById(kpi.id);
    if (!card) return;
    card.className = `kpi-card ${kpi.cls}`;
    card.querySelector('.kpi-value').textContent = kpi.value;
    card.querySelector('.kpi-value').className = `kpi-value ${kpi.cls}`;
    card.querySelector('.kpi-sub').textContent = kpi.sub;
    card.querySelector('.kpi-change').textContent = kpi.change;
    card.querySelector('.kpi-change').className = `kpi-change ${kpi.cls}`;
    card.classList.add('updated');
    setTimeout(() => card.classList.remove('updated'), 600);
  });
}

// ===== 투자자별 매매동향 =====
function updateInvestorTable(data) {
  const tbody = document.getElementById('investor-tbody');
  if (!tbody) return;

  tbody.innerHTML = data.investorFlow.data.map(inv => `
    <tr class="${inv.class}">
      <td>${inv.name}</td>
      <td class="${getSignalClass(inv.kospi)}">${formatChange(inv.kospi)}</td>
      <td class="${getSignalClass(inv.kosdaq)}">${formatChange(inv.kosdaq)}</td>
      <td class="${getSignalClass(inv.futures)}"><strong>${formatChange(inv.futures)}</strong></td>
      <td class="${getSignalClass(inv.callOpt)}">${formatChange(inv.callOpt)}</td>
      <td class="${getSignalClass(inv.putOpt)}">${formatChange(inv.putOpt)}</td>
    </tr>
  `).join('');

  renderInvestorChart('investor-chart', data.investorFlow);
}

// ===== 조합 신호 =====
function updateSignal(data) {
  const { currentSignal } = data;
  const scenario = getScenarioById(currentSignal.scenarioId);
  if (!scenario) return;

  const mainEl = document.getElementById('signal-main');
  if (mainEl) {
    const isBull = scenario.signal.startsWith('bull');
    const isBear = scenario.signal.startsWith('bear');
    const cls = isBull ? 'bull' : isBear ? 'bear' : 'neutral';

    mainEl.className = `signal-main ${cls}`;

    const emoji = isBull ? '📈' : isBear ? '📉' : '⚠️';
    const titleEl = mainEl.querySelector('.signal-text h3');
    const descEl = mainEl.querySelector('.signal-text p');
    const iconEl = mainEl.querySelector('.signal-icon');

    if (iconEl) iconEl.textContent = emoji;
    if (titleEl) titleEl.textContent = scenario.label;
    if (descEl) descEl.textContent = `시나리오 ${scenario.id}: 가격${scenario.price} × 외국인${scenario.foreigner} × OI${scenario.oi}`;
  }

  // 인디케이터
  const priceInd = document.getElementById('ind-price');
  const foreignerInd = document.getElementById('ind-foreigner');
  const oiInd = document.getElementById('ind-oi');

  if (priceInd) {
    priceInd.textContent = currentSignal.priceDir;
    priceInd.className = `ind-value ${currentSignal.priceDir === '↑' ? 'up' : 'down'}`;
  }
  if (foreignerInd) {
    foreignerInd.textContent = currentSignal.foreignerAction;
    foreignerInd.className = `ind-value ${currentSignal.foreignerAction === '매수' ? 'up' : 'down'}`;
  }
  if (oiInd) {
    oiInd.textContent = currentSignal.oiChange;
    oiInd.className = `ind-value ${currentSignal.oiChange === '↑' ? 'up' : 'down'}`;
  }

  // 8가지 시나리오 그리드 업데이트
  const grid = document.getElementById('scenarios-grid');
  if (grid) {
    grid.innerHTML = SCENARIOS.map(s => {
      const isActive = s.id === currentSignal.scenarioId;
      const isBull = s.signal.startsWith('bull');
      const isBear = s.signal.startsWith('bear');
      const activeClass = isActive ? (isBull ? 'active-bull' : isBear ? 'active-bear' : 'active-bull') : '';
      return `
        <div class="combo-item ${activeClass}">
          <div class="combo-number">시나리오 ${s.id}</div>
          <div class="combo-arrows">${s.price} ${s.foreigner === '매수' ? '🟢' : '🔴'} ${s.oi}</div>
          <div class="combo-desc">${s.label}</div>
        </div>
      `;
    }).join('');
  }
}

// ===== 프로그램매매 =====
function updateProgramTrading(data) {
  const { programTrading } = data;
  const arb = programTrading.arbitrage;
  const nonArb = programTrading.nonArbitrage;

  const rows = [
    { name: '차익매매', buy: arb.buy.amount, sell: arb.sell.amount, net: arb.net },
    { name: '비차익매매', buy: nonArb.buy.amount, sell: nonArb.sell.amount, net: nonArb.net },
    { name: '합계', buy: programTrading.total.buy.amount, sell: programTrading.total.sell.amount, net: programTrading.total.net },
  ];

  const tbody = document.getElementById('program-tbody');
  if (tbody) {
    tbody.innerHTML = rows.map((r, i) => `
      <tr ${i === rows.length - 1 ? 'style="font-weight:700;border-top:1px solid rgba(255,255,255,0.08)"' : ''}>
        <td ${i === 1 ? 'style="color:var(--neutral);font-weight:700"' : ''}>${r.name}${i === 1 ? ' ★' : ''}</td>
        <td class="val-pos">${formatNumber(Math.round(r.buy / 100000000))}</td>
        <td class="val-neg">${formatNumber(Math.round(r.sell / 100000000))}</td>
        <td class="${getSignalClass(r.net)}"><strong>${formatChange(Math.round(r.net / 100000000))}</strong></td>
      </tr>
    `).join('');
  }

  // 비차익 미니바
  const maxAbs = Math.max(Math.abs(arb.net), Math.abs(nonArb.net));
  const setBar = (id, value) => {
    const bar = document.getElementById(id);
    if (!bar) return;
    const pct = Math.min((Math.abs(value) / maxAbs) * 100, 100);
    bar.style.width = `${pct}%`;
    bar.className = `mini-bar-fill ${value > 0 ? 'up' : 'down'}`;
  };
  setBar('bar-arb', arb.net);
  setBar('bar-nonarb', nonArb.net);

  renderProgramChart('program-chart', programTrading);
}

// ===== 만기 캘린더 =====
function updateExpiryCalendar() {
  const nextOpt = getNextOptionExpiry();
  const nextFut = getNextFutureExpiry();
  const upcoming = getNextExpiries();

  // D-Day 카운트다운
  const countdownEl = document.getElementById('countdown-days');
  const countdownLabel = document.getElementById('countdown-label');
  const countdownDate = document.getElementById('countdown-date');
  const expiryTypeBadge = document.getElementById('expiry-type-badge');

  if (nextOpt && countdownEl) {
    countdownEl.textContent = nextOpt.daysToOption;
    if (countdownLabel) countdownLabel.textContent = '옵션 만기까지 (영업일 기준)';
    if (countdownDate) countdownDate.textContent = `📅 ${formatExpiryDate(nextOpt.optionDate)}`;

    const rollover = isRolloverPeriod(nextOpt.daysToOption);
    const expiryWeek = isExpiryWeek(nextOpt.daysToOption);

    if (expiryTypeBadge) {
      if (nextOpt.isFutureExpiry) {
        expiryTypeBadge.textContent = '선물 동시 만기 ⚡';
        expiryTypeBadge.className = 'expiry-type-badge badge-purple';
      } else {
        expiryTypeBadge.textContent = '옵션 만기';
        expiryTypeBadge.className = 'expiry-type-badge badge-blue';
      }
    }

    // 롤오버 배너
    const banner = document.getElementById('rollover-banner');
    if (banner) {
      if (rollover) {
        banner.classList.remove('hidden');
        banner.querySelector('.rollover-text').textContent =
          `⚠️ 롤오버 기간 (D-${nextOpt.daysToOption}): 만기주 수급 왜곡 주의 - OI 증감을 함께 확인하세요`;
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  // 다음 만기 리스트
  const listEl = document.getElementById('expiry-list');
  if (listEl) {
    listEl.innerHTML = upcoming.slice(0, 5).map(exp => `
      <div class="expiry-item ${exp.daysToOption <= 14 ? 'soon' : ''}">
        <span class="expiry-month">${exp.month}월</span>
        <div class="expiry-dates">
          <span class="expiry-opt">옵션: ${formatExpiryDate(exp.optionDate)}</span>
          ${exp.futureDate ? `<span class="expiry-fut">선물: ${formatExpiryDate(exp.futureDate)}</span>` : ''}
        </div>
        <span class="${exp.daysToOption <= 5 ? 'val-neg' : exp.daysToOption <= 14 ? 'neutral' : 'val-neutral'}" style="font-size:11px;font-family:var(--font-num)">D-${exp.daysToOption}</span>
      </div>
    `).join('');
  }
}

// ===== Max Pain + 옵션 OI =====
function updateMaxPain(data) {
  const { optionOI } = data;
  const { strikes, callOI, putOI, currentIndex } = optionOI;

  // Max Pain 재계산
  const { calculateMaxPain: calcMP, findKeyLevels } = window._signals || {};
  const mp = optionOI.maxPain;
  const levels = { resistance: optionOI.callResist, support: optionOI.putSupport };

  const mpEl = document.getElementById('maxpain-price');
  if (mpEl) mpEl.textContent = formatNumber(mp);

  const resistEl = document.getElementById('resist-price');
  const supportEl = document.getElementById('support-price');
  if (resistEl) resistEl.textContent = formatNumber(levels.resistance);
  if (supportEl) supportEl.textContent = formatNumber(levels.support);

  renderOptionOIChart('option-oi-chart', optionOI);
}

// ===== 투자자별 만기손익 =====
function updatePnL(data) {
  const { investorPnL } = data;
  const tbody = document.getElementById('pnl-tbody');
  if (tbody) {
    const base = investorPnL.baseIndex;
    tbody.innerHTML = investorPnL.investors.map(inv => {
      const gap = inv.breakeven - base;
      const gapPct = (gap / base * 100).toFixed(1);
      const barPct = Math.min(Math.abs(gap) / 100 * 60 + 20, 90);
      const cls = inv.direction === 'bull' ? 'up' : 'down';
      return `
        <tr>
          <td class="${inv.class === 'foreigner' ? '' : ''}" style="color:${inv.class === 'foreigner' ? 'var(--accent)' : inv.class === 'individual' ? 'var(--text-secondary)' : 'var(--accent2)'};font-weight:600">${inv.name}</td>
          <td class="${cls}"><strong>${formatNumber(inv.breakeven, 2)}</strong></td>
          <td class="${cls}">${gap > 0 ? '+' : ''}${gap.toFixed(2)} (${gapPct > 0 ? '+' : ''}${gapPct}%)</td>
          <td>
            <div class="pnl-bar-wrapper">
              <div class="pnl-bar ${cls}" style="width:${barPct}%"></div>
            </div>
          </td>
          <td class="${getSignalClass(inv.futuresNet)}">${formatChange(inv.futuresNet)}</td>
          <td class="${inv.direction === 'bull' ? 'val-pos' : 'val-neg'}" style="font-size:11px">${inv.direction === 'bull' ? '🟢 상방 유리' : '🔴 하방 유리'}</td>
        </tr>
      `;
    }).join('');
  }

  renderPnLChart('pnl-chart', investorPnL);
}

// ===== 마지막 업데이트 시각 =====
function updateLastUpdated() {
  const el = document.getElementById('last-updated');
  if (el) {
    const now = new Date();
    el.textContent = `마지막 업데이트: ${now.toLocaleTimeString('ko-KR')}`;
  }
}

// ===== 유틸 =====
function setTextAndClass(id, text, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (cls) el.className = el.className.replace(/\b(up|down|neutral)\b/g, '') + ` ${cls}`;
}

// ===== 전체 대시보드 렌더 =====
async function renderDashboard(showLoader = false) {
  if (isLoading) return;
  isLoading = true;

  const btn = document.getElementById('refresh-btn');
  if (btn) btn.classList.add('spinning');

  try {
    const data = await fetchDashboardData();

    updateHeader(data);
    updateFuturesChain(data);
    updateKpiCards(data);
    updateInvestorTable(data);
    updateSignal(data);
    updateProgramTrading(data);
    updateExpiryCalendar();
    updateMaxPain(data);
    updatePnL(data);
    updateLastUpdated();

  } catch (err) {
    console.error('Dashboard render error:', err);
  } finally {
    isLoading = false;
    if (btn) btn.classList.remove('spinning');
  }
}

// ===== 앱 초기화 =====
function init() {
  // 시계 시작
  updateClock();
  setInterval(updateClock, 1000);

  // 초기 렌더링
  renderDashboard(true);

  // 30초마다 자동 갱신
  refreshTimer = setInterval(renderDashboard, REFRESH_INTERVAL);

  // 수동 새로고침 버튼
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => renderDashboard());
  }
}

// DOM 로드 후 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
