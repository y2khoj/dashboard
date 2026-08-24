/**
 * expiry.js - 만기일 계산 및 D-Day
 */
import { EXPIRY_DATES } from './data.js';

export function getNextExpiries() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = [];

  for (const exp of EXPIRY_DATES) {
    const optDate = new Date(exp.optionDate);
    const futDate = exp.futureDate ? new Date(exp.futureDate) : null;

    if (optDate >= today) {
      const diff = Math.ceil((optDate - today) / (1000 * 60 * 60 * 24));
      upcoming.push({
        ...exp,
        optDateObj: optDate,
        futDateObj: futDate,
        daysToOption: diff,
        daysToFuture: futDate ? Math.ceil((futDate - today) / (1000 * 60 * 60 * 24)) : null,
        isThisMonth: optDate.getMonth() === today.getMonth() && optDate.getFullYear() === today.getFullYear(),
        isFutureExpiry: !!exp.futureDate,
      });
    }
  }

  return upcoming.slice(0, 6);
}

export function getNextOptionExpiry() {
  const upcoming = getNextExpiries();
  return upcoming[0] || null;
}

export function getNextFutureExpiry() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const exp of EXPIRY_DATES) {
    if (exp.futureDate) {
      const futDate = new Date(exp.futureDate);
      if (futDate >= today) {
        const diff = Math.ceil((futDate - today) / (1000 * 60 * 60 * 24));
        return { ...exp, daysToFuture: diff, futDateObj: futDate };
      }
    }
  }
  return null;
}

export function isRolloverPeriod(daysToExpiry) {
  return daysToExpiry <= 14 && daysToExpiry > 0;
}

export function isExpiryWeek(daysToExpiry) {
  return daysToExpiry <= 5 && daysToExpiry > 0;
}

export function formatExpiryDate(dateStr) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]})`;
}
