/**
 * charts.js - Chart.js 차트 렌더링
 */

// 공통 Chart.js 기본 설정
const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeInOutQuart' },
  plugins: {
    legend: {
      labels: {
        color: '#8899aa',
        font: { family: "'JetBrains Mono', monospace", size: 11 },
        boxWidth: 12,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#0f1b2d',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#8899aa',
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: "'Noto Sans KR', sans-serif", size: 12, weight: 'bold' },
      bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: { color: '#4a5568', font: { family: "'JetBrains Mono', monospace", size: 10 } },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: { color: '#4a5568', font: { family: "'JetBrains Mono', monospace", size: 10 } },
    },
  },
};

// 활성 차트 인스턴스 저장
const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

/**
 * 옵션 OI 분포 차트 (Max Pain 시각화)
 */
export function renderOptionOIChart(canvasId, optionData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const { strikes, callOI, putOI, maxPain, currentIndex } = optionData;

  // 현재 지수에 가장 가까운 행사가 인덱스
  const currentIdx = strikes.reduce((best, s, i) =>
    Math.abs(s - currentIndex) < Math.abs(strikes[best] - currentIndex) ? i : best, 0);

  const callColors = strikes.map((s, i) => {
    if (s === maxPain) return 'rgba(251,191,36,0.9)';
    if (i === currentIdx) return 'rgba(91,141,238,0.6)';
    return 'rgba(255,77,109,0.75)';
  });

  const putColors = strikes.map((s, i) => {
    if (s === maxPain) return 'rgba(251,191,36,0.7)';
    if (i === currentIdx) return 'rgba(91,141,238,0.5)';
    return 'rgba(0,229,160,0.75)';
  });

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: strikes.map(s => s.toLocaleString()),
      datasets: [
        {
          label: '콜 OI (저항)',
          data: callOI,
          backgroundColor: callColors,
          borderColor: callColors.map(c => c.replace('0.75', '1')),
          borderWidth: 1,
          borderRadius: 3,
        },
        {
          label: '풋 OI (지지)',
          data: putOI,
          backgroundColor: putColors,
          borderColor: putColors.map(c => c.replace('0.75', '1')),
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { ...CHART_DEFAULTS.plugins.legend },
        annotation: {
          annotations: {
            currentLine: {
              type: 'line',
              xMin: currentIdx,
              xMax: currentIdx,
              borderColor: '#5b8dee',
              borderWidth: 2,
              borderDash: [4, 4],
              label: {
                content: `현재 ${currentIndex}`,
                enabled: true,
                position: 'end',
                color: '#5b8dee',
                font: { size: 10 },
              },
            },
          },
        },
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            title: (items) => `행사가 ${strikes[items[0].dataIndex].toLocaleString()}`,
            label: (item) => `${item.dataset.label}: ${item.raw.toLocaleString()} 계약`,
          },
        },
      },
      scales: {
        x: {
          ...CHART_DEFAULTS.scales.x,
          stacked: false,
          ticks: {
            ...CHART_DEFAULTS.scales.x.ticks,
            maxRotation: 45,
          },
        },
        y: {
          ...CHART_DEFAULTS.scales.y,
          ticks: {
            ...CHART_DEFAULTS.scales.y.ticks,
            callback: v => v.toLocaleString(),
          },
        },
      },
    },
  });
}

/**
 * 비차익 프로그램매매 미니 차트 (Bar)
 */
export function renderProgramChart(canvasId, programData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const { arbitrage, nonArbitrage } = programData;
  const arb = arbitrage.net / 100000000;      // 억원
  const nonArb = nonArbitrage.net / 100000000;

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['차익매매', '비차익매매'],
      datasets: [{
        data: [arb, nonArb],
        backgroundColor: [
          arb >= 0 ? 'rgba(0,229,160,0.7)' : 'rgba(255,77,109,0.7)',
          nonArb >= 0 ? 'rgba(0,229,160,0.7)' : 'rgba(255,77,109,0.7)',
        ],
        borderColor: [
          arb >= 0 ? '#00e5a0' : '#ff4d6d',
          nonArb >= 0 ? '#00e5a0' : '#ff4d6d',
        ],
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: (item) => {
              const v = item.raw;
              const sign = v > 0 ? '+' : '';
              return `순매수: ${sign}${v.toFixed(0)}억원`;
            },
          },
        },
      },
      scales: {
        x: { ...CHART_DEFAULTS.scales.x },
        y: {
          ...CHART_DEFAULTS.scales.y,
          ticks: {
            ...CHART_DEFAULTS.scales.y.ticks,
            callback: v => `${v > 0 ? '+' : ''}${v.toFixed(0)}억`,
          },
        },
      },
    },
  });
}

/**
 * 투자자별 선물 순매수 도넛/Bar 차트
 */
export function renderInvestorChart(canvasId, investorData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = investorData.data.map(d => d.name);
  const futures = investorData.data.map(d => d.futures);
  const colors = futures.map(v => v > 0 ? 'rgba(0,229,160,0.75)' : 'rgba(255,77,109,0.75)');
  const borderColors = futures.map(v => v > 0 ? '#00e5a0' : '#ff4d6d');

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '선물 순매수(억원)',
        data: futures,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: (item) => {
              const v = item.raw;
              return `선물: ${v > 0 ? '+' : ''}${v.toLocaleString()}억원`;
            },
          },
        },
      },
      scales: {
        x: {
          ...CHART_DEFAULTS.scales.x,
          ticks: {
            ...CHART_DEFAULTS.scales.x.ticks,
            callback: v => `${v > 0 ? '+' : ''}${v.toLocaleString()}`,
          },
        },
        y: { ...CHART_DEFAULTS.scales.y },
      },
    },
  });
}

/**
 * 투자자별 만기손익 라인 차트
 */
export function renderPnLChart(canvasId, pnlData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const { investors, baseIndex } = pnlData;
  const indexRange = [];
  const start = baseIndex - 100;
  const end = baseIndex + 100;
  for (let i = start; i <= end; i += 10) indexRange.push(i);

  const datasets = investors.map((inv, idx) => {
    const colors = ['#5b8dee', '#ff4d6d', '#a78bfa'];
    const data = indexRange.map(price => {
      // 단순화된 P&L: 손익분기점 기준 선형
      if (inv.direction === 'bull') {
        return (price - inv.breakeven) * 10; // 단순 선형
      } else {
        return (inv.breakeven - price) * 10;
      }
    });
    return {
      label: inv.name,
      data,
      borderColor: colors[idx % colors.length],
      backgroundColor: `${colors[idx % colors.length]}20`,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0,
      fill: false,
    };
  });

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: indexRange.map(v => v.toLocaleString()),
      datasets,
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          ...CHART_DEFAULTS.scales.x,
          ticks: { ...CHART_DEFAULTS.scales.x.ticks, maxTicksLimit: 8 },
        },
        y: {
          ...CHART_DEFAULTS.scales.y,
          ticks: {
            ...CHART_DEFAULTS.scales.y.ticks,
            callback: v => `${v > 0 ? '+' : ''}${v.toFixed(0)}`,
          },
        },
      },
    },
  });
}

export function destroyAllCharts() {
  Object.keys(chartInstances).forEach(id => destroyChart(id));
}
