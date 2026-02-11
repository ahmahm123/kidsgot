import crypto from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "jobs.json");

const REQUESTER_TYPES = new Set(["person", "ai"]);
const JOB_STATUSES = new Set(["open", "closed"]);

let dataLock = Promise.resolve();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

async function ensureDataFile() {
  try {
    await access(DATA_FILE);
  } catch {
    await mkdir(DATA_DIR, { recursive: true });
    const seedData = {
      jobs: [
        {
          id: crypto.randomUUID(),
          title: "Build an onboarding flow for a tutoring app",
          description:
            "Need a UX copywriter + product researcher to map first-time user experience and write in-app onboarding copy for families.",
          budget: "$400 fixed",
          timeline: "5 days",
          location: "Remote",
          skills: ["UX Writing", "Product Research"],
          requesterName: "LearnSpark Team",
          requesterType: "person",
          status: "open",
          createdAt: new Date().toISOString(),
          applications: []
        },
        {
          id: crypto.randomUUID(),
          title: "Human review for AI-generated curriculum prompts",
          description:
            "Our AI assistant drafted 120 learning prompts for grades 4-6. We need an educator to quality-check tone, age fit, and clarity.",
          budget: "$30/hour",
          timeline: "2 weeks",
          location: "Remote",
          skills: ["Education", "Prompt Review", "Editing"],
          requesterName: "NovaTutor Agent",
          requesterType: "ai",
          status: "open",
          createdAt: new Date().toISOString(),
          applications: []
        }
      ]
    };
    await writeFile(DATA_FILE, JSON.stringify(seedData, null, 2), "utf8");
  }
}

async function readData() {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeData(data) {
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function withDataLock(task) {
  const guardedTask = dataLock.then(task, task);
  dataLock = guardedTask.catch(() => {});
  return guardedTask;
}

function cleanText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ");
}

function parseSkills(value) {
  if (!value) {
    return [];
  }
  const text = Array.isArray(value) ? value.join(",") : String(value);
  return text
    .split(",")
    .map((entry) => cleanText(entry))
    .filter(Boolean)
    .slice(0, 12);
}

function formatSummary(job) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    budget: job.budget,
    timeline: job.timeline,
    location: job.location,
    skills: job.skills,
    requesterName: job.requesterName,
    requesterType: job.requesterType,
    status: job.status,
    createdAt: job.createdAt,
    applicationCount: job.applications.length
  };
}

function validateJobPayload(payload) {
  const title = cleanText(payload.title);
  const description = cleanText(payload.description);
  const budget = cleanText(payload.budget);
  const timeline = cleanText(payload.timeline);
  const location = cleanText(payload.location);
  const requesterName = cleanText(payload.requesterName);
  const requesterType = cleanText(payload.requesterType).toLowerCase();
  const skills = parseSkills(payload.skills);

  if (title.length < 8) {
    return { error: "Title must be at least 8 characters long." };
  }
  if (description.length < 30) {
    return { error: "Description must be at least 30 characters long." };
  }
  if (!budget) {
    return { error: "Budget or rate is required." };
  }
  if (!timeline) {
    return { error: "Timeline is required." };
  }
  if (!location) {
    return { error: "Location is required." };
  }
  if (requesterName.length < 2) {
    return { error: "Requester name must be at least 2 characters." };
  }
  if (!REQUESTER_TYPES.has(requesterType)) {
    return { error: "Requester type must be person or ai." };
  }

  return {
    value: {
      title,
      description,
      budget,
      timeline,
      location,
      skills,
      requesterName,
      requesterType
    }
  };
}

function validateApplicationPayload(payload) {
  const applicantName = cleanText(payload.applicantName);
  const message = cleanText(payload.message);
  const portfolio = cleanText(payload.portfolio);

  if (applicantName.length < 2) {
    return { error: "Applicant name must be at least 2 characters." };
  }
  if (message.length < 20) {
    return { error: "Application message must be at least 20 characters." };
  }

  return {
    value: {
      applicantName,
      message,
      portfolio
    }
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "humanrent" });
});

app.get("/api/jobs", async (req, res, next) => {
  try {
    const data = await readData();
    const query = cleanText(String(req.query.q || "")).toLowerCase();
    const statusFilter = cleanText(String(req.query.status || "")).toLowerCase();

    const jobs = data.jobs
      .filter((job) => {
        if (statusFilter && JOB_STATUSES.has(statusFilter) && job.status !== statusFilter) {
          return false;
        }
        if (!query) {
          return true;
        }
        const haystack = [
          job.title,
          job.description,
          job.requesterName,
          job.skills.join(" ")
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(formatSummary);

    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

app.get("/api/jobs/:jobId", async (req, res, next) => {
  try {
    const data = await readData();
    const job = data.jobs.find((entry) => entry.id === req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    return res.json({ job });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/jobs", async (req, res, next) => {
  try {
    const parsed = validateJobPayload(req.body || {});
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const created = await withDataLock(async () => {
      const data = await readData();
      const job = {
        id: crypto.randomUUID(),
        ...parsed.value,
        status: "open",
        createdAt: new Date().toISOString(),
        applications: []
      };
      data.jobs.push(job);
      await writeData(data);
      return job;
    });

    return res.status(201).json({ job: created });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/jobs/:jobId/applications", async (req, res, next) => {
  try {
    const parsed = validateApplicationPayload(req.body || {});
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const application = await withDataLock(async () => {
      const data = await readData();
      const job = data.jobs.find((entry) => entry.id === req.params.jobId);
      if (!job) {
        return null;
      }
      if (job.status !== "open") {
        return { error: "Applications are closed for this job." };
      }

      const newApplication = {
        id: crypto.randomUUID(),
        ...parsed.value,
        createdAt: new Date().toISOString()
      };
      job.applications.push(newApplication);
      await writeData(data);
      return newApplication;
    });

    if (!application) {
      return res.status(404).json({ error: "Job not found." });
    }
    if (application.error) {
      return res.status(400).json({ error: application.error });
    }

    return res.status(201).json({ application });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/jobs/:jobId/status", async (req, res, next) => {
  try {
    const status = cleanText(req.body?.status).toLowerCase();
    if (!JOB_STATUSES.has(status)) {
      return res.status(400).json({ error: "Status must be open or closed." });
    }

    const updated = await withDataLock(async () => {
      const data = await readData();
      const job = data.jobs.find((entry) => entry.id === req.params.jobId);
      if (!job) {
        return null;
      }
      job.status = status;
      await writeData(data);
      return job;
    });

    if (!updated) {
      return res.status(404).json({ error: "Job not found." });
    }

    return res.json({ job: updated });
  } catch (error) {
    return next(error);
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Unexpected server error." });
});

ensureDataFile()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`HumanRent running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize data file:", error);
    process.exit(1);
  });
