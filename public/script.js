const API_BASE = "/api";
const DEFAULT_COURSE = "COMP307";
const currentYearMonthLabel = "2026/10";

const state = {
  user: JSON.parse(localStorage.getItem("unislotUser") || "null"),
  mode: localStorage.getItem("unislotMode") || "student",
  currentView: localStorage.getItem("unislotCurrentView") || "studentHomeView",
  selectedSubject: null,
  selectedDate: 2,
  selectedTutorId: null,
  selectedTutorSlots: [],
  selectedExamSlot: null,
  selectedOfficeHourSlot: null,
  selectedOrganizerExamSlots: [],
  selectedOrganizerOfficeSlots: [],
  latestConfirmation: "",
  availableSessions: [],
  availableTutors: [],
  lastReservation: null,
  modifySessionId: null
};

const baseSlots = [
  "9:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "12:00-13:00",
  "13:00-14:00",
  "14:00-15:00",
  "15:00-16:00",
  "16:00-17:00"
];

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

const modifyModal = document.getElementById("modifyModal");
const modifyLocationInput = document.getElementById("modifyLocationInput");
const closeModifyModalBtn = document.getElementById("closeModifyModalBtn");
const saveModifyModalBtn = document.getElementById("saveModifyModalBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");

function showMessage(text) {
  if (!globalMessage) return;
  globalMessage.textContent = text;
  globalMessage.classList.remove("hidden");
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => {
    globalMessage.classList.add("hidden");
    globalMessage.textContent = "";
  }, 3500);
}

function normalizeCourse(course) {
  return (course || "").trim().replace(/\s+/g, "").toUpperCase();
}

