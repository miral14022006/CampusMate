# Feature 06: Multi-Turn Conversation Memory with Slot Carry-Over

## 1. Overview & Architecture
In realistic campus conversations, students frequently ask elliptical or follow-up questions without repeating previously stated context (e.g. asking *"and for 5th sem?"* right after *"What is the exam timetable for B.Tech CS 3rd sem?"*). 

To solve this while adhering to modern microservice best practices:
1. **Stateless Microservice Principle**: The Python FastAPI `nlp-service` remains completely **stateless**. The incoming `dialogue_state` is provided in the request payload, transformed, and returned in the response as `updated_state`.
2. **Stateful Gateway Storage**: The Node.js Express server (`server/features/f06_sessions/`) manages hot state in **Redis** with a configurable Time-To-Live (TTL = 30 minutes / 1800s). In environments where Redis is not connected, it gracefully falls back to an in-memory TTL store.
3. **Follow-Up Detection**: Identifies elliptical queries using short length ($< 6$ words), conjunction triggers (`and`, `aur`, `ane`, `what about`), slot entity presence, or awaiting clarification slot status.
4. **Slot Inheritance & Override**: Active slots (`course`, `branch`, `semester`, `exam_type`, `date`) are carried over across turns. When a new entity is detected (e.g. `5th sem`), it overrides the previous slot while retaining non-conflicting slots (e.g. `course: B.Tech CS`).
5. **Standalone Query Rewriting**: Synthesizes a transparent, self-contained query (e.g., *"exam timetable schedule for course B.Tech CS semester 5th sem"*) that is routed to the hybrid BM25 + FAISS retriever.
6. **Session Reset**: Commands like `"reset"`, `"new topic"`, `"clear"`, or `"reset karo"` immediately purge active dialogue slots and start fresh.

---

## 2. Files Involved
- [schemas.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f06_dialogue_state/schemas.py): Pydantic models for `DialogueState` and `TurnRecord`.
- [manager.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f06_dialogue_state/manager.py): Core `DialogueManager` handling slot extraction, follow-up detection, slot inheritance, and query rewriting.
- [dialogue_stage.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/app/pipeline_stages/dialogue_stage.py): Pipeline stage plugged after entity extraction and before retrieval.
- [sessionManager.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/features/f06_sessions/sessionManager.js): Hot state session manager with Redis & memory TTL caching.
- [chat.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/routes/chat.js): Express route retrieving session state before NLP call and saving updated state afterwards.
- [ChatWindow.jsx](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/client/src/features/chat/ChatWindow.jsx): React chat interface rendering `🔄 Context Linked` badges and rewritten standalone queries.
- [followup_set.json](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/eval/followup_set.json): 40 multi-turn test dialogues in English, Hindi, Gujarati, Hinglish, and Gujlish.
- [run_memory.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/eval/run_memory.py): Evaluation benchmark script reporting accuracy metrics to `eval/results/06-memory.json`.
- [test_dialogue_state.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f06_dialogue_state/tests/test_dialogue_state.py): Unit test suite verifying slot inheritance, override, query rewriting, and resets.
- [demo_conversation_memory.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/scripts/demo_conversation_memory.py): Multi-turn interactive demonstration across 3 languages.

---

## 3. How to Run

### Run Unit Tests
```bash
PYTHONPATH=nlp-service python3 -m unittest features.f06_dialogue_state.tests.test_dialogue_state
```

### Run 40-Dialogue Benchmark Evaluation
```bash
python3 eval/run_memory.py
```

### Run Interactive Multi-Turn Demo
```bash
python3 scripts/demo_conversation_memory.py
```

---

## 4. Multi-Turn Example Dialogues

### Example 1: English (Exam Timetable & Semester Override)
```
Turn 1:
User: "What is the exam timetable for B.Tech CS 3rd sem?"
Action: New Context Initiated (Intent: exam_timetable)
Slots:  { course: "B.Tech CS", semester: "3rd sem" }

Turn 2:
User: "and for 5th sem?"
Action: Follow-up Detected (Inherited Intent: exam_timetable)
Rewritten Standalone Query: "exam timetable schedule for course B.Tech CS semester 5th sem"
Slots:  { course: "B.Tech CS", semester: "5th sem" } (inherited course, overridden semester)

Turn 3:
User: "new topic"
Action: Session Reset Triggered!
Slots:  {} (cleared)
```

### Example 2: Hinglish (Fee Schedule & Context Retention)
```
Turn 1:
User: "B.Tech IT ki semester fee schedule kya hai?"
Action: New Context Initiated (Intent: fee_payment_dates)
Slots:  { course: "B.Tech IT" }

Turn 2:
User: "aur hostel fees ke liye?"
Action: Follow-up Detected (Inherited Intent: fee_payment_dates)
Rewritten Standalone Query: "fee payment schedule and fees for course B.Tech IT"
Slots:  { course: "B.Tech IT" }
```

### Example 3: Gujarati (Syllabus & Semester Inheritance)
```
Turn 1:
User: "Mechanical Engineering 4th sem નો સિલેબસ શું છે?"
Action: New Context Initiated (Intent: syllabus_structure)
Slots:  { course: "Mechanical", branch: "Mechanical", semester: "4th sem" }

Turn 2:
User: "અને 6th sem માટે?"
Action: Follow-up Detected (Inherited Intent: syllabus_structure)
Rewritten Standalone Query: "syllabus structure and curriculum for course Mechanical branch Mechanical semester 6th sem"
Slots:  { course: "Mechanical", branch: "Mechanical", semester: "6th sem" }
```

---

## 5. Evaluation Benchmark Results

Tested across **40 multi-turn dialogues (80 conversation turns)** in `eval/followup_set.json`:

| Metric | Result | Notes |
|---|---|---|
| **Follow-up Detection Accuracy** | **95.00%** | Successfully flags elliptical queries across all 4 languages |
| **Slot Carry-Over Accuracy** | **85.26%** | Retains non-conflicting slots while overriding target slots |
| **Elliptical Intent Resolution** | **75.00%** | Accurately inherits previous dialogue intent |
| **Standalone Query Rewriting Quality** | **75.00%** | Synthesizes full standalone search strings for retrieval |
| **Session Reset Accuracy** | **100.00%** | Reliably clears hot memory upon `"reset"` / `"new topic"` |

Full evaluation results saved to [eval/results/06-memory.json](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/eval/results/06-memory.json).

