# EDITH AI | Capabilities Manual (V38.1.3)

EDITH is a modular, intent-driven AI desktop agent — built for natural conversation and deep, real-time Windows OS integration.

---

## 1. Interaction Modes & Personality

EDITH operates with **Dual-Mode Intelligence** backed by a modular execution pipeline:

- **🗣️ Conversational Mode**: Natural, human-like dialogue. No chatbot jargon. Uses "True Vision" to perceive your system state.
- **🛠️ Execution Mode**: Structured intent pipeline. Parses complex requests into precise OS actions.
- **🧠 Cognitive Bridge**: Real-time hardware telemetry is injected directly into EDITH's cognition, giving her "eyes" on your PC.

---

## 2. Intent Detection Engine (V38.1.3 Standard)

| Intent | Description |
| :--- | :--- |
| `OPEN_APPLICATION` | Launch registered apps or absolute paths |
| `CLOSE_APPLICATION` | Terminate applications safely (Protected: Explorer, Winlogon) |
| `WINDOW_MANAGEMENT` | FOCUS, MINIMIZE, MAXIMIZE, RESTORE |
| `RESIZE_WINDOW` | Change window dimensions (width, height) |
| `MOVE_WINDOW` | Reposition window (x, y) with boundary validation |
| `ARRANGE_WINDOWS` | Split-screen or workspace orchestration |
| `FILE_SYSTEM` | CREATE, DELETE, MOVE, READ, SEARCH, SUMMARIZE |
| `SYSTEM_CONTROL` | VOLUME, BRIGHTNESS, LOCK, SLEEP |

---

## 3. Nervous System (System Integration Layer V38.1.3)

EDITH's **Nervous System (SIL)** is a high-performance bridge providing deep host connectivity:

- **📸 Real-time Vision (Telemetry)**:
  - **State Cache**: Unified snapshot of CPU, RAM, Battery, 300+ Processes, and Disks.
  - **Heartbeat**: 3-second refresh cycle with 10s timeout guards for stability.
- **⚡ Reactive OS Events (WMI)**:
  - **Process Watcher**: Instant detection of application starts and stops.
  - **Hardware Watcher**: Real-time notification of USB device connections.
  - **Download Watcher**: Automatic awareness of new files in Downloads.
- **🛰️ System Bridge API**:
  - `GET /system/status`: Returns the live real-time system snapshot.
  - `POST /system/resize`: Precise window bounds management.

---

## 4. Advanced Window Orchestration

Leveraging optimized PowerShell .NET interop, EDITH provides surgical control:

- **📐 Precise Bounds**: Resize and Move windows to exact coordinates.
- **🛡️ Boundary Validation**: Windows are hardware-locked to your primary display area; they cannot be moved "off-screen."
- **🖼️ Layouts**: Built-in support for `split-horizontal` and workspace cleanup.

---

## 5. Security & Safety Hub

A multi-layered barrier protects the integrity of your host:

- **🛡️ Directory Guard**: System directories (Windows, System32) are strictly protected.
- **🚫 PID Tracking**: EDITH tracks her own launched processes to manage them safely.
- **🛡️ Graceful Close**: Uses PID-based termination with no force-kill unless requested.
- **🔐 extension Block**: Dangerous file types are intercepted by the sandbox.

---

## 6. Path Healing & Hallucination Guard

- **Variable Healing**: Automatically resolves `%USERPROFILE%` and `C:\Users\yourusername`.
- **Context Memory**: Resolves "it", "that", "this" based on your most recent activity.

---

## 7. Technical Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | Vanilla JS / CSS3 | Modern Glassmorphism UI |
| **Orchestration** | Node.js (Express) | Intent Dispatcher / Context |
| **Nervous System** | PowerShell / WMI | Deep OS Hooks & Window Control |
| **Telemetry** | systeminformation | Hardware & Resource monitoring |
| **AI Engine** | Python (Gemma-3) | Cognitive reasoning & Task planning |

---

*EDITH V38.1.3 — Finalized Deep Integration Build.*