function capitalizeRole(role) {
  if (!role) return "";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function saveUser(user) {
  state.user = user;
  localStorage.setItem("unislotUser", JSON.stringify(user));
  inferModeAndView();
  renderApp();
}

function persistCurrentView(viewId) {
  localStorage.setItem("unislotCurrentView", viewId);
}

function logout() {
  localStorage.removeItem("unislotUser");
  localStorage.removeItem("unislotMode");
  localStorage.removeItem("unislotCurrentView");

  state.user = null;
  state.selectedSubject = null;
  state.availableSessions = [];
  state.availableTutors = [];
  state.lastReservation = null;
  state.modifySessionId = null;

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
    if (
      ![
        "organizerHomeView",
        "accountView",
        "examReviewOrganizerView",
        "officeHourOrganizerView",
        "successView"
      ].includes(state.currentView)
    ) {
      state.currentView = "organizerHomeView";
    }
  } else {
    state.mode = "student";
    if (
      ![
        "studentHomeView",
        "accountView",
        "studentOrganizerRequestView",
        "taRequestView",
        "requestTutorStep1View",
        "chooseTutorView",
        "tutorMessageView",
        "examReviewStudentView",
        "officeHourStudentView",
        "successView"
      ].includes(state.currentView)
    ) {
      state.currentView = "studentHomeView";
    }
  }

  localStorage.setItem("unislotMode", state.mode);
  persistCurrentView(state.currentView);
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
    closeModifyModal();
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
  persistCurrentView(viewId);

  if (pageTopLeft) pageTopLeft.classList.toggle("hidden", !shouldShowNewReservations(viewId));
  if (!shouldShowNewReservations(viewId)) toggleSubjectDropdown(false);

  if (viewId === "studentHomeView") loadStudentReservations();
  if (viewId === "organizerHomeView") loadOrganizerReservations();
  if (viewId === "adminView") loadPendingApplications();
  if (viewId === "accountView") renderAccountView();
  if (viewId === "chooseTutorView") renderTutorList();
  if (viewId === "requestTutorStep1View") prepareTutorRequestView();
  if (viewId === "examReviewStudentView" || viewId === "officeHourStudentView") refreshAvailableSessions();
  if (viewId === "successView" && successSummary) successSummary.innerHTML = state.latestConfirmation;

  renderTopActionBox();
  renderNewReservationList();
  syncSuccessButtons();
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
  if (dropdownChevron) dropdownChevron.textContent = shouldOpen ? "∧" : "∨";
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

    if (state.selectedSubject === item.label) btn.classList.add("selected");

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

  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "11:00-12:00";

  const sf = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
  const ef = `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;

  return `${sf}-${ef}`;
}

function mapSubject(title, sessionType) {
  if (title === "Midterm review polling") return "Exam review";
  if (sessionType === "office-hour") return "Library drop-in/office hours";
  if (title === "Library drop-in/ office hours") return "Library drop-in/office hours";
  return title || "Exam review";
}

function userIsCreator(session) {
  const createdById =
    typeof session.createdBy === "object" && session.createdBy !== null
      ? session.createdBy._id || session.createdBy.id
      : session.createdBy;
  return String(createdById) === String(state.user?.id);
}

function userIsAttendee(session) {
  if (!Array.isArray(session.attendees)) return false;
  return session.attendees.some((id) => String(id) === String(state.user?.id));
}

function slotToHours(slot) {
  const [start, end] = slot.split("-");
  if (!start || !end) return null;
  const startHour = start.split(":")[0].padStart(2, "0");
  const endHour = end.split(":")[0].padStart(2, "0");
  return { startHour, endHour };
}

function sameSelectedDay(dateString) {
  const date = new Date(dateString);
  return date.getDate() === state.selectedDate;
}

function sessionMatchesSlot(session, slot) {
  return formatTimeRange(session.startTime, session.endTime) === slot;
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
    throw new Error(data.error || data.details || data.message || "Request failed");
  }

  return data;
}

function buildReservationRow(session, homeMode = "student") {
  const tr = document.createElement("tr");
  const subject = mapSubject(session.title, session.sessionType);
  const course = session.course || DEFAULT_COURSE;
  const host = session.createdBy?.name || state.user?.name || "Unknown";
  const date = formatDateOnly(session.startTime);
  const time = formatTimeRange(session.startTime, session.endTime);
  const location = session.location || "TBD";

  tr.innerHTML = `
    <td>${subject}</td>
    <td>${course}</td>
    <td>${host}</td>
    <td>${date}</td>
    <td>${time}</td>
    <td>${location}</td>
    <td></td>
  `;

  const actionCell = tr.lastElementChild;

  if (userIsCreator(session) && (state.user.role === "organizer" || state.user.role === "admin")) {
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "table-action-btn clickable-text";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", async () => {
      try {
        await apiFetch(`/sessions/${session._id}`, { method: "DELETE" });
        showMessage("Reservation cancelled.");
        if (homeMode === "organizer") {
          loadOrganizerReservations();
        } else {
          loadStudentReservations();
        }
      } catch (error) {
        showMessage(error.message);
      }
    });

    const divider = document.createTextNode(" / ");

    const modifyBtn = document.createElement("button");
    modifyBtn.className = "table-action-btn clickable-text";
    modifyBtn.textContent = "Modify";
    modifyBtn.addEventListener("click", () => openModifyModal(session));

    actionCell.appendChild(cancelBtn);
    actionCell.appendChild(divider);
    actionCell.appendChild(modifyBtn);
  } else if (userIsAttendee(session)) {
    const leaveBtn = document.createElement("button");
    leaveBtn.className = "table-action-btn clickable-text";
    leaveBtn.textContent = "Cancel";
    leaveBtn.addEventListener("click", async () => {
      try {
        await apiFetch(`/sessions/${session._id}/leave`, {
          method: "PUT",
          body: JSON.stringify({ userId: state.user.id })
        });
        showMessage("Reservation cancelled.");
        loadStudentReservations();
      } catch (error) {
        showMessage(error.message);
      }
    });

    actionCell.appendChild(leaveBtn);
  } else {
    actionCell.textContent = "-";
  }

  return tr;
}

async function loadStudentReservations() {
  if (!studentReservationsBody || !state.user) return;
  studentReservationsBody.innerHTML = "";

  try {
    const data = await apiFetch(`/sessions/user/${state.user.id}`);
    const sessions = data.sessions || [];

    if (!sessions.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="7">No reservations yet.</td>`;
      studentReservationsBody.appendChild(tr);
      return;
    }

    sessions.forEach((session) => {
      studentReservationsBody.appendChild(buildReservationRow(session, "student"));
    });
  } catch (error) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7">${error.message}</td>`;
    studentReservationsBody.appendChild(tr);
  }
}

