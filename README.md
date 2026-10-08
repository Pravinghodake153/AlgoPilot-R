# AlgoPilot

AlgoPilot is an AI-powered technical interview platform for realistic, structured
and measurable engineering interviews. It combines a live conversational
interviewer, a browser-based coding workspace, optional voice interaction,
step-level evaluation and a hiring-ready report.

The interviewer is not just a chatbot that asks a fixed list of questions. It
receives the candidate's conversation, current code, execution results, time
remaining and interview signals as context. It can then ask follow-ups, change
the interview activity, provide progressive hints and record recruiter
observations while the session is in progress.

## What the interview AI does

During an interview, AlgoPilot can:

- Introduce the interview and present a problem matched to the selected
  language, difficulty, duration and role.
- Hold a natural technical conversation about problem understanding,
  assumptions, approach and trade-offs.
- Inspect the candidate's current editor code, including line numbers, and
  discuss the implementation with accurate context.
- Receive code execution output and use successful output, compilation errors,
  runtime errors, execution time and memory information in the next response.
- Ask targeted follow-up questions instead of repeating the same prompt.
- Evaluate an answer against a question-specific rubric, identify matched and
  missed concepts, score the answer and decide whether to advance.
- Provide progressive hints at three levels: `nudge`, `conceptual` and
  `code_hint`.
- Move between conversation, code editor, drawing/whiteboard and option-quiz
  activities when the candidate is ready.
- Support text and voice experiences with speech-to-text and text-to-speech
  routes.
- Persist the transcript, code snapshots, step evaluations, hints, recruiter
  notes and interview events for the final report.

## Interview modes

Each job role can use either `dynamic` or `hybrid` mode.

### Dynamic AI mode

Dynamic mode is the adaptive interview experience. The backend builds the
interview prompt from:

1. The base interviewer instructions.
2. The selected job role and target skills.
3. An interviewer skill/persona.
4. The current problem, language, difficulty, style, duration and time
   remaining.
5. The authoritative transcript and current candidate code.
6. Code execution results and interview signals.
7. Dynamic tool-calling instructions.

The selected skill can come from a database-defined custom skill or from the
built-in skill registry. This means an administrator can add or update an
interview specialization without changing the interview UI.

The live interviewer can emit structured tool markers that the server
intercepts and persists as events:

```text
[TOOL_CALL: switch_category(category="code_editor", reason="Approach is ready")]
[TOOL_CALL: record_recruiter_note(trait="technical_depth", quote="...", assessment="...")]
[TOOL_CALL: give_progressive_hint(level="nudge", hint="...")]
```

The candidate sees a clean conversational response; tool markup is removed from
the stored transcript while the resulting category switch, recruiter note or
hint event remains available to the report generator.

### Hybrid mode

Hybrid mode combines a controlled interview plan with AI conversation. Questions
are stored in the database with an order, stage, category, time limit, rubric,
secondary probe, maximum probe count and evaluation type. The AI can explain
the question and respond naturally, while the platform retains predictable
progression and scoring boundaries.

Hybrid questions can include:

- Approach and reasoning prompts.
- Code-editor tasks.
- Drawing or system-design activities.
- Multiple-choice or option-quiz questions.
- Subjective recruiter questions.
- Expected concepts and secondary probing angles.
- Optional audio prompts.

This mode is useful when every candidate must be assessed on the same structured
competencies while still receiving conversational feedback.

## Two-skill dynamic architecture

Every dynamic interview uses two independent skill layers:

### 1. Live interviewer skill

This skill controls the persona, pacing, probing strategy, hints and how the
interviewer transitions between discussion and implementation.

Built-in interviewer skills include:

- **Startup Pragmatist** - speed, autonomy, practical trade-offs and working
  code.
- **Big-Tech Architect** - Big-O complexity, scale, modular architecture and
  edge cases.
- **Behavioral & Culture Leader** - STAR responses, empathy, ownership and
  leadership.
- **FinTech & Security Auditor** - correctness, concurrency, transactions,
  input safety and data integrity.
- **Frontend & Web UX Specialist** - component state, rendering, hydration,
  performance and accessibility.
- **Cloud, DevOps & SRE Reliability Engineer** - incidents, resilience,
  deployments, observability and recovery.
- **Data & AI Systems Specialist** - streaming and batch systems, SQL,
  embeddings, RAG, schema evolution and model reliability.

### 2. Report evaluator skill

This skill controls how the completed interview is interpreted and how the
result is presented to a hiring manager or candidate.

Built-in evaluator skills include:

- **Executive Hiring Committee** - hiring verdict, executive summary and skill
  scorecard.
- **Culture & Team Dynamic Evaluator** - collaboration, coachability, empathy
  and ownership.
- **Technical Rigor & Engineering Excellence** - complexity, code quality and
  a technical growth roadmap.
- **Product-Minded Engineering Leader** - user empathy, ROI and pragmatic
  engineering trade-offs.
- **Early-Career & Growth Potential Evaluator** - fundamentals, curiosity,
  learning velocity and a 90-day mentorship plan.

Both layers are configurable per job role. The admin skill system also supports
custom active skills stored in the `AiSkill` table.

## Adaptive interview lifecycle

1. **Create** - the candidate selects a role, language, difficulty and duration.
2. **Start** - the AI generates a short opening and frames the problem.
3. **Understand** - the candidate explains assumptions and an initial approach.
4. **Probe** - the interviewer tests reasoning, complexity, edge cases and
   role-specific competencies.
