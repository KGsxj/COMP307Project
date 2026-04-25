const API_BASE = "/api";
const DEFAULT_COURSE = "COMP307";

const state = {
  user: JSON.parse(localStorage.getItem("unislotUser") || "null"),
  mode: localStorage.getItem("unislotMode") || "student",
  currentView: localStorage.getItem("unislotCurrentView") || "studentHomeView",
  selectedSubject: null,
  selectedTutorId: null,
  latestConfirmation: "",
  availableSessions: [],
  availableTutors: [],
  lastReservation: null,
  modifySessionId: null,
  editingTutorRequestId: null,
  requestTutorFormData: {
    course: DEFAULT_COURSE,
    preferredDate: "",
    preferredStartTime: "",
    preferredEndTime: ""
  }
};

if (state.user && !Array.isArray(state.user.courseRoles)) {
  state.user.courseRoles = [];
}

const ORGANIZER_SURFACE_KEY = "unislotOrganizerSurface";

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
const studentTutorRequestsBody = document.getElementById("studentTutorRequestsBody");
const organizerReservationsBody = document.getElementById("organizerReservationsBody");
const organizerTutorRequestsBody = document.getElementById("organizerTutorRequestsBody");
const pendingApplicationsBody = document.getElementById("pendingApplicationsBody");
const tutorList = document.getElementById("tutorList");
const successSummary = document.getElementById("successSummary");

const examReviewStudentListBody = document.getElementById("examReviewStudentListBody");
const officeHourStudentListBody = document.getElementById("officeHourStudentListBody");

const brandHomeBtn = document.getElementById("brandHomeBtn");
const successCancelBtn = document.getElementById("successCancelBtn");
const successModifyBtn = document.getElementById("successModifyBtn");

const modifyModal = document.getElementById("modifyModal");
const modifyLocationInput = document.getElementById("modifyLocationInput");
const closeModifyModalBtn = document.getElementById("closeModifyModalBtn");
const saveModifyModalBtn = document.getElementById("saveModifyModalBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");

const examReviewOrganizerForm = document.getElementById("examReviewOrganizerForm");
const officeHourOrganizerForm = document.getElementById("officeHourOrganizerForm");
const requestTutorForm = document.getElementById("requestTutorForm");

function showMessage(text) {
  if (!globalMessage) return;
  globalMessage.textContent = text;
  globalMessage.classList.remove("hidden");
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => {
    globalMessage.classList.add("hidden");
    globalMessage.textContent = "";
  }, 4500);
}

function normalizeCourse(course) {
  return (course || "").trim().replace(/\s+/g, "").toUpperCase();
}

