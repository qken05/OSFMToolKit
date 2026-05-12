const params = new URLSearchParams(window.location.search);
const caseType = params.get("type") || "vehicle";
const VEHICLE_POST_LINK = "https://sfm-forum.gta.world/posting.php?mode=post&f=210";
const STRUCTURE_POST_LINK = "https://sfm-forum.gta.world/posting.php?mode=post&f=44";

const DRAFT_KEY = `sfm_case_builder_${caseType}_draft`;

const staticFieldIds = [
  "caseNumber",
  "caseName",
  "fireDateTime",
  "fireLocation",
  "assignedInvestigator",
  "leadInvestigator",
  "otherInvestigators",
  "criminalProceedings",
  "aptInvolved",
  "collabLink",
  "narrative",
  "conclusion"
];

const exhibitList = document.getElementById("exhibitList");
const personList = document.getElementById("personList");

const questionnaireOutput = document.getElementById("questionnaireOutput");
const casefileOutput = document.getElementById("casefileOutput");
const copyStatus = document.getElementById("copyStatus");

const btnAddExhibit = document.getElementById("btnAddExhibit");
const btnAddPerson = document.getElementById("btnAddPerson");
const btnClearCase = document.getElementById("btnClearCase");
const btnCopyQuestionnaire = document.getElementById("btnCopyQuestionnaire");
const btnCopyCaseFile = document.getElementById("btnCopyCaseFile");
const btnGenerateQuestionnaire = document.getElementById("btnGenerateQuestionnaire");
const btnGenerateCaseFile = document.getElementById("btnGenerateCaseFile");

const caseTypeLabel = document.getElementById("caseTypeLabel");
const caseBuilderTitle = document.getElementById("caseBuilderTitle");
const caseBuilderSubtitle = document.getElementById("caseBuilderSubtitle");
const assignedInvestigatorField = document.getElementById("assignedInvestigatorField");
const postCasefileBtn = document.getElementById("postCasefileBtn");

/* -----------------------------
   CASE TYPE LABELS
----------------------------- */

if (caseType === "structure") {
  if (caseTypeLabel) caseTypeLabel.textContent = "Fire Investigation Logs";
  if (caseBuilderTitle) caseBuilderTitle.textContent = "Fire Investigation Log";
  if (caseBuilderSubtitle) {
    caseBuilderSubtitle.textContent =
      "Complete the fire investigation log questionnaire first, then build the full case file sections below.";
  }

  if (assignedInvestigatorField) {
    assignedInvestigatorField.style.display = "flex";
  }

  if (postCasefileBtn) {
    postCasefileBtn.href = STRUCTURE_POST_LINK;
    postCasefileBtn.textContent = "Post Fire Investigation Casefile →";
  }
} else {
  if (caseTypeLabel) caseTypeLabel.textContent = "Vehicle Fire Format";
  if (caseBuilderTitle) caseBuilderTitle.textContent = "Vehicle Fire Investigation File";
  if (caseBuilderSubtitle) {
    caseBuilderSubtitle.textContent =
      "Complete the questionnaire first, copy it, then continue down the page to build the full case file.";
  }

  if (assignedInvestigatorField) {
    assignedInvestigatorField.style.display = "none";
  }

  if (postCasefileBtn) {
    postCasefileBtn.href = VEHICLE_POST_LINK;
    postCasefileBtn.textContent = "Post Vehicle Fire Casefile →";
  }
}

/* -----------------------------
   HELPERS
----------------------------- */

