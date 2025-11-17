"use strict";

const { Gio, GLib, UPowerGlib } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { Utils } = Me.imports.utils;
const { Log } = Me.imports.log;

var PowerTracker = class {
  constructor(onChange) {
    this._onChange = typeof onChange === "function" ? onChange : null;

    this._upClient = new UPowerGlib.Client();
    this._display = this._upClient.get_display_device();

    const s = Utils.readState();
    this._unplugMonotonic = s.unplugMonotonic || null;
    this._accumulatedRuntime = s.accumulatedRuntime || 0;
    this._lastUpdateMonotonic = s.lastUpdateMonotonic || null;
    this._lastPercent = s.batteryPercent || null;
    this._startPercent = s.startPercent || null;

    this._signals = [];
    this._connect(this._display, "notify::state", () => this._onPowerChange());
    this._connect(this._display, "notify::time-to-empty", () =>
      this._safeChange(),
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

  _safeChange() {
    if (this._onChange) {
      try {
        this._onChange();
      } catch (e) {
        Log.write("onChange error: " + e);
      }
    }
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

    // Reset if plugged in OR charged significantly while running
    if (
      !onBattery ||
      (lastPercent !== null && currentPercent > lastPercent + 3)
    ) {
      this._unplugMonotonic = null;
      this._accumulatedRuntime = 0;
      this._startPercent = null;
      this._lastUpdateMonotonic = null;
    }

    // Start tracking when first detected on battery
    if (onBattery && !this._unplugMonotonic) {
      this._unplugMonotonic = nowMono;
      this._lastUpdateMonotonic = nowMono;
      this._accumulatedRuntime = 0;
      this._startPercent = Math.round(currentPercent);
    }

    this._lastPercent = currentPercent;
    this._persist();
    this._safeChange();
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

    this._persist();
    this._safeChange();
  }

  _persist() {
    Utils.writeState({
      unplugMonotonic: this._unplugMonotonic,
      accumulatedRuntime: this._accumulatedRuntime,
      lastUpdateMonotonic: this._lastUpdateMonotonic,
      batteryPercent: this._lastPercent,
      startPercent: this._startPercent,
    });
  }

  getTimes() {
    const onBattery = this._isOnBattery();
    const timeToEmpty = this._display.time_to_empty;
    const hasUnplug = !!this._unplugMonotonic;
    const active = this._accumulatedRuntime;
    const total = active;
    return {
      onBattery,
      hasUnplug,
      active,
      total,
      startPercent: this._startPercent,
      timeToEmpty,
    };
  }

  destroy() {
    if (this._timeoutId) GLib.source_remove(this._timeoutId);
    this._signals.forEach(([o, id]) => o.disconnect(id));
    this._signals = [];
    Log.write("PowerTracker destroyed");
  }
};
