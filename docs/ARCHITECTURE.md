# Architecture and trade-offs

## Problem and audience
FirstHello explores meaningful friendships for adults who prefer private, slower conversations. Design choices: interests before photos; private chat before groups; no guilt-driven activity or forced social interaction; AI as opt-in assistance, not a social judge.

## Why an agent rather than a normal workflow?
A rule-only implementation chooses a fixed suggestion category from keywords. The optional Ollama layer uses **model-based planning** to choose one of three read-only tools and one of five conversation strategies. Python enforces the permitted tool list, retrieves evidence from the demo, and the model drafts options. Human permission remains necessary for any use of a suggestion.

## JSON contract
Planner: `{ "tool": "shared_interests|recent_context|friend_pace", "route": "opener|empathetic|followup|gentle_question|low_pressure", "why": "..." }`

Draft: `{ "suggestions": ["...", "...", "..."], "reason": "..." }`

The program requests Ollama's structured JSON output and **also validates** fields before returning them. The responses are advice, not factual evidence of a relationship.

## Tool and data boundaries
- `shared_interests`: sees the current demo profile's public interests and the user's selected interests.
- `recent_context`: receives up to six recent fictional messages.
- `friend_pace`: returns the fictional friend's public preferred communication pace.

All other tool names are rejected. No tool can send, reveal identity, fetch a camera, access the user's file system or send data to external contacts. The server only exposes fictional data and never stores real accounts. The Conversation Coach uses the selected fictional conversation when the user asks for suggestions. The app can also recognise birthdays mentioned in new fictional messages, but it asks for permission before saving them. Saved birthdays are kept locally and can be edited or deleted.

## Failure paths
Unreachable model, missing model, unexpected tool, bad JSON, duplicate suggestions and oversized outputs cause a visible fallback to deterministic offline rules. This is a useful reliability pattern, but it is not enough for production social safety. Small models can still sound confident while misunderstanding context; an actual real-world deployment would need evaluation, moderation, authentication, consent and privacy compliance.

## Explicitly unfinished
Real user-to-user networking, account database, secure private messages, gender verification, meaningful friendship predictions, camera/video, actual face reveals, and live moderation are **not** implemented. The reveal controls and peers are simulations.
