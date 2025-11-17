"use strict";

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const { BatteryRuntimeIndicator } = Me.imports.indicator;
const { Log } = Me.imports.log;

let indicator;

function init() {
  Log.init();
  Log.write("init()");
}

function enable() {
  indicator = new BatteryRuntimeIndicator();
  Main.panel.addToStatusArea("battery-runtime", indicator);
}

function disable() {
  Log.write("disable()");
  if (indicator) {
    indicator.destroy();
    indicator = null;
  }
  Log.close();
}
