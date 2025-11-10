"use strict";

const { Gio, GLib, GObject, St, UPowerGlib } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const OnBatteryIconName = "clock-alt-symbolic";
const OnAcIconName = "gnome-power-manager-symbolic";

const CACHE_DIR = GLib.build_filenamev([
  GLib.get_user_cache_dir(),
  "battery-runtime",
]);
const CACHE_FILE = GLib.build_filenamev([CACHE_DIR, "state.json"]);

function formatDuration(seconds) {
  if (seconds <= 0 || !Number.isFinite(seconds)) return "0m";
  const mins = Math.floor(seconds / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

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

var BatteryRuntimeIndicator = GObject.registerClass(
  class BatteryRuntimeIndicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, "Battery Runtime Indicator");

      this._icon = new St.Icon({
        icon_name: OnBatteryIconName,
        style_class: "system-status-icon",
      });

      this._label = new St.Label({
        text: "-",
        y_align: St.Align.MIDDLE,
        style_class: "battery-runtime-label",
      });

      const box = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      box.add_child(this._icon);
      box.add_child(this._label);
      this.add_child(box);

      this._buildReadOnlyPopup();

      this._upClient = new UPowerGlib.Client();
      this._display = this._upClient.get_display_device();

      const s = readState();
      this._unplugMonotonic = s.unplugMonotonic || null; // monotonic time when unplugged
      this._accumulatedRuntime = s.accumulatedRuntime || 0; // total runtime in seconds
      this._lastUpdateMonotonic = s.lastUpdateMonotonic || null;
      this._lastPercent = s.batteryPercent || null;
      this._startPercent = s.startPercent || null;

      this._signals = [];
      this._connect(this._display, "notify::state", () =>
        this._onPowerChange(),
      );
      this._connect(this._display, "notify::time-to-empty", () =>
        this._update(),
      );

      this._timeoutId = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        60,
        () => {
          this._tick();
          return GLib.SOURCE_CONTINUE;
        },
      );

      this._onPowerChange();
    }

    _buildReadOnlyPopup() {
      this.menu.removeAll();
      const section = new PopupMenu.PopupMenuSection();

      this._titleLabel = new St.Label({
        text: "Battery Runtime",
        style_class: "battery-runtime-popup-header",
      });
      this._sinceLabel = new St.Label({
        text: "Since unplugged: –",
        style_class: "battery-runtime-popup-label",
      });
      this._startPercentLabel = new St.Label({
        text: "Started at: –",
        style_class: "battery-runtime-popup-label",
      });
      this._remainingLabel = new St.Label({
        text: "Estimated remaining: –",
        style_class: "battery-runtime-popup-label",
      });
      const hr = new St.Widget({
        style_class: "battery-runtime-separator",
        x_expand: true,
        y_expand: false,
        height: 1,
      });

      const vbox = new St.BoxLayout({ vertical: true });
      vbox.add_child(this._titleLabel);
      vbox.add_child(hr);
      vbox.add_child(this._sinceLabel);
      vbox.add_child(this._startPercentLabel);
      vbox.add_child(this._remainingLabel);

      section.actor.add_child(vbox);
      this.menu.addMenuItem(section);
    }

    _connect(obj, sig, cb) {
      this._signals.push([obj, obj.connect(sig, cb)]);
    }

    _isOnBattery() {
      return this._display.state === UPowerGlib.DeviceState.DISCHARGING;
    }

    _onPowerChange() {
      const onBattery = this._isOnBattery();
      const currentPercent = this._display.percentage;
      const lastPercent = this._lastPercent;

      const nowMono = Math.floor(GLib.get_monotonic_time() / 1_000_000);

      // Reset if plugged in or charged significantly
      if (
        !onBattery ||
        (lastPercent !== null && currentPercent > lastPercent + 3)
      ) {
        this._unplugMonotonic = null;
        this._accumulatedRuntime = 0;
        this._startPercent = null;
      }

      // Start new unplug tracking if unplugged
      if (onBattery && !this._unplugMonotonic) {
        this._unplugMonotonic = nowMono;
        this._lastUpdateMonotonic = nowMono;
        this._accumulatedRuntime = 0;
        this._startPercent = Math.round(currentPercent);
      }

      // update last percent
      this._lastPercent = currentPercent;

      writeState({
        unplugMonotonic: this._unplugMonotonic,
        accumulatedRuntime: this._accumulatedRuntime,
        lastUpdateMonotonic: this._lastUpdateMonotonic,
        batteryPercent: currentPercent,
        startPercent: this._startPercent,
      });

      this._update();
    }

    _tick() {
      const onBattery = this._isOnBattery();
      if (!onBattery || !this._unplugMonotonic) return;

      const nowMono = Math.floor(GLib.get_monotonic_time() / 1_000_000);
      if (this._lastUpdateMonotonic) {
        const delta = nowMono - this._lastUpdateMonotonic;
        if (delta > 0) this._accumulatedRuntime += delta;
      }
      this._lastUpdateMonotonic = nowMono;

      writeState({
        unplugMonotonic: this._unplugMonotonic,
        accumulatedRuntime: this._accumulatedRuntime,
        lastUpdateMonotonic: this._lastUpdateMonotonic,
        batteryPercent: this._lastPercent,
        startPercent: this._startPercent,
      });

      this._update();
    }

    _update() {
      const onBattery = this._isOnBattery();
      const timeToEmpty = this._display.time_to_empty;

      if (onBattery) {
        const since = formatDuration(this._accumulatedRuntime);

        this._icon.set_icon_name(OnBatteryIconName);
        this._label.set_text(since);
        this._sinceLabel.text = `Since unplugged: ${since}`;
        this._startPercentLabel.text =
          this._startPercent != null
            ? `Started at: ${Math.round(this._startPercent)}%`
            : "Started at: –";
        this._remainingLabel.text = `Estimated remaining: ${timeToEmpty > 0 ? formatDuration(timeToEmpty) : "–"}`;
        this.visible = true;
      } else {
        this.visible = true;
        this._icon.set_icon_name(OnAcIconName);
        this._label.set_text("AC");
        this._startPercentLabel.text = "Started at: –";
      }
    }

    destroy() {
      if (this._timeoutId) GLib.source_remove(this._timeoutId);
      this._signals.forEach(([o, id]) => o.disconnect(id));
      super.destroy();
    }
  },
);

let indicator;

function init() {}

function enable() {
  indicator = new BatteryRuntimeIndicator();
  Main.panel.addToStatusArea("battery-runtime", indicator);
}

function disable() {
  if (indicator) indicator.destroy();
  indicator = null;
}