function valueOf(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function fallback(value, defaultValue) {
  return value && value.length > 0 ? value : defaultValue;
}

function spacer() {
  return "[color=white][spacer][/color]";
}

function isUrl(text) {
  return /^https?:\/\//i.test(text.trim());
}

function looksLikeImageUrl(text) {
  return /\.(png|jpg|jpeg|gif|webp|bmp)(\?.*)?$/i.test(text.trim());
}

function splitLines(text) {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

function createElementFromHTML(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html.trim();
  return wrapper.firstElementChild;
}

/* -----------------------------
   EXHIBIT BUILDER
----------------------------- */

function legacyContentToItems(type, content) {
  const lines = splitLines(content || "");

  if (type === "images") {
    return lines.map(url => ({ url }));
  }

  if (type === "urls") {
    return lines.map(line => {
      const parts = line.split("|").map(part => part.trim()).filter(Boolean);

      if (parts.length >= 2) {
        const first = parts[0];
        const second = parts.slice(1).join(" | ");

        if (isUrl(first)) {
          return {
            label: second,
            url: first
          };
        }

        return {
          label: first,
          url: second
        };
      }

      return {
        label: "",
        url: line
      };
    });
  }

  return [];
}

function normaliseExhibitData(data = {}) {
  const type = data.type || "images";

  return {
    title: data.title || "",
    type,
    content: data.content || "",
    items: Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : legacyContentToItems(type, data.content || "")
  };
}

function createEvidenceItemRow(type, item = {}) {
  if (type === "images") {
    const row = createElementFromHTML(`
      <div class="evidence-item-row image-item">
        <span class="evidence-item-number">1</span>

        <input
          class="evidence-image-url"
          type="url"
          placeholder="https://example.com/scene-picture.png"
        />

        <button class="icon-remove-btn remove-evidence-item" type="button">×</button>
      </div>
    `);

    row.querySelector(".evidence-image-url").value = item.url || "";
    return row;
  }

  if (type === "urls") {
    const row = createElementFromHTML(`
      <div class="evidence-item-row url-item">
        <span class="evidence-item-number">1</span>

        <input
          class="evidence-link-label"
          type="text"
          placeholder="Name of evidence"
        />

        <input
          class="evidence-link-url"
          type="url"
          placeholder="LINK HERE"
        />

        <button class="icon-remove-btn remove-evidence-item" type="button">×</button>
      </div>
    `);

    row.querySelector(".evidence-link-label").value = item.label || "";
    row.querySelector(".evidence-link-url").value = item.url || "";

    return row;
  }

  return null;
}

function refreshEvidenceNumbers(card) {
  const numbers = card.querySelectorAll(".evidence-item-number");

  numbers.forEach((number, index) => {
    number.textContent = index + 1;
  });
}

function addEvidenceItem(card, type, item = {}) {
  const list = card.querySelector(".evidence-items");
  const row = createEvidenceItemRow(type, item);

  if (!row) return;

  row.querySelector(".remove-evidence-item").addEventListener("click", () => {
    row.remove();
    refreshEvidenceNumbers(card);
    renderAll();
    saveDraft();
  });

  row.addEventListener("input", () => {
    renderAll();
    saveDraft();
  });

  list.appendChild(row);
  refreshEvidenceNumbers(card);
}

function renderEvidenceFields(card, exhibitData = {}) {
  const type = card.querySelector(".exhibit-type").value;
  const builder = card.querySelector(".evidence-builder-fields");

  if (type === "images") {
    builder.innerHTML = `
      <div class="evidence-list-head">
        <p>Add each image as its own URL. The generator wraps each one in [img] tags.</p>
        <button class="btn add-mini-btn add-evidence-item" type="button">+ Add Image</button>
      </div>

      <div class="evidence-items"></div>
    `;

    const addBtn = builder.querySelector(".add-evidence-item");

    addBtn.addEventListener("click", () => {
      addEvidenceItem(card, "images");
      renderAll();
      saveDraft();
    });

    const items = exhibitData.items && exhibitData.items.length > 0
      ? exhibitData.items
      : [{}];

    items.forEach(item => addEvidenceItem(card, "images", item));
    return;
  }

  if (type === "urls") {
    builder.innerHTML = `
      <div class="evidence-list-head">
        <p>Add each link separately with a label and URL.</p>
        <button class="btn add-mini-btn add-evidence-item" type="button">+ Add Link</button>
      </div>

      <div class="evidence-items"></div>
    `;

    const addBtn = builder.querySelector(".add-evidence-item");

    addBtn.addEventListener("click", () => {
      addEvidenceItem(card, "urls");
      renderAll();
      saveDraft();
    });

    const items = exhibitData.items && exhibitData.items.length > 0
      ? exhibitData.items
      : [{}];

    items.forEach(item => addEvidenceItem(card, "urls", item));
    return;
  }

  builder.innerHTML = `
    <div class="field">
      <label>Evidence Content</label>
      <textarea
        class="exhibit-content"
        placeholder="This is just a normal textbox, you can type the BBcode yourself if you want."
      ></textarea>
      <p class="hint">
        Use this for full quote blocks, K9 deployment reports, or BBCode you want to keep as-is.
      </p>
    </div>
  `;

  const contentBox = builder.querySelector(".exhibit-content");
  contentBox.value = exhibitData.content || "";

  contentBox.addEventListener("input", () => {
    renderAll();
    saveDraft();
  });
}

function addExhibit(data = {}) {
  if (!exhibitList) return;

  const exhibitData = normaliseExhibitData(data);

  const card = createElementFromHTML(`
    <article class="dynamic-card exhibit-card">
      <div class="dynamic-card-header">
        <h3>Exhibit</h3>
        <button class="btn remove-btn" type="button">Remove Exhibit</button>
      </div>

      <div class="case-row2">
        <div class="field">
          <label>Exhibit Title</label>
          <input class="exhibit-title" type="text" placeholder="Exhibit Title" />
        </div>

        <div class="field">
          <label>Evidence Type</label>
          <select class="exhibit-type">
            <option value="images">Picture Evidence</option>
            <option value="urls">Hyperlink Evidence</option>
            <option value="mixed">Any Evidence</option>
          </select>
        </div>
      </div>

      <div class="evidence-builder-fields"></div>
    </article>
  `);

  card.querySelector(".exhibit-title").value = exhibitData.title || "";
  card.querySelector(".exhibit-type").value = exhibitData.type || "images";

  card.querySelector(".remove-btn").addEventListener("click", () => {
    card.remove();
    renderAll();
    saveDraft();
  });

  card.querySelector(".exhibit-title").addEventListener("input", () => {
    renderAll();
    saveDraft();
  });

  card.querySelector(".exhibit-type").addEventListener("change", () => {
    renderEvidenceFields(card, {
      type: card.querySelector(".exhibit-type").value,
      items: [],
      content: ""
    });

    renderAll();
    saveDraft();
  });

  exhibitList.appendChild(card);
  renderEvidenceFields(card, exhibitData);

  renderAll();
  saveDraft();
}

function getExhibits() {
  return [...document.querySelectorAll(".exhibit-card")].map(card => {
    const title = card.querySelector(".exhibit-title")?.value.trim() || "";
    const type = card.querySelector(".exhibit-type")?.value || "images";

    if (type === "images") {
      const items = [...card.querySelectorAll(".image-item")].map(row => ({
        url: row.querySelector(".evidence-image-url")?.value.trim() || ""
      })).filter(item => item.url);

      return {
        title,
        type,
        items,
        content: items.map(item => item.url).join("\n")
      };
    }

    if (type === "urls") {
      const items = [...card.querySelectorAll(".url-item")].map(row => ({
        label: row.querySelector(".evidence-link-label")?.value.trim() || "",
        url: row.querySelector(".evidence-link-url")?.value.trim() || ""
      })).filter(item => item.label || item.url);

      return {
        title,
        type,
        items,
        content: items.map(item => `${item.label} | ${item.url}`).join("\n")
      };
    }

    return {
      title,
      type,
      items: [],
      content: card.querySelector(".exhibit-content")?.value.trim() || ""
    };
  });
}

function formatExhibit(exhibit, index) {
  const title = fallback(exhibit.title, "Evidence");
  let body = "";

  if (exhibit.type === "images") {
    const imageItems = Array.isArray(exhibit.items)
      ? exhibit.items.filter(item => item.url)
      : [];

    body = imageItems.length > 0
      ? imageItems.map(item => `[img]${item.url}[/img]`).join("\n")
      : "TBA";
  } else if (exhibit.type === "urls") {
    const urlItems = Array.isArray(exhibit.items)
      ? exhibit.items.filter(item => item.url || item.label)
      : [];

    body = urlItems.length > 0
      ? urlItems.map(item => {
          const label = item.label || item.url || "Link";
          const url = item.url || "#";

          return `[url=${url}]${label}[/url]`;
        }).join("\n")
      : "TBA";
  } else {
    body = exhibit.content && exhibit.content.trim().length > 0
      ? exhibit.content.trim()
      : "TBA";
  }

  return `[altspoiler= Exhibit ${index} - ${title}]
${body}
[/altspoiler]
${spacer()}`;
}

function formatExhibits() {
  const exhibits = getExhibits().filter(exhibit => {
    return exhibit.title || exhibit.content || (exhibit.items && exhibit.items.length > 0);
  });

  if (exhibits.length === 0) {
    return `[altspoiler= Exhibit 1 - Evidence]
TBA
[/altspoiler]
${spacer()}`;
  }

  return exhibits
    .map((exhibit, index) => formatExhibit(exhibit, index + 1))
    .join("\n");
}

/* -----------------------------
   PERSON OF INTEREST BUILDER
----------------------------- */

function addPerson(data = {}) {
  if (!personList) return;

  const card = createElementFromHTML(`
    <article class="dynamic-card person-card">
      <div class="dynamic-card-header">
        <h3>Person</h3>
        <button class="btn remove-btn" type="button">Remove Person</button>
      </div>

      <div class="field">
        <label>Name</label>
        <input class="person-name" type="text" placeholder="Firstname Lastname" />
      </div>

      <div class="field">
        <label>MDC / Profile Link</label>
        <input class="person-link" type="url" placeholder="https://mdc.gta.world/record/Name_Here" />
      </div>

      <div class="field">
        <label>Relation</label>
        <input class="person-relation" type="text" placeholder="Perpetrator / Suspect / Witness / Victim" />
      </div>

      <div class="person-contact-area"></div>

      <button class="btn small-btn add-contact-btn" type="button">
        + Add Point of Contact
      </button>
    </article>
  `);

  card.querySelector(".person-name").value = data.name || "";
  card.querySelector(".person-link").value = data.link || "";
  card.querySelector(".person-relation").value = data.relation || "";

  const contactArea = card.querySelector(".person-contact-area");
  const addContactBtn = card.querySelector(".add-contact-btn");

  function showContactField(value = "") {
    contactArea.innerHTML = `
      <div class="field contact-field">
        <label>Point of Contact / Preferred Contact</label>

        <div class="contact-row">
          <input
            class="person-contact"
            type="text"
            placeholder="Phone number,email, or preferred contact method"
          />

          <button class="icon-remove-btn remove-contact-btn" type="button">×</button>
        </div>

        <p class="hint">
          Optional. Use this for a phone number or preferred way to contact this person.
        </p>
      </div>
    `;

    const contactInput = contactArea.querySelector(".person-contact");
    const removeContactBtn = contactArea.querySelector(".remove-contact-btn");

    contactInput.value = value || "";
    addContactBtn.style.display = "none";

    contactInput.addEventListener("input", () => {
      renderAll();
      saveDraft();
    });

    removeContactBtn.addEventListener("click", () => {
      contactArea.innerHTML = "";
      addContactBtn.style.display = "inline-flex";
      renderAll();
      saveDraft();
    });
  }

  if (data.contact) {
    showContactField(data.contact);
  }

  addContactBtn.addEventListener("click", () => {
    showContactField();
    renderAll();
    saveDraft();
  });

  card.querySelector(".remove-btn").addEventListener("click", () => {
    card.remove();
    renderAll();
    saveDraft();
  });

  card.addEventListener("input", () => {
    renderAll();
    saveDraft();
  });

  personList.appendChild(card);

  renderAll();
  saveDraft();
}

function getPersons() {
  return [...document.querySelectorAll(".person-card")].map(card => ({
    name: card.querySelector(".person-name")?.value.trim() || "",
    link: card.querySelector(".person-link")?.value.trim() || "",
    relation: card.querySelector(".person-relation")?.value.trim() || "",
    contact: card.querySelector(".person-contact")?.value.trim() || ""
  }));
}

function formatPersons() {
  const persons = getPersons().filter(person => {
    return person.name || person.link || person.relation || person.contact;
  });

  if (persons.length === 0) {
    return `TBA
${spacer()}`;
  }

  return persons.map(person => {
    const name = fallback(person.name, "Unknown");
    const relation = fallback(person.relation, "TBA");

    const displayName = person.link
      ? `[url=${person.link}]${name}[/url]`
      : name;

    const contactLine = person.contact
      ? `\nPoint of Contact: ${person.contact}`
      : "";

    return `${displayName}
Relation: ${relation}${contactLine}
${spacer()}`;
  }).join("\n");
}

/* -----------------------------
   BBCODE FORMATTING
----------------------------- */

function formatQuestionnaire() {
  const caseNumber = fallback(valueOf("caseNumber"), "000");
  const caseName = fallback(valueOf("caseName"), "CASENAME");
  const fireDateTime = fallback(valueOf("fireDateTime"), "DD/MMM/YYYY; HH:MM");
  const fireLocation = fallback(valueOf("fireLocation"), "Property, Street, District, City");
  const assignedInvestigator = fallback(valueOf("assignedInvestigator"), "");
  const leadInvestigator = fallback(valueOf("leadInvestigator"), "");
  const otherInvestigators = fallback(valueOf("otherInvestigators"), "");
  const criminalProceedings = fallback(valueOf("criminalProceedings"), "Y/N");
  const aptInvolved = fallback(valueOf("aptInvolved"), "Y/N");
  const collabLink = fallback(valueOf("collabLink"), "");

  if (caseType === "structure") {
    return `[divbox=white][hr][/hr]
[divbox=#4D0000][center][b][color=#FFFFFF][size=150] CASEFILE #${caseNumber} - ${caseName}[/size][/color][/b][/center] [/divbox][hr][/hr]
[b]DATE AND TIME OF FIRE:[/b] ${fireDateTime}
[b]LOCATION OF FIRE:[/b] ${fireLocation}
[b]ASSIGNED INVESTIGATOR:[/b] ${assignedInvestigator}
[b]LEAD INVESTIGATOR:[/b] ${leadInvestigator}
[b]OTHER INVESTIGATORS:[/b] ${otherInvestigators}
[b]CRIMINAL PROCEEDINGS:[/b] ${criminalProceedings}
[b]APT INVOLVED:[/b] ${aptInvolved}
[b]LINK TO COLLABORATIVE TOPIC / DOCUMENT:[/b] ${collabLink}
[/divbox]`;
  }

  return `[divbox=white][hr][/hr]
[divbox=#4D0000][center][b][color=#FFFFFF][size=150] CASEFILE #${caseNumber} - ${caseName}[/size][/color][/b][/center] [/divbox][hr][/hr]
[b]DATE AND TIME OF FIRE:[/b] ${fireDateTime}
[b]LOCATION OF FIRE:[/b] ${fireLocation}
[b]LEAD INVESTIGATOR:[/b] ${leadInvestigator}
[b]OTHER INVESTIGATORS:[/b] ${otherInvestigators}
[b]CRIMINAL PROCEEDINGS:[/b] ${criminalProceedings}
[b]APT INVOLVED:[/b] ${aptInvolved}
[b]LINK TO COLLABORATIVE TOPIC / DOCUMENT:[/b] ${collabLink}
[/divbox]`;
}

/* -----------------------------
   RENDER / COPY / DRAFT
----------------------------- */

function renderAll() {
  if (questionnaireOutput) {
    questionnaireOutput.value = formatQuestionnaire();
  }

  if (casefileOutput) {
    casefileOutput.value = formatCaseFile();
  }
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);

    if (copyStatus) {
      copyStatus.textContent = message;
    }
  } catch (error) {
    if (copyStatus) {
      copyStatus.textContent = "Copy failed. Select the text manually and press CTRL + C.";
    }
  }

  setTimeout(() => {
    if (copyStatus) {
      copyStatus.textContent = "";
    }
  }, 2200);
}