async function loadOrganizerReservations() {
  if (!organizerReservationsBody || !state.user) return;
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
      organizerReservationsBody.appendChild(buildReservationRow(session, "organizer"));
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
  if (accountRole) accountRole.textContent = capitalizeRole(state.user.role);
  if (accountEmail) accountEmail.textContent = state.user.email;
}

async function loadPendingApplications() {
  if (!pendingApplicationsList) return;
  pendingApplicationsList.innerHTML = "";

  try {
    const pendingUsers = await apiFetch("/users/applications/pending");

    const entries = [];
    pendingUsers.forEach((user) => {
      (user.courseRoles || []).forEach((role) => {
        if (role.status === "pending") {
          entries.push({
            userId: user._id,
            name: user.name,
            course: role.course,
            gpa: role.gpa
          });
        }
      });
    });

    if (!entries.length) {
      pendingApplicationsList.innerHTML = "<div>No pending applications.</div>";
      return;
    }

    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "admin-app-row";
      row.innerHTML = `
        <div>${entry.name} (${entry.course})</div>
        <div>${entry.gpa ?? "-"}</div>
        <div><button class="plain-link clickable-text">Approve</button></div>
        <div><button class="plain-link clickable-text">Decline</button></div>
      `;

      const [approveBtn, declineBtn] = row.querySelectorAll("button");

      approveBtn.addEventListener("click", async () => {
        try {
          await apiFetch(`/users/${entry.userId}/approve/${encodeURIComponent(entry.course)}`, {
            method: "PUT"
          });
          showMessage(`Approved ${entry.name} for ${entry.course}.`);
          loadPendingApplications();
        } catch (error) {
          showMessage(error.message);
        }
      });

      declineBtn.addEventListener("click", async () => {
        try {
          await apiFetch(`/users/${entry.userId}/decline/${encodeURIComponent(entry.course)}`, {
            method: "PUT"
          });
          showMessage(`Declined ${entry.name} for ${entry.course}.`);
          loadPendingApplications();
        } catch (error) {
          showMessage(error.message);
        }
      });

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
          if (document.getElementById(id)) renderCalendar(id);
        });

        if (
          ["requestTutorStep1View", "examReviewStudentView", "officeHourStudentView"].includes(
            state.currentView
          )
        ) {
          refreshAvailableSessions();
        }
      });
    }

    days.appendChild(day);
  });

  container.appendChild(weekdays);
  container.appendChild(days);
}

function availableSlotsForType(sessionType) {
  return state.availableSessions
    .filter((session) => session.sessionType === sessionType)
    .filter((session) => sameSelectedDay(session.startTime))
    .filter((session) => !userIsCreator(session))
    .filter((session) => !userIsAttendee(session))
    .map((session) => formatTimeRange(session.startTime, session.endTime));
}

function buildSlotChoices(containerId) {
  if (containerId === "examReviewStudentSlots") {
    const available = availableSlotsForType("review");
    return [...new Set([...available, ...baseSlots])];
  }

  if (containerId === "officeHourStudentSlots") {
    const available = availableSlotsForType("office-hour");
    return [...new Set([...available, ...baseSlots])];
  }

  return [...baseSlots];
}

async function refreshAvailableSessions() {
  try {
    state.availableSessions = await apiFetch("/sessions");
  } catch (error) {
    state.availableSessions = [];
  }
  rerenderSlots();
}