5. **Implement** - the candidate writes code in the Monaco editor and can run it.
6. **Inspect** - the AI receives the latest code and execution result as
   structured context.
7. **Evaluate** - rubric evaluation records matched concepts, missed concepts,
   score, feedback and probe count.
8. **Adapt** - the AI asks a secondary probe, gives a progressive hint or
   advances to the next question/category.
9. **Complete** - the transcript, code, events and integrity signals are sent
   to the report evaluator.
10. **Report** - the platform generates scores, verdict, strengths,
    weaknesses, suggestions, complexity analysis and next steps.

## Reports and scoring

The final report can contain:

- Overall, technical, communication, problem-solving, optimization and code
  quality scores.
- Estimated level: Junior, Mid-Level, Senior or Staff.
- Whether the problem was solved.
- Time and space complexity.
- Strengths, weaknesses, suggestions and actionable next steps.
- Transcript annotations.
- A recruiter verdict: `STRONG_HIRE`, `HIRE`, `LEANING_NO` or `NO_HIRE`.
- Executive recruiter notes and hiring recommendations.
- Target skill scores from 0 to 100.
- Verbatim candidate quotes and professional assessments.
- A candidate roadmap with concrete practice advice.

Hints, retries and integrity signals are included in the evaluation context so
the result reflects how the candidate reasoned, responded to coaching and
worked under interview conditions.

## Code execution

The `/api/execute` endpoint uses a layered execution strategy:

1. Piston as the primary open-source execution service.
2. JDoodle when configured and Piston is unavailable.
3. Judge0 as the tertiary fallback when its RapidAPI credentials are present.

Supported languages include C++, Java, Python, JavaScript, TypeScript and Go.
The execution result is normalized into stdout, stderr, compilation output,
status, time and memory fields before it is supplied to the interviewer.

## Voice and interview integrity

Voice interviews use dedicated speech-to-text and text-to-speech API routes.
The platform can use configurable voices and provider fallbacks while keeping
the same transcript and evaluation pipeline as text interviews.

Optional integrity signals are captured during an interview:

- Tab switches, window blur/focus and refresh attempts.
- Time spent with the candidate out of camera frame.
- Multiple-person detection using TensorFlow.js and BlazeFace.
- Error logs and interview lifecycle events.

These signals are persisted as interview data and event logs. They are supplied
to the evaluation layer as context rather than rendered as disruptive warnings
inside the technical conversation.

## Application architecture

```text
Next.js App Router
├── app/                  Pages and authenticated API routes
├── features/             Interview, editor, dashboard and report UI
├── services/             AI provider and interview prompt logic
├── types/                Skill registries and shared TypeScript types
├── hooks/                Voice, face and tab-switch behavior
├── lib/                  Prisma, auth and server utilities
├── prisma/               PostgreSQL schema
└── data/                 Seed/default coding problems
```

Important server routes include:

- `/api/interviews/[id]/start` - creates the opening interviewer message.
- `/api/interviews/[id]/chat` - non-streaming conversational turn with the
  authoritative database context.
- `/api/interviews/[id]/chat-stream` - streaming SSE conversational response.
- `/api/interviews/[id]/evaluate-step` - rubric evaluation and progression.
- `/api/interviews/[id]/report` - final report generation.
- `/api/interviews/[id]/stt` and `/api/interviews/[id]/tts` - voice pipeline.
- `/api/execute` - sandboxed external code execution orchestration.

## AI provider strategy

AI requests use an OpenAI-compatible chat-completions interface. The active
provider and model can be configured through database system settings, with
environment variables as defaults. Supported provider integrations include
Gemini, OpenRouter, DeepSeek and Z.AI/GLM. Streaming responses use SSE and
non-streaming requests are used for reports and structured evaluations.

The service has provider failover behavior so a temporary primary-provider
failure can be retried through a configured fallback provider. Report
generation can use a separate provider and model from the live interviewer.

## Technology stack

- Next.js App Router and React
- TypeScript
- Clerk authentication
- Prisma ORM with PostgreSQL/Supabase
- Tailwind CSS and shadcn/ui components
- Monaco Editor
- Zustand interview state management
- TensorFlow.js and BlazeFace
- OpenAI-compatible AI providers
- SSE streaming for live responses

## Local development

### Prerequisites

- Node.js 20 or newer
- PostgreSQL database (Supabase works well)
- Clerk application credentials
- At least one configured AI provider

### Setup

```bash
git clone https://github.com/Pravinghodake153/AlgoPilot-R.git
cd AlgoPilot-R
npm install
cp .env.example .env.local
```

Fill in `.env.local` with the Clerk and database values and at least one AI
provider key. Add optional code execution, voice and fallback-provider
credentials when those features are enabled.

Synchronize the database when required:

```bash
npx prisma generate
npx prisma db push
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Generate Prisma client and create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:sync` | Run the Supabase synchronization script |

## Security and configuration notes

- Never commit `.env.local`, API keys, Clerk secrets or database credentials.
- Use `.env.example` as the configuration reference.
- Keep provider keys and database access on the server; browser code should
  call the application API routes.
- Configure Clerk webhooks if user synchronization is required.
- Configure `DIRECT_URL` for Prisma operations that require a direct database
  connection.
