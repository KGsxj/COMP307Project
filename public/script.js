const API_BASE = "/api";

const state = {
  user: JSON.parse(localStorage.getItem("unislotUser") || "null"),
  mode: localStorage.getItem("unislotMode") || "student",
  currentView: "studentHomeView",
  selectedSubject: null,
  selectedDate: 2,
  selectedTutorId: null,
  selectedTutorSlots: [],
  selectedExamSlot: null,
  selectedOfficeHourSlot: null,
  selectedOrganizerExamSlots: [],
  selectedOrganizerOfficeSlots: [],
  latestConfirmation: ""
};

const mockTutors = [
  { id: "t1", name: "Jane Doe", course: "some class (comp 303, etc)", email: "Djane@mail.mcgill.ca" },
  { id: "t2", name: "Jane Doe", course: "some class (comp 303, etc)", email: "Djane@mail.mcgill.ca" },
  { id: "t3", name: "Jane Doe", course: "some class (comp 303, etc)", email: "Djane@mail.mcgill.ca" }
];

const mockSlots = ["9:00-10:00", "10:00-11:00", "", "", "", "", "", ""];
const currentYearMonthLabel = "2026/10";

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const topbarUser = document.getElementById("topbarUser");
const topbarUserName = document.getElementById("topbarUserName");
const globalMessage = document.getElementById("globalMessage");
const topActionBox = document.getElementById("topActionBox");
const newReservationList = document.getElementById("newReservationList");
const subjectDropdownToggle = document.getElementById("subjectDropdownToggle");
const dropdownChevron = document.getElementById("dropdownChevron");
const pageTopLeft = document.getElementById("pageTopLeft");
const studentReservationsBody = document.getElementById("studentReservationsBody");
const organizerReservationsBody = document.getElementById("organizerReservationsBody");
const pendingApplicationsList = document.getElementById("pendingApplicationsList");
const tutorList = document.getElementById("tutorList");
const successSummary = document.getElementById("successSummary");
const brandHomeBtn = document.getElementById("brandHomeBtn");
const successCancelBtn = document.getElementById("successCancelBtn");
const successModifyBtn = document.getElementById("successModifyBtn");

function showMessage(text) {
  if (!globalMessage) return;
  globalMessage.textContent = text;
  globalMessage.classList.remove("hidden");
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => {
    globalMessage.classList.add("hidden");
    globalMessage.textContent = "";
  }, 4000);
}

function saveUser(user) {
  state.user = user;
  localStorage.setItem("unislotUser", JSON.stringify(user));
  inferModeAndView();
  renderApp();
}

function logout() {
  localStorage.removeItem("unislotUser");
  localStorage.removeItem("unislotMode");
  state.user = null;
  state.selectedSubject = null;
  renderApp();
  showAuthView("loginView");
}

function inferModeAndView() {
  if (!state.user) return;

  if (state.user.role === "admin") {
    state.mode = "admin";
    state.currentView = "adminView";
  } else if (state.user.role === "organizer") {
    state.mode = "organizer";
    state.currentView = "organizerHomeView";
  } else {
    state.mode = "student";
    state.currentView = "studentHomeView";
  }

  localStorage.setItem("unislotMode", state.mode);
}

function getHomeViewForCurrentUser() {
  if (!state.user) return null;
  if (state.user.role === "admin") return "adminView";
  if (state.user.role === "organizer") return "organizerHomeView";
  return "studentHomeView";
}

function shouldShowNewReservations(viewId) {
  return viewId === "studentHomeView" || viewId === "organizerHomeView";
}

function renderApp() {
  const isLoggedIn = !!state.user;

  if (authSection) authSection.classList.toggle("hidden", isLoggedIn);
  if (appSection) appSection.classList.toggle("hidden", !isLoggedIn);
  if (topbarUser) topbarUser.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    if (topbarUserName) topbarUserName.textContent = "";
    toggleSubjectDropdown(false);
    return;
  }

  if (topbarUserName) topbarUserName.textContent = state.user.name;

  const organizerRequestName = document.getElementById("organizerRequestName");
  const taRequestName = document.getElementById("taRequestName");

  if (organizerRequestName) organizerRequestName.value = state.user.name;
  if (taRequestName) taRequestName.value = state.user.name;

  renderNewReservationList();
  showAppView(state.currentView);
}