function capitalizeRole(role) {
  if (!role) return "";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function capitalizeStatus(status) {
  if (!status) return "-";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatGpaTwoDecimals(gpa) {
  if (gpa === undefined || gpa === null || gpa === "") return "—";
  const n = Number(gpa);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(2);
}

function formatTimestamp(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

function extractPreferredDate(message) {
  if (!message) return "-";
  const match = message.match(/Preferred date:\s*(.+)/i);
  return match ? match[1].trim() : "-";
}

function extractPreferredTime(message) {
  if (!message) return "-";
  const match = message.match(/Preferred time:\s*(.+)/i);
  return match ? match[1].trim() : "-";
}

function extractPlainStudentMessage(message) {
  if (!message) return "-";
  const match = message.match(/Message:\s*([\s\S]*)/i);
  return match ? match[1].trim() : message.trim();
}

/** Empty string if valid; otherwise an error message. Enforces YYYY-MM-DD with a real calendar date. */
function validateHtmlDateString(value) {
  if (!value || typeof value !== "string") {
    return "Please enter a valid date.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "Date must use a four-digit year (YYYY-MM-DD).";
  }
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== m - 1 ||
    parsed.getUTCDate() !== d
  ) {
    return "That calendar date is not valid.";
  }
  return "";
}

function getApprovedOrganizerCourses() {
  const roles = state.user?.courseRoles;
  if (!Array.isArray(roles)) return [];
  const list = roles
    .filter((r) => r.status === "approved")
    .map((r) => normalizeCourse(r.course))
    .filter(Boolean);
  return [...new Set(list)];
}

function populateOrganizerCourseSelects() {
  const courses = getApprovedOrganizerCourses();
  ["examOrganizerCourse", "officeOrganizerCourse"].forEach((id) => {
    const sel = document.getElementById(id);
    if (!sel || sel.tagName !== "SELECT") return;
    const previous = normalizeCourse(sel.value);
    sel.innerHTML = "";
    if (!courses.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No approved courses — complete organizer access first";
      opt.disabled = true;
      opt.selected = true;
      sel.appendChild(opt);
      sel.required = false;
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    sel.required = true;
    courses.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
    if (previous && courses.includes(previous)) {
      sel.value = previous;
    } else {
      sel.value = courses[0];
    }
  });
}

function mergeUserCourseRolesFromApi(result) {
  if (result && Array.isArray(result.courseRoles)) {
    state.user.courseRoles = result.courseRoles;
    localStorage.setItem("unislotUser", JSON.stringify(state.user));
    populateOrganizerCourseSelects();
    if (state.currentView === "accountView") renderAccountView();
  }
}

function saveUser(user) {
  if (!user.courseRoles) user.courseRoles = [];
  state.user = user;
  localStorage.setItem("unislotUser", JSON.stringify(user));
  if (user.role !== "organizer") {
    localStorage.removeItem(ORGANIZER_SURFACE_KEY);
  }
  inferModeAndView();
  renderApp();
  populateOrganizerCourseSelects();
}

function persistCurrentView(viewId) {
  localStorage.setItem("unislotCurrentView", viewId);
}

function logout() {
  localStorage.removeItem("unislotUser");
  localStorage.removeItem("unislotMode");
  localStorage.removeItem("unislotCurrentView");
  localStorage.removeItem(ORGANIZER_SURFACE_KEY);

  state.user = null;
  state.selectedSubject = null;
  state.availableSessions = [];
  state.availableTutors = [];
  state.lastReservation = null;
  state.modifySessionId = null;
  state.editingTutorRequestId = null;
  state.requestTutorFormData = {
    course: DEFAULT_COURSE,
    preferredDate: "",
    preferredStartTime: "",
    preferredEndTime: ""
  };

  renderApp();
  showAuthView("loginView");
}

function getOrganizerUiSurface() {
  return localStorage.getItem(ORGANIZER_SURFACE_KEY) || "organizer";
}

function setOrganizerUiSurface(surface) {
  localStorage.setItem(ORGANIZER_SURFACE_KEY, surface);
}

const STUDENT_APP_VIEWS = [
  "studentHomeView",
  "studentTutorRequestsView",
  "accountView",
  "studentOrganizerRequestView",
  "taRequestView",
  "requestTutorStep1View",
  "chooseTutorView",
  "tutorMessageView",
  "examReviewStudentView",
  "officeHourStudentView",
  "successView"
];

const ORGANIZER_APP_VIEWS = [
  "organizerHomeView",
  "organizerTutorRequestsView",
  "accountView",
  "examReviewOrganizerView",
  "officeHourOrganizerView",
  "successView"
];


// Decides what surface a user gets
function inferModeAndView() {
  if (!state.user) return;

  if (state.user.role === "admin") {
    state.mode = "admin";
    state.currentView = "adminView";
  } else if (state.user.role === "organizer") {
    const surface = getOrganizerUiSurface();
    state.mode = surface === "student" ? "student" : "organizer";
    const allowed = state.mode === "student" ? STUDENT_APP_VIEWS : ORGANIZER_APP_VIEWS;
    if (!allowed.includes(state.currentView)) {
      state.currentView = state.mode === "student" ? "studentHomeView" : "organizerHomeView";
    }
  } else {
    state.mode = "student";
    if (!STUDENT_APP_VIEWS.includes(state.currentView)) {
      state.currentView = "studentHomeView";
    }
  }

  localStorage.setItem("unislotMode", state.mode);
  persistCurrentView(state.currentView);
}

function getHomeViewForCurrentUser() {
  if (!state.user) return null;
  if (state.user.role === "admin") return "adminView";
  if (state.user.role === "organizer") {
    return getOrganizerUiSurface() === "student" ? "studentHomeView" : "organizerHomeView";
  }
  return "studentHomeView";
}

function canManageHostedSession() {
  if (!state.user) return false;
  if (state.user.role === "admin") return true;
  return state.user.role === "organizer" && state.mode === "organizer";
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

  if (viewId === "loginView") {
    const rn = document.getElementById("registerName");
    const re = document.getElementById("registerEmail");
    const rp = document.getElementById("registerPassword");
    if (rn) rn.value = "";
    if (re) re.value = "";
    if (rp) rp.value = "";
  }
  if (viewId === "registerView") {
    const le = document.getElementById("loginEmail");
    const lp = document.getElementById("loginPassword");
    if (le) le.value = "";
    if (lp) lp.value = "";
  }
  if (viewId === "resetView") {
    const rem = document.getElementById("resetEmail");
    const rnp = document.getElementById("resetNewPassword");
    if (rem) rem.value = "";
    if (rnp) rnp.value = "";
  }
}

function fillRequestTutorForm() {
  const course = document.getElementById("requestTutorCourse");
  const preferredDate = document.getElementById("requestTutorDate");
  const preferredStartTime = document.getElementById("requestTutorStartTime");
  const preferredEndTime = document.getElementById("requestTutorEndTime");

  if (course) course.value = state.requestTutorFormData.course || DEFAULT_COURSE;
  if (preferredDate) preferredDate.value = state.requestTutorFormData.preferredDate || "";
  if (preferredStartTime) preferredStartTime.value = state.requestTutorFormData.preferredStartTime || "";
  if (preferredEndTime) preferredEndTime.value = state.requestTutorFormData.preferredEndTime || "";
}

function resetExamOrganizerFormFields() {
  const d = document.getElementById("examOrganizerDate");
  const st = document.getElementById("examOrganizerStartTime");
  const en = document.getElementById("examOrganizerEndTime");
  const loc = document.getElementById("examOrganizerLocation");
  if (d) d.value = "";
  if (st) st.value = "";
  if (en) en.value = "";
  if (loc) loc.value = "";
  populateOrganizerCourseSelects();
}

function resetOfficeOrganizerFormFields() {
  const d = document.getElementById("officeOrganizerDate");
  const st = document.getElementById("officeOrganizerStartTime");
  const en = document.getElementById("officeOrganizerEndTime");
  const loc = document.getElementById("officeOrganizerLocation");
  if (d) d.value = "";
  if (st) st.value = "";
  if (en) en.value = "";
  if (loc) loc.value = "";
  populateOrganizerCourseSelects();
}

function resetTutorRequestFlowAfterSuccess() {
  state.requestTutorFormData = {
    course: DEFAULT_COURSE,
    preferredDate: "",
    preferredStartTime: "",
    preferredEndTime: ""
  };
  state.selectedTutorId = null;
  state.editingTutorRequestId = null;
  const c = document.getElementById("requestTutorCourse");
  const d = document.getElementById("requestTutorDate");
  const st = document.getElementById("requestTutorStartTime");
  const en = document.getElementById("requestTutorEndTime");
  const tm = document.getElementById("tutorMessage");
  if (c) c.value = DEFAULT_COURSE;
  if (d) d.value = "";
  if (st) st.value = "";
  if (en) en.value = "";
  if (tm) tm.value = "";
}

// Clear draft fields when opening a view so leaving and returning does not keep old input
function applyViewReset(viewId) {
  if (viewId === "studentOrganizerRequestView") {
    const cl = document.getElementById("organizerRequestClass");
    const gpa = document.getElementById("organizerRequestGpa");
    if (cl) cl.value = "";
    if (gpa) gpa.value = "";
  }
  if (viewId === "taRequestView") {
    const cl = document.getElementById("taRequestClass");
    const code = document.getElementById("taRequestCode");
    if (cl) cl.value = "";
    if (code) code.value = "";
  }
  if (viewId === "requestTutorStep1View") {
    if (state.editingTutorRequestId) {
      fillRequestTutorForm();
      return;
    }
    state.requestTutorFormData = {
      course: DEFAULT_COURSE,
      preferredDate: "",
      preferredStartTime: "",
      preferredEndTime: ""
    };
    state.selectedTutorId = null;
    const c = document.getElementById("requestTutorCourse");
    if (c) c.value = DEFAULT_COURSE;
    const tm = document.getElementById("tutorMessage");
    if (tm) tm.value = "";
    fillRequestTutorForm();
  }
  if (viewId === "tutorMessageView") {
    const tm = document.getElementById("tutorMessage");
    if (!tm) return;
    if (state.editingTutorRequestId && state.lastReservation?.mode === "tutor-request") {
      tm.value = state.lastReservation.studentMessage || "";
    } else {
      tm.value = "";
    }
  }
  if (viewId === "examReviewOrganizerView") {
    resetExamOrganizerFormFields();
  }
  if (viewId === "officeHourOrganizerView") {
    resetOfficeOrganizerFormFields();
  }
}

// Every time the UI should change to a different "page", function is called
function showAppView(viewId) {
  applyViewReset(viewId);

  document.querySelectorAll(".app-view").forEach((view) => {
    view.classList.toggle("hidden", view.id !== viewId);
  });

  state.currentView = viewId;
  persistCurrentView(viewId);

  if (pageTopLeft) pageTopLeft.classList.toggle("hidden", !shouldShowNewReservations(viewId));
  if (!shouldShowNewReservations(viewId)) toggleSubjectDropdown(false);

  if (viewId === "studentHomeView") loadStudentReservations();
  if (viewId === "studentTutorRequestsView") loadStudentTutorRequests();
  if (viewId === "organizerHomeView") loadOrganizerReservations();
  if (viewId === "organizerTutorRequestsView") loadOrganizerTutorRequests();
  if (viewId === "adminView") loadPendingApplications();
  if (viewId === "accountView") renderAccountView();
  if (viewId === "chooseTutorView") renderTutorList();
  if (viewId === "examReviewStudentView") loadAvailableStudentSessions("review");
  if (viewId === "officeHourStudentView") loadAvailableStudentSessions("office-hour");
  if (viewId === "examReviewOrganizerView" || viewId === "officeHourOrganizerView") {
    populateOrganizerCourseSelects();
  }
  if (viewId === "successView" && successSummary) successSummary.innerHTML = state.latestConfirmation;

  renderTopActionBox();
  renderNewReservationList();
  syncSuccessButtons();
}

// Builds the top action menu dynamically
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
    addActionButton("My tutor requests", () => showAppView("studentTutorRequestsView"));
    addActionButton("Request to become an organizer", () => showAppView("studentOrganizerRequestView"));
    addActionButton("Already a TA?", () => showAppView("taRequestView"));
    if (state.user.role === "organizer") {
      addActionButton("Organizer view", () => {
        setOrganizerUiSurface("organizer");
        inferModeAndView();
        showAppView("organizerHomeView");
      });
    }
    addActionButton("Logout", logout);
    return;
  }

  if (state.mode === "organizer") {
    addActionButton("Account", () => showAppView("accountView"));
    addActionButton("Tutor requests", () => showAppView("organizerTutorRequestsView"));
    if (state.user.role === "organizer") {
      addActionButton("Student view", () => {
        setOrganizerUiSurface("student");
        inferModeAndView();
        showAppView("studentHomeView");
      });
    }
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
      if (item.view === "requestTutorStep1View") {
        state.editingTutorRequestId = null;
        state.lastReservation = null;
        state.selectedTutorId = null;
      }
      renderNewReservationList();
      toggleSubjectDropdown(false);
      showAppView(item.view);
    });

    newReservationList.appendChild(btn);
  });
}

