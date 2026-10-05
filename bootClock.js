import GLib from "gi://GLib";

const BOOT_ID_PATH = "/proc/sys/kernel/random/boot_id";
const UPTIME_PATH = "/proc/uptime";

function readText(path) {
  const [ok, bytes] = GLib.file_get_contents(path);
  if (!ok) throw new Error(`cannot read ${path}`);
  return new TextDecoder().decode(bytes).trim();
}

/** Identifies the current boot; it changes on every reboot. */
export function readBootId() {
  try {
    return readText(BOOT_ID_PATH);
  } catch (e) {
    console.error(`battery-runtime: ${e.message}`);
    return "unknown";
  }
}

/**
 * Total seconds this machine has spent suspended since boot.
 *
 * /proc/uptime counts suspend (CLOCK_BOOTTIME), while GLib's monotonic clock
 * (CLOCK_MONOTONIC) does not, so their difference is exactly the suspend time.
 * This stays correct even if the extension was disabled while suspended.
 */
export function readSuspendedSeconds() {
  try {
    const boottime = parseFloat(readText(UPTIME_PATH).split(" ")[0]);
    const monotonic = GLib.get_monotonic_time() / 1_000_000;
    return Math.max(0, boottime - monotonic);
  } catch (e) {
    console.error(`battery-runtime: ${e.message}`);
    return 0;
  }
}
