const state = {
  allJobs: [],
  visibleJobs: []
};

const elements = {
  jobForm: document.querySelector("#job-form"),
  jobFormMessage: document.querySelector("#job-form-message"),
  searchInput: document.querySelector("#search-input"),
  statusFilter: document.querySelector("#status-filter"),
  jobList: document.querySelector("#job-list"),
  openCount: document.querySelector("#open-count"),
  totalCount: document.querySelector("#total-count"),
  applicationCount: document.querySelector("#application-count"),
  applyDialog: document.querySelector("#apply-dialog"),
  applicationForm: document.querySelector("#application-form"),
  applyTitle: document.querySelector("#apply-title"),
  applyMeta: document.querySelector("#apply-meta"),
  applicationMessage: document.querySelector("#application-message"),
  closeDialog: document.querySelector("#close-dialog")
};

let listRequestToken = 0;
let searchDebounce = null;

function setMessage(node, text, tone = "") {
  node.textContent = text;
  node.classList.remove("success", "error");
  if (tone) {
    node.classList.add(tone);
  }
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(isoDate) {
  try {
    return new Date(isoDate).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return isoDate;
  }
}

function renderStats() {
  const open = state.allJobs.filter((job) => job.status === "open").length;
  const total = state.allJobs.length;
  const applications = state.allJobs.reduce((sum, job) => sum + (job.applicationCount || 0), 0);

  elements.openCount.textContent = String(open);
  elements.totalCount.textContent = String(total);
  elements.applicationCount.textContent = String(applications);
}

function renderJobs() {
  if (!state.visibleJobs.length) {
    elements.jobList.innerHTML = `
      <div class="empty-state">
        <p>No requirements matched your filters.</p>
        <p>Try a broader search or post a new requirement.</p>
      </div>
    `;
    return;
  }

  elements.jobList.innerHTML = state.visibleJobs
    .map((job) => {
      const skillTags =
        job.skills?.length > 0
          ? `<div class="skills">${job.skills
              .map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`)
              .join("")}</div>`
          : "";
      const requesterClass = job.requesterType === "ai" ? "ai" : "person";
      const requesterLabel = job.requesterType === "ai" ? "AI Requester" : "Human Requester";
      const statusTag = job.status === "closed" ? '<span class="tag closed">Closed</span>' : "";
      const applyDisabled = job.status !== "open" ? "disabled" : "";

      return `
        <article class="job-card" data-job-id="${escapeHtml(job.id)}">
          <div class="job-head">
            <h3 class="job-title">${escapeHtml(job.title)}</h3>
            <div>
              <span class="tag ${requesterClass}">${requesterLabel}</span>
              ${statusTag}
            </div>
          </div>
          <p class="job-meta">
            <strong>${escapeHtml(job.requesterName)}</strong> · ${escapeHtml(job.location)} · ${escapeHtml(job.timeline)}
          </p>
          <p>${escapeHtml(job.description)}</p>
          ${skillTags}
          <div class="job-actions">
            <small>Budget: ${escapeHtml(job.budget)} · ${job.applicationCount} application(s)</small>
            <button class="button apply-button" ${applyDisabled}>Apply</button>
          </div>
          <small>Posted ${escapeHtml(formatDate(job.createdAt))}</small>
        </article>
      `;
    })
    .join("");
}

async function loadJobs() {
  const token = ++listRequestToken;
  const q = elements.searchInput.value.trim();
  const status = elements.statusFilter.value.trim();
  const filteredParams = new URLSearchParams();

  if (q) {
    filteredParams.set("q", q);
  }
  if (status) {
    filteredParams.set("status", status);
  }

  try {
    const [allResponse, visibleResponse] = await Promise.all([
      fetch("/api/jobs"),
      fetch(`/api/jobs?${filteredParams.toString()}`)
    ]);

    if (!allResponse.ok || !visibleResponse.ok) {
      throw new Error("Unable to load marketplace data.");
    }

    const [allPayload, visiblePayload] = await Promise.all([
      allResponse.json(),
      visibleResponse.json()
    ]);

    if (token !== listRequestToken) {
      return;
    }

    state.allJobs = allPayload.jobs || [];
    state.visibleJobs = visiblePayload.jobs || [];
    renderStats();
    renderJobs();
  } catch (error) {
    console.error(error);
    elements.jobList.innerHTML = `
      <div class="empty-state">
        <p>Could not load requirements right now.</p>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}

async function handleJobSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.jobForm);
  const payload = Object.fromEntries(formData.entries());

  setMessage(elements.jobFormMessage, "Publishing requirement...", "");

  try {
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to publish requirement.");
    }

    elements.jobForm.reset();
    setMessage(elements.jobFormMessage, "Requirement published successfully.", "success");
    await loadJobs();
  } catch (error) {
    setMessage(elements.jobFormMessage, error.message, "error");
  }
}

async function openApplyDialog(jobId) {
  const targetJob = state.visibleJobs.find((job) => job.id === jobId);
  if (!targetJob) {
    return;
  }

  elements.applicationForm.reset();
  elements.applicationForm.elements.jobId.value = targetJob.id;
  elements.applyTitle.textContent = `Apply: ${targetJob.title}`;
  elements.applyMeta.textContent = `${targetJob.requesterName} · ${targetJob.location} · ${targetJob.timeline}`;
  setMessage(elements.applicationMessage, "", "");

  if (typeof elements.applyDialog.showModal === "function") {
    elements.applyDialog.showModal();
  } else {
    alert("Your browser does not support dialogs. Please update and try again.");
  }
}

async function handleApplicationSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.applicationForm);
  const jobId = formData.get("jobId");
  const payload = {
    applicantName: formData.get("applicantName"),
    portfolio: formData.get("portfolio"),
    message: formData.get("message")
  };

  if (!jobId) {
    setMessage(elements.applicationMessage, "No selected requirement found.", "error");
    return;
  }

  setMessage(elements.applicationMessage, "Submitting application...", "");

  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not send application.");
    }

    setMessage(elements.applicationMessage, "Application sent successfully.", "success");
    await loadJobs();
    window.setTimeout(() => elements.applyDialog.close(), 750);
  } catch (error) {
    setMessage(elements.applicationMessage, error.message, "error");
  }
}

function wireEvents() {
  elements.jobForm.addEventListener("submit", handleJobSubmit);
  elements.applicationForm.addEventListener("submit", handleApplicationSubmit);

  elements.searchInput.addEventListener("input", () => {
    window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(loadJobs, 220);
  });
  elements.statusFilter.addEventListener("change", loadJobs);

  elements.jobList.addEventListener("click", (event) => {
    const button = event.target.closest(".apply-button");
    if (!button) {
      return;
    }
    const card = event.target.closest(".job-card");
    if (!card) {
      return;
    }
    openApplyDialog(card.dataset.jobId);
  });

  elements.closeDialog.addEventListener("click", () => {
    elements.applyDialog.close();
  });
}

wireEvents();
loadJobs();