function renderSlotGrid(containerId, selectedValue, multi = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const slots = buildSlotChoices(containerId);

  slots.forEach((slot) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-btn";
    btn.textContent = slot || "";

    const isSelected = multi
      ? slot && selectedValue.includes(slot)
      : slot && selectedValue === slot;

    if (isSelected) btn.classList.add("selected");

    btn.addEventListener("click", () => {
      if (!slot) return;

      if (multi) {
        const list = selectedValue;
        const index = list.indexOf(slot);

        if (index >= 0) {
          list.splice(index, 1);
        } else {
          list.push(slot);
        }
      } else {
        if (containerId === "examReviewStudentSlots") state.selectedExamSlot = slot;
        if (containerId === "officeHourStudentSlots") state.selectedOfficeHourSlot = slot;
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

async function prepareTutorRequestView() {
  state.availableTutors = [];
  state.selectedTutorId = null;
  renderTutorList();

  try {
    const tutors = await apiFetch(`/users/tutors/${encodeURIComponent(DEFAULT_COURSE)}`);
    state.availableTutors = tutors || [];
  } catch (error) {
    state.availableTutors = [];
  }

  renderTutorList();
}

function renderTutorList() {
  if (!tutorList) return;
  tutorList.innerHTML = "";

  if (!state.availableTutors.length) {
    tutorList.innerHTML = `<div>No tutors found for ${DEFAULT_COURSE}.</div>`;
    return;
  }

  state.availableTutors.forEach((tutor) => {
    const tutorId = tutor._id || tutor.id;
    const card = document.createElement("div");
    card.className = `tutor-card ${state.selectedTutorId === tutorId ? "selected" : ""}`;
    card.innerHTML = `
      <div class="tutor-photo">Tutor</div>
      <div class="tutor-meta">| name: ${tutor.name}</div>
      <div class="tutor-meta">| responsible class: ${DEFAULT_COURSE}</div>
      <div class="tutor-meta">| email: ${tutor.email}</div>
    `;

    card.addEventListener("click", () => {
      state.selectedTutorId = tutorId;
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

function syncSuccessButtons() {
  if (!successCancelBtn || !successModifyBtn) return;

  const hasReservation = !!state.lastReservation;
  successCancelBtn.disabled = !hasReservation;
  successModifyBtn.disabled = !hasReservation || state.lastReservation?.mode !== "created";
}

async function joinMatchingSession(sessionType, slot) {
  const match = state.availableSessions.find((session) => {
    return session.sessionType === sessionType &&
      sameSelectedDay(session.startTime) &&
      sessionMatchesSlot(session, slot) &&
      !userIsAttendee(session);
  });

  if (!match) {
    throw new Error(
      "No matching reservation for that timeslot. This usually means an organizer has not created a session for that date/time yet."
    );
  }

  await apiFetch(`/sessions/${match._id}/join`, {
    method: "PUT",
    body: JSON.stringify({ userId: state.user.id })
  });

  return match;
}

async function createOrganizerSession({ title, sessionType, slot, location, course }) {
  const hours = slotToHours(slot);
  if (!hours) throw new Error("Invalid time slot.");

  const date = String(state.selectedDate).padStart(2, "0");
  const startTime = new Date(`2026-10-${date}T${hours.startHour}:00:00`).toISOString();
  const endTime = new Date(`2026-10-${date}T${hours.endHour}:00:00`).toISOString();

  const normalizedCourse = normalizeCourse(course || DEFAULT_COURSE);

  const data = await apiFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({
      title,
      course: normalizedCourse,
      sessionType,
      startTime,
      endTime,
      location,
      createdBy: state.user.id
    })
  });

  return data.session;
}

function resetStudentSelections() {
  state.selectedTutorSlots = [];
  state.selectedTutorId = null;
  state.selectedExamSlot = null;
  state.selectedOfficeHourSlot = null;
  state.availableTutors = [];
  const tutorMessage = document.getElementById("tutorMessage");
  if (tutorMessage) tutorMessage.value = "";
  rerenderSlots();
}

function resetOrganizerSelections() {
  state.selectedOrganizerExamSlots = [];
  state.selectedOrganizerOfficeSlots = [];
  const examHost = document.getElementById("examOrganizerHostRoom");
  const examZoom = document.getElementById("examOrganizerZoomLink");
  const officeHost = document.getElementById("officeOrganizerHostRoom");
  const officeZoom = document.getElementById("officeOrganizerZoomLink");

  if (examHost) examHost.value = "";
  if (examZoom) examZoom.value = "";
  if (officeHost) officeHost.value = "";
  if (officeZoom) officeZoom.value = "";
  rerenderSlots();
}

async function cancelLastReservation() {
  if (!state.lastReservation || !state.user) return;

  try {
    if (state.lastReservation.mode === "joined") {
      await apiFetch(`/sessions/${state.lastReservation.sessionId}/leave`, {
        method: "PUT",
        body: JSON.stringify({ userId: state.user.id })
      });
      showMessage("Reservation cancelled.");
      state.lastReservation = null;
      syncSuccessButtons();
      showAppView("studentHomeView");
      return;
    }

    if (state.lastReservation.mode === "created") {
      await apiFetch(`/sessions/${state.lastReservation.sessionId}`, { method: "DELETE" });
      showMessage("Reservation cancelled.");
      state.lastReservation = null;
      syncSuccessButtons();
      showAppView(getHomeViewForCurrentUser());
    }
  } catch (error) {
    showMessage(error.message);
  }
}

function openModifyModal(session) {
  if (!modifyModal || !modifyLocationInput) return;
  state.modifySessionId = session._id;
  modifyLocationInput.value = session.location || "";
  modifyModal.classList.remove("hidden");
}

function openModifyLastReservation() {
  if (!state.lastReservation || state.lastReservation.mode !== "created") return;
  if (!modifyModal || !modifyLocationInput) return;
  state.modifySessionId = state.lastReservation.sessionId;
  modifyLocationInput.value = state.lastReservation.location || "";
  modifyModal.classList.remove("hidden");
}

function closeModifyModal() {
  if (!modifyModal) return;
  modifyModal.classList.add("hidden");
  state.modifySessionId = null;
}

async function saveModifyModal() {
  if (!state.modifySessionId || !modifyLocationInput) return;

  try {
    const newLocation = modifyLocationInput.value.trim();
    await apiFetch(`/sessions/${state.modifySessionId}`, {
      method: "PUT",
      body: JSON.stringify({ location: newLocation })
    });

    if (state.lastReservation && state.lastReservation.sessionId === state.modifySessionId) {
      state.lastReservation.location = newLocation;
    }

    showMessage("Reservation modified.");
    closeModifyModal();

    if (state.mode === "organizer") {
      loadOrganizerReservations();
    } else {
      loadStudentReservations();
    }
  } catch (error) {
    showMessage(error.message);
  }
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
      showMessage("Login successful.");
    } catch (error) {
      showMessage(error.message);
    }
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

      showMessage("Account created.");
      showAuthView("loginView");
    } catch (error) {
      showMessage(error.message);
    }
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
      const course = normalizeCourse(
        document.getElementById("organizerRequestClass").value || DEFAULT_COURSE
      );

      const result = await apiFetch(`/users/${state.user.id}/apply`, {
        method: "PUT",
        body: JSON.stringify({
          course,
          gpa: document.getElementById("organizerRequestGpa").value
        })
      });

      showMessage(result.message || "Application submitted.");
      showAppView("studentHomeView");
    } catch (error) {
      showMessage(error.message);
    }
  });
}

const taRequestForm = document.getElementById("taRequestForm");
if (taRequestForm) {
  taRequestForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const course = normalizeCourse(
        document.getElementById("taRequestClass").value || DEFAULT_COURSE
      );

      const result = await apiFetch(`/users/${state.user.id}/apply`, {
        method: "PUT",
        body: JSON.stringify({
          course,
          taCode: document.getElementById("taRequestCode").value.trim()
        })
      });

      if (result.message && result.message.includes("Organizer")) {
        state.user.role = "organizer";
        localStorage.setItem("unislotUser", JSON.stringify(state.user));
        inferModeAndView();
      }

      showMessage(result.message || "TA request submitted.");
      showAppView(getHomeViewForCurrentUser());
    } catch (error) {
      showMessage(error.message);
    }
  });
}