function formatDateOnly(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatTimeRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);

  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "Invalid time";

  const sf = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
  const ef = `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;
  return `${sf}-${ef}`;
}

function formatDateTimeForSuccess(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const rawText = await response.text();
  let data = {};

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { error: rawText || "Request failed" };
  }

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

  if (userIsCreator(session) && canManageHostedSession()) {
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "table-action-btn clickable-text table-action-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", async () => {
      try {
        await apiFetch(`/sessions/${session._id}`, { method: "DELETE" });
        showMessage("Reservation cancelled.");
        if (homeMode === "organizer") {
          await loadOrganizerReservations();
        } else {
          await loadStudentReservations();
        }
      } catch (error) {
        showMessage(error.message);
      }
    });

    const divider = document.createTextNode(" / ");

    const modifyBtn = document.createElement("button");
    modifyBtn.className = "table-action-btn clickable-text table-action-secondary";
    modifyBtn.textContent = "Modify";
    modifyBtn.addEventListener("click", () => openModifyModal(session));

    actionCell.appendChild(cancelBtn);
    actionCell.appendChild(divider);
    actionCell.appendChild(modifyBtn);
  } else if (userIsAttendee(session)) {
    const leaveBtn = document.createElement("button");
    leaveBtn.className = "table-action-btn clickable-text table-action-secondary";
    leaveBtn.textContent = "Cancel";
    leaveBtn.addEventListener("click", async () => {
      try {
        await apiFetch(`/sessions/${session._id}/leave`, {
          method: "PUT",
          body: JSON.stringify({ userId: state.user.id })
        });
        showMessage("Reservation cancelled.");
        await loadStudentReservations();
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

// Fetches sessions from /sessions/user/:id
async function loadStudentReservations() {
  if (!studentReservationsBody || !state.user) return;
  studentReservationsBody.innerHTML = "";

  try {
    const data = await apiFetch(`/sessions/user/${state.user.id}`);
    const sessions = (data.sessions || []).filter((session) => !userIsCreator(session));

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

// 
async function loadStudentTutorRequests() {
  if (!studentTutorRequestsBody || !state.user) return;
  studentTutorRequestsBody.innerHTML = "";

  try {
    const requests = await apiFetch(`/users/my-tutor-requests/${state.user.id}`);

    if (!requests.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="8">No tutor requests yet.</td>`;
      studentTutorRequestsBody.appendChild(tr);
      return;
    }

    requests.forEach((request) => {
      const tr = document.createElement("tr");
      const dateCell =
        request.preferredDate && request.preferredDate !== "—"
          ? request.preferredDate
          : extractPreferredDate(request.message);
      const timeCell =
        request.preferredTime && request.preferredTime !== "—"
          ? request.preferredTime
          : extractPreferredTime(request.message);
      const msgCell =
        request.studentMessage && request.studentMessage !== "—"
          ? request.studentMessage
          : extractPlainStudentMessage(request.message);

      tr.innerHTML = `
        <td>${request.tutorName || "-"}</td>
        <td>${request.course || "-"}</td>
        <td>${dateCell || "-"}</td>
        <td>${timeCell || "-"}</td>
        <td>${msgCell || "-"}</td>
        <td>${capitalizeStatus(request.status)}</td>
        <td>${formatTimestamp(request.createdAt)}</td>
        <td></td>
      `;

      const actionCell = tr.lastElementChild;
      if (request.status === "pending") {
        const cancelBtn = document.createElement("button");
        cancelBtn.className = "table-action-btn clickable-text table-action-secondary";
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", async () => {
          try {
            await apiFetch(`/users/my-tutor-requests/${state.user.id}/${request.requestId}`, {
              method: "DELETE"
            });
            showMessage("Tutor request cancelled.");
            await loadStudentTutorRequests();
          } catch (error) {
            showMessage(error.message);
          }
        });
        actionCell.appendChild(cancelBtn);
      } else {
        actionCell.textContent = "—";
      }

      studentTutorRequestsBody.appendChild(tr);
    });
  } catch (error) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8">${error.message}</td>`;
    studentTutorRequestsBody.appendChild(tr);
  }
}

