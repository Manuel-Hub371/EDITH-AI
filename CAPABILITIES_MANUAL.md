# EDITH AI | Internal Architecture & Execution Flow (V52.2)

This manual provides a definitive explanation of EDITH's internal operations, from natural language input to real-world OS execution.

---

## 1. High-Level Architecture

EDITH is a multi-layered system designed for modularity and resilience:

- **🖼️ Electron UI**: The presentation layer. A desktop container that manages the main window, captures user text/voice input, and communicates with the backend via REST APIs.
- **⚙️ Node.js Backend (Controller)**: The "Central Nervous System". It hosts the Express server (`server.js`), manages the `ActionDispatcher`, coordinates database interactions (MongoDB), and handles high-speed filesystem indexing.
- **🧠 Python AI Engine**: The "Cognition Layer". It uses Gemini to parse natural language into structured JSON intents. It is external to the core Node.js process to allow for specialized ML environments.
- **🗄️ MongoDB**: The "Persistent Memory". Stores the file index, user aliases, command history, and session state.
- **🛰️ Background Services**:
    - **Indexer**: Performs a recursive crawl of the OS on boot.
    - **Watcher**: Uses `chokidar` for event-driven FS updates (creation, deletion, rename).

---

## 2. Full Command Flow (Step-by-Step)

**Example Command**: *"Rename ManuelTextingFolder to TextingFolder"*

1.  **UI Sending**: The Electron frontend POSTs the message to `/api/chat`.
2.  **Intent Parsing**: `server.js` relays the message to the Python AI. Gemini detects the intent `RENAME_FOLDER` and extracts parameters: `{ "path": "ManuelTextingFolder", "newName": "TextingFolder" }`.
3.  **Phase 2 (Alias Lookup)**: `ActionDispatcher` calls `resolver.resolve()`. It first checks the `Alias` collection in MongoDB for a nickname match.
4.  **Phase 1 (Index Search)**: Since "ManuelTextingFolder" is a literal name, the `resolver` queries the `FileIndex` using fuzzy search (`Fuse.js`) and prefix matching.
5.  **Path Resolution**: The resolver identifies the absolute system path: `C:\Users\USER\Documents\ManuelTextingFolder`.
6.  **Sandbox Validation**: Before execution, the `ExecutorPipeline` validates the path and intent risk level. If it involves system folders, it triggers a `NEED_CONFIRMATION` response.
7.  **Phase 3 (Execution)**: The `AutomationEngine` executes the OS command: `powershell -Command "rename-item '...' 'TextingFolder'"` (or CMD equivalent).
8.  **Post-Execution Sync**: If successful:
    - `recursivePathUpdate` migrates all sub-item indices in MongoDB to the new path.
    - `updateAliases` migrates any user nicknames pointing into that folder.
9.  **Response Builder**: A standardized JSON response is returned to the UI: `{ "success": true, "message": "Renamed to: TextingFolder" }`.
10. **UI Display**: The frontend displays a friendly confirmation message to the user.

---

## 3. Phase 1 (Indexing) Internals

- **Indexing Strategy**: On startup, `indexer.js` scans user-defined entry points (`Desktop`, `Documents`, etc.). It stores `name`, `path`, `type`, and `extension`.
- **Storage**: Highly optimized MongoDB `FileIndex` collection with unique indices on the `path` field.
- **Real-Time Watcher**: `watcher.js` (Chokidar) listens for OS interrupts. If you move a file manually in Windows, the Watcher catches the event and upserts the DB in < 2 seconds.
- **Search Retrieval**: Uses `$regex` patterns with `i` (case-insensitive) flags, combined with a local cache for sub-10ms response times.

---

## 4. Phase 2 (Memory & Learning)

- **Alias Registry**: User-defined mappings (e.g., "my projects" → `D:\Dev\Work`) override the standard index.
- **Frecency Ranking**: `MemoryService` calculates a "Frecency" score (Frequency + Recency). The more you interact with a file, the higher it appears in search results.
- **Correction Learning**: If the user corrects EDITH ("I meant the other folder"), the system updates the `Alias` mapping for that specific query.
- **Phase Override**: Phase 2 (Explicit Aliases) always takes precedence over Phase 1 (Dynamic Search).