const toTutorSelectionBtn = document.getElementById("toTutorSelectionBtn");
if (toTutorSelectionBtn) {
  toTutorSelectionBtn.addEventListener("click", async () => {
    if (!state.selectedTutorSlots.length) {
      showMessage("Select at least one time slot.");
      return;
    }

    await prepareTutorRequestView();
    showAppView("chooseTutorView");
  });
}

const toTutorMessageBtn = document.getElementById("toTutorMessageBtn");
if (toTutorMessageBtn) {
  toTutorMessageBtn.addEventListener("click", () => {
    if (!state.selectedTutorId) {
      showMessage("Choose a tutor first.");
      return;
    }

    showAppView("tutorMessageView");
  });
}

const submitTutorRequestBtn = document.getElementById("submitTutorRequestBtn");
if (submitTutorRequestBtn) {
  submitTutorRequestBtn.addEventListener("click", async () => {
    const message = document.getElementById("tutorMessage").value.trim();

    if (!state.selectedTutorSlots.length || !state.selectedTutorId) {
      showMessage("Choose a tutor and at least one time slot.");
      return;
    }

    try {
      await apiFetch("/users/request-tutor", {
        method: "POST",
        body: JSON.stringify({
          studentId: state.user.id,
          tutorId: state.selectedTutorId,
          course: DEFAULT_COURSE,
          message
        })
      });

      state.latestConfirmation = buildSuccessHtml("Request a tutor", [
        `<div>Requested course: ${DEFAULT_COURSE}</div>`,
        `<div>Selected time slot(s): ${state.selectedTutorSlots.join(". ")}</div>`,
        `<div>Message: ${message || "No message provided."}</div>`
      ]);

      state.lastReservation = null;
      syncSuccessButtons();
      showAppView("successView");
      resetStudentSelections();
    } catch (error) {
      showMessage(error.message);
    }
  });
}