function showAuthView(viewId) {
  ["loginView", "registerView", "resetView", "resetSentView"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== viewId);
  });
}

function showAppView(viewId) {
  document.querySelectorAll(".app-view").forEach((view) => {
    view.classList.toggle("hidden", view.id !== viewId);
  });

  state.currentView = viewId;

  if (pageTopLeft) {
    pageTopLeft.classList.toggle("hidden", !shouldShowNewReservations(viewId));
  }

  if (!shouldShowNewReservations(viewId)) {
    toggleSubjectDropdown(false);
  }

  if (viewId === "studentHomeView") loadStudentReservations();
  if (viewId === "organizerHomeView") loadOrganizerReservations();
  if (viewId === "adminView") loadPendingApplications();
  if (viewId === "accountView") renderAccountView();
  if (viewId === "chooseTutorView") renderTutorList();
  if (viewId === "successView" && successSummary) {
    successSummary.innerHTML = state.latestConfirmation;
  }

  renderTopActionBox();
  renderNewReservationList();
}

function renderTopActionBox() {
  if (!topActionBox) return;
  topActionBox.innerHTML = "";

  if (state.mode === "admin") {
    addActionButton("Account", () => showAppView("accountView"));
    addActionButton("Logout", logout);
    return;
  }

  if (state.mode === "student") {
    addActionButton("Account", () => showAppView("accountView"));
    addActionButton("Request to become an organizer", () => showAppView("studentOrganizerRequestView"));
    addActionButton("Already a TA?", () => showAppView("taRequestView"));
    addActionButton("Logout", logout);
    return;
  }

  if (state.mode === "organizer") {
    addActionButton("Account", () => showAppView("accountView"));
    addActionButton("Logout", logout);
  }
}

function addActionButton(label, handler) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = "clickable-text";
  btn.addEventListener("click", handler);
  topActionBox.appendChild(btn);
}

function toggleSubjectDropdown(forceOpen = null) {
  if (!newReservationList) return;

  const shouldOpen =
    forceOpen !== null ? forceOpen : newReservationList.classList.contains("hidden");

  newReservationList.classList.toggle("hidden", !shouldOpen);

  if (dropdownChevron) {
    dropdownChevron.textContent = shouldOpen ? "∧" : "∨";
  }
}

function renderNewReservationList() {
  if (!newReservationList) return;
  newReservationList.innerHTML = "";

  let items = [];

  if (state.mode === "student") {
    items = [
      { label: "Request a tutor", view: "requestTutorStep1View" },
      { label: "Exam review", view: "examReviewStudentView" },
      { label: "Library drop-in/office hours", view: "officeHourStudentView" }
    ];
  } else if (state.mode === "organizer") {
    items = [
      { label: "Exam review", view: "examReviewOrganizerView" },
      { label: "Library drop-in/office hours", view: "officeHourOrganizerView" }
    ];
  }

  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "subject-option";

    if (state.selectedSubject === item.label) {
      btn.classList.add("selected");
    }

    btn.innerHTML = `<span>${item.label}</span>`;

    btn.addEventListener("click", () => {
      state.selectedSubject = item.label;
      renderNewReservationList();
      toggleSubjectDropdown(false);
      showAppView(item.view);
    });

    newReservationList.appendChild(btn);
  });
}

