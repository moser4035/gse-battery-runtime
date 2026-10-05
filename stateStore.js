import Gio from "gi://Gio";
import GLib from "gi://GLib";

const STATE_DIR = GLib.build_filenamev([
  GLib.get_user_cache_dir(),
  "battery-runtime",
]);
const STATE_PATH = GLib.build_filenamev([STATE_DIR, "state.json"]);

function isValidRecord(state) {
  return (
    Number.isFinite(state?.unplugTime) &&
    Number.isFinite(state?.startPercent) &&
    Number.isFinite(state?.suspendedAtUnplug) &&
    typeof state?.bootId === "string"
  );
}

/**
 * Persists the unplug record so it survives logout, lock and reboot.
 * The record is `{ unplugTime, startPercent, bootId, suspendedAtUnplug }`
 * or `null` when on AC.
 */
export class StateStore {
  /** Reads the record synchronously. The file is tiny and read once per enable. */
  load() {
    try {
      const [, bytes] = Gio.File.new_for_path(STATE_PATH).load_contents(null);
      const state = JSON.parse(new TextDecoder().decode(bytes));
      return isValidRecord(state) ? state : null;
    } catch (e) {
      if (!e.matches?.(GLib.FileError, GLib.FileError.NOENT) &&
          !e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
        console.error(`battery-runtime: cannot read state: ${e.message}`);
      return null;
    }
  }

  /** Writes the record asynchronously so the shell is never blocked. */
  save(state) {
    try {
      GLib.mkdir_with_parents(STATE_DIR, 0o755);
      Gio.File.new_for_path(STATE_PATH).replace_contents_async(
        new TextEncoder().encode(JSON.stringify(state)),
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null,
        (file, result) => {
          try {
            file.replace_contents_finish(result);
          } catch (e) {
            console.error(`battery-runtime: cannot write state: ${e.message}`);
          }
        },
      );
    } catch (e) {
      console.error(`battery-runtime: cannot write state: ${e.message}`);
    }
  }
}
