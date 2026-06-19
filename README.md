Campus Life Planner

A vanilla HTML/CSS/JavaScript app for managing campus tasks and events with due dates, durations, tags, regex-powered search, and local persistence.

Purpose

Campus Life Planner helps students track what they need to do, how long it takes, and when it's due — with stats, weekly caps, and smart search.


Run locally

No build step required. Serve the folder with any static server (ES modules need HTTP, not file://):

cd campus-life-planner
python3 -m http.server 8080

Open http://localhost:8080.

Data model

Each record:

{
  "id": "rec_0001",
  "title": "Calculus study group 14:00",
  "dueDate": "2025-09-29",
  "duration": 90,
  "tag": "Study",
  "createdAt": "2025-06-15T09:00:00.000Z",
  "updatedAt": "2025-06-15T09:00:00.000Z"
}


duration is stored in minutes internally

Settings support minutes ↔ hours display conversion

Auto-saved to localStorage on every change

Regex validation rules

Field

Pattern

Notes

Title

/^\S(?:.*\S)?$/

No leading/trailing spaces


Title (advanced)



/\b(\w+)\s+\1\b/i



Back-reference: no duplicate words





Duration



/^(0|[1-9]\d*)(\.\d{1,2})?$/



Non-negative, max 2 decimals





Due date



/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/



YYYY-MM-DD





Tag



/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/



Letters, spaces, hyphens

Search patterns







Pattern



Example



Purpose





@tag:Study



@tag:Events



Filter by tag (shorthand)





\b\d{2}:\d{2}\b



matches 14:00



Find time tokens in titles





\b(\w+)\s+\1\b



matches study study



Duplicate words

Accessibility





Semantic landmarks: header, nav, main, section, footer



Skip-to-content link (visible on focus)



All inputs have associated <label> elements



:focus-visible outline on interactive elements



aria-live="polite" for routine updates; aria-live="assertive" when weekly cap is exceeded



Keyboard-only navigation throughout

Tests

Open tests.html via local server to run validator assertions.

Milestones







#



Milestone



Status





M1



Spec & wireframes



Done





M2



Semantic HTML & base CSS



Done





M3



Forms & regex validation + tests.html



Done





M4



Render, sort, regex search



Done





M5



Stats dashboard + cap/ARIA live



Done





M6



Persistence, import/export, settings



Done





M7



Polish, a11y audit, demo video



Pending (video)