function formatDateOnly(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "08-04-2026";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatTimeRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);

  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return "11:00-12:00";
  }

  const sf = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
  const ef = `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;

  return `${sf}-${ef}`;
}

function mapSubject(title) {
  if (title === "Midterm review polling") return "Exam review";
  return title;
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.details || "Request failed");
  }

  return data;
}

function buildReservationRow(session) {
  const tr = document.createElement("tr");
  const subject = mapSubject(session.title || "Exam review");
  const course = session.course || "Comp303";
  const host = session.createdBy?.name || state.user?.name || "John Doe";
  const date = formatDateOnly(session.startTime);
  const time = formatTimeRange(session.startTime, session.endTime);
  const location = session.location || "ZoomLink";

  tr.innerHTML = `
    <td>${subject}</td>
    <td>${course}</td>
    <td>${host}</td>
    <td>${date}</td>
    <td>${time}</td>
    <td>${location}</td>
    <td><button class="table-action-btn">Cancel/Modify</button></td>
  `;

  const actionBtn = tr.querySelector(".table-action-btn");
  if (actionBtn) actionBtn.addEventListener("click", () => {});

  return tr;
}

async function loadStudentReservations() {
  if (!studentReservationsBody) return;
  studentReservationsBody.innerHTML = "";

  try {
    const sessions = await apiFetch("/sessions");

    if (!sessions.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="7">No reservations yet.</td>`;
      studentReservationsBody.appendChild(tr);
      return;
    }

    sessions.forEach((session) => {
      studentReservationsBody.appendChild(buildReservationRow(session));
    });
  } catch (error) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7">${error.message}</td>`;
    studentReservationsBody.appendChild(tr);
  }
}

async function loadOrganizerReservations() {
  if (!organizerReservationsBody) return;
  organizerReservationsBody.innerHTML = "";

  try {
    const data = await apiFetch(`/sessions/user/${state.user.id}`);
    const sessions = data.sessions || [];

    if (!sessions.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="7">No reservations yet.</td>`;
      organizerReservationsBody.appendChild(tr);
      return;
    }

    sessions.forEach((session) => {
      organizerReservationsBody.appendChild(buildReservationRow(session));
    });
  } catch (error) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7">${error.message}</td>`;
    organizerReservationsBody.appendChild(tr);
  }
}

function renderAccountView() {
  const accountName = document.getElementById("accountName");
  const accountRole = document.getElementById("accountRole");
  const accountEmail = document.getElementById("accountEmail");

  if (accountName) accountName.textContent = state.user.name;
  if (accountRole) accountRole.textContent = state.user.role;
  if (accountEmail) accountEmail.textContent = state.user.email;
}

async function loadPendingApplications() {
  if (!pendingApplicationsList) return;
  pendingApplicationsList.innerHTML = "";

  try {
    const data = await apiFetch("/users/applications/pending");
    const users = data.users || [];

    if (!users.length) {
      pendingApplicationsList.innerHTML = "<div>No pending applications.</div>";
      return;
    }

    users.forEach((user) => {
      const row = document.createElement("div");
      row.className = "admin-app-row";
      row.innerHTML = `
        <div>${user.name}</div>
        <div>${user.gpa ?? "4.0"}</div>
        <div><button class="plain-link clickable-text">Approve</button></div>
        <div><button class="plain-link clickable-text">Decline</button></div>
      `;

      const [approveBtn, declineBtn] = row.querySelectorAll("button");

      if (approveBtn) {
        approveBtn.addEventListener("click", async () => {
          try {
            await apiFetch(`/users/${user._id}/approve`, { method: "PUT" });
            loadPendingApplications();
          } catch (error) {}
        });
      }

      if (declineBtn) {
        declineBtn.addEventListener("click", () => {});
      }

      pendingApplicationsList.appendChild(row);
    });
  } catch (error) {
    pendingApplicationsList.innerHTML = `<div>${error.message}</div>`;
  }
}

function renderCalendar(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const weekdays = document.createElement("div");
  weekdays.className = "calendar-weekdays";
  ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach((day) => {
    const el = document.createElement("div");
    el.textContent = day;
    weekdays.appendChild(el);
  });

  const days = document.createElement("div");
  days.className = "calendar-days";

  const values = [
    { value: 1, currentMonth: true },
    { value: 2, currentMonth: true },
    { value: 3, currentMonth: true },
    { value: 4, currentMonth: true },
    { value: 5, currentMonth: true },
    { value: 6, currentMonth: true },
    { value: 7, currentMonth: true },
    { value: 8, currentMonth: true },
    { value: 9, currentMonth: true },
    { value: 10, currentMonth: true },
    { value: 11, currentMonth: true },
    { value: 12, currentMonth: true },
    { value: 13, currentMonth: true },
    { value: 14, currentMonth: true },
    { value: 15, currentMonth: true },
    { value: 16, currentMonth: true },
    { value: 17, currentMonth: true },
    { value: 18, currentMonth: true },
    { value: 19, currentMonth: true },
    { value: 20, currentMonth: true },
    { value: 21, currentMonth: true },
    { value: 22, currentMonth: true },
    { value: 23, currentMonth: true },
    { value: 24, currentMonth: true },
    { value: 25, currentMonth: true },
    { value: 26, currentMonth: true },
    { value: 27, currentMonth: true },
    { value: 28, currentMonth: true },
    { value: 29, currentMonth: true },
    { value: 30, currentMonth: true },
    { value: 1, currentMonth: false },
    { value: 2, currentMonth: false },
    { value: 3, currentMonth: false },
    { value: 4, currentMonth: false }
  ];

  values.forEach((entry) => {
    const day = document.createElement("div");
    day.className = "calendar-day";
    day.textContent = entry.value;

    if (!entry.currentMonth) {
      day.classList.add("disabled");
    }

    if (entry.currentMonth && entry.value === state.selectedDate) {
      day.classList.add("selected");
    }

    if (entry.currentMonth) {
      day.addEventListener("click", () => {
        state.selectedDate = entry.value;

        [
          "requestTutorCalendar",
          "examReviewStudentCalendar",
          "officeHourStudentCalendar",
          "examReviewOrganizerCalendar",
          "officeHourOrganizerCalendar"
        ].forEach((id) => {
          if (document.getElementById(id)) {
            renderCalendar(id);
          }
        });
      });
    }

    days.appendChild(day);
  });

  container.appendChild(weekdays);
  container.appendChild(days);
}

function renderSlotGrid(containerId, selectedValue, multi = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  mockSlots.forEach((slot) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-btn";
    btn.textContent = slot || "";

    const isSelected = multi
      ? slot && selectedValue.includes(slot)
      : slot && selectedValue === slot;

    if (isSelected) {
      btn.classList.add("selected");
    }

    btn.addEventListener("click", () => {
      if (!slot) return;

      if (multi) {
        const list = selectedValue;
        const index = list.indexOf(slot);

        if (index >= 0) {
          list.splice(index, 1);
        } else {
          if (containerId === "requestTutorSlots" && list.length >= 3) {
            return;
          }
          list.push(slot);
        }
      } else {
        if (containerId === "examReviewStudentSlots") {
          state.selectedExamSlot = slot;
        }
        if (containerId === "officeHourStudentSlots") {
          state.selectedOfficeHourSlot = slot;
        }
      }

      rerenderSlots();
    });

    container.appendChild(btn);
  });
}