// 
async function loadOrganizerReservations() {
  if (!organizerReservationsBody || !state.user) return;
  organizerReservationsBody.innerHTML = "";

  try {
    const data = await apiFetch(`/sessions/user/${state.user.id}`);
    const sessions = (data.sessions || []).filter((session) => userIsCreator(session));

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

async function loadOrganizerTutorRequests() {
  if (!organizerTutorRequestsBody || !state.user) return;
  organizerTutorRequestsBody.innerHTML = "";

  try {
    const requests = await apiFetch(`/users/tutor-requests/${state.user.id}`);

    if (!requests.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="10">No tutor requests yet.</td>`;
      organizerTutorRequestsBody.appendChild(tr);
      return;
    }

    requests.forEach((request) => {
      const tr = document.createElement("tr");

      const emailRaw = request.studentEmail || "";
      const emailCell =
        emailRaw === ""
          ? "-"
          : `<td title="${escapeHtml(emailRaw)}">${escapeHtml(emailRaw)}</td>`;
      const msgRaw = request.studentMessage != null ? String(request.studentMessage) : "";
      const msgCell = !msgRaw || msgRaw === "—" ? "—" : escapeHtml(msgRaw);
      const prefDate =
        request.preferredDate && request.preferredDate !== "—"
          ? escapeHtml(String(request.preferredDate))
          : "—";
      const prefTime =
        request.preferredTime && request.preferredTime !== "—"
          ? escapeHtml(String(request.preferredTime))
          : "—";
      const statusLabel = capitalizeStatus(request.status || "pending");

      tr.innerHTML = `
        <td>${escapeHtml(request.studentName || "-")}</td>
        ${emailRaw === "" ? "<td>-</td>" : emailCell}
        <td>${escapeHtml(request.course || "-")}</td>
        <td>${prefDate}</td>
        <td>${prefTime}</td>
        <td>${msgCell}</td>
        <td>${escapeHtml(formatTimestamp(request.createdAt))}</td>
        <td>${escapeHtml(statusLabel)}</td>
        <td></td>
        <td></td>
      `;

      const acceptCell = tr.children[8];
      const declineCell = tr.children[9];

      if (request.status === "pending") {
        const acceptBtn = document.createElement("button");
        acceptBtn.className = "table-action-btn clickable-text table-action-secondary";
        acceptBtn.textContent = "Accept";
        acceptBtn.addEventListener("click", async () => {
          try {
            const result = await apiFetch(
              `/users/tutor-requests/${request.studentId}/${request.requestId}`,
              {
                method: "PUT",
                body: JSON.stringify({ action: "accepted" })
              }
            );
            showMessage(result.message || "Request accepted.");
            await loadOrganizerTutorRequests();
          } catch (error) {
            showMessage(error.message);
          }
        });

        const declineBtn = document.createElement("button");
        declineBtn.className = "table-action-btn clickable-text table-action-secondary";
        declineBtn.textContent = "Decline";
        declineBtn.addEventListener("click", async () => {
          try {
            const result = await apiFetch(
              `/users/tutor-requests/${request.studentId}/${request.requestId}`,
              {
                method: "PUT",
                body: JSON.stringify({ action: "declined" })
              }
            );
            showMessage(result.message || "Request declined.");
            await loadOrganizerTutorRequests();
          } catch (error) {
            showMessage(error.message);
          }
        });

        acceptCell.appendChild(acceptBtn);
        declineCell.appendChild(declineBtn);
      } else {
        acceptCell.textContent = "—";
        declineCell.textContent = "—";
      }

      organizerTutorRequestsBody.appendChild(tr);
    });
  } catch (error) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="10">${error.message}</td>`;
    organizerTutorRequestsBody.appendChild(tr);
  }
}

function renderAccountView() {
  const accountName = document.getElementById("accountName");
  const accountRole = document.getElementById("accountRole");
  const accountEmail = document.getElementById("accountEmail");
  const coursesRow = document.getElementById("accountOrganizerCoursesRow");
  const coursesList = document.getElementById("accountOrganizerCourses");

  if (accountName) accountName.textContent = state.user.name;
  if (accountRole) accountRole.textContent = capitalizeRole(state.user.role);
  if (accountEmail) accountEmail.textContent = state.user.email;

  if (coursesRow && coursesList) {
    const approved = getApprovedOrganizerCourses();
    if (state.user.role === "organizer") {
      coursesRow.classList.remove("hidden");
      coursesList.textContent = approved.length
        ? approved.join(", ")
        : "No approved courses yet. Use “Request to become an organizer” or “Already a TA?” to gain access.";
    } else {
      coursesRow.classList.add("hidden");
      coursesList.textContent = "";
    }
  }
}

async function loadPendingApplications() {
  if (!pendingApplicationsBody) return;
  pendingApplicationsBody.innerHTML = "";

  try {
    const pendingUsers = await apiFetch("/users/applications/pending");

    const entries = [];
    pendingUsers.forEach((user) => {
      (user.courseRoles || []).forEach((role) => {
        if (role.status === "pending") {
          entries.push({
            userId: user._id,
            name: user.name,
            email: user.email || "—",
            course: role.course,
            gpa: role.gpa
          });
        }
      });
    });

    if (!entries.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6">No pending applications.</td>`;
      pendingApplicationsBody.appendChild(tr);
      return;
    }

    entries.forEach((entry) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(entry.name)}</td>
        <td>${escapeHtml(entry.email)}</td>
        <td>${escapeHtml(entry.course)}</td>
        <td>${escapeHtml(formatGpaTwoDecimals(entry.gpa))}</td>
        <td></td>
        <td></td>
      `;

      const approveBtn = document.createElement("button");
      approveBtn.className = "table-action-btn clickable-text table-action-secondary";
      approveBtn.textContent = "Approve";
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

      const declineBtn = document.createElement("button");
      declineBtn.className = "table-action-btn clickable-text table-action-secondary";
      declineBtn.textContent = "Decline";
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

      tr.children[4].appendChild(approveBtn);
      tr.children[5].appendChild(declineBtn);
      pendingApplicationsBody.appendChild(tr);
    });
  } catch (error) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6">${escapeHtml(error.message)}</td>`;
    pendingApplicationsBody.appendChild(tr);
  }
}

function renderTutorList() {
  if (!tutorList) return;
  tutorList.innerHTML = "";

  if (!state.availableTutors.length) {
    tutorList.innerHTML = `<div>No tutors found for ${state.requestTutorFormData.course || DEFAULT_COURSE}.</div>`;
    return;
  }

  state.availableTutors.forEach((tutor) => {
    const tutorId = tutor._id || tutor.id;
    const card = document.createElement("div");
    card.className = `tutor-card ${state.selectedTutorId === tutorId ? "selected" : ""}`;
    card.innerHTML = `
      <div class="tutor-photo">Tutor</div>
      <div class="tutor-meta">| Name: ${tutor.name}</div>
      <div class="tutor-meta">| Responsible Class: ${state.requestTutorFormData.course || DEFAULT_COURSE}</div>
      <div class="tutor-meta">| Email: ${tutor.email}</div>
    `;

    card.addEventListener("click", () => {
      state.selectedTutorId = tutorId;
      renderTutorList();
    });

    tutorList.appendChild(card);
  });
}

async function loadAvailableStudentSessions(sessionType) {
  const targetBody =
    sessionType === "review" ? examReviewStudentListBody : officeHourStudentListBody;

  if (!targetBody || !state.user) return;

  targetBody.innerHTML = "";

  try {
    const sessions = await apiFetch("/sessions");

    const filtered = sessions.filter((session) => {
      if (session.sessionType !== sessionType) return false;
      if (userIsCreator(session)) return false;
      if (userIsAttendee(session)) return false;
      return true;
    });

    if (!filtered.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6">No available sessions right now.</td>`;
      targetBody.appendChild(tr);
      return;
    }

    filtered.forEach((session) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${session.course || DEFAULT_COURSE}</td>
        <td>${session.createdBy?.name || "Unknown"}</td>
        <td>${formatDateOnly(session.startTime)}</td>
        <td>${formatTimeRange(session.startTime, session.endTime)}</td>
        <td>${session.location || "TBD"}</td>
        <td></td>
      `;

      const actionCell = tr.lastElementChild;
      const joinBtn = document.createElement("button");
      joinBtn.className = "table-action-btn clickable-text table-action-secondary";
      joinBtn.textContent = "Join";

      joinBtn.addEventListener("click", async () => {
        try {
          const result = await apiFetch(`/sessions/${session._id}/join`, {
            method: "PUT",
            body: JSON.stringify({ userId: state.user.id })
          });

          const joinedSession = result.session || session;

          state.lastReservation = {
            mode: "joined",
            sessionId: joinedSession._id || session._id,
            location: joinedSession.location || session.location || "TBD"
          };

          state.latestConfirmation = buildSuccessHtml(
            mapSubject(joinedSession.title || session.title, joinedSession.sessionType || session.sessionType),
            [
              `<div>Date: ${formatDateTimeForSuccess(joinedSession.startTime || session.startTime)}</div>`,
              `<div>Time: ${formatTimeRange(joinedSession.startTime || session.startTime, joinedSession.endTime || session.endTime)}</div>`,
              `<div>Location/Link: ${joinedSession.location || session.location || "TBD"}</div>`
            ]
          );

          syncSuccessButtons();
          showAppView("successView");
        } catch (error) {
          showMessage(error.message);
        }
      });

      actionCell.appendChild(joinBtn);
      targetBody.appendChild(tr);
    });
  } catch (error) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6">${error.message}</td>`;
    targetBody.appendChild(tr);
  }
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

  const lr = state.lastReservation;
  const canCancel = !!lr && (lr.mode === "created" || lr.mode === "joined" || lr.mode === "tutor-request");
  const canModify = !!lr && (lr.mode === "created" || lr.mode === "tutor-request");

  successCancelBtn.disabled = !canCancel;
  successModifyBtn.disabled = !canModify;
}

async function createOrganizerSession({ title, sessionType, course, date, startTime, endTime, location }) {
  const normalizedCourse = normalizeCourse(course || DEFAULT_COURSE);

  const dateErr = validateHtmlDateString(date);
  if (dateErr) {
    throw new Error(dateErr);
  }

  const startIso = new Date(`${date}T${startTime}:00`).toISOString();
  const endIso = new Date(`${date}T${endTime}:00`).toISOString();

  const data = await apiFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({
      title,
      course: normalizedCourse,
      sessionType,
      startTime: startIso,
      endTime: endIso,
      location,
      createdBy: state.user.id
    })
  });

  return data.session;
}

async function cancelLastReservation() {
  if (!state.lastReservation || !state.user) return;

  try {
    if (state.lastReservation.mode === "tutor-request") {
      await apiFetch(
        `/users/my-tutor-requests/${state.lastReservation.studentId}/${state.lastReservation.requestId}`,
        { method: "DELETE" }
      );
      showMessage("Tutor request cancelled.");
      state.lastReservation = null;
      state.editingTutorRequestId = null;
      syncSuccessButtons();
      showAppView(getHomeViewForCurrentUser());
      return;
    }

    if (state.lastReservation.mode === "joined") {
      await apiFetch(`/sessions/${state.lastReservation.sessionId}/leave`, {
        method: "PUT",
        body: JSON.stringify({ userId: state.user.id })
      });
      showMessage("Reservation cancelled.");
      state.lastReservation = null;
      syncSuccessButtons();
      showAppView(getHomeViewForCurrentUser());
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
  if (!state.lastReservation) return;

  if (state.lastReservation.mode === "tutor-request") {
    const lr = state.lastReservation;
    state.editingTutorRequestId = lr.requestId;
    state.requestTutorFormData = {
      course: lr.course,
      preferredDate: lr.preferredDate,
      preferredStartTime: lr.preferredStartTime,
      preferredEndTime: lr.preferredEndTime
    };
    state.selectedTutorId = lr.tutorId;
    fillRequestTutorForm();
    const tm = document.getElementById("tutorMessage");
    if (tm) tm.value = lr.studentMessage || "";
    showAppView("requestTutorStep1View");
    return;
  }

  if (state.lastReservation.mode !== "created") return;
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

    if (canManageHostedSession()) {
      await loadOrganizerReservations();
    } else {
      await loadStudentReservations();
    }
  } catch (error) {
    showMessage(error.message);
  }
}

document.querySelectorAll("[data-auth-target]").forEach((btn) => {
  btn.addEventListener("click", () => showAuthView(`${btn.dataset.authTarget}View`));
});

document.querySelectorAll("[data-back-home]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!state.user) {
      showAuthView("loginView");
      return;
    }

    showAppView(getHomeViewForCurrentUser());
    toggleSubjectDropdown(false);
  });
});

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
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await apiFetch("/users/reset-password", {
        method: "PUT",
        body: JSON.stringify({
          email: document.getElementById("resetEmail").value.trim(),
          newPassword: document.getElementById("resetNewPassword").value
        })
      });

      showAuthView("resetSentView");
      showMessage("Password updated.");
    } catch (error) {
      showMessage(error.message);
    }
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
      mergeUserCourseRolesFromApi(result);
      document.getElementById("organizerRequestClass").value = "";
      document.getElementById("organizerRequestGpa").value = "";
      showAppView(getHomeViewForCurrentUser());
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
        mergeUserCourseRolesFromApi(result);
        setOrganizerUiSurface("organizer");
        inferModeAndView();
      } else {
        mergeUserCourseRolesFromApi(result);
      }

      document.getElementById("taRequestClass").value = "";
      document.getElementById("taRequestCode").value = "";
      showMessage(result.message || "TA request submitted.");
      showAppView(getHomeViewForCurrentUser());
    } catch (error) {
      showMessage(error.message);
    }
  });
}