const submitExamReviewStudentBtn = document.getElementById("submitExamReviewStudentBtn");
if (submitExamReviewStudentBtn) {
  submitExamReviewStudentBtn.addEventListener("click", async () => {
    if (!state.selectedExamSlot) {
      showMessage("Select a time slot.");
      return;
    }

    try {
      const joinedSession = await joinMatchingSession("review", state.selectedExamSlot);

      state.lastReservation = {
        mode: "joined",
        sessionId: joinedSession._id,
        location: joinedSession.location
      };

      state.latestConfirmation = buildSuccessHtml("Exam review", [
        `<div>Selected time slot: ${currentYearMonthLabel}/${String(state.selectedDate).padStart(2, "0")}: ${state.selectedExamSlot}</div>`,
        `<div>Location/Link: ${joinedSession.location || "TBD"}</div>`
      ]);

      syncSuccessButtons();
      showAppView("successView");
      resetStudentSelections();
    } catch (error) {
      showMessage(error.message);
    }
  });
}

const submitOfficeHourStudentBtn = document.getElementById("submitOfficeHourStudentBtn");
if (submitOfficeHourStudentBtn) {
  submitOfficeHourStudentBtn.addEventListener("click", async () => {
    if (!state.selectedOfficeHourSlot) {
      showMessage("Select a time slot.");
      return;
    }

    try {
      const joinedSession = await joinMatchingSession("office-hour", state.selectedOfficeHourSlot);

      state.lastReservation = {
        mode: "joined",
        sessionId: joinedSession._id,
        location: joinedSession.location
      };

      state.latestConfirmation = buildSuccessHtml("Library drop-in/ office hours", [
        `<div>Selected time slot(s):</div>`,
        `<div>${currentYearMonthLabel}/${String(state.selectedDate).padStart(2, "0")}: ${state.selectedOfficeHourSlot} at ${joinedSession.location || "TBD"}.</div>`
      ]);

      syncSuccessButtons();
      showAppView("successView");
      resetStudentSelections();
    } catch (error) {
      showMessage(error.message);
    }
  });
}