---

## 5. Phase 3 (Execution Engine)

- **Executor Pipeline**: Centralizes all OS-level calls. It abstracts away the difference between CMD and PowerShell.
- **Intent Mapping**: Maps high-level intents (`ADJUST_VOLUME`, `OPEN_APPLICATION`) to specific shell scripts or Node `fs` calls.
- **OS Interop**:
    - **Hardware**: Uses WScript.Shell (ComObject) via PowerShell for volume/brightness.
    - **Filesystem**: Uses Node `fs.promises` for simple reads/writes, but OS shell commands (`rename`, `move`, `xcopy`) for complex migrations to ensure transactional integrity.

---

## 6. Sandbox & Safety Flow

- **Triggers**: Every execution request must pass through the `ExecutorPipeline`.
- **Constraint Level**:
    - **SAFE**: `READ_FILE`, `ADJUST_VOLUME` (Execute immediately).
    - **MODERATE**: `RENAME_FOLDER`, `WRITE_FILE` (Check path permissions).
    - **CRITICAL**: `DELETE_FILE`, `SHUTDOWN` (Always require user confirmation).
- **Blocking**: If an action targets a protected system directory (e.g., `C:\Windows`), the Sandbox throws an immediate `Access Denied` error.

---

## 7. Response Generation

- **Structured Output**: Every backend action returns a JSON object with a `message` field.
- **Human-Like Touches**: The Python AI engine provides the natural language wrapper, while the Node backend injects specific system details (e.g., "Folder renamed successfully to TextingFolder").
- **State Handling**: If an action is pending confirmation, the response includes an `actionId` and status `NEED_CONFIRMATION`.

---

## 8. Error Flow Analysis

Errors like *"The 'path' argument must be of type string"* occur when:
- **Module**: `AutomationEngine` (fs operations).
- **Cause**: The `ActionDispatcher` failed to resolve a user query, passing an empty `target` to a mandatory filesystem command.
- **Failure**: The pipeline crashes because the `path` module expects a string but receives `undefined`.
- **Prevention**: Robust `_healPath` logic and defensive checks in `ExecutorPipeline` (V52.x Fix).

---

## 9. Visual Flow Diagram (Text-Based)

```text
[ USER INPUT ] 
      |
      V
[ ELECTRON UI ] --- (POST /api/chat) ---> [ NODE.js SERVER ]
                                              |
      +---------------------------------------+
      |
[ PYTHON AI ] <--- (INTENT PARSER: Gemini)
      |
      V
[ ACTION DISPATCHER ]
      |
      +---> Phase 2: [ ALIAS LOOKUP ] (MongoDB)
      |
      +---> Phase 1: [ INDEX SEARCH ] (FileIndex)
      |
      V
[ PATH RESOLVER ] (healPath: resolving ~Desktop, aliases, etc.)
      |
      V
[ SANDBOX V2 ] (Policy Check & confirmation flow)
      |
      V
[ EXECUTOR PIPELINE ] --- (OS SHELL: CMD/PS/fs) ---> [ OS EFFECTS ]
      |
      V
[ RESPONSE BUILDER ] --- (JSON Payload) ---> [ UI DISPLAY ]
```

---

## 10. Identified Weak Points & Recommendations

### **Weak Points**
1.  **Watcher Races**: During a rename, the `Watcher` (chokidar) and `AutomationEngine` (manual sync) both attempt to update MongoDB. This can cause "duplicate key" errors if not handled by `upsert`.
2.  **Shadowed Modules**: Local environment issues where `require('electron')` returns a path string instead of the API prevent automated Playwright UI testing.
3.  **Fuzzy Over-Matching**: High similarity scores between unrelated files (e.g., `test.txt` and `test_final.txt`) can lead to unintended target selection.

### **Recommendations**
- **Action Atomicity**: Implement a file-level locking mechanism during `RENAME` or `MOVE` to prevent the Watcher from interfering with the manual sync.
- **Strict Typing**: Use TypeScript for the backend to eliminate `undefined` path errors at compile-time.
- **Advanced Heuristics**: Incorporate folder *depth* and *parent relevance* into search scores (Phase 1) to improve path resolution accuracy.

---
*EDITH Technical Documentation — Updated V52.2*
