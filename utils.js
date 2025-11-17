"use strict";

const { Gio, GLib } = imports.gi;

const CACHE_DIR = GLib.build_filenamev([
  GLib.get_user_cache_dir(),
  "battery-runtime",
]);
const CACHE_FILE = GLib.build_filenamev([CACHE_DIR, "state.json"]);

function ensureCacheDir() {
  try {
    GLib.mkdir_with_parents(CACHE_DIR, 0o755);
  } catch (_) {}
}

function readState() {
  try {
    const file = Gio.File.new_for_path(CACHE_FILE);
    if (!file.query_exists(null)) return {};
    const [ok, contents] = file.load_contents(null);
    if (!ok) return {};
    return JSON.parse(imports.byteArray.toString(contents));
  } catch (_) {
    return {};
  }
}

function writeState(state) {
  try {
    ensureCacheDir();
    Gio.File.new_for_path(CACHE_FILE).replace_contents(
      JSON.stringify(state),
      null,
      false,
      Gio.FileCreateFlags.REPLACE_DESTINATION,
      null,
    );
  } catch (_) {}
}

function formatDuration(seconds) {
  if (seconds <= 0 || !Number.isFinite(seconds)) return "0m";
  const mins = Math.floor(seconds / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const LOG_FILE = GLib.build_filenamev([
  GLib.get_home_dir(),
  ".local/share/battery-runtime.log",
]);

// Export object via 'var' (GJS module convention)
var Utils = { formatDuration, readState, writeState };