function rerenderSlots() {
  renderSlotGrid("requestTutorSlots", state.selectedTutorSlots, true);
  renderSlotGrid("examReviewStudentSlots", state.selectedExamSlot, false);
  renderSlotGrid("officeHourStudentSlots", state.selectedOfficeHourSlot, false);
  renderSlotGrid("examReviewOrganizerSlots", state.selectedOrganizerExamSlots, true);
  renderSlotGrid("officeHourOrganizerSlots", state.selectedOrganizerOfficeSlots, true);
}

function renderTutorList() {
  if (!tutorList) return;
  tutorList.innerHTML = "";

  mockTutors.forEach((tutor) => {
    const card = document.createElement("div");
    card.className = `tutor-card ${state.selectedTutorId === tutor.id ? "selected" : ""}`;
    card.innerHTML = `
      <div class="tutor-photo">Photo here(default if not no photo)</div>
      <div class="tutor-meta">| name: ${tutor.name}</div>
      <div class="tutor-meta">| responsible class: ${tutor.course}</div>
      <div class="tutor-meta">| email: ${tutor.email}</div>
    `;

    card.addEventListener("click", () => {
      state.selectedTutorId = tutor.id;
      renderTutorList();
    });

    tutorList.appendChild(card);
  });
}

function buildSuccessHtml(title, extraLines = []) {
  return [
    `<div>Name: ${state.user.name}</div>`,
    `<div>Subject: ${title}</div>`,
    ...extraLines
  ].join("");
}

