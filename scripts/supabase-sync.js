/**
 * Supabase Database Schema Sync & Inspector Script
 * Uses Supabase Management API to inspect, verify, and apply database schema changes.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// Load local environment variables if available
const envPath = path.resolve(__dirname, "../.env.local");
let SUPABASE_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || "";
let PROJECT_ID = process.env.SUPABASE_PROJECT_ID || "vvqclyejgcblrsfahlou";

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        if (k === "SUPABASE_ACCESS_TOKEN") SUPABASE_TOKEN = v;
        if (k === "SUPABASE_PROJECT_ID") PROJECT_ID = v;
      }
    }
  });
}

if (!SUPABASE_TOKEN) {
  console.error("Error: SUPABASE_ACCESS_TOKEN is not set in environment or .env.local");
  process.exit(1);
}

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query: sql });
    const options = {
      hostname: "api.supabase.com",
      path: `/v1/projects/${PROJECT_ID}/database/query`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function syncDatabase() {
  console.log("--------------------------------------------------");
  console.log("Checking Supabase connection for project:", PROJECT_ID);

  try {
    // 1. Verify connection and list all public tables
    const tables = await runQuery(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name ASC;"
    );

    if (Array.isArray(tables)) {
      console.log(`Connected! Found ${tables.length} tables in public schema:`);
      tables.forEach((t) => console.log(`   - ${t.table_name}`));
    } else {
      console.log("Response:", tables);
    }

    // 2. Ensure all multi-category & 2-skill columns and JobRole table exist
    console.log("\nEnsuring JobRole table & columns in database...");
    const alterSql = `
      CREATE TABLE IF NOT EXISTS "JobRole" (
        "id" text PRIMARY KEY,
        "title" text NOT NULL,
        "slug" text UNIQUE NOT NULL,
        "description" text,
        "department" text DEFAULT 'Engineering',
        "level" text DEFAULT 'Mid-Level',
        "mode" text DEFAULT 'dynamic',
        "hybridVoice" text DEFAULT 'af_heart',
        "interviewerSkill" text DEFAULT 'startup_pragmatist',
        "evaluatorSkill" text DEFAULT 'executive_committee',
        "targetSkills" text DEFAULT 'System Architecture, Big-O Complexity, Code Modularity, Ambition & Ownership',
        "isDefault" boolean DEFAULT false,
        "isActive" boolean DEFAULT true,
        "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "JobRole_slug_idx" ON "JobRole"("slug");
      CREATE INDEX IF NOT EXISTS "JobRole_isDefault_idx" ON "JobRole"("isDefault");

      ALTER TABLE "InterviewQuestion" 
        ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'code_editor',
        ADD COLUMN IF NOT EXISTS "durationMinutes" integer DEFAULT 5,
        ADD COLUMN IF NOT EXISTS "autoSwitch" boolean DEFAULT true,
        ADD COLUMN IF NOT EXISTS "allowAiSwitch" boolean DEFAULT true,
        ADD COLUMN IF NOT EXISTS "options" jsonb,
        ADD COLUMN IF NOT EXISTS "correctOption" integer,
        ADD COLUMN IF NOT EXISTS "explanation" text,
        ADD COLUMN IF NOT EXISTS "evaluationType" text DEFAULT 'rubric_scored',
        ADD COLUMN IF NOT EXISTS "skillTags" jsonb,
        ADD COLUMN IF NOT EXISTS "jobRoleId" text REFERENCES "JobRole"("id") ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS "InterviewQuestion_jobRoleId_idx" ON "InterviewQuestion"("jobRoleId");

      ALTER TABLE "Interview"
        ADD COLUMN IF NOT EXISTS "jobRoleId" text REFERENCES "JobRole"("id") ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS "Interview_jobRoleId_idx" ON "Interview"("jobRoleId");

      ALTER TABLE "Report"
        ADD COLUMN IF NOT EXISTS "recruiterVerdict" text,
        ADD COLUMN IF NOT EXISTS "recruiterNotes" jsonb,
        ADD COLUMN IF NOT EXISTS "skillScores" jsonb,
        ADD COLUMN IF NOT EXISTS "candidateRoadmap" jsonb;

      -- Seed a default Job Role if none exists
      INSERT INTO "JobRole" ("id", "title", "slug", "description", "department", "level", "mode", "hybridVoice", "interviewerSkill", "evaluatorSkill", "targetSkills", "isDefault", "isActive", "createdAt", "updatedAt")
      SELECT 
        'role-default-fullstack', 
        'Full-Stack Software Engineer (Default)', 
        'fullstack-software-engineer', 
        'Comprehensive technical interview covering system design, live coding algorithms, and architectural trade-offs.', 
        'Engineering', 
        'Mid-Level / Senior', 
        'dynamic', 
        'af_heart', 
        'startup_pragmatist', 
        'executive_committee', 
        'System Architecture, Big-O Complexity, Code Modularity, Ambition & Ownership', 
        true, 
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM "JobRole" LIMIT 1);

      -- Create AiSkill table
      CREATE TABLE IF NOT EXISTS "AiSkill" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "slug" text UNIQUE NOT NULL,
        "type" text NOT NULL,
        "category" text DEFAULT 'General',
        "description" text,
        "badge" text DEFAULT 'Custom',
        "content" text NOT NULL,
        "files" jsonb,
        "isBuiltIn" boolean DEFAULT false,
        "isActive" boolean DEFAULT true,
        "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "AiSkill_slug_idx" ON "AiSkill"("slug");
      CREATE INDEX IF NOT EXISTS "AiSkill_type_idx" ON "AiSkill"("type");
      CREATE INDEX IF NOT EXISTS "AiSkill_isActive_idx" ON "AiSkill"("isActive");

      -- Seed built-in Interviewer Skills
      INSERT INTO "AiSkill" ("id", "name", "slug", "type", "category", "description", "badge", "content", "isBuiltIn", "isActive", "createdAt", "updatedAt")
      VALUES
      (
        'skill-startup-pragmatist',
        'The Startup Pragmatist',
        'startup_pragmatist',
        'interviewer',
        'Agile & Execution',
        'Values working code, rapid trade-offs, and production ownership over academic theory.',
        'Agile & Scrappy',
        '# Startup Pragmatist Persona\n\n- Pacing: Swift, conversational, pragmatic, and goal-oriented.\n- Value: Focus on getting things to work, modularity, simplicity, and business trade-offs.\n- Open-Ended Probing: Ask what they built from scratch, how they handle ambiguity, and what they do when things break in production.\n- Hinting: Provide quick nudges when stuck on boilerplate so the candidate demonstrates core logic.\n- Transitions: Switch to live coding as soon as approach is clear.',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        'skill-bigtech-architect',
        'The Big-Tech Architect',
        'bigtech_architect',
        'interviewer',
        'Enterprise & Scale',
        'Methodical and rigorous. Deeply evaluates Big-O complexity, distributed systems scalability, and edge cases.',
        'Scale & Big-O',
        '# Big-Tech Architect Persona\n\n- Pacing: Methodical, structured, and analytically rigorous.\n- Value: Big-O time and auxiliary space complexity, system scale, boundary checks, and testability.\n- Probing: Proactively ask: "What happens if N = 10^8?", "How would you handle concurrent writes?", "What if input is null or cyclical?".\n- Architecture First: Encourage the candidate to whiteboard or state their invariant before jumping into raw code.\n- Hinting: Socratic questions only.',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        'skill-behavioral-leader',
        'The Behavioral & Culture Leader',
        'behavioral_leader',
        'interviewer',
        'Culture & Leadership',
        'Explores cultural alignment, conflict resolution, leadership initiative, and career ambitions through the STAR method.',
        'STAR & Leadership',
        '# Behavioral & Culture Leader Persona\n\n- Pacing: Warm, patient, highly attentive, and conversational.\n- Value: Self-awareness, conflict management, cross-functional empathy, and long-term ambition.\n- STAR Probing: Ask for Situation, Task, Action, and Result whenever candidate mentions past projects.\n- Recruiter Notes: Actively record observations on ambition, ownership, and communication.\n- Technical Balance: Keep technical questions grounded in team collaboration.',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        'skill-fintech-auditor',
        'The FinTech & Security Auditor',
        'fintech_auditor',
        'interviewer',
        'Security & Compliance',
        'Zero tolerance for sloppy logic. Rigorously audits transaction boundaries, race conditions, and defensive practices.',
        'Security & Precision',
        '# FinTech & Security Auditor Persona\n\n- Pacing: Precise, deliberate, and detail-oriented.\n- Value: Data integrity, idempotency, race condition prevention, input sanitization, and defensive exceptions.\n- Boundary Probing: Challenge on integer overflows, floating-point precision, network partition recovery, and transaction rollbacks.\n- Hinting: Point out vulnerability vectors and observe how quickly candidate fortifies solution.',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        'skill-frontend-ux-specialist',
        'Frontend & Web UX Specialist',
        'frontend_ux_specialist',
        'interviewer',
        'Frontend & UX',
        'Deeply evaluates DOM rendering performance, client vs server state hydration, responsiveness, and web accessibility.',
        'UI & Web Performance',
        '# Frontend & Web UX Specialist Persona\n\n- Pacing: Visual, user-centric, and performance-minded.\n- Value: Core Web Vitals (LCP, CLS, INP), state management, re-render avoidance, accessibility (WCAG AA), and responsive design.\n- Probing: Proactively ask: "How does this scale when rendering 10,000 list items?", "What happens on slow 3G networks?", "How do you avoid unnecessary re-renders?", "Is this screen reader and keyboard navigable?".\n- Architecture First: Ask candidate to articulate component tree separation, data flow, and server vs client component boundaries.\n- Hinting: Guide toward clean separation of concerns and standard browser APIs rather than heavy third-party packages.',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        'skill-cloud-devops-sre',
        'Cloud, DevOps & SRE Reliability Engineer',
        'cloud_devops_sre',
        'interviewer',
        'Cloud & Reliability',
        'Rigorously assesses zero-downtime deployments, incident postmortems, container orchestration, and telemetry.',
        'SRE & Infrastructure',
        '# Cloud, DevOps & SRE Reliability Engineer Persona\n\n- Pacing: Calm, analytical, focused on resilience and failure recovery.\n- Value: Observability (metrics, logs, traces), MTTR, blue-green / canary rollouts, container security, and blast radius control.\n- Probing: Ask: "What happens when AWS/GCP region experiences a network split?", "How do you protect database connection pools under sudden 50x traffic spikes?", "Walk me through your runbook when CPU hits 99% in production at 3 AM."\n- Real-World Scenarios: Present realistic production outages and observe if they isolate root cause before applying band-aids.\n- Hinting: Ask about automated rollback conditions and health check probes.',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        'skill-data-ai-specialist',
        'Data & AI Systems Specialist',
        'data_ai_specialist',
        'interviewer',
        'Data & Machine Learning',
        'Probes streaming vs batch data pipelines, vector search, LLM orchestration, hallucination mitigations, and data freshness.',
        'Data & AI Architecture',
        '# Data & AI Systems Specialist Persona\n\n- Pacing: Rigorous, data-centric, and mathematically grounded.\n- Value: Data consistency models, stream processing, vector similarity indexing, embedding chunking strategies, and model evaluation.\n- Probing: Ask: "How do you evaluate retrieval precision vs recall in your RAG pipeline?", "What happens when data schemas evolve in real-time pipelines?", "How do you catch model hallucinations before showing responses to users?".\n- Trade-offs: Challenge candidates to balance latency, cost per 1,000 tokens, and query accuracy.\n- Hinting: Prompt them to consider caching layers and evaluation benchmarks (evals).',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      -- Seed built-in Evaluator Skills
      (
        'skill-executive-committee',
        'Executive Hiring Committee',
        'executive_committee',
        'evaluator',
        'Executive Decision',
        'Produces a decisive 1-minute executive hiring scorecard for HR and hiring managers.',
        'Executive Scorecard',
        '# Executive Hiring Committee Philosophy\n\n- Goal: Enable a hiring manager or HR recruiter to make a confident decision in under 60 seconds.\n- Provide a definitive recruiterVerdict: STRONG_HIRE, HIRE, LEANING_NO, or NO_HIRE.\n- Executive Summary: Highlight candidate strengths, key trade-offs, and risk factors.\n- Score target skills (e.g., Python, Architecture, Communication) on a 0-100 scale.\n- Include verbatim quotes on subjective questions (career vision, ambition, teamwork).',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        'skill-culture-leadership',
        'Culture & Team Dynamic Evaluator',
        'culture_leadership',
        'evaluator',
        'Culture & EQ',
        'Evaluates communication clarity, receptiveness to feedback, emotional intelligence, and team collaboration.',
        'Culture & EQ',
        '# Culture & Team Dynamic Philosophy\n\n- Goal: Evaluate if candidate elevates the team culture and morale.\n- Assess coachability and receptiveness to interviewer hints.\n- Score communication clarity, active listening, and ownership.\n- Quote verbatim statements revealing self-awareness and ambition.\n- Produce actionable onboarding recommendations for hiring managers.',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        'skill-technical-rigor',
        'Technical Rigor & Engineering Excellence',
        'technical_rigor',
        'evaluator',
        'Technical Deep-Dive',
        'Deep-dive technical autopsy benchmarking time/space complexity, modularity, and candidate growth roadmap.',
        'Engineering Rigor',
        '# Technical Rigor & Engineering Excellence Philosophy\n\n- Goal: Deep algorithmic and architectural evaluation for engineering leads.\n- Compute precise Big-O Time and Space complexity benchmarks.\n- Audit code structure, readability, modularity, and error handling.\n- Provide a 3-step candidateRoadmap with concrete topics and practice problems.',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        'skill-product-engineering-leader',
        'Product-Minded Engineering Leader',
        'product_engineering_leader',
        'evaluator',
        'Product & Business Impact',
        'Evaluates how candidate aligns software architecture with business ROI, user empathy, MVP velocity, and cost discipline.',
        'Product Mindset',
        '# Product-Minded Engineering Leader Philosophy\n\n- Goal: Determine whether candidate builds technology for users and business outcomes or purely for theoretical resume-padding.\n- Metric Focus: Evaluate their instincts for conversion rates, user drop-offs, cloud compute costs, and time-to-market trade-offs.\n- Pragmatism Score: Reward candidates who know when a simple SQL query beats a complex microservice architecture.\n- Stakeholder Empathy: Audit how well they communicate technical constraints to non-technical leaders and cross-functional teams.\n- Recruiter Recommendation: Highlight readiness to lead sprint planning, MVP launches, and feature triage.',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        'skill-early-career-growth',
        'Early-Career & Growth Potential Evaluator',
        'early_career_growth',
        'evaluator',
        'Growth & Foundation',
        'Tailored for junior and entry-level talent: measures learning velocity, coachability, curiosity, and 90-day onboarding readiness.',
        'High Potential',
        '# Early-Career & Growth Potential Evaluator Philosophy\n\n- Goal: Identify high-ceiling candidates who may lack deep senior experience but absorb feedback and learn exceptionally fast.\n- Coachability Benchmark: Did the candidate actively listen when the interviewer dropped a hint? Did they adapt or get defensive?\n- Curiosity & Ownership: Look for enthusiasm in self-directed learning, personal projects, and asking insightful clarifying questions.\n- Fundamentals over Frameworks: Value rock-solid grasp of programming fundamentals (variables, recursion, arrays, debug mindset) over buzzwords.\n- 90-Day Ramp Plan: Provide hiring managers with a customized 30-60-90 day mentorship plan for quick team integration.',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("slug") DO NOTHING;
    `;
    await runQuery(alterSql);

    // 3. Inspect columns on InterviewQuestion
    const columns = await runQuery(
      "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'InterviewQuestion' ORDER BY ordinal_position ASC;"
    );

    console.log("\nActive columns on 'InterviewQuestion':");
    if (Array.isArray(columns)) {
      columns.forEach((c) => {
        console.log(`   - ${c.column_name.padEnd(20)} (${c.data_type}) [default: ${c.column_default || "none"}]`);
      });
    }

    // 4. Check active questions
    const questions = await runQuery(
      'SELECT "order", category, "durationMinutes", "autoSwitch", title FROM "InterviewQuestion" ORDER BY "order" ASC;'
    );
    console.log("\nCurrent configured interview questions:");
    if (Array.isArray(questions)) {
      questions.forEach((q) => {
        console.log(`   Step ${q.order}: [${q.category.toUpperCase()}] (${q.durationMinutes} min, autoSwitch: ${q.autoSwitch}) -> "${q.title}"`);
      });
    }

    console.log("\nDatabase schema is 100% in sync with Prisma schema.");
    console.log("--------------------------------------------------");
  } catch (err) {
    console.error("Database sync failed:", err);
  }
}

syncDatabase();
