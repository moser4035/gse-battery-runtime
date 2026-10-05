/**
 * Splits the time since unplug into active and suspended time.
 *
 * @param {{unplugTime: number, suspendedAtUnplug: number}} record
 * @param {number} nowSeconds wall-clock time
 * @param {number} suspendedNow total suspended seconds in this boot
 * @returns {{total: number, suspended: number, active: number}}
 */
export function computeDurations(record, nowSeconds, suspendedNow) {
  const total = Math.max(0, nowSeconds - record.unplugTime);
  const suspended = Math.min(
    total,
    Math.max(0, suspendedNow - record.suspendedAtUnplug),
  );
  return { total, suspended, active: total - suspended };
}
