"use strict";

const { Gio, GLib } = imports.gi;

const LOG_DIR = GLib.build_filenamev([GLib.get_home_dir(), ".local/share"]);
const LOG_FILE = GLib.build_filenamev([LOG_DIR, "battery-runtime.log"]);

let _stream = null;

function init() {
  try {
    GLib.mkdir_with_parents(LOG_DIR, 0o755);

    const file = Gio.File.new_for_path(LOG_FILE);
    if (!file.query_exists(null)) {
      file.create(Gio.FileCreateFlags.NONE, null).close(null);
    }

    _stream = file.append_to(Gio.FileCreateFlags.NONE, null);
    write("==== Battery Runtime Extension started ====");
  } catch (e) {
    log(`log.init() failed: ${e}`);
  }
}

/**
 * Write a line to the log file.
 */
function write(message) {
  try {
    if (!_stream) init();
    const timestamp = new Date().toISOString();
    const line = `${timestamp} ${message}\n`;
    _stream.write(line, null);
    _stream.flush(null);
  } catch (e) {
    log(`[battery-runtime] log.write() failed: ${e}`);
  }
}

/**
 * Gracefully close the log file.
 */
function close() {
  try {
    if (_stream) {
      write("==== Battery Runtime Extension stopped ====");
      _stream.close(null);
      _stream = null;
    }
  } catch (e) {
    log(`log.close() failed: ${e}`);
  }
}

/**
 * Exported API
 */
var Log = { init, write, close, LOG_FILE };
