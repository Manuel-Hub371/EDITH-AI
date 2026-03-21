# EDITH AI | Capabilities Manual (V42.7)

EDITH is a production-hardened, intent-driven AI desktop agent — built for natural human conversation and deep, self-healing Windows OS integration.

---

## 1. Interaction Modes & Personality (Refined V41.8)

EDITH operates with **Human-Centric Intelligence** designed to feel like a collaborator, not a tool:

- **🗣️ Natural Conversationalist**: Direct, informal, and human. No "AI-style" prefixes, poetic filler, or performative warmth.
- **🚫 Anti-Data-Dump Policy**: Unlike generic bots, EDITH will never volunteer technical percentages (CPU/RAM/Apps) unless you specifically ask "How's my PC?" or if it's necessary to explain a delay. 
- **🧠 System Vision**: Real-time hardware telemetry is injected directly into her context, allowing her to "perceive" your system state without needing manual commands.

---

## 2. Self-Healing Nervous System (V41.9)

EDITH features a **High-Availability Architecture** designed for zero-failure production environments:

- **⚡ Auto-Restart Logic**: Both the Node.js controller and the Python AI engine are monitored 24/7. If a service exits unexpectedly, EDITH revives it within 2 seconds automatically.
- **🛡️ 3-Strike Resilience**: To prevent "false positive" disconnections during temporary CPU spikes, the frontend uses a "Fail-Soft" policy. It ignores lag spikes and only alerts the user if the backend fails to respond 3 times consecutively (15s window).
- **📐 Solid-State Execution**: Services are spawned directly by the Electron shell using strictly controlled `spawn` arguments, ensuring native path resilience (handles "EDITH AI" spaces) and absolute path stability.

---

## 3. Advanced AI Engine (V41.18 Quota Resilience)

The cognitive layer uses a **High-Resiliency Model Registry** to ensure 100% uptime on the Google Free Tier:

| Priority | Model | Logic |
| :--- | :--- | :--- |
| **Primary** | `models/gemini-flash-latest` | **1500 Requests/Day**. The stable workhorse of EDITH. |
| **Fallback 1** | `models/gemini-2.0-flash` | State-of-the-art reasoning for complex tasks. |
| **Fallback 2** | `models/gemini-2.5-flash` | Ultra-high capacity backup tier. |

*Auto-Resilience: If a model hits a quota limit, EDITH rotates through her registry with a 2-second staggered delay, ensuring continuous service.*

---

## 4. Smart Universal Launcher (V46.5)

EDITH features an adaptive, intent-driven launcher with 100% OS coverage:

- **🌐 UWP & Modern Apps**: Native support for **Settings, Store, Calculator, Photos**, etc., using URI protocols and high-performance **AppUserModelID** discovery.
- **🧠 Sibling Resolution**: Automatically resolves script-launchers (e.g., `code.cmd`) to their native **`.exe`** siblings for safety and PID tracking.
- **🔗 Shortcut Dereferencing**: Native support for **`.lnk`** files — EDITH resolves them to the absolute target executable using COM.
- **🚫 Security Blocklist**: Strictly forbids execution of unsafe file types (**`.cmd`, `.bat`, `.ps1`, etc.**) unless they can be resolved to a native executable.
- **🛰️ Dynamic Discovery**: If an app is unknown, EDITH dynamically scans `Program Files` and the **Start Menu** using high-speed PowerShell logic.
- **🎯 PID Tracking**: Classic executables are tracked by PID, while modern apps are launched via the System Broker.

| Supported Intent | Description |
| :--- | :--- |
| `OPEN_APPLICATION` | Automatically discover and launch any installed app |
| `CLOSE_APPLICATION` | Terminate specific instances via PID or Name |
| `WINDOW_MANAGEMENT` | Native User32 interaction (Focus, Min/Max, Resize) |
| `FILE_SYSTEM` | Adaptive Path Healing (Supports OneDrive redirection) |

---

## 5. Nervous System (System Integration Layer)

- **📸 Real-time Telemetry**: Throttled 10s heartbeat for CPU/RAM/Battery ensures high system responsiveness.
- **📡 System Bridge API**: Staggered service startup prevents CPU congestion during initialization.
- **🛰️ Diagnostics**: Real-time error transparency reveals the exact cause of execution failures.

---

## 6. Technical Stack (Production Build)

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Shell** | Electron (.exe) | Desktop Container & Service Manager |
| **Backend** | Node.js (v22+) | Intent Dispatcher / Health Monitor |
| **Cognition** | Python (3.11+) | Gemini-Integrated AI Engine |
| **Delivery** | Standalone Packaging | No external Node.js/Python installation required |

---

*EDITH V42.7 — The Definitive Adaptive Build.*
