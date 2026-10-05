# 🪫 Battery Runtime — GNOME Shell Extension

A simple GNOME Shell extension that shows **how long your system has been running on battery power** since it was last unplugged.

It adds a small label to your top bar that updates automatically and displays:

* Active time since last unplugged, excluding suspend (e.g., `1h 23m`)
* Time spent suspended
* Starting battery percentage
* Estimated remaining runtime

---

## 📸 Screenshots

<img width="426" height="180" alt="Screenshot from 2025-11-10 21-35-10" src="https://github.com/user-attachments/assets/bc162383-eeb8-4c36-a582-f3e5ce6e0468" />


---

## ⚙️ Features

* Displays **time since last unplugged** in the top bar
* Popup shows detailed battery info:

  * Duration on battery
  * Start percentage
  * Estimated remaining time
* Lightweight — redraws once a minute, no background accounting
* Uses native GNOME UI components for a clean look

---

## 🧹 Installation

### 🏷️ From Source (for development)

1. Clone this repository:

   ```bash
   git clone https://github.com/moser4035/gse-battery-runtime.git
   ```
2. Link the repository into your GNOME extensions directory:

   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions/
   ln -s "$PWD/gse-battery-runtime" ~/.local/share/gnome-shell/extensions/battery-runtime@moser4035.github.io
   ```
3. Restart GNOME Shell:

   * On X11: `Alt + F2`, type `r`, and press Enter
   * On Wayland: log out and back in
4. Enable the extension:

   ```bash
   gnome-extensions enable battery-runtime@moser4035.github.io
   ```

---

## 🧰 Compatibility

| GNOME Shell | Status      |
| ----------- | ----------- |
| 45 – 50     | ✅ Supported |
| 42 – 44     | ❌ Use release 1 |

---

## 🧠 How It Works

The extension watches the **UPower** display device over D-Bus. When the laptop goes onto battery it stores the unplug time (wall clock), the battery level and the machine's suspend time at that moment. Nothing has to tick in the background, and the values stay correct across lock and logout.

* **Active** (shown in the top bar) is the time since unplug minus the time spent suspended.
* **Suspended** is the time the machine slept since unplug. It is the difference between the kernel's boot clock (which counts suspend) and monotonic clock (which does not), so it is correct even when the extension was disabled during the suspend, e.g. while the screen was locked.
* A **reboot** starts a new session: the suspend baseline of the previous boot is unknown, so tracking restarts if the laptop is still on battery.

The record is cleared as soon as the laptop is charging or fully charged.

The state is stored in:

```
~/.cache/battery-runtime/state.json
```

The extension only reads power state. It does not inhibit idle, suspend or logout, and it is disabled while the screen is locked.

---

## 🧑‍💻 Development

To reload the extension after code changes:

```bash
gnome-extensions disable battery-runtime@moser4035.github.io
gnome-extensions enable battery-runtime@moser4035.github.io
```

To view logs:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

---

## 📦 Packaging for extensions.gnome.org

1. Zip only the contents of the extension folder (not the parent repo):

   ```bash
   cd ~/.local/share/gnome-shell/extensions/battery-runtime@moser4035.github.io/
   zip -r ../battery-runtime@moser4035.github.io.zip *
   ```
2. Upload the ZIP file to [extensions.gnome.org](https://extensions.gnome.org/upload/).

---

## 📜 License

MIT License © 2025 [moser4035](https://github.com/moser4035)