async function createStudentReservation({ title, course, location, slot }) {
  const date = String(state.selectedDate).padStart(2, "0");
  const startHour = slot.startsWith("9:00") ? "09" : "10";
  const endHour = slot.startsWith("9:00") ? "10" : "11";

  await apiFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({
      title,
      course,
      startTime: new Date(`2026-10-${date}T${startHour}:00:00`).toISOString(),
      endTime: new Date(`2026-10-${date}T${endHour}:00:00`).toISOString(),
      location,
      createdBy: state.user.id
    })
  });
}

document.querySelectorAll("[data-auth-target]").forEach((btn) => {
  btn.addEventListener("click", () => showAuthView(`${btn.dataset.authTarget}View`));
});

if (brandHomeBtn) {
  brandHomeBtn.addEventListener("click", () => {
    if (!state.user) {
      showAuthView("loginView");
      return;
    }

    state.currentView = getHomeViewForCurrentUser();
    showAppView(state.currentView);
    toggleSubjectDropdown(false);
  });
}

if (subjectDropdownToggle) {
  subjectDropdownToggle.addEventListener("click", () => {
    toggleSubjectDropdown();
  });
}

document.addEventListener("click", (event) => {
  if (!subjectDropdownToggle || !newReservationList) return;

  const clickedInsideDropdown =
    subjectDropdownToggle.contains(event.target) ||
    newReservationList.contains(event.target);

  if (!clickedInsideDropdown) {
    toggleSubjectDropdown(false);
  }
});

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const data = await apiFetch("/users/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("loginEmail").value.trim(),
          password: document.getElementById("loginPassword").value
        })
      });

      saveUser(data.user);
    } catch (error) {}
  });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await apiFetch("/users/register", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("registerName").value.trim(),
          email: document.getElementById("registerEmail").value.trim(),
          password: document.getElementById("registerPassword").value
        })
      });

      showAuthView("loginView");
    } catch (error) {}
  });
}

const resetForm = document.getElementById("resetForm");
if (resetForm) {
  resetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showAuthView("resetSentView");
  });
}

const organizerRequestForm = document.getElementById("organizerRequestForm");
if (organizerRequestForm) {
  organizerRequestForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const result = await apiFetch(`/users/${state.user.id}/apply`, {
        method: "PUT",
        body: JSON.stringify({
          gpa: document.getElementById("organizerRequestGpa").value
        })
      });

      state.user.applicationStatus = result.status;
      localStorage.setItem("unislotUser", JSON.stringify(state.user));
      showAppView("studentHomeView");
    } catch (error) {}
  });
}

const taRequestForm = document.getElementById("taRequestForm");
if (taRequestForm) {
  taRequestForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });
}

const toTutorSelectionBtn = document.getElementById("toTutorSelectionBtn");
if (toTutorSelectionBtn) {
  toTutorSelectionBtn.addEventListener("click", () => {
    if (!state.selectedTutorSlots.length) return;
    showAppView("chooseTutorView");
  });
}

const toTutorMessageBtn = document.getElementById("toTutorMessageBtn");
if (toTutorMessageBtn) {
  toTutorMessageBtn.addEventListener("click", () => {
    if (!state.selectedTutorId) return;
    showAppView("tutorMessageView");
  });
}

const submitTutorRequestBtn = document.getElementById("submitTutorRequestBtn");
if (submitTutorRequestBtn) {
  submitTutorRequestBtn.addEventListener("click", async () => {
    const message = document.getElementById("tutorMessage").value.trim();

    if (!state.selectedTutorSlots.length) return;

    try {
      await createStudentReservation({
        title: "Request a tutor",
        course: "COMP303",
        location: "ZoomLink",
        slot: state.selectedTutorSlots[0]
      });
    } catch (error) {}

    state.latestConfirmation = buildSuccessHtml("Request a tutor", [
      `<div>Selected time slot(s): ${state.selectedTutorSlots.join(". ")}.</div>`,
      `<div>Message: ${message}</div>`
    ]);

    showAppView("successView");
  });
}