const submitExamReviewOrganizerBtn = document.getElementById("submitExamReviewOrganizerBtn");
if (submitExamReviewOrganizerBtn) {
  submitExamReviewOrganizerBtn.addEventListener("click", async () => {
    const slot = state.selectedOrganizerExamSlots[0];
    if (!slot) {
      showMessage("Select at least one time slot.");
      return;
    }

    const hostRoom = document.getElementById("examOrganizerHostRoom").value.trim();
    const zoomLink = document.getElementById("examOrganizerZoomLink").value.trim();
    const location = hostRoom || zoomLink || "TBD";

    try {
      const created = await createOrganizerSession({
        title: "Exam review",
        sessionType: "review",
        slot,
        location,
        course: DEFAULT_COURSE
      });

      state.lastReservation = {
        mode: "created",
        sessionId: created._id,
        location: created.location
      };

      state.latestConfirmation = buildSuccessHtml("Exam review", [
        `<div>Selected time slot(s):</div>`,
        `<div>${currentYearMonthLabel}/${String(state.selectedDate).padStart(2, "0")}: ${slot}</div>`,
        `<div>Location/Link: ${created.location}</div>`
      ]);

      syncSuccessButtons();
      showAppView("successView");
      resetOrganizerSelections();
      refreshAvailableSessions();
    } catch (error) {
      showMessage(error.message);
    }
  });
}

const submitOfficeHourOrganizerBtn = document.getElementById("submitOfficeHourOrganizerBtn");
if (submitOfficeHourOrganizerBtn) {
  submitOfficeHourOrganizerBtn.addEventListener("click", async () => {
    const slot = state.selectedOrganizerOfficeSlots[0];
    if (!slot) {
      showMessage("Select at least one time slot.");
      return;
    }

    const hostRoom = document.getElementById("officeOrganizerHostRoom").value.trim();
    const zoomLink = document.getElementById("officeOrganizerZoomLink").value.trim();
    const location = hostRoom || zoomLink || "TBD";

    try {
      const created = await createOrganizerSession({
        title: "Library drop-in/ office hours",
        sessionType: "office-hour",
        slot,
        location,
        course: DEFAULT_COURSE
      });

      state.lastReservation = {
        mode: "created",
        sessionId: created._id,
        location: created.location
      };

      state.latestConfirmation = buildSuccessHtml("Library drop-in/ office hours", [
        `<div>Selected time slot(s):</div>`,
        `<div>${currentYearMonthLabel}/${String(state.selectedDate).padStart(2, "0")}: ${slot}</div>`,
        `<div>Location/Link: ${created.location}</div>`
      ]);

      syncSuccessButtons();
      showAppView("successView");
      resetOrganizerSelections();
      refreshAvailableSessions();
    } catch (error) {
      showMessage(error.message);
    }
  });
}

if (successCancelBtn) {
  successCancelBtn.addEventListener("click", async () => {
    await cancelLastReservation();
  });
}

if (successModifyBtn) {
  successModifyBtn.addEventListener("click", () => {
    openModifyLastReservation();
  });
}

if (closeModifyModalBtn) {
  closeModifyModalBtn.addEventListener("click", closeModifyModal);
}

if (saveModifyModalBtn) {
  saveModifyModalBtn.addEventListener("click", saveModifyModal);
}

if (modifyModal) {
  modifyModal.addEventListener("click", (event) => {
    if (event.target === modifyModal) closeModifyModal();
  });
}

if (changePasswordBtn) {
  changePasswordBtn.addEventListener("click", () => {
    showMessage("Change password is not available yet because the backend does not have a password-change route.");
  });
}

[
  "requestTutorCalendar",
  "examReviewStudentCalendar",
  "officeHourStudentCalendar",
  "examReviewOrganizerCalendar",
  "officeHourOrganizerCalendar"
].forEach((id) => {
  if (document.getElementById(id)) renderCalendar(id);
});

rerenderSlots();
syncSuccessButtons();

if (state.user) {
  inferModeAndView();
  renderApp();
  refreshAvailableSessions();
} else {
  renderApp();
  showAuthView("loginView");
}