function collectDraft() {
  const fields = {};

  staticFieldIds.forEach(id => {
    fields[id] = document.getElementById(id)?.value || "";
  });

  return {
    fields,
    exhibits: getExhibits(),
    persons: getPersons()
  };
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(collectDraft()));
  } catch (error) {
    // Ignore localStorage errors.
  }
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;

    const draft = JSON.parse(raw);

    if (draft.fields) {
      Object.entries(draft.fields).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
      });
    }

    if (exhibitList) exhibitList.innerHTML = "";
    if (personList) personList.innerHTML = "";

    if (Array.isArray(draft.exhibits) && draft.exhibits.length > 0) {
      draft.exhibits.forEach(addExhibit);
    }

    if (Array.isArray(draft.persons) && draft.persons.length > 0) {
      draft.persons.forEach(addPerson);
    }

    return true;
  } catch (error) {
    return false;
  }
}

function clearCase() {
  staticFieldIds.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

  });

  if (exhibitList) exhibitList.innerHTML = "";
  if (personList) personList.innerHTML = "";

  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    // Ignore localStorage errors.
  }

  renderAll();
}

/* -----------------------------
   EVENTS
----------------------------- */

staticFieldIds.forEach(id => {
  const input = document.getElementById(id);

  if (input) {
    input.addEventListener("input", () => {
      renderAll();
      saveDraft();
    });

    input.addEventListener("change", () => {
      renderAll();
      saveDraft();
    });
  }
});

