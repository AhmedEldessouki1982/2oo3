**Orientation**
- Repo currently holds only `docs/PRD.md`; treat it as the single source of product scope and build process guidance until code and configs exist.

**Product Shape**
- MVP centers on a multi-model chat for commissioning engineers: simultaneous ChatGPT/Claude/Gemini runs, side-by-side streaming UI, and an automated comparison engine surfacing agreements, disagreements, unique insights, hidden risks, and next investigations.
- Conversations must persist (titles, history, resume) with automatic context compression that preserves technical identifiers, findings, and attachment references while trimming repetition.

**Stack Expectations**
- Frontend is expected to be React + Vite + TypeScript + Tailwind CSS + shadcn/ui with animated, production-quality UX tailored to commissioning workflows.
- Backend is expected to be NestJS + Prisma + PostgreSQL orchestrating provider calls, attachment processing, structured analysis, and context compression; design for parallel provider execution so one failure never blocks the rest.

**Implementation Priorities**
- Maintain identical shared context across providers (prompt, history, notes, attachments); never send privileged data to a single model.
- Attachment pipeline must extract content from PDF/DOCX/XLSX/CSV/images and inject the same distilled context into every model turn.
- Provider management has to accept user-supplied API keys (OpenAI, Anthropic, Google), encrypt at rest, support enable/disable toggles, and degrade gracefully when quotas expire.

**When Adding Code**
- Document real setup, build, lint, typecheck, and test commands as soon as they exist; until then, reference `docs/PRD.md` before taking implementation shortcuts.