const submitExamReviewStudentBtn = document.getElementById("submitExamReviewStudentBtn");
if (submitExamReviewStudentBtn) {
  submitExamReviewStudentBtn.addEventListener("click", async () => {
    if (!state.selectedExamSlot) return;

    try {
      await createStudentReservation({
        title: "Exam review",
        course: "COMP303",
        location: "ZoomLink",
        slot: state.selectedExamSlot
      });
    } catch (error) {}

    state.latestConfirmation = buildSuccessHtml("Exam review", [
      `<div>Selected time slot: ${currentYearMonthLabel}/${String(state.selectedDate).padStart(2, "0")}: ${state.selectedExamSlot}.</div>`
    ]);

    showAppView("successView");
  });
}

const submitOfficeHourStudentBtn = document.getElementById("submitOfficeHourStudentBtn");
if (submitOfficeHourStudentBtn) {
  submitOfficeHourStudentBtn.addEventListener("click", async () => {
    if (!state.selectedOfficeHourSlot) return;

    try {
      await createStudentReservation({
        title: "Library drop-in/ office hours",
        course: "COMP303",
        location: "RedPath361",
        slot: state.selectedOfficeHourSlot
      });
    } catch (error) {}

    state.latestConfirmation = buildSuccessHtml("Library drop-in/ office hours", [
      `<div>Selected time slot(s):</div><div>${currentYearMonthLabel}/${String(state.selectedDate).padStart(2, "0")}: ${state.selectedOfficeHourSlot} at RedPath361.</div>`
    ]);

    showAppView("successView");
  });
}

const submitExamReviewOrganizerBtn = document.getElementById("submitExamReviewOrganizerBtn");
if (submitExamReviewOrganizerBtn) {
  submitExamReviewOrganizerBtn.addEventListener("click", async () => {
    try {
      await apiFetch("/sessions", {
        method: "POST",
        body: JSON.stringify({
          title: "Exam review",
          course: "COMP303",
          startTime: new Date("2026-10-09T11:00:00").toISOString(),
          endTime: new Date("2026-10-09T12:00:00").toISOString(),
          location: "ZoomLink",
          createdBy: state.user.id
        })
      });

      state.latestConfirmation = buildSuccessHtml("Exam review", [
        `<div>Selected time slot(s):</div><div>2026/10/09: 11:00 -12:00.</div>`
      ]);

      showAppView("successView");
    } catch (error) {}
  });
}

const submitOfficeHourOrganizerBtn = document.getElementById("submitOfficeHourOrganizerBtn");
if (submitOfficeHourOrganizerBtn) {
  submitOfficeHourOrganizerBtn.addEventListener("click", async () => {
    try {
      await apiFetch("/sessions", {
        method: "POST",
        body: JSON.stringify({
          title: "Library drop-in/ office hours",
          course: "COMP421",
          startTime: new Date("2026-10-09T11:00:00").toISOString(),
          endTime: new Date("2026-10-09T12:00:00").toISOString(),
          location: "RedPath361",
          createdBy: state.user.id
        })
      });

      state.latestConfirmation = buildSuccessHtml("Library drop-in/ office hours", [
        `<div>Selected time slot(s):</div><div>2026/10/09: 11:00 -12:00 at RedPath361.</div>`
      ]);

      showAppView("successView");
    } catch (error) {}
  });
}

if (successCancelBtn) {
  successCancelBtn.addEventListener("click", () => {});
}

if (successModifyBtn) {
  successModifyBtn.addEventListener("click", () => {});
}

[
  "requestTutorCalendar",
  "examReviewStudentCalendar",
  "officeHourStudentCalendar",
  "examReviewOrganizerCalendar",
  "officeHourOrganizerCalendar"
].forEach((id) => {
  if (document.getElementById(id)) {
    renderCalendar(id);
  }
});

rerenderSlots();

if (state.user) {
  inferModeAndView();
  renderApp();
} else {
  renderApp();
  showAuthView("loginView");
}