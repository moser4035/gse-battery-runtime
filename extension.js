import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { BatteryRuntimeIndicator } from "./indicator.js";
import { PowerTracker } from "./powerTracker.js";
import { StateStore } from "./stateStore.js";

export default class BatteryRuntimeExtension extends Extension {
  enable() {
    this._tracker = new PowerTracker(new StateStore(), () =>
      this._indicator?.refresh(),
    );
    this._indicator = new BatteryRuntimeIndicator(this.path, () =>
      this._tracker.getSnapshot(),
    );
    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }

  disable() {
    this._tracker?.destroy();
    this._tracker = null;
    this._indicator?.destroy();
    this._indicator = null;
  }
}
