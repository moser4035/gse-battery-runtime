# 🪫 Battery Runtime — GNOME Shell Extension

A simple GNOME Shell extension that shows **how long your system has been running on battery power** since it was last unplugged.

It adds a small label to your top bar that updates automatically and displays:

* Time since last unplugged (e.g., `1h 23m`)
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
* Lightweight — updates every minute
* Uses native GNOME UI components for a clean look

---

## 🧹 Installation

### 🏷️ From Source (for development)

1. Clone this repository:

   ```bash
   git clone https://github.com/moser4035/gse-battery-runtime.git
   ```
2. Copy the extension folder to your GNOME extensions directory:

   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions/
   cp -r gse-battery-runtime/battery-runtime@moser4035.github.io ~/.local/share/gnome-shell/extensions/
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
| 42          | ✅ Supported |
| 45          | 🟡 Planned |
| 46          | 🟡 Planned |

---

## 🧠 How It Works

The extension uses the **UPower** system API to track when the system switches between AC and battery power.
When unplugged, it records the timestamp and battery level, then calculates how long the system has been running since that moment.

It stores this state in:

```
~/.cache/battery-runtime/state.json
```

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