if (btnAddExhibit) {
  btnAddExhibit.addEventListener("click", () => {
    addExhibit();
  });
}

if (btnAddPerson) {
  btnAddPerson.addEventListener("click", () => {
    addPerson();
  });
}

if (btnClearCase) {
  btnClearCase.addEventListener("click", () => {
    clearCase();
  });
}

if (btnCopyQuestionnaire) {
  btnCopyQuestionnaire.addEventListener("click", () => {
    copyText(questionnaireOutput.value, "Questionnaire BBCode copied.");
  });
}

if (btnCopyCaseFile) {
  btnCopyCaseFile.addEventListener("click", () => {
    copyText(casefileOutput.value, "Case File BBCode copied.");
  });
}

if (btnGenerateQuestionnaire) {
  btnGenerateQuestionnaire.addEventListener("click", () => {
    renderAll();

    if (questionnaireOutput) {
      questionnaireOutput.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    if (copyStatus) {
      copyStatus.textContent = "Questionnaire preview refreshed.";

      setTimeout(() => {
        copyStatus.textContent = "";
      }, 1800);
    }
  });
}

if (btnGenerateCaseFile) {
  btnGenerateCaseFile.addEventListener("click", () => {
    renderAll();

    if (casefileOutput) {
      casefileOutput.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    if (copyStatus) {
      copyStatus.textContent = "Case file BBCode generated.";

      setTimeout(() => {
        copyStatus.textContent = "";
      }, 1800);
    }
  });
}

renderAll();

/* -----------------------------
   GUIDELINES POPUP
----------------------------- */

/* -----------------------------
   GUIDELINES POPUP
----------------------------- */

const guidelinesModal = document.getElementById("guidelinesModal");
const closeGuidelinesBtn = document.getElementById("closeGuidelinesBtn");
const guidelinesTimerText = document.getElementById("guidelinesTimerText");

const GUIDELINES_KEY = `sfm_guidelines_seen_${caseType}`;

let guidelinesSecondsLeft = 5;

function openGuidelinesModal() {
  if (!guidelinesModal) return;

  guidelinesModal.classList.add("is-open");
  guidelinesModal.setAttribute("aria-hidden", "false");
}

function closeGuidelinesModal() {
  if (!guidelinesModal) return;

  guidelinesModal.classList.remove("is-open");
  guidelinesModal.setAttribute("aria-hidden", "true");

  sessionStorage.setItem(GUIDELINES_KEY, "true");
}

function startGuidelinesTimer() {
  if (!guidelinesModal || !closeGuidelinesBtn || !guidelinesTimerText) return;

  const alreadySeen = sessionStorage.getItem(GUIDELINES_KEY) === "true";

  if (alreadySeen) {
    guidelinesModal.classList.remove("is-open");
    guidelinesModal.setAttribute("aria-hidden", "true");
    return;
  }

  openGuidelinesModal();

  closeGuidelinesBtn.disabled = true;
  closeGuidelinesBtn.textContent = `Continue in ${guidelinesSecondsLeft}`;
  guidelinesTimerText.textContent =
    `Please read the guidelines. You can continue in ${guidelinesSecondsLeft} seconds.`;

  const timer = setInterval(() => {
    guidelinesSecondsLeft -= 1;

    if (guidelinesSecondsLeft > 0) {
      closeGuidelinesBtn.textContent = `Continue in ${guidelinesSecondsLeft}`;
      guidelinesTimerText.textContent =
        `Please read the guidelines. You can continue in ${guidelinesSecondsLeft} seconds.`;
    } else {
      clearInterval(timer);

      closeGuidelinesBtn.disabled = false;
      closeGuidelinesBtn.textContent = "I Understand, Continue";
      guidelinesTimerText.textContent =
        "You can now continue to the case builder.";
    }
  }, 1000);
}

if (closeGuidelinesBtn) {
  closeGuidelinesBtn.addEventListener("click", () => {
    if (!closeGuidelinesBtn.disabled) {
      closeGuidelinesModal();
    }
  });
}

startGuidelinesTimer();