if (requestTutorForm) {
  requestTutorForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const course = normalizeCourse(document.getElementById("requestTutorCourse").value || DEFAULT_COURSE);
    const preferredDate = document.getElementById("requestTutorDate").value;
    const preferredStartTime = document.getElementById("requestTutorStartTime").value;
    const preferredEndTime = document.getElementById("requestTutorEndTime").value;

    if (!preferredDate || !preferredStartTime || !preferredEndTime) {
      showMessage("Please fill in all tutor request fields.");
      return;
    }

    const dateProblem = validateHtmlDateString(preferredDate);
    if (dateProblem) {
      showMessage(dateProblem);
      return;
    }

    state.requestTutorFormData = {
      course,
      preferredDate,
      preferredStartTime,
      preferredEndTime
    };

    try {
      const tutors = await apiFetch(`/users/tutors/${encodeURIComponent(course)}`);
      state.availableTutors = tutors || [];
      if (state.editingTutorRequestId && state.lastReservation?.mode === "tutor-request") {
        state.selectedTutorId = state.lastReservation.tutorId;
      } else {
        state.selectedTutorId = null;
      }

      if (!state.availableTutors.length) {
        showMessage(`No approved tutors are available for ${course} right now.`);
        return;
      }

      if (state.editingTutorRequestId && state.lastReservation?.mode === "tutor-request") {
        showAppView("tutorMessageView");
      } else {
        showAppView("chooseTutorView");
      }
    } catch (error) {
      showMessage(error.message);
    }
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
    const extraMessage = document.getElementById("tutorMessage").value.trim();

    if (!state.selectedTutorId) {
      showMessage("Choose a tutor first.");
      return;
    }

    const preferredDate = state.requestTutorFormData.preferredDate;
    const preferredStartTime = state.requestTutorFormData.preferredStartTime;
    const preferredEndTime = state.requestTutorFormData.preferredEndTime;
    const course = state.requestTutorFormData.course || DEFAULT_COURSE;

    const dateProblem = validateHtmlDateString(preferredDate);
    if (dateProblem) {
      showMessage(dateProblem);
      return;
    }

    const isEdit = !!state.editingTutorRequestId;

    try {
      let result;
      if (isEdit) {
        result = await apiFetch(
          `/users/my-tutor-requests/${state.user.id}/${state.editingTutorRequestId}`,
          {
            method: "PUT",
            body: JSON.stringify({
              preferredDate,
              preferredStartTime,
              preferredEndTime,
              message: extraMessage
            })
          }
        );
      } else {
        result = await apiFetch("/users/request-tutor", {
          method: "POST",
          body: JSON.stringify({
            studentId: state.user.id,
            tutorId: state.selectedTutorId,
            course,
            message: extraMessage,
            preferredDate,
            preferredStartTime,
            preferredEndTime
          })
        });
      }

      state.latestConfirmation = buildSuccessHtml("Request a tutor", [
        `<div>Requested course: ${course}</div>`,
        `<div>Preferred date: ${preferredDate}</div>`,
        `<div>Preferred time: ${preferredStartTime}-${preferredEndTime}</div>`,
        `<div>${result.message || "Tutor request saved."}</div>`
      ]);

      state.lastReservation = {
        mode: "tutor-request",
        studentId: state.user.id,
        requestId: isEdit ? state.editingTutorRequestId : result.requestId,
        tutorId: state.selectedTutorId,
        course,
        preferredDate,
        preferredStartTime,
        preferredEndTime,
        studentMessage: extraMessage
      };
      state.editingTutorRequestId = null;
      syncSuccessButtons();
      resetTutorRequestFlowAfterSuccess();
      showAppView("successView");
    } catch (error) {
      showMessage(error.message);
    }
  });
}

if (examReviewOrganizerForm) {
  examReviewOrganizerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const created = await createOrganizerSession({
        title: "Exam review",
        sessionType: "review",
        course: document.getElementById("examOrganizerCourse").value,
        date: document.getElementById("examOrganizerDate").value,
        startTime: document.getElementById("examOrganizerStartTime").value,
        endTime: document.getElementById("examOrganizerEndTime").value,
        location: document.getElementById("examOrganizerLocation").value.trim()
      });

      state.lastReservation = {
        mode: "created",
        sessionId: created._id,
        location: created.location
      };

      state.latestConfirmation = buildSuccessHtml("Exam review", [
        `<div>Date: ${formatDateTimeForSuccess(created.startTime)}</div>`,
        `<div>Time: ${formatTimeRange(created.startTime, created.endTime)}</div>`,
        `<div>Location/Link: ${created.location}</div>`
      ]);

      syncSuccessButtons();
      resetExamOrganizerFormFields();
      showAppView("successView");
      await loadOrganizerReservations();
    } catch (error) {
      showMessage(error.message);
    }
  });
}

if (officeHourOrganizerForm) {
  officeHourOrganizerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const created = await createOrganizerSession({
        title: "Library drop-in/ office hours",
        sessionType: "office-hour",
        course: document.getElementById("officeOrganizerCourse").value,
        date: document.getElementById("officeOrganizerDate").value,
        startTime: document.getElementById("officeOrganizerStartTime").value,
        endTime: document.getElementById("officeOrganizerEndTime").value,
        location: document.getElementById("officeOrganizerLocation").value.trim()
      });

      state.lastReservation = {
        mode: "created",
        sessionId: created._id,
        location: created.location
      };

      state.latestConfirmation = buildSuccessHtml("Library drop-in/ office hours", [
        `<div>Date: ${formatDateTimeForSuccess(created.startTime)}</div>`,
        `<div>Time: ${formatTimeRange(created.startTime, created.endTime)}</div>`,
        `<div>Location/Link: ${created.location}</div>`
      ]);

      syncSuccessButtons();
      resetOfficeOrganizerFormFields();
      showAppView("successView");
      await loadOrganizerReservations();
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
    if (!state.user) return;
    showAuthView("resetView");
    if (authSection) authSection.classList.remove("hidden");
    if (appSection) appSection.classList.add("hidden");

    const resetEmail = document.getElementById("resetEmail");
    if (resetEmail) resetEmail.value = state.user.email;
  });
}

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

if (state.user) {
  inferModeAndView();
  renderApp();
} else {
  renderApp();
  showAuthView("loginView");
}