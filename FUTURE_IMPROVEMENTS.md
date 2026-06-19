# Knowledge Capture Tool — Future Improvements & Roadmap

This document tracks planned improvements beyond the MVP. Items are grouped by theme, not strict priority — reprioritise based on what paying customers actually ask for.

---

## v2 — Core product improvements

### RAG / semantic search
The single highest-leverage improvement after MVP. Feed all captured documents back into a vector store so that:
- New captures are enriched by existing organisational context (the AI already knows what "the server room" or "Site B" means)
- Users can search semantically ("how do we handle contractor inductions?") and get answers drawn from captured docs, not just keyword matches
- The "ask a question" retrieval mode becomes possible

**Stack:** pgvector (already in Supabase), Google text embeddings (`text-embedding-004` via Gemini API), a retrieval layer in the API.

**Why it matters:** This is the compounding moat. Every document captured makes the next one smarter. After 6 months a client's instance understands their terminology, people, equipment, and processes in a way that's not replicable by pasting into a generic AI tool.

### Voice / audio input
High value for field workers, tradespeople, and engineers who'd rather talk than type. Record a verbal explanation of how something works, get a structured document out.

**Stack:** Google Cloud Speech-to-Text or OpenAI Whisper API → transcript → existing capture pipeline. The capture pipeline doesn't need to change — just add a transcription step before it.

**Use case:** Site supervisor records a voice note explaining a maintenance procedure. Field engineer does a verbal walkthrough of a network setup. New starter records an explanation from an experienced colleague.

### Better diagram rendering
Replace the basic SVG grid layout with a proper diagramming library:
- **Mermaid.js** — good for flowcharts and sequence diagrams, auto-layout
- **ReactFlow** — interactive, draggable, best for network diagrams
- **draw.io embed** — familiar to engineers, exportable

Also add: export diagram as PNG/SVG, copy diagram as image.

### Document versioning and history
Track changes over time. When a document is updated, keep the previous version accessible. Show a diff between versions. Critical for compliance documents where audit trails matter.

### Collaborative review workflow
After capture, route the document to a subject matter expert for review before it's marked as verified. Simple approval flow: draft → in review → approved. Approved documents get a visible badge.

---

## v3 — Integrations

### Microsoft 365 / SharePoint
The most requested integration for Australian engineering SMEs already on M365.
- OAuth flow with Entra ID (replaces email/password auth)
- Read from SharePoint: pull existing docs into the knowledge base
- Write to SharePoint: push captured documents back to a configured library
- Teams tab: surface the capture tool inside Teams so users don't need a separate app

**Complexity:** High. Requires Azure app registration, Graph API permissions, tenant admin consent. Worth it once you have 3+ customers asking for it.

### Email capture
Forward an email thread to a capture address (e.g. `capture@yourdomain.com`) and get a structured document back. High value for the common case where knowledge lives in email chains.

**Stack:** Postmark or SendGrid inbound parsing → extract email body/thread → capture pipeline.

### Slack / Teams message capture
Highlight a message or thread and send it to the capture bot. Same pipeline, different input surface.

---

## v4 — Advanced features

### Knowledge gap dashboard
Org-level view showing:
- Topics that have been captured vs topics with no documentation
- Documents flagged with unresolved warnings/gaps
- Most-searched topics with no matching documents (demand signal for what to capture next)
- Staff who have captured knowledge vs who hasn't (gamified, optional)

This turns the tool from reactive (capture when you remember) to proactive (here's what your organisation doesn't know it doesn't know).

### Guided capture interviews
Instead of a blank text area, an AI-guided interview mode:
- "Tell me about this process" → follow-up questions based on what's missing
- "You mentioned Dave handles escalations — what happens if Dave is unavailable?"
- Structured conversation that ends with a complete document

Particularly valuable for capturing knowledge from experienced staff who don't know what to document — the AI asks the right questions.

### Knowledge expiry and review reminders
Documents have a review date. When it expires, the owner gets notified to confirm it's still accurate or update it. Compliance-critical documents (SWMS, emergency procedures) get shorter review cycles.

### Role-based access control
Beyond member/admin:
- Department-scoped access (maintenance team sees maintenance docs, not HR docs)
- Public vs internal docs within an org
- Guest access for contractors or auditors (read-only, time-limited)

### AI-powered onboarding assistant
New staff can ask questions and get answers drawn from the knowledge base:
- "How do I connect to the VPN?" → pulls from the captured IT onboarding procedure
- "Who do I contact for X?" → pulls from the contacts/roles reference

Essentially a private internal chatbot grounded in the org's own captured knowledge. This is the end state of the RAG layer — not just search, but a conversational interface to organisational knowledge.

---

## Technical debt to address post-MVP

### PDF export quality
The MVP PDF export will be basic. Proper PDF generation with correct formatting, headers, footers, page numbers, and logo is worth investing in once customers are paying — it's what they'll share externally.

### Rate limiting and cost controls
Gemini API calls cost money. Add per-org usage tracking, rate limiting on the capture endpoint, and a cost dashboard for your own visibility.

### Proper error handling and retries
MVP will have basic error handling. Production needs: retry logic for Gemini API failures, graceful degradation if extraction fails, user-facing error messages that are actually helpful.

### Test coverage
MVP: none. Before taking on paying customers: integration tests for the capture pipeline, unit tests for the document structuring logic, end-to-end test for the full capture → save → export flow.

### Supabase migrations management
As the schema evolves, maintain proper migration files in version control. Don't make schema changes directly in the Supabase dashboard.

---

## Business / go-to-market improvements

### Onboarding flow
After sign-up, guide the user to their first successful capture within 5 minutes. Show example inputs, explain what the tool does, prompt them to try the examples. Time-to-value is the most important metric in early SaaS.

### Usage analytics
Track: captures per org per week, document types most commonly generated, export frequency, search queries. This tells you what's actually being used and what to build next.

### Pricing and billing
MVP: free or manually invoiced. v2: Stripe integration with a simple per-seat or per-capture model. Engineering SMEs are used to paying for software — don't underprice.

### White-label / custom branding
Once you have multiple customers, some will want their own logo and domain. Relatively straightforward to add, high perceived value.

---

## Ideas to validate before building

These are speculative — only build if customers ask for them:

- **Auto-capture from meeting transcripts** — Teams/Zoom transcript → structured action items and decisions as reference doc
- **Procedure comparison** — "how does our procedure differ from AS/NZS standard X?" — useful for compliance-heavy customers
- **Multi-language support** — probably not needed for Australian market initially
- **Offline mode** — for sites with poor connectivity (mining, remote construction) — high complexity, niche use case
- **Integration with project management tools** (Procore, Aconex) — only if you get traction with customers already on these platforms

---

## Notes on prioritisation

The order of building should follow what paying customers actually ask for, not this list. After MVP:

1. Talk to every customer after their first week of use
2. Ask: what's the one thing that would make this 10x more useful?
3. Build the thing that comes up most often across 3+ customers
4. Repeat

The RAG/semantic search and voice input are the highest-confidence bets based on the problem space. Everything else should be validated before committing to build.
