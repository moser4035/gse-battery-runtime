import Gio from "gi://Gio";
import GLib from "gi://GLib";

import { readBootId, readSuspendedSeconds } from "./bootClock.js";
import { computeDurations } from "./durations.js";

// org.freedesktop.UPower.Device "State" values.
const State = {
  CHARGING: 1,
  DISCHARGING: 2,
  EMPTY: 3,
  FULLY_CHARGED: 4,
  PENDING_CHARGE: 5,
};
const ON_BATTERY_STATES = [State.DISCHARGING, State.EMPTY];
const ON_AC_STATES = [State.CHARGING, State.FULLY_CHARGED, State.PENDING_CHARGE];

const UPOWER_NAME = "org.freedesktop.UPower";
const DISPLAY_DEVICE_PATH = "/org/freedesktop/UPower/devices/DisplayDevice";
const DEVICE_INTERFACE = "org.freedesktop.UPower.Device";

/**
 * Tracks when the laptop was unplugged.
 *
 * The only state is the wall-clock time of the unplug, so the elapsed time is
 * always `now - unplugTime`. Nothing has to tick, and the value stays correct
 * across lock, logout, suspend and reboot. States that are neither clearly
 * "on battery" nor clearly "on AC" (e.g. pending-discharge) keep the record.
 */
export class PowerTracker {
  /**
   * @param {import('./stateStore.js').StateStore} store
   * @param {() => void} onChange called whenever the displayed data changes
   */
  constructor(store, onChange) {
    this._store = store;
    this._onChange = onChange;
    this._bootId = readBootId();
    this._record = this._loadRecord();
    this._cancellable = new Gio.Cancellable();
    this._proxy = null;
    this._proxySignalId = 0;

    Gio.DBusProxy.new_for_bus(
      Gio.BusType.SYSTEM,
      Gio.DBusProxyFlags.NONE,
      null,
      UPOWER_NAME,
      DISPLAY_DEVICE_PATH,
      DEVICE_INTERFACE,
      this._cancellable,
      (_source, result) => this._onProxyReady(result),
    );
  }

  /**
   * @returns {{onBattery: boolean, unplugTime: number|null, active: number,
   *   suspended: number, startPercent: number|null, timeToEmpty: number}}
   */
  getSnapshot() {
    const record = this._record;
    const durations = record
      ? computeDurations(
          record,
          Math.floor(GLib.get_real_time() / 1_000_000),
          readSuspendedSeconds(),
        )
      : { active: 0, suspended: 0 };
    return {
      onBattery: record !== null,
      unplugTime: record?.unplugTime ?? null,
      active: durations.active,
      suspended: durations.suspended,
      startPercent: record?.startPercent ?? null,
      timeToEmpty: this._property("TimeToEmpty") ?? 0,
    };
  }

  destroy() {
    this._cancellable.cancel();
    if (this._proxy && this._proxySignalId)
      this._proxy.disconnect(this._proxySignalId);
    this._proxy = null;
    this._proxySignalId = 0;
  }

  /**
   * Loads the persisted record. A record from another boot is dropped because
   * its suspend-time baseline cannot be compared with this boot's clocks.
   */
  _loadRecord() {
    const record = this._store.load();
    return record?.bootId === this._bootId ? record : null;
  }

  _onProxyReady(result) {
    try {
      this._proxy = Gio.DBusProxy.new_for_bus_finish(result);
    } catch (e) {
      if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
        console.error(`battery-runtime: cannot reach UPower: ${e.message}`);
      return;
    }
    this._proxySignalId = this._proxy.connect("g-properties-changed", () =>
      this._reconcile(),
    );
    this._reconcile();
  }

  _property(name) {
    return this._proxy?.get_cached_property(name)?.deepUnpack() ?? null;
  }

  /** Brings the stored record in line with the current UPower state. */
  _reconcile() {
    const state = this._property("State");
    const previous = this._record;

    if (ON_BATTERY_STATES.includes(state) && !this._record) {
      this._record = {
        unplugTime: Math.floor(GLib.get_real_time() / 1_000_000),
        startPercent: Math.round(this._property("Percentage") ?? 0),
        bootId: this._bootId,
        suspendedAtUnplug: readSuspendedSeconds(),
      };
    } else if (ON_AC_STATES.includes(state)) {
      this._record = null;
    }

    if (this._record !== previous) this._store.save(this._record);
    this._onChange();
  }
}
