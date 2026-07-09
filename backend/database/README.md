# Runtime Data Seeds

This directory is used by the API and GUI runtime for append-only JSONL data.

- Runtime files like `ai_cases.jsonl` and `events_log.jsonl` are ignored by Git.
- Seed placeholders are versioned as `*.seed.jsonl`.
- Set `CATALYST_DATA_DIR` to move writable runtime data outside the repository when needed.
