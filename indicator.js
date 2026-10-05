import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import St from "gi://St";

import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import { formatDuration } from "./format.js";

const REFRESH_INTERVAL_SECONDS = 60;
const ON_BATTERY_ICON_FILE = "battery-runtime-clock-symbolic.svg";
const ON_AC_ICON_FILE = "battery-runtime-ac-symbolic.svg";
const PLACEHOLDER = "–";

/** Top-bar label and popup that display the data from the PowerTracker. */
export const BatteryRuntimeIndicator = GObject.registerClass(
  class BatteryRuntimeIndicator extends PanelMenu.Button {
    /**
     * @param {string} extensionPath directory containing the bundled icons
     * @param {() => object} getSnapshot returns the current tracker snapshot
     */
    _init(extensionPath, getSnapshot) {
      super._init(0.0, "Battery Runtime Indicator");
      this._getSnapshot = getSnapshot;
      // Bundled icons: the icon theme has no suitable clock/plug symbolics.
      this._onBatteryIcon = loadIcon(extensionPath, ON_BATTERY_ICON_FILE);
      this._onAcIcon = loadIcon(extensionPath, ON_AC_ICON_FILE);

      this._icon = new St.Icon({
        gicon: this._onAcIcon,
        style_class: "system-status-icon",
      });
      this._label = new St.Label({
        text: PLACEHOLDER,
        y_align: Clutter.ActorAlign.CENTER,
        style_class: "battery-runtime-label",
      });
      const box = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      box.add_child(this._icon);
      box.add_child(this._label);
      this.add_child(box);

      this._sinceLabel = this._addPopupRow("On battery since");
      this._activeLabel = this._addPopupRow("Active");
      this._suspendedLabel = this._addPopupRow("Suspended");
      this._startLabel = this._addPopupRow("Started at");
      this._remainingLabel = this._addPopupRow("Estimated remaining");

      // The elapsed time is derived from the clock, so a periodic redraw is
      // all that is needed to keep the label current.
      this._refreshId = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        REFRESH_INTERVAL_SECONDS,
        () => {
          this.refresh();
          return GLib.SOURCE_CONTINUE;
        },
      );
      this.refresh();
    }

    /** Redraws the indicator from the latest tracker snapshot. */
    refresh() {
      const {
        onBattery,
        unplugTime,
        active,
        suspended,
        startPercent,
        timeToEmpty,
      } = this._getSnapshot();

      if (onBattery) {
        this._icon.gicon = this._onBatteryIcon;
        this._label.text = formatDuration(active);
        this._setRow(this._sinceLabel, "On battery since", formatTime(unplugTime));
        this._setRow(this._activeLabel, "Active", formatDuration(active));
        this._setRow(this._suspendedLabel, "Suspended", formatDuration(suspended));
        this._setRow(this._startLabel, "Started at", `${startPercent}%`);
      } else {
        this._icon.gicon = this._onAcIcon;
        this._label.text = "AC";
        this._setRow(this._sinceLabel, "On battery since", PLACEHOLDER);
        this._setRow(this._activeLabel, "Active", PLACEHOLDER);
        this._setRow(this._suspendedLabel, "Suspended", PLACEHOLDER);
        this._setRow(this._startLabel, "Started at", PLACEHOLDER);
      }
      this._setRow(
        this._remainingLabel,
        "Estimated remaining",
        timeToEmpty > 0 ? formatDuration(timeToEmpty) : PLACEHOLDER,
      );
    }

    destroy() {
      if (this._refreshId) {
        GLib.source_remove(this._refreshId);
        this._refreshId = 0;
      }
      super.destroy();
    }

    _addPopupRow(text) {
      const item = new PopupMenu.PopupMenuItem(text, { reactive: false });
      item.label.style_class = "battery-runtime-popup-label";
      this.menu.addMenuItem(item);
      return item.label;
    }

    _setRow(label, title, value) {
      label.text = `${title}: ${value}`;
    }
  },
);

function loadIcon(extensionPath, fileName) {
  return new Gio.FileIcon({
    file: Gio.File.new_for_path(GLib.build_filenamev([extensionPath, "icons", fileName])),
  });
}

function formatTime(unixSeconds) {
  return GLib.DateTime.new_from_unix_local(unixSeconds).format("%H:%M");
}
