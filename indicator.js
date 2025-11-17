"use strict";

const { St, GObject } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { PowerTracker } = Me.imports.powerTracker;
const Utils = Me.imports.utils.Utils;

const OnBatteryIconName = "clock-alt-symbolic";
const OnAcIconName = "gnome-power-manager-symbolic";

var BatteryRuntimeIndicator = GObject.registerClass(
  class BatteryRuntimeIndicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, "Battery Runtime Indicator");

      this._tracker = new PowerTracker();
      this._tracker._onChange = () => this._update();

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

      this._buildPopup();
      this._update();
    }

    _buildPopup() {
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
      this._activeLabel = new St.Label({
        text: "Active time: –",
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
      vbox.add_child(this._activeLabel);
      vbox.add_child(this._startPercentLabel);
      vbox.add_child(this._remainingLabel);

      section.actor.add_child(vbox);
      this.menu.addMenuItem(section);
    }

    _update() {
      const t = this._tracker.getTimes();

      if (t.onBattery && t.hasUnplug) {
        const totalText = Utils.formatDuration(t.total);
        this._icon.set_icon_name(OnBatteryIconName);
        this._label.set_text(totalText);
        this._sinceLabel.text = `Since unplugged: ${totalText}`;
        this._activeLabel.text = `Active time: ${Utils.formatDuration(t.active)}`;
        this._startPercentLabel.text =
          t.startPercent != null
            ? `Started at: ${Math.round(t.startPercent)}%`
            : "Started at: –";
        this._remainingLabel.text = `Estimated remaining: ${t.timeToEmpty > 0 ? Utils.formatDuration(t.timeToEmpty) : "–"}`;
        this.visible = true;
      } else {
        this._icon.set_icon_name(OnAcIconName);
        this._label.set_text("AC");
        this._sinceLabel.text = "Since unplugged: –";
        this._activeLabel.text = "Active time: –";
        this._startPercentLabel.text = "Started at: –";
        this._remainingLabel.text = `Estimated remaining: ${t.timeToEmpty > 0 ? Utils.formatDuration(t.timeToEmpty) : "–"}`;
        this.visible = true;
      }
    }

    destroy() {
      if (this._tracker) {
        this._tracker.destroy();
        this._tracker = null;
      }
      super.destroy();
    }
  },
);
