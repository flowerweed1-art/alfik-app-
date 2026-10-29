/*

* ALFIK feature extension
* Supports pet profiles, pet health records, rescue workspaces,
* veterinary workspaces and subscription status.
* 
* Payment security must be enforced by Supabase Edge Functions
* and database policies, never by this browser file alone.
  */

(function () {
"use strict";

const SUPABASE_URL = "https://rrsccsswluacuvymuheo.supabase.co";
const SUPABASE_KEY = "sb_publishable_krU5ZaSiuDwCniAycXr0cw_ZfTosBJ8";

function client() {
if (window.supabaseClient) return window.supabaseClient;

if (window.supabase && typeof window.supabase.createClient === "function") {
  if (!window.__alfikSupabaseClient) {
    window.__alfikSupabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );
  }
  return window.__alfikSupabaseClient;
}

return null;

}

let editingPetId = null;
let dashboardPets = [];

function el(id) {
return document.getElementById(id);
}

function say(id, text) {
const node = el(id);
if (node) node.textContent = text || "";
}

function escapeText(value) {
return String(value == null ? "" : value);
}

function readableError(error) {
if (!error) return "Unknown error";
const message = error.message || String(error);
const code = error.code ? " (code: " + error.code + ")" : "";
const details = error.details ? " Details: " + error.details : "";
const hint = error.hint ? " Hint: " + error.hint : "";
return message + code + details + hint;
}

async function currentUser() {
const db = client();
if (!db) return null;

const result = await db.auth.getUser();
if (result.error || !result.data.user) return null;

return result.data.user;

}

async function getPlan() {
const db = client();
if (!db) return "unknown";

try {
  // ALFIK owner testing access. Database policies remain responsible
  // for enforcing access to protected data.
  const userResult = await db.auth.getUser();
  const user = userResult && userResult.data && userResult.data.user;
  if (user && (user.id === "a1669d1a-b6f9-47af-b5d2-196eb26aa2a8" || String(user.email || "").toLowerCase() === "flowerweed1@gmail.com")) {
    return "premium";
  }

  const result = await db.rpc("alfik_my_plan");
  if (result.error) {
    console.warn("ALFIK plan lookup failed:", result.error);
    return "unknown";
  }

  const value = result.data;
  let plan = "";
  if (typeof value === "string") plan = value.toLowerCase().trim();
  else if (value && typeof value === "object") plan = String(value.plan || value.tier || "").toLowerCase().trim();

  return ["free", "premium", "pro"].includes(plan) ? plan : "unknown";
} catch (error) {
  console.warn("ALFIK plan lookup:", error);
  return "unknown";
}
}

async function hasPlan(required) {
const plan = await getPlan();
const levels = { free: 0, premium: 1, pro: 2 };
if (plan === "unknown" || !Object.prototype.hasOwnProperty.call(levels, plan)) return false;
return levels[plan] >= (levels[required] || 0);
}

async function planAccessMessage(required) {
const plan = await getPlan();
if (plan === "unknown") {
  return "ALFIK couldn't verify your plan just now. Please refresh and try again before assuming you need to upgrade.";
}
const levels = { free: 0, premium: 1, pro: 2 };
if ((levels[plan] || 0) < (levels[required] || 0)) {
  return required === "pro"
    ? "This feature requires the Pro plan."
    : "This feature requires Premium or Pro.";
}
return "";
}

function addText(container, label, value) {
const p = document.createElement("p");
const strong = document.createElement("strong");
strong.textContent = label + ": ";
p.appendChild(strong);
p.appendChild(document.createTextNode(escapeText(value || "Not provided")));
container.appendChild(p);
}

function addButton(container, label, action) {
const button = document.createElement("button");
button.type = "button";
button.className = "secondary wide";
button.textContent = label;
button.addEventListener("click", action);
container.appendChild(button);
}

function card(container, heading) {
const article = document.createElement("article");
article.className = "report-card";

const h = document.createElement("h3");
h.textContent = heading;
article.appendChild(h);

container.appendChild(article);
return article;

}

async function refreshAlfikProfile() {
const db = client();
if (!db) return;

const user = await currentUser();
if (!user) return;

const plan = await getPlan();
const signedInAs = el("signedInAs");
if (signedInAs) signedInAs.textContent = "Signed in as " + (user.email || "email address unavailable");
const promo = el("premiumPromo");
if (promo) {
  const paid = plan === "premium" || plan === "pro";
  promo.classList.toggle("hidden", paid || plan === "unknown");
  if (!paid && plan !== "unknown") {
    let compact = false;
    try {
      compact = localStorage.getItem("alfik-premium-promo-dismissed-" + user.id) === "yes";
    } catch (_) {}
    promo.classList.toggle("compact", compact);
    const dismiss = el("premiumPromoDismissBtn");
    if (dismiss) dismiss.textContent = compact ? "Show Premium details" : "Keep this reminder compact";
    const heading = el("premiumPromoHeading");
    if (heading) heading.textContent = compact
      ? "Premium pet profiles are available for £5.99/month 🐾"
      : "Make more of your ALFIK account 🐾";
  }
}
const badgeValue = el("accountPlanBadgeValue");
const badgeDetail = el("accountPlanBadgeDetail");
const planLabel = plan === "pro" ? "PRO ★" : plan === "premium" ? "PREMIUM ✓" : plan === "free" ? "FREE" : "PLAN CHECK NEEDED";
const planDetail = plan === "pro"
  ? "Pro membership • Health features and eligible veterinary tools."
  : plan === "premium"
    ? "Premium membership • Pet profiles and eligible rescue tools."
    : plan === "free"
      ? "Free membership • Lost-and-found reports and search remain free."
      : "ALFIK could not verify your plan just now. This does not mean your subscription has been cancelled. Please try refreshing, and contact ALFIK support if this continues.";
if (badgeValue) badgeValue.textContent = planLabel;
if (badgeDetail) badgeDetail.textContent = planDetail;
["accountPlanBadgeValue","accountPlanAccountValue","accountPlanBillingValue"].forEach(id => { const node = el(id); if (node) node.textContent = planLabel; });
["accountPlanBadgeDetail","accountPlanAccountDetail","accountPlanBillingDetail"].forEach(id => { const node = el(id); if (node) node.textContent = planDetail; });

const status = el("planStatus");

if (status) {
  status.textContent = plan === "unknown"
    ? "We couldn't verify your plan. Your subscription may still be active."
    : "Your current plan: " + plan.toUpperCase();
}

say(
  "healthPlanMessage",
  plan === "unknown"
    ? "Your plan could not be verified. Please refresh before assuming you need to upgrade."
    : plan === "pro"
      ? "Your account has Pro access. Health records still require the database setup to be complete."
      : "Pet health records require Pro access and the supporting database setup."
);

say(
  "rescuePlanMessage",
  plan === "unknown"
    ? "Your plan could not be verified. Please refresh before assuming you need to upgrade."
    : plan === "premium" || plan === "pro"
      ? "Your account has a paid plan. Rescue features require the supporting database setup."
      : "Rescue workspace access requires Premium or Pro and supporting database setup."
);

say(
  "vetPlanMessage",
  plan === "unknown"
    ? "Your plan could not be verified. Please refresh before assuming you need to upgrade."
    : plan === "pro"
      ? "Your account has Pro access. Veterinary features require the supporting database setup."
      : "Veterinary workspace access requires Pro and supporting database setup."
);
await loadCareNotifications();

}

async function renderPayPalButtons() {
  const config = window.ALFIK_CONFIG || {};
  const premium = el("paypal-premium");
  const pro = el("paypal-pro");
  const messageNode = el("billingMessage");

  if (!premium || !pro) return;

  function makeButton(container, plan, label) {
    container.replaceChildren();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary";
    button.textContent = label;
    button.addEventListener("click", async () => {
      const db = client();
      const user = await currentUser();

      if (!db || !user) {
        say("billingMessage", "Please sign in to ALFIK before choosing a paid plan.");
        return;
      }

      button.disabled = true;
      premium.querySelector("button") && (premium.querySelector("button").disabled = true);
      pro.querySelector("button") && (pro.querySelector("button").disabled = true);
      say("billingMessage", "Connecting securely to PayPal...");

      try {
        const { data, error } = await db.functions.invoke("alfik-create-subscription", {
          body: { plan }
        });

        if (error) {
          let detail = error.message || "Checkout could not start.";
          if (error.context && typeof error.context.json === "function") {
            try {
              const body = await error.context.json();
              if (body && body.error) detail = body.error;
            } catch (_) {}
          }
          throw new Error(detail);
        }

        if (!data || !data.approvalUrl || !data.subscriptionId) {
          throw new Error((data && data.error) || "PayPal did not return an approval link.");
        }

        say("billingMessage", "Opening PayPal. Approve the subscription there to continue.");
        window.location.assign(data.approvalUrl);
      } catch (error) {
        say("billingMessage", (error && error.message) || "Checkout could not start. Please try again.");
        [premium, pro].forEach(box => {
          const btn = box.querySelector("button");
          if (btn) btn.disabled = false;
        });
      }
    });
    container.appendChild(button);
  }

  const configured = config.PAYPAL_CLIENT_ID &&
    config.PAYPAL_CLIENT_ID !== "REPLACE_WITH_PAYPAL_CLIENT_ID";

  if (!configured) {
    premium.textContent = "PayPal checkout is not configured yet.";
    pro.textContent = "PayPal checkout is not configured yet.";
    if (messageNode) messageNode.textContent = "PayPal configuration is missing.";
    return;
  }

  makeButton(premium, "premium", "Subscribe to Premium · £5.99/month");
  makeButton(pro, "pro", "Subscribe to Pro · £9.99/month");

  const returnState = new URLSearchParams(window.location.search).get("subscription");
  if (messageNode) {
    if (returnState === "return") {
      messageNode.textContent = "You've returned from PayPal. Paid access activates only after ALFIK verifies the PayPal confirmation.";
    } else if (returnState === "cancelled") {
      messageNode.textContent = "Checkout was cancelled. No paid access has been activated.";
    } else {
      messageNode.textContent = "Choose a plan to continue to PayPal. Paid access activates after verified confirmation.";
    }
  }
}

async function markPetMissingReportFound(pet, report) {
  const petName = pet && pet.name ? pet.name : "your pet";
  if (!report || !report.id) {
    say("petMessage", "Could not identify the active missing report. Refresh your pet profiles and try again.");
    return;
  }
  if (!window.confirm("Mark " + petName + " as found and close the active missing-animal report? The saved pet profile will stay in your account.")) return;
  const db = client();
  const user = await currentUser();
  if (!db || !user) {
    say("petMessage", "Please sign in again.");
    return;
  }
  try {
    const result = await db.rpc("alfik_mark_own_report_resolved", {
      p_report_id: String(report.id)
    });
    if (result.error) throw result.error;
    if (result.data !== true) throw new Error("The report was not updated. It may already be resolved, or it may not belong to this account.");
    say("petMessage", petName + " is marked as found. The missing report has been marked reunited, and the pet profile is still saved. 💙");
    await loadPetWorkspace();
  } catch (error) {
    say("petMessage", "Could not mark " + petName + " as found: " + readableError(error));
  }
}

function startMissingReportFromPet(pet) {
  if (!pet || pet.life_status === "deceased") {
    say("petMessage", "A missing report can only be started for a pet marked as living.");
    return;
  }
  if (typeof window.startNewReport !== "function") {
    say("petMessage", "The report form is not ready. Please refresh ALFIK and try again.");
    return;
  }

  window.startNewReport("lost");
  const animal = el("animal");
  const name = el("animalName");
  const description = el("description");
  const location = el("location");
  const dateSeen = el("dateSeen");
  const messageNode = el("reportMessage");

  const species = String(pet.species || "").toLowerCase();
  animal.value = /cat|kitten|feline/.test(species) ? "cat"
    : /dog|puppy|canine/.test(species) ? "dog" : "other";
  if (name) name.value = pet.name || "";
  if (description) {
    const details = [pet.breed ? "Breed: " + pet.breed : "", "Details copied from the saved pet profile. Please add the pet's colours, distinctive markings, collar and anything else that may help identify them."].filter(Boolean);
    description.value = details.join("\n\n");
  }
  if (location) location.value = "";
  if (dateSeen) dateSeen.value = "";
  if (messageNode) {
    messageNode.textContent = "Started from " + (pet.name || "your pet") + "'s profile. Please enter where and when they were last seen. For privacy, profile notes, microchip number, vet details and private photo are not published automatically. You can choose a photo for this public report below.";
  }
  if (location) location.focus();
}

function dashboardAddLine(parent, label, value) {
  if (value === null || value === undefined || String(value).trim() === "") return;
  const line = document.createElement("p");
  line.className = "pet-dashboard-line";
  const strong = document.createElement("strong");
  strong.textContent = label + ": ";
  line.appendChild(strong);
  line.appendChild(document.createTextNode(String(value)));
  parent.appendChild(line);
}

function petAgeText(dateValue) {
  if (!dateValue) return "Not recorded";
  const birth = new Date(dateValue + "T12:00:00");
  if (Number.isNaN(birth.getTime()) || birth > new Date()) return "Check date";
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months--;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (years === 0) return months + (months === 1 ? " month" : " months");
  return years + (years === 1 ? " year" : " years") + (remainder ? " " + remainder + (remainder === 1 ? " month" : " months") : "");
}

async function loadPetLifeline(pet, panel) {
  if (!panel) return;
  panel.replaceChildren();
  const heading = document.createElement("h4");
  heading.textContent = "🛟 ALFIK Lifeline";
  panel.appendChild(heading);
  const note = document.createElement("p");
  note.className = "note";
  note.textContent = "See help requests linked to this pet, or start a new request without leaving their profile.";
  panel.appendChild(note);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary";
  button.textContent = "Request help for " + (pet.name || "this pet");
  button.addEventListener("click", () => {
    if (typeof window.alfikOpenLifelineForPet === "function") window.alfikOpenLifelineForPet(pet);
    else {
      const status = document.createElement("p");
      status.textContent = "ALFIK Lifeline is still loading. Please try again in a moment.";
      panel.appendChild(status);
    }
  });
  panel.appendChild(button);
  const db = client();
  const user = await currentUser();
  if (!db || !user || !pet || !pet.id) {
    const empty = document.createElement("p");
    empty.textContent = "Sign in to view this pet's private Lifeline requests.";
    panel.appendChild(empty);
    return;
  }
  const result = await db.from("alfik_lifeline_cases")
    .select("id,animal_name,species,crisis_type,urgency,help_needed,status,created_at,next_step,closed_outcome")
    .eq("owner_id", user.id)
    .eq("pet_id", pet.id)
    .order("updated_at", { ascending: false });
  if (result.error) {
    const error = document.createElement("p");
    error.className = "note";
    error.textContent = result.error.message && /pet_id|column/i.test(result.error.message)
      ? "Linking Lifeline requests to pet profiles needs the Lifeline pet-link SQL update in Supabase."
      : "This pet's Lifeline requests could not be loaded. Please try again later.";
    panel.appendChild(error);
    return;
  }
  const rows = result.data || [];
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "note";
    empty.textContent = "No help requests linked to this pet yet.";
    panel.appendChild(empty);
    return;
  }
  rows.forEach(request => {
    const card = document.createElement("div");
    card.className = "pet-dashboard-section";
    const status = document.createElement("strong");
    status.textContent = request.status || "Seeking support";
    card.appendChild(status);
    const detail = document.createElement("p");
    detail.textContent = (request.crisis_type || "Help request") + " · " + (request.urgency || "Urgency not set");
    card.appendChild(detail);
    if (request.help_needed && request.help_needed.length) {
      const needs = document.createElement("p");
      needs.textContent = "Support needed: " + request.help_needed.join(", ");
      card.appendChild(needs);
    }
    if (request.next_step) {
      const next = document.createElement("p");
      next.textContent = "Next step: " + request.next_step;
      card.appendChild(next);
    }
    if (request.closed_outcome) {
      const outcome = document.createElement("p");
      outcome.textContent = "Outcome: " + request.closed_outcome;
      card.appendChild(outcome);
    }
    const date = document.createElement("small");
    date.textContent = "Requested " + (request.created_at ? new Date(request.created_at).toLocaleDateString() : "date not recorded");
    card.appendChild(date);
    panel.appendChild(card);
  });
}

function dashboardStat(parent, value, label) {
  const tile = document.createElement("div");
  tile.className = "pet-dashboard-stat";
  const strong = document.createElement("strong");
  strong.textContent = String(value);
  const span = document.createElement("span");
  span.textContent = label;
  tile.append(strong, span);
  parent.appendChild(tile);
}

async function loadPetDashboard() {
  const content = el("petDashboardContent");
  const petId = el("dashboardPetSelect")?.value;
  const db = client();
  const user = await currentUser();
  if (!content) return;
  content.replaceChildren();
  const pet = dashboardPets.find(item => String(item.id) === String(petId));
  if (!pet) {
    content.textContent = "Add a pet profile or choose a pet to see their dashboard.";
    return;
  }
  const summary = document.createElement("div");
  summary.className = "pet-dashboard-grid";
  dashboardStat(summary, petAgeText(pet.date_of_birth), "Age");
  dashboardStat(summary, pet.microchip ? "Recorded" : "Missing", "Microchip");
  content.appendChild(summary);

  const emergency = document.createElement("div");
  emergency.className = "pet-dashboard-section";
  const emergencyHeading = document.createElement("h4");
  emergencyHeading.textContent = "Emergency pet card";
  emergency.appendChild(emergencyHeading);
  dashboardAddLine(emergency, "Pet", pet.name);
  dashboardAddLine(emergency, "Species / breed", [pet.species, pet.breed].filter(Boolean).join(" / "));
  dashboardAddLine(emergency, "Microchip", pet.microchip);
  dashboardAddLine(emergency, "Allergies", pet.allergies || "None recorded");
  dashboardAddLine(emergency, "Medication note", "Check the medication list below for current doses and instructions.");
  dashboardAddLine(emergency, "Vet / practice", pet.vet_name);
  dashboardAddLine(emergency, "Vet phone", pet.vet_phone);
  dashboardAddLine(emergency, "Vet email", pet.vet_email);
  dashboardAddLine(emergency, "Vet address", pet.vet_address);
  const printButton = document.createElement("button");
  printButton.type = "button";
  printButton.className = "secondary";
  printButton.textContent = "Print emergency pet card";
  printButton.addEventListener("click", () => {
    document.body.classList.add("alfik-print-dashboard");
    window.print();
    document.body.classList.remove("alfik-print-dashboard");
  });
  emergency.appendChild(printButton);
  content.appendChild(emergency);

  if (!db || !user) {
    const note = document.createElement("p");
    note.className = "pet-dashboard-alert";
    note.textContent = "Sign in again to load health records, medications and reminders.";
    content.appendChild(note);
    return;
  }

  const [recordsResult, medicationResult, scheduleResult] = await Promise.all([
    db.from("alfik_pet_records").select("record_type,record_date,title,numeric_value").eq("owner_id", user.id).eq("pet_id", pet.id).order("record_date", { ascending: false }).limit(100),
    db.from("alfik_animal_medications").select("medication_name,dose,frequency,start_date,end_date,instructions,active").eq("owner_id", user.id).eq("pet_id", pet.id).order("created_at", { ascending: false }),
    db.from("alfik_care_schedules").select("schedule_type,treatment_name,interval_days,next_due_date,enabled").eq("owner_id", user.id).eq("pet_id", pet.id).order("next_due_date")
  ]);

  const records = recordsResult.error ? [] : (recordsResult.data || []);
  const medications = medicationResult.error ? [] : (medicationResult.data || []).filter(m => m.active !== false);
  const schedules = scheduleResult.error ? [] : (scheduleResult.data || []);
  const today = new Date().toISOString().slice(0, 10);
  const activeSchedules = schedules.filter(item => item.enabled);
  const overdue = activeSchedules.filter(item => item.next_due_date && item.next_due_date < today);
  const upcoming = activeSchedules.filter(item => item.next_due_date && item.next_due_date >= today).sort((a,b) => a.next_due_date.localeCompare(b.next_due_date));
  const stats = document.createElement("div");
  stats.className = "pet-dashboard-grid";
  dashboardStat(stats, records.length, "Health records");
  dashboardStat(stats, medications.length, "Active medications");
  dashboardStat(stats, overdue.length, "Overdue care tasks");
  dashboardStat(stats, upcoming.length, "Upcoming care tasks");
  content.insertBefore(stats, emergency);

  const care = document.createElement("div");
  care.className = "pet-dashboard-section";
  const careHeading = document.createElement("h4");
  careHeading.textContent = "Care overview";
  care.appendChild(careHeading);
  if (overdue.length) {
    const warning = document.createElement("div");
    warning.className = "pet-dashboard-alert";
    warning.textContent = overdue.length + " care reminder(s) are past their due date. Check the schedule and your vet or product instructions.";
    care.appendChild(warning);
  } else {
    const okay = document.createElement("div");
    okay.className = "pet-dashboard-ok";
    okay.textContent = "No overdue enabled care reminders recorded.";
    care.appendChild(okay);
  }
  if (upcoming.length) {
    upcoming.slice(0, 5).forEach(item => {
      dashboardAddLine(care, item.next_due_date, (item.treatment_name || item.schedule_type || "Care task") + (item.interval_days ? " · repeats every " + item.interval_days + " days" : ""));
    });
  } else {
    dashboardAddLine(care, "Next due", "No future care reminders recorded.");
  }
  content.appendChild(care);

  const medicationSection = document.createElement("div");
  medicationSection.className = "pet-dashboard-section";
  const medicationHeading = document.createElement("h4");
  medicationHeading.textContent = "Medication schedule";
  medicationSection.appendChild(medicationHeading);
  if (medicationResult.error) {
    medicationSection.textContent = "Medication details could not be loaded. Open the medication list below to check access.";
  } else if (medications.length) {
    medications.forEach(m => {
      const item = document.createElement("div");
      item.className = "pet-dashboard-line";
      const name = document.createElement("strong");
      name.textContent = m.medication_name || "Medication";
      item.appendChild(name);
      const details = [m.dose, m.frequency, m.start_date ? "from " + m.start_date : "", m.end_date ? "until " + m.end_date : ""].filter(Boolean).join(" · ");
      if (details) item.appendChild(document.createTextNode(" · " + details));
      if (m.instructions) {
        const instructions = document.createElement("div");
        instructions.textContent = m.instructions;
        item.appendChild(instructions);
      }
      medicationSection.appendChild(item);
    });
  } else {
    medicationSection.textContent = "No active medications recorded for this pet.";
  }
  content.appendChild(medicationSection);

  const weights = records.filter(record => String(record.record_type).toLowerCase() === "weight" && record.numeric_value !== null && record.numeric_value !== undefined).sort((a,b) => (a.record_date || "").localeCompare(b.record_date || ""));
  const trend = document.createElement("div");
  trend.className = "pet-dashboard-section";
  const trendHeading = document.createElement("h4");
  trendHeading.textContent = "Weight history";
  trend.appendChild(trendHeading);
  if (weights.length) {
    weights.slice(-6).forEach(record => {
      const row = document.createElement("div");
      row.className = "pet-weight-row";
      const date = document.createElement("span");
      date.textContent = record.record_date || "Date not recorded";
      const value = document.createElement("strong");
      value.textContent = String(record.numeric_value) + (record.title && /kg|lb|lbs/i.test(record.title) ? " (" + record.title + ")" : "");
      row.append(date, value);
      trend.appendChild(row);
    });
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "Record weights consistently and discuss concerning changes with your vet. Values are shown as entered.";
    trend.appendChild(note);
  } else {
    trend.textContent = "No weight records yet. Add a Weight health record to start tracking trends.";
  }
  content.appendChild(trend);

  const errors = [];
  if (recordsResult.error) errors.push("health record statistics");
  if (medicationResult.error) errors.push("medication details");
  if (scheduleResult.error) errors.push("care reminders");
  if (errors.length) {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "Some dashboard information could not be loaded (" + errors.join(", ") + "). Your profile and emergency details are still available.";
    content.appendChild(note);
  }
}

async function loadPetWorkspace() {
const db = client();
const list = el("petList");
const petSelect = el("healthPet");

// Restore movable care panels before rebuilding the pet cards, so a refresh of pet data never deletes them.
const petsSection = el("petsView");
if (petsSection) {
  ["vaccinationTrackerPanel", "medicationPet", "carePet", "healthPet"].forEach(id => {
    const control = el(id);
    const panel = control && control.closest(".feature-panel");
    if (panel && panel.parentElement !== petsSection) petsSection.appendChild(panel);
  });
}
if (list) list.replaceChildren();
["healthPet", "medicationPet", "carePet", "vaccinationPet"].forEach(selectId => {
  const target = el(selectId);
  if (!target) return;
  target.replaceChildren();
  const option = document.createElement("option");
  option.value = "";
  option.textContent = "Select a pet";
  target.appendChild(option);
});


const user = await currentUser();
if (!user) return;

const planMessage = await planAccessMessage("premium");
if (planMessage) {
  if (list) {
    const p = document.createElement("p");
    p.textContent = planMessage;
    list.appendChild(p);
  }
  return;
}

if (!db) return;

try {
  const result = await db
    .from("alfik_pets")
    .select("id,name,species,breed,date_of_birth,microchip,notes,neutering_status,neutered_date,life_status,photo_path,allergies,vet_name,vet_phone,vet_email,vet_address")
    .eq("owner_id", user.id);

  if (result.error) throw result.error;

  dashboardPets = result.data || [];
  let petMissingReports = [];
  try {
    const reportsResult = await db.from("animal_reports")
      .select("id,report_type,animal_type,animal_name,status,created_at")
      .eq("owner_id", user.id)
      .eq("report_type", "lost")
      .order("created_at", { ascending: false });
    if (!reportsResult.error) petMissingReports = reportsResult.data || [];
  } catch (reportLookupError) {
    console.warn("Could not check pet missing-report status:", reportLookupError);
  }
  const dashboardSelect = el("dashboardPetSelect");
  if (dashboardSelect) {
    const previousValue = String(dashboardSelect.value || "");
    dashboardSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = dashboardPets.length ? "Choose a pet…" : "No pet profiles found";
    dashboardSelect.appendChild(placeholder);
    for (const pet of dashboardPets) {
      if (!pet || !pet.id) continue;
      const option = document.createElement("option");
      option.value = String(pet.id);
      option.textContent = pet.name || "Unnamed pet";
      dashboardSelect.appendChild(option);
    }
    const selectedPet = dashboardPets.find(pet => String(pet.id) === previousValue) || dashboardPets.find(pet => pet && pet.id);
    dashboardSelect.value = selectedPet ? String(selectedPet.id) : "";
    dashboardSelect.disabled = dashboardSelect.options.length <= 1;
  }

  (result.data || []).forEach(pet => {
    if (list) {
      const item = card(list, pet.name || "Unnamed pet");
      item.classList.add("pet-profile-card");
      const isDeceased = pet.life_status === "deceased";
      const petSpecies = String(pet.species || "").toLowerCase();
      const petAnimalType = /cat|kitten|feline/.test(petSpecies) ? "cat"
        : /dog|puppy|canine/.test(petSpecies) ? "dog" : "other";
      const petReports = petMissingReports.filter(report =>
        String(report.animal_name || "").trim().toLowerCase() === String(pet.name || "").trim().toLowerCase()
        && String(report.animal_type || "").trim().toLowerCase() === petAnimalType
      );
      const activeMissingReport = petReports.find(report => report.status === "active");
      const previousMissingReport = petReports[0];
      if (isDeceased) item.classList.add("pet-deceased");
      const species = document.createElement("p");
      species.className = "pet-card-subtitle";
      species.textContent = [pet.species, pet.breed].filter(Boolean).join(" • ") || "Pet profile";
      item.appendChild(species);
      if (isDeceased) {
        const rainbow = document.createElement("span");
        rainbow.className = "pet-rainbow";
        rainbow.textContent = "🌈";
        rainbow.setAttribute("aria-label", "Remembering this pet");
        rainbow.title = "Remembering this pet";
        item.appendChild(rainbow);
        const status = document.createElement("p");
        status.className = "pet-deceased-label";
        status.textContent = "Forever loved";
        item.appendChild(status);
      }
      if (pet.photo_path) {
        const photo = document.createElement("img");
        photo.className = "pet-profile-photo";
        photo.alt = (pet.name || "Pet") + " profile photo";
        photo.loading = "lazy";
        item.appendChild(photo);
        db.storage.from("alfik-pet-photos").createSignedUrl(pet.photo_path, 3600).then(({data, error}) => {
          if (!error && data && data.signedUrl) photo.src = data.signedUrl;
          else photo.alt = "Pet photo could not be loaded";
        }).catch(() => { photo.alt = "Pet photo could not be loaded"; });
      }
      const details = document.createElement("div");
      details.className = "pet-card-details hidden";
      addText(details, "Date of birth", pet.date_of_birth);
      addText(details, "Microchip", pet.microchip);
      addText(details, "Neutering status", ({neutered:"Neutered / spayed",not_neutered:"Not neutered",unknown:"Unknown / not confirmed"})[pet.neutering_status] || "Unknown / not confirmed");
      addText(details, "Date neutered", pet.neutered_date);
      addText(details, "Allergies", pet.allergies);
      addText(details, "Vet / practice", pet.vet_name);
      addText(details, "Vet phone", pet.vet_phone);
      addText(details, "Vet email", pet.vet_email);
      addText(details, "Vet address", pet.vet_address);
      addText(details, "Notes", pet.notes);
      item.appendChild(details);
      const lifelinePanel = document.createElement("div");
      lifelinePanel.className = "pet-dashboard-section pet-lifeline-panel";
      details.appendChild(lifelinePanel);
      if (activeMissingReport) {
        const missingStatus = document.createElement("p");
        missingStatus.className = "pet-missing-status";
        missingStatus.textContent = "🚨 Reported missing · Active community report";
        missingStatus.style.cssText = "padding:10px 12px;border-radius:10px;background:#fff1f0;border:1px solid #efb2ad;color:#8e2424;font-weight:700";
        item.appendChild(missingStatus);
      } else if (previousMissingReport && ["resolved", "reunited", "closed"].includes(previousMissingReport.status)) {
        const safeStatus = document.createElement("p");
        safeStatus.className = "pet-missing-status";
        safeStatus.textContent = "🟢 Previously reported missing · Marked found / reunited";
        safeStatus.style.cssText = "padding:10px 12px;border-radius:10px;background:#effaf2;border:1px solid #b9dfc2;color:#216b36;font-weight:700";
        item.appendChild(safeStatus);
      }
      const actions = document.createElement("div");
      actions.className = "pet-card-actions";
      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.className = "secondary";
      viewButton.textContent = "View details";
      viewButton.addEventListener("click", async () => {
        const opening = details.classList.contains("hidden");
        if (opening) {
          // Keep one pet's full care record open at a time.
          list.querySelectorAll(".pet-card-details").forEach(otherDetails => {
            if (otherDetails !== details) {
              otherDetails.classList.add("hidden");
              const otherCard = otherDetails.closest(".pet-profile-card");
              const otherButton = otherCard && otherCard.querySelector(".pet-card-actions button");
              if (otherButton) otherButton.textContent = "View details";
            }
          });

          // Put each pet-care tool inside the selected pet's details, not at the bottom of the profiles page.
          for (const id of ["vaccinationTrackerPanel", "medicationPet", "carePet"]) {
            const control = el(id);
            const panel = control && control.closest(".feature-panel");
            if (panel) {
              panel.classList.remove("hidden");
              details.appendChild(panel);
            }
          }

          // Health records remain a Pro feature and are only shown to Pro members.
          const canUseHealth = await hasPlan("pro");
          if (canUseHealth) {
            const healthControl = el("healthPet");
            const healthPanel = healthControl && healthControl.closest(".feature-panel");
            if (healthPanel) {
              healthPanel.classList.remove("hidden");
              details.appendChild(healthPanel);
            }
          }

          ["healthPet", "medicationPet", "carePet", "vaccinationPet"].forEach(id => {
            const select = el(id);
            if (select) select.value = String(pet.id);
          });
          details.classList.remove("hidden");
          await loadPetLifeline(pet, lifelinePanel);
          viewButton.textContent = "Hide details";
          await Promise.all([
            loadVaccinations(),
            loadMedicationList(),
            loadCareSchedules(),
            loadCareNotifications(),
            canUseHealth ? loadHealthRecords() : Promise.resolve()
          ]);
        } else {
          details.classList.add("hidden");
          viewButton.textContent = "View details";
        }
      });
      actions.appendChild(viewButton);
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "primary";
      editButton.textContent = "Edit profile";
      editButton.addEventListener("click", () => beginEditPet(pet));
      actions.appendChild(editButton);
      if (activeMissingReport) {
        const foundButton = document.createElement("button");
        foundButton.type = "button";
        foundButton.className = "primary";
        foundButton.textContent = "🟢 Mark as found / reunited";
        foundButton.addEventListener("click", () => markPetMissingReportFound(pet, activeMissingReport));
        actions.appendChild(foundButton);
      } else if (!isDeceased) {
        const missingButton = document.createElement("button");
        missingButton.type = "button";
        missingButton.className = "lost";
        missingButton.textContent = "🚨 Report missing";
        missingButton.addEventListener("click", () => startMissingReportFromPet(pet));
        actions.appendChild(missingButton);
      }
      const lifeButton = document.createElement("button");
      lifeButton.type = "button";
      lifeButton.className = "secondary";
      lifeButton.textContent = isDeceased ? "Mark as living" : "🌈 Mark deceased";
      lifeButton.addEventListener("click", () => updatePetLifeStatus(pet, isDeceased ? "living" : "deceased"));
      actions.appendChild(lifeButton);
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "danger pet-delete-button";
      deleteButton.textContent = "Delete profile";
      deleteButton.addEventListener("click", () => deletePetProfile(pet));
      actions.appendChild(deleteButton);
      item.appendChild(actions);
    }

    ["medicationPet", "carePet", "vaccinationPet"].forEach(selectId => {
      const target = el(selectId);
      if (!target) return;
      const option = document.createElement("option");
      option.value = pet.id;
      option.textContent = pet.name || "Unnamed pet";
      target.appendChild(option);
    });
    if (petSelect) {
      const option = document.createElement("option");
      option.value = pet.id;
      option.textContent = pet.name || "Unnamed pet";
      petSelect.appendChild(option);
    }
  });

  if (list && !(result.data || []).length) {
    list.textContent = "No pet profiles saved yet.";
  }

  await loadPetDashboard();
  await loadHealthRecords();
  await loadVaccinations();
  await loadMedicationList();
  await loadCareSchedules();
  await loadCareNotifications();
} catch (error) {
  console.warn("ALFIK pet profiles:", error);
  const message = "Pet profiles could not be loaded: " + readableError(error);
  say("petMessage", message);
  if (list) {
    list.replaceChildren();
    const p = document.createElement("p");
    p.textContent = message;
    list.appendChild(p);
  }
}

}

async function updatePetLifeStatus(pet, newStatus) {
  const label = pet.name || "this pet";
  const promptText = newStatus === "deceased"
    ? "Mark " + label + " as deceased? A rainbow will appear on the profile. You can change this back later."
    : "Mark " + label + " as living again and remove the rainbow?";
  if (!window.confirm(promptText)) return;

  const db = client();
  const user = await currentUser();
  if (!db || !user) {
    say("petMessage", "Please sign in again.");
    return;
  }
  try {
    const { error } = await db.from("alfik_pets")
      .update({ life_status: newStatus })
      .eq("id", pet.id)
      .eq("owner_id", user.id);
    if (error) throw error;
    say("petMessage", newStatus === "deceased"
      ? "Pet profile updated. Sending love and remembering " + label + " 🌈"
      : "Pet profile updated.");
    await loadPetWorkspace();
  } catch (error) {
    say("petMessage", "Could not update the pet's status: " + readableError(error));
  }
}

async function deletePetProfile(pet) {
  const label = pet.name || "this pet";
  if (!window.confirm("Permanently delete " + label + "'s pet profile? This cannot be undone.")) return;

  const db = client();
  const user = await currentUser();
  if (!db || !user) {
    say("petMessage", "Please sign in again.");
    return;
  }
  try {
    const { error } = await db.from("alfik_pets")
      .delete()
      .eq("id", pet.id)
      .eq("owner_id", user.id);
    if (error) throw error;
    if (editingPetId === pet.id) {
      resetPetForm();
      if (el("petForm")) el("petForm").classList.add("hidden");
    }
    say("petMessage", "Pet profile deleted.");
    await loadPetWorkspace();
  } catch (error) {
    say("petMessage", "Could not delete the pet profile: " + readableError(error));
  }
}

function beginEditPet(pet) {
  editingPetId = pet.id;
  el("petName").value = pet.name || "";
  el("petSpecies").value = pet.species || "";
  el("petBreed").value = pet.breed || "";
  el("petDob").value = pet.date_of_birth || "";
  el("petMicrochip").value = pet.microchip || "";
  el("petNeuteringStatus").value = pet.neutering_status || "unknown";
  el("petNeuteredDate").value = pet.neutered_date || "";
  el("petAllergies").value = pet.allergies || "";
  el("petVetName").value = pet.vet_name || "";
  el("petVetPhone").value = pet.vet_phone || "";
  el("petVetEmail").value = pet.vet_email || "";
  el("petVetAddress").value = pet.vet_address || "";
  el("petPhotoPath").value = pet.photo_path || "";
  el("petPhotoFile").value = "";
  el("petNotes").value = pet.notes || "";
  el("petFormHeading").textContent = "Edit " + (pet.name || "pet profile");
  el("savePetBtn").textContent = "Save changes";
  el("cancelPetEditBtn").classList.remove("hidden");
  el("petForm").classList.remove("hidden");
  el("petForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetPetForm() {
  editingPetId = null;
  if (el("petForm")) el("petForm").reset();
  if (el("petPhotoPath")) el("petPhotoPath").value = "";
  if (el("petFormHeading")) el("petFormHeading").textContent = "Add a pet";
  if (el("savePetBtn")) el("savePetBtn").textContent = "Save pet profile";
  if (el("cancelPetEditBtn")) el("cancelPetEditBtn").classList.add("hidden");
}

async function compressPetPhoto(file) {
  // Resize large phone photos and convert them to a compact JPEG before upload.
  if (!("createImageBitmap" in window)) {
    throw new Error("This browser cannot resize the photo automatically. Please choose a smaller image.");
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (error) {
    throw new Error("This photo format cannot be resized here. Please choose a JPG or PNG photo.");
  }
  try {
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Could not prepare the photo. Please try another image.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error("Could not compress the photo.")), "image/jpeg", 0.82);
    });
    return new File([blob], (file.name.replace(/\.[^.]+$/, "") || "pet-photo") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now()
    });
  } finally {
    bitmap.close?.();
  }
}

async function savePet(event) {
event.preventDefault();

const db = client();
const user = await currentUser();

if (!db || !user) {
  say("petMessage", "Please sign in again.");
  return;
}

const planMessage = await planAccessMessage("premium");
if (planMessage) {
  say("petMessage", planMessage);
  return;
}

const pet = {
  owner_id: user.id,
  name: el("petName").value.trim(),
  species: el("petSpecies").value,
  breed: el("petBreed").value.trim() || null,
  date_of_birth: el("petDob").value || null,
  microchip: el("petMicrochip").value.trim() || null,
  neutering_status: el("petNeuteringStatus")?.value || "unknown",
  neutered_date: el("petNeuteredDate")?.value || null,
  allergies: el("petAllergies").value.trim() || null,
  vet_name: el("petVetName").value.trim() || null,
  vet_phone: el("petVetPhone").value.trim() || null,
  vet_email: el("petVetEmail").value.trim() || null,
  vet_address: el("petVetAddress").value.trim() || null,
  photo_path: el("petPhotoPath").value || null,
  notes: el("petNotes").value.trim() || null
};

if (!pet.name || !pet.species) {
  say("petMessage", "Please enter the pet's name and species.");
  return;
}

const photoInput = el("petPhotoFile");
const originalPhotoFile = photoInput?.files?.[0] || null;
if (originalPhotoFile && !originalPhotoFile.type.startsWith("image/")) {
  say("petMessage", "Please choose an image file for the pet photo.");
  return;
}

const button = event.submitter;
if (button) button.disabled = true;

try {
  if (originalPhotoFile) {
    say("petMessage", "Optimising your photo for ALFIK…");
    const photoFile = await compressPetPhoto(originalPhotoFile);
    if (photoFile.size > 5 * 1024 * 1024) {
      throw new Error("This photo is still over 5 MB after compression. Please choose a different photo.");
    }
    const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "pet-photo.jpg";
    const photoPath = user.id + "/" + Date.now() + "-" + safeName;
    const upload = await db.storage.from("alfik-pet-photos").upload(photoPath, photoFile, { upsert: false, contentType: "image/jpeg" });
    if (upload.error) throw upload.error;
    pet.photo_path = photoPath;
  }
  const result = editingPetId
    ? await db.from("alfik_pets").update(pet).eq("id", editingPetId).eq("owner_id", user.id)
    : await db.from("alfik_pets").insert([pet]);
  if (result.error) throw result.error;

  const wasEditing = Boolean(editingPetId);
  resetPetForm();
  el("petForm").classList.add("hidden");
  say("petMessage", wasEditing ? "Pet profile updated." : "Pet profile saved.");
  await loadPetWorkspace();
} catch (error) {
  say("petMessage", "Could not save the pet profile: " + readableError(error));
  console.error("ALFIK save pet:", error);
} finally {
  if (button) button.disabled = false;
}

}

async function saveHealthRecord() {
const db = client();
const user = await currentUser();

if (!db || !user) {
  say("healthRecordMessage", "Please sign in again.");
  return;
}

if (!(await hasPlan("pro"))) {
  say("healthRecordMessage", "Health records require the Pro plan.");
  return;
}

const petId = el("healthPet").value;
if (!petId) {
  say("healthRecordMessage", "Please select a pet first.");
  return;
}

const rawValue = el("healthValue").value;
const record = {
  owner_id: user.id,
  pet_id: petId,
  record_type: el("healthType").value,
  record_date: el("healthDate").value || new Date().toISOString().slice(0, 10),
  title: el("healthTitle").value.trim() || null,
  details: el("healthDetails").value.trim() || null,
  numeric_value: rawValue === "" ? null : Number(rawValue)
};

try {
  const result = await db.from("alfik_pet_records").insert([record]);
  if (result.error) throw result.error;

  el("healthTitle").value = "";
  el("healthDetails").value = "";
  el("healthValue").value = "";

  say("healthRecordMessage", "Health record saved.");
  await loadHealthRecords();
} catch (error) {
  console.error("ALFIK save health record:", error);
  say("healthRecordMessage", "Could not save the record: " + readableError(error));
}

}

async function loadHealthRecords() {
const db = client();
const user = await currentUser();
const container = el("healthRecords");

if (!db || !user || !container) return;

container.replaceChildren();

const petId = el("healthPet")?.value;

if (!petId) {
  container.textContent = "Choose a pet to view its health records.";
  return;
}

try {
  const result = await db
    .from("alfik_pet_records")
    .select("record_type,record_date,title,details,numeric_value")
    .eq("owner_id", user.id)
    .eq("pet_id", petId)
    .order("record_date", { ascending: false })
    .limit(100);

  if (result.error) throw result.error;

  (result.data || []).forEach(record => {
    const item = card(container, record.title || record.record_type || "Health record");
    addText(item, "Type", record.record_type);
    addText(item, "Date", record.record_date);
    addText(item, "Details", record.details);

    if (record.numeric_value !== null && record.numeric_value !== undefined) {
      addText(item, "Value", record.numeric_value);
    }
  });

  if (!(result.data || []).length) {
    container.textContent = "No health records saved for this pet yet.";
  }
} catch (error) {
  console.warn("ALFIK health records:", error);
  container.textContent = "Health records could not be loaded: " + readableError(error);
}

}


async function saveVaccination() {
  const db = client();
  const user = await currentUser();
  if (!db || !user) return say("vaccinationMessage", "Please sign in again.");
  const planMessage = await planAccessMessage("premium");
  if (planMessage) return say("vaccinationMessage", planMessage);
  const petId = el("vaccinationPet")?.value;
  const name = el("vaccinationName")?.value.trim();
  const dateGiven = el("vaccinationDate")?.value;
  const dueDate = el("vaccinationDue")?.value || null;
  if (!petId || !name || !dateGiven) return say("vaccinationMessage", "Choose a pet, enter the vaccine name and select the date given.");
  if (dueDate && dueDate < dateGiven) return say("vaccinationMessage", "The booster due date cannot be before the date given.");
  try {
    const result = await db.from("alfik_pet_vaccinations").insert([{
      owner_id: user.id, pet_id: petId, vaccine_name: name, date_given: dateGiven,
      next_due_date: dueDate, vet_name: el("vaccinationVet")?.value.trim() || null,
      notes: el("vaccinationNotes")?.value.trim() || null,
      reminder_enabled: Boolean(el("vaccinationReminderEnabled")?.checked)
    }]);
    if (result.error) throw result.error;
    ["vaccinationName", "vaccinationDate", "vaccinationDue", "vaccinationVet", "vaccinationNotes"].forEach(id => { if (el(id)) el(id).value = ""; });
    say("vaccinationMessage", "Vaccination saved.");
    await loadVaccinations();
    await loadCareNotifications();
  } catch (error) {
    console.error("ALFIK save vaccination:", error);
    say("vaccinationMessage", "Could not save vaccination: " + readableError(error) + ". If this is the first time, run vaccination-booster-tracker.sql in Supabase.");
  }
}

async function loadVaccinations() {
  const db = client(), user = await currentUser(), list = el("vaccinationList"), petId = el("vaccinationPet")?.value;
  if (!db || !user || !list) return;
  list.replaceChildren();
  const planMessage = await planAccessMessage("premium");
  if (planMessage) { list.textContent = planMessage; return; }
  if (!petId) { list.textContent = "Choose a pet to view vaccinations."; return; }
  try {
    const result = await db.from("alfik_pet_vaccinations")
      .select("id,vaccine_name,date_given,next_due_date,vet_name,notes,reminder_enabled")
      .eq("owner_id", user.id).eq("pet_id", petId).order("date_given", { ascending: false });
    if (result.error) throw result.error;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const soon = new Date(today); soon.setDate(soon.getDate() + 30);
    (result.data || []).forEach(v => {
      const item = card(list, v.vaccine_name || "Vaccination");
      addText(item, "Date given", v.date_given);
      addText(item, "Next booster", v.next_due_date || "Not scheduled");
      addText(item, "Vet / practice", v.vet_name);
      addText(item, "Notes", v.notes);
      let status = "No booster scheduled";
      if (v.next_due_date) {
        const due = new Date(v.next_due_date + "T00:00:00");
        if (due < today) status = "Overdue";
        else if (due <= soon) status = "Due soon";
        else status = "Upcoming";
      }
      addText(item, "Status", status);
      addText(item, "In-app reminder", v.reminder_enabled ? "On" : "Off");
      const edit = document.createElement("button");
      edit.type = "button"; edit.className = "secondary"; edit.textContent = "Edit vaccination";
      edit.addEventListener("click", async () => {
        const name = window.prompt("Vaccine name", v.vaccine_name || "");
        if (name === null) return;
        const given = window.prompt("Date given (YYYY-MM-DD)", v.date_given || "");
        if (given === null) return;
        const due = window.prompt("Next booster due (YYYY-MM-DD, or leave blank)", v.next_due_date || "");
        if (due === null) return;
        const vet = window.prompt("Vet / practice (optional)", v.vet_name || "");
        if (vet === null) return;
        const notes = window.prompt("Notes (optional)", v.notes || "");
        if (notes === null) return;
        const reminder = window.confirm("Enable in-app reminder for this vaccination? Choose OK for On, Cancel for Off.");
        if (!name.trim() || !given.trim()) return say("vaccinationMessage", "Vaccine name and date given are required.");
        if (due.trim() && due.trim() < given.trim()) return say("vaccinationMessage", "The booster due date cannot be before the date given.");
        const userNow = await currentUser();
        const update = await client().from("alfik_pet_vaccinations").update({
          vaccine_name: name.trim(), date_given: given.trim(), next_due_date: due.trim() || null,
          vet_name: vet.trim() || null, notes: notes.trim() || null, reminder_enabled: reminder
        }).eq("id", v.id).eq("owner_id", userNow.id).eq("pet_id", petId);
        if (update.error) return say("vaccinationMessage", "Could not update vaccination: " + readableError(update.error));
        say("vaccinationMessage", "Vaccination updated.");
        await loadVaccinations(); await loadCareNotifications();
      });
      item.appendChild(edit);
      const remove = document.createElement("button");
      remove.type = "button"; remove.className = "secondary"; remove.textContent = "Delete vaccination";
      remove.addEventListener("click", async () => {
        if (!window.confirm("Delete this vaccination record? This cannot be undone.")) return;
        const current = await currentUser();
        const deletion = await client().from("alfik_pet_vaccinations").delete().eq("id", v.id).eq("owner_id", current.id).eq("pet_id", petId);
        if (deletion.error) return say("vaccinationMessage", "Could not delete vaccination: " + readableError(deletion.error));
        say("vaccinationMessage", "Vaccination deleted.");
        await loadVaccinations(); await loadCareNotifications();
      });
      item.appendChild(remove);
    });
    if (!(result.data || []).length) list.textContent = "No vaccination records saved for this pet yet.";
  } catch (error) {
    console.warn("ALFIK vaccinations:", error);
    list.textContent = "Could not load vaccinations: " + readableError(error) + ". If this is the first time, run vaccination-booster-tracker.sql in Supabase.";
  }
}

async function refreshRescueDashboardSummary() {
const db = client();
const orgId = el("rescueOrgSelect")?.value || "";
const overview = el("rescueOrgOverview");
const animalCount = el("rescueAnimalCount");
const dueCount = el("rescueDueCount");
const medicationCount = el("rescueMedicationCount");
if (!orgId || !db) {
  if (overview) overview.innerHTML = "<strong>Organisation overview</strong><p>Select your rescue organisation to see its profile and verification status.</p>";
  [animalCount,dueCount,medicationCount].forEach(node => { if(node) node.textContent = "—"; });
  return;
}
try {
  const orgResult = await db.from("alfik_organisations")
    .select("id,name,org_type,verification_status")
    .eq("id", orgId).maybeSingle();
  if (orgResult.error) throw orgResult.error;
  const org = orgResult.data;
  if (overview) {
    overview.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = org?.name || "Selected organisation";
    overview.appendChild(title);
    const detail = document.createElement("p");
    detail.textContent = "Type: " + (org?.org_type || "Rescue");
    overview.appendChild(detail);
    const status = document.createElement("span");
    status.className = "rescue-status-pill";
    const rawStatus = String(org?.verification_status || "unverified").toLowerCase().replace(/_/g," ");
    status.textContent = rawStatus === "verified" ? "✓ ALFIK Verified" : "Verification: " + rawStatus;
    overview.appendChild(status);
    const helper = document.createElement("p");
    helper.textContent = rawStatus === "verified"
      ? "Your organisation has been verified by ALFIK."
      : "Your organisation is not yet verified. You can review or submit evidence under Verification & Evidence.";
    overview.appendChild(helper);
  }
  const todayDate = new Date();
  const today = todayDate.getFullYear() + "-" + String(todayDate.getMonth()+1).padStart(2,"0") + "-" + String(todayDate.getDate()).padStart(2,"0");
  const [animals, due, meds] = await Promise.all([
    db.from("alfik_rescue_animals").select("id",{count:"exact",head:true}).eq("org_id",orgId),
    db.from("alfik_care_schedules").select("id",{count:"exact",head:true}).eq("org_id",orgId).eq("enabled",true).lte("next_due_date",today),
    db.from("alfik_rescue_animal_medications").select("id",{count:"exact",head:true}).eq("org_id",orgId)
  ]);
  if(animalCount) animalCount.textContent = animals.error ? "—" : String(animals.count ?? 0);
  if(dueCount) dueCount.textContent = due.error ? "—" : String(due.count ?? 0);
  if(medicationCount) medicationCount.textContent = meds.error ? "—" : String(meds.count ?? 0);
} catch(error) {
  console.warn("ALFIK rescue dashboard summary:", error);
  if (overview) {
    const detail = document.createElement("p");
    detail.textContent = "Could not load organisation details. Please try refreshing the workspace.";
    overview.replaceChildren(detail);
  }
  [animalCount,dueCount,medicationCount].forEach(node => { if(node) node.textContent = "—"; });
}
}

async function loadRescueWorkspace() {
const db = client();
const list = el("rescueAnimalList");
const orgSelect = el("rescueOrgSelect");

if (list) list.replaceChildren();
if (orgSelect) {
  orgSelect.replaceChildren();
  const option = document.createElement("option");
  option.value = "";
  option.textContent = "Choose an organisation";
  orgSelect.appendChild(option);
}

const user = await currentUser();
if (!user) return;

if (!(await hasPlan("premium"))) {
  if (list) list.textContent = "Upgrade to Premium to use the rescue workspace.";
  return;
}

if (!db) return;

try {
  const membership = await db
    .from("alfik_org_members")
    .select("org_id,role,alfik_organisations(id,name,org_type,verification_status)")
    .eq("user_id", user.id);

  if (membership.error) throw membership.error;

  const organisations = [];

  (membership.data || []).forEach(row => {
    const org = row.alfik_organisations;
    if (!org) return;

    organisations.push(org);

    if (orgSelect) {
      const option = document.createElement("option");
      option.value = org.id;
      option.textContent = org.name + (org.verification_status === "verified" ? " ✓ ALFIK Verified" : " (" + (org.verification_status || "unverified") + ")");
      orgSelect.appendChild(option);
    }
  });

  if (list) {
    if (!organisations.length) {
      list.textContent = "Create a rescue workspace to begin.";
    } else {
      organisations.forEach(org => {
        const item = card(list, org.name);
        addText(item, "Type", org.org_type);
        addText(item, "Verification", org.verification_status || "unverified");
      });
    }
  }

  await refreshRescueDashboardSummary();
  await loadRescueAnimals();
  await loadRescueCareSchedules();
  await loadRescueMedicationList();
  await loadCareNotifications();
  await loadOrganisationVerificationStatus();
  await loadVerificationAdminQueue();
  await loadLifelinePartnerWorkspace();
} catch (error) {
  console.warn("ALFIK rescue workspace:", error);
  say("rescueAnimalMessage", "Could not load rescue workspaces: " + readableError(error));
}

}

async function createRescueOrganisation() {
const db = client();
const user = await currentUser();

if (!db || !user) {
  say("rescueOrgMessage", "Please sign in again.");
  return;
}

if (!(await hasPlan("premium"))) {
  say("rescueOrgMessage", "The rescue workspace requires Premium or Pro.");
  return;
}

const name = el("rescueOrgName").value.trim();
if (!name) {
  say("rescueOrgMessage", "Enter an organisation name.");
  return;
}

const button = el("createRescueOrgBtn");
if (button) button.disabled = true;
say("rescueOrgMessage", "Creating rescue workspace...");

try {
  const result = await db.rpc("alfik_create_organisation", {
    p_name: name,
    p_org_type: el("rescueOrgType").value,
    p_contact_details: el("rescueOrgContact").value.trim() || null
  });

  if (result.error) throw result.error;

  say("rescueOrgMessage", "Rescue workspace created. It is not automatically verified.");
  await loadRescueWorkspace();
} catch (error) {
  console.error("ALFIK rescue workspace creation failed:", error);
  say(
    "rescueOrgMessage",
    "Could not create the rescue workspace: " + readableError(error)
  );
} finally {
  if (button) button.disabled = false;
}

}

async function saveRescueAnimal() {
const db = client();
const user = await currentUser();

if (!db || !user) {
  say("rescueAnimalMessage", "Please sign in again.");
  return;
}

if (!(await hasPlan("premium"))) {
  say("rescueAnimalMessage", "The rescue workspace requires Premium or Pro.");
  return;
}

const orgId = el("rescueOrgSelect").value;
const name = el("rescueAnimalName").value.trim();

if (!orgId || !name) {
  say("rescueAnimalMessage", "Choose an organisation and enter an animal name or reference.");
  return;
}

const animal = {
  org_id: orgId,
  name,
  species: el("rescueAnimalType").value,
  status: el("rescueAnimalStatus").value,
  microchip: el("rescueAnimalMicrochip")?.value.trim() || null,
  neutering_status: el("rescueAnimalNeuteringStatus")?.value || "unknown",
  neutered_date: el("rescueAnimalNeuteredDate")?.value || null,
  care_reminders_enabled: el("rescueAnimalStatus").value !== "rehomed",
  notes: el("rescueAnimalNotes").value.trim() || null
};

try {
  const result = await db.from("alfik_rescue_animals").insert([animal]);
  if (result.error) throw result.error;

  el("rescueAnimalName").value = "";
  el("rescueAnimalNotes").value = "";

  say("rescueAnimalMessage", "Rescue animal saved.");
  await loadRescueAnimals();
  await refreshRescueDashboardSummary();
} catch (error) {
  console.error("ALFIK save rescue animal:", error);
  say("rescueAnimalMessage", "Could not save the animal: " + readableError(error));
}

}

async function loadRescueAnimals() {
const db = client();
const user = await currentUser();
const list = el("rescueAnimalList");
const orgId = el("rescueOrgSelect")?.value;

if (!db || !user || !list) return;
list.replaceChildren();

if (!orgId) {
  list.textContent = "Choose an organisation to view its animal register.";
  return;
}

try {
  const result = await db
    .from("alfik_rescue_animals")
    .select("id,name,species,status,notes,microchip,neutering_status,neutered_date,care_reminders_enabled")
    .eq("org_id", orgId)
    .order("name");

  if (result.error) throw result.error;

  const careAnimalSelect = el("rescueCareAnimal");
  const medAnimalSelect = el("rescueMedicationAnimal");
  [careAnimalSelect, medAnimalSelect].forEach(target => {
    if (!target) return;
    target.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose an animal";
    target.appendChild(placeholder);
  });
  (result.data || []).forEach(animal => {
    [careAnimalSelect, medAnimalSelect].forEach(target => {
      if (!target) return;
      const option = document.createElement("option");
      option.value = animal.id;
      option.textContent = animal.name + (animal.status === "rehomed" ? " (rehomed)" : "");
      target.appendChild(option);
    });
    const item = card(list, animal.name);
    addText(item, "Species", animal.species);
    addText(item, "Status", animal.status);
    addText(item, "Care reminders", animal.care_reminders_enabled && animal.status !== "rehomed" ? "On" : "Off");
    addText(item, "Microchip", animal.microchip);
    addText(item, "Neutering status", ({neutered:"Neutered / spayed",not_neutered:"Not neutered",unknown:"Unknown / not confirmed"})[animal.neutering_status] || "Unknown / not confirmed");
    addText(item, "Date neutered", animal.neutered_date);
    addText(item, "Notes", animal.notes);
    if (animal.status !== "rehomed" && animal.status !== "reunited" && animal.status !== "closed") {
      const rehome = document.createElement("button");
      rehome.className = "secondary";
      rehome.textContent = "Mark rehomed and stop reminders";
      rehome.addEventListener("click", async () => {
        if (!window.confirm("Mark this animal as rehomed and turn off its rescue care reminders?")) return;
        const update = await db.from("alfik_rescue_animals").update({status:"rehomed",care_reminders_enabled:false}).eq("id",animal.id).eq("org_id",orgId);
        if (update.error) { say("rescueAnimalMessage","Could not update animal: "+readableError(update.error)); return; }
        const schedules = await db.from("alfik_care_schedules").update({enabled:false}).eq("rescue_animal_id",animal.id);
        if (schedules.error) say("rescueAnimalMessage","Animal marked rehomed, but reminders could not all be switched off: "+readableError(schedules.error));
        else say("rescueAnimalMessage","Animal marked rehomed. Rescue reminders are off.");
        await loadRescueAnimals();
        await loadRescueCareSchedules();
      });
      item.appendChild(rehome);
    }
  });

  if (!(result.data || []).length) {
    list.textContent = "No rescue animals recorded yet.";
  }
} catch (error) {
  console.warn("ALFIK rescue animals:", error);
  list.textContent = "Could not load the animal register: " + readableError(error);
}

}

async function saveRescueMedication(){
const db=client(),user=await currentUser(),orgId=el("rescueOrgSelect")?.value,animalId=el("rescueMedicationAnimal")?.value;
if(!db||!user)return say("rescueMedicationMessage","Please sign in again.");
if(!(await hasPlan("premium")))return say("rescueMedicationMessage","Rescue medication lists require Premium or Pro.");
const name=el("rescueMedicationName").value.trim();
if(!orgId||!animalId||!name)return say("rescueMedicationMessage","Choose an animal and enter a medication name.");
try{
 const r=await db.from("alfik_rescue_animal_medications").insert([{
  org_id:orgId,rescue_animal_id:animalId,medication_name:name,
  dose:el("rescueMedicationDose").value.trim()||null,
  frequency:el("rescueMedicationFrequency").value.trim()||null,
  start_date:el("rescueMedicationStart").value||null,
  end_date:el("rescueMedicationEnd").value||null,
  instructions:el("rescueMedicationInstructions").value.trim()||null,
  created_by:user.id
 }]);
 if(r.error)throw r.error;
 ["rescueMedicationName","rescueMedicationDose","rescueMedicationFrequency","rescueMedicationStart","rescueMedicationEnd","rescueMedicationInstructions"].forEach(id=>{if(el(id))el(id).value="";});
 say("rescueMedicationMessage","Rescue medication saved.");await loadRescueMedicationList();await refreshRescueDashboardSummary();
}catch(e){say("rescueMedicationMessage","Could not save rescue medication: "+readableError(e));}
}

async function loadRescueMedicationList(){
const db=client(),list=el("rescueMedicationList"),orgId=el("rescueOrgSelect")?.value,animalId=el("rescueMedicationAnimal")?.value;
if(!db||!list)return;list.replaceChildren();
if(!orgId||!animalId){list.textContent="Choose an organisation and animal to view medications.";return;}
try{
 const r=await db.from("alfik_rescue_animal_medications").select("medication_name,dose,frequency,start_date,end_date,instructions").eq("org_id",orgId).eq("rescue_animal_id",animalId).order("created_at",{ascending:false});
 if(r.error)throw r.error;
 (r.data||[]).forEach(m=>{const item=card(list,m.medication_name);addText(item,"Dose",m.dose);addText(item,"Frequency",m.frequency);addText(item,"Dates",(m.start_date||"")+(m.end_date?" to "+m.end_date:""));addText(item,"Instructions",m.instructions);
 edit.addEventListener("click",async()=>{
  const name=window.prompt("Medication name",m.medication_name||"");if(name===null)return;
  const dose=window.prompt("Dose",m.dose||"");if(dose===null)return;
  const frequency=window.prompt("Frequency",m.frequency||"");if(frequency===null)return;
  const start=window.prompt("Start date (YYYY-MM-DD, optional)",m.start_date||"");if(start===null)return;
  const end=window.prompt("End date (YYYY-MM-DD, optional)",m.end_date||"");if(end===null)return;
  const instructions=window.prompt("Instructions (optional)",m.instructions||"");if(instructions===null)return;
  if(!name.trim())return say("medicationMessage","Medication name is required.");
  const current=await currentUser();
  const update=await client().from("alfik_animal_medications").update({medication_name:name.trim(),dose:dose.trim()||null,frequency:frequency.trim()||null,start_date:start.trim()||null,end_date:end.trim()||null,instructions:instructions.trim()||null}).eq("id",m.id).eq("owner_id",current.id).eq("pet_id",petId);
  if(update.error)return say("medicationMessage","Could not update medication: "+readableError(update.error));
  say("medicationMessage","Medication updated.");await loadMedicationList();
 });item.appendChild(edit);
 });
 if(!(r.data||[]).length)list.textContent="No medications recorded for this rescue animal.";
}catch(e){list.textContent="Could not load rescue medications: "+readableError(e);}
}

async function refreshAlfikNotificationBadge() {
const badge=el("headerNotificationCount"),bell=el("headerNotificationBell");
if(!badge||!bell)return;
const db=client(),user=await currentUser();
if(!db||!user){badge.textContent="0";badge.classList.add("hidden");bell.classList.add("hidden");return;}
bell.classList.remove("hidden");
try{
 const result=await db.from("alfik_in_app_notifications").select("id",{count:"exact",head:true}).eq("user_id",user.id).is("read_at",null);
 if(result.error)throw result.error;
 const count=Number(result.count||0);
 badge.textContent=count>99?"99+":String(count);
 badge.classList.toggle("hidden",count===0);
 badge.setAttribute("aria-label",count+" unread notifications");
 bell.setAttribute("aria-label",count?("Open notifications, "+count+" unread"): "Open notifications");
}catch(error){badge.classList.add("hidden");console.warn("ALFIK notification count:",error);}
}

async function loadCareNotifications() {
const db=client(),user=await currentUser(),list=el("careNotificationsList"),detail=el("careNotificationDetail");
if(!list)return;
list.replaceChildren();
if(detail){detail.replaceChildren();detail.classList.add("hidden");}
if(!db||!user){list.textContent="Sign in to view your notifications.";if(window.refreshAlfikNotificationBadge)await window.refreshAlfikNotificationBadge();return;}
try{
 const r=await db.from("alfik_in_app_notifications").select("id,title,body,due_date,created_at,read_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50);
 if(r.error)throw r.error;
 const notifications=r.data||[];
 notifications.forEach(n=>{
   const item=document.createElement("article");
   item.className="notification-item"+(n.read_at?"":" unread");
   const heading=document.createElement("h4");heading.textContent=n.title||"Notification";item.appendChild(heading);
   const summary=document.createElement("p");
   const preview=String(n.body||"").trim();
   summary.textContent=preview.length>120?preview.slice(0,117)+"…":preview||"Open to view this notification.";
   item.appendChild(summary);
   const meta=document.createElement("p");meta.className="note";
   meta.textContent=(n.created_at?new Date(n.created_at).toLocaleString():"Date unavailable")+" · "+(n.read_at?"Read":"Unread");
   item.appendChild(meta);
   const open=document.createElement("button");open.type="button";open.className="secondary";open.textContent="Open notification";
   open.addEventListener("click",async()=>{
     if(!detail)return;
     detail.replaceChildren();detail.classList.remove("hidden");
     const title=document.createElement("h3");title.textContent=n.title||"Notification";detail.appendChild(title);
     const body=document.createElement("p");body.textContent=n.body||"There are no extra details for this notification.";detail.appendChild(body);
     if(n.due_date){const due=document.createElement("p");due.textContent="Due date: "+n.due_date;detail.appendChild(due);}
     if(String(n.title||"").toLowerCase().includes("possible animal match")){
       const reportMatch=String(n.body||"").match(/Report #([A-Za-z0-9_-]+)/i);
       if(reportMatch){
         const viewReport=document.createElement("button");
         viewReport.type="button";viewReport.className="primary";viewReport.textContent="View matching report & message privately";
         viewReport.addEventListener("click",async()=>{
           viewReport.disabled=true;viewReport.textContent="Opening report...";
           if(typeof window.openAlfikReportFromNotification==="function"){
             await window.openAlfikReportFromNotification(reportMatch[1]);
           }else{
             viewReport.disabled=false;viewReport.textContent="View matching report & message privately";
             say("careNotificationsMessage","Please refresh ALFIK and try again.");
           }
         });
         detail.appendChild(viewReport);
       }
     }
     if(n.created_at){const created=document.createElement("p");created.className="note";created.textContent="Received: "+new Date(n.created_at).toLocaleString();detail.appendChild(created);}
     if(!n.read_at){
       const mark=document.createElement("button");mark.type="button";mark.className="primary";mark.textContent="Mark as read";
       mark.addEventListener("click",async()=>{
         mark.disabled=true;
         const update=await db.from("alfik_in_app_notifications").update({read_at:new Date().toISOString()}).eq("id",n.id).eq("user_id",user.id);
         if(update.error){mark.disabled=false;say("careNotificationsMessage","Could not mark notification as read: "+readableError(update.error));return;}
         say("careNotificationsMessage","Notification marked as read.");
         await loadCareNotifications();
       });
       detail.appendChild(mark);
     }else{const read=document.createElement("p");read.className="note";read.textContent="You have read this notification.";detail.appendChild(read);}
     detail.scrollIntoView({behavior:"smooth",block:"nearest"});
   });
   item.appendChild(open);list.appendChild(item);
 });
 if(!notifications.length)list.textContent="You're all caught up. No notifications yet.";
 if(window.refreshAlfikNotificationBadge)await window.refreshAlfikNotificationBadge();
}catch(e){list.textContent="Could not load notifications: "+readableError(e);}
}

async function saveMedication() {
const db = client();
const user = await currentUser();
if (!db || !user) return say("medicationMessage", "Please sign in again.");
const planMessage = await planAccessMessage("premium");
if (planMessage) return say("medicationMessage", planMessage);
const petId = el("medicationPet").value;
const name = el("medicationName").value.trim();
if (!petId || !name) return say("medicationMessage", "Choose a pet and enter a medication name.");
try {
  const result = await db.from("alfik_animal_medications").insert([{
    owner_id:user.id, pet_id:petId, medication_name:name,
    dose:el("medicationDose").value.trim() || null,
    frequency:el("medicationFrequency").value.trim() || null,
    start_date:el("medicationStart").value || null,
    end_date:el("medicationEnd").value || null,
    instructions:el("medicationInstructions").value.trim() || null
  }]);
  if (result.error) throw result.error;
  ["medicationName","medicationDose","medicationFrequency","medicationStart","medicationEnd","medicationInstructions"].forEach(id => { if(el(id)) el(id).value=""; });
  say("medicationMessage","Medication saved privately.");
  await loadMedicationList();
} catch(error) { say("medicationMessage","Could not save medication: "+readableError(error)); }
}

async function loadMedicationList() {
const db=client(), user=await currentUser(), list=el("medicationList"), petId=el("medicationPet")?.value;
if(!db||!user||!list)return;
list.replaceChildren();
const planMessage = await planAccessMessage("premium");
if(planMessage){list.textContent=planMessage;return;}
if(!petId){list.textContent="Choose a pet to view medications.";return;}
try{
 const r=await db.from("alfik_animal_medications").select("id,medication_name,dose,frequency,start_date,end_date,instructions,active").eq("owner_id",user.id).eq("pet_id",petId).order("created_at",{ascending:false});
 if(r.error)throw r.error;
 (r.data||[]).forEach(m=>{
 const item=card(list,m.medication_name);addText(item,"Dose",m.dose);addText(item,"Frequency",m.frequency);addText(item,"Dates",(m.start_date||"")+(m.end_date?" to "+m.end_date:""));addText(item,"Instructions",m.instructions);
 const edit=document.createElement("button");edit.type="button";edit.className="secondary";edit.textContent="Edit medication";
 edit.addEventListener("click",async()=>{
  const name=window.prompt("Medication name",m.medication_name||"");if(name===null)return;
  const dose=window.prompt("Dose",m.dose||"");if(dose===null)return;
  const frequency=window.prompt("Frequency",m.frequency||"");if(frequency===null)return;
  const start=window.prompt("Start date (YYYY-MM-DD, optional)",m.start_date||"");if(start===null)return;
  const end=window.prompt("End date (YYYY-MM-DD, optional)",m.end_date||"");if(end===null)return;
  const instructions=window.prompt("Instructions (optional)",m.instructions||"");if(instructions===null)return;
  if(!name.trim())return say("medicationMessage","Medication name is required.");
  if(start.trim()&&end.trim()&&end.trim()<start.trim())return say("medicationMessage","End date cannot be before start date.");
  const current=await currentUser();
  const update=await client().from("alfik_animal_medications").update({medication_name:name.trim(),dose:dose.trim()||null,frequency:frequency.trim()||null,start_date:start.trim()||null,end_date:end.trim()||null,instructions:instructions.trim()||null}).eq("id",m.id).eq("owner_id",current.id).eq("pet_id",petId);
  if(update.error)return say("medicationMessage","Could not update medication: "+readableError(update.error));
  say("medicationMessage","Medication updated.");await loadMedicationList();
 });item.appendChild(edit);
 const remove=document.createElement("button");remove.type="button";remove.className="secondary";remove.textContent="Delete medication";
 remove.addEventListener("click",async()=>{
  if(!window.confirm("Delete this medication record? This cannot be undone."))return;
  const current=await currentUser();
  const deletion=await client().from("alfik_animal_medications").delete().eq("id",m.id).eq("owner_id",current.id).eq("pet_id",petId);
  if(deletion.error)return say("medicationMessage","Could not delete medication: "+readableError(deletion.error));
  say("medicationMessage","Medication deleted.");await loadMedicationList();
 });item.appendChild(remove);
 });
 if(!(r.data||[]).length)list.textContent="No medications recorded for this pet.";
}catch(e){list.textContent="Could not load medications: "+readableError(e);}
}

async function saveCareSchedule() {
const db=client(),user=await currentUser();
if(!db||!user)return say("careMessage","Please sign in again.");
const planMessage = await planAccessMessage("premium");
if(planMessage)return say("careMessage",planMessage);
const petId=el("carePet").value, due=el("careDue").value, type=el("careType").value;
if(!petId||!due)return say("careMessage","Choose a pet and next due date.");
try{
 const r=await db.from("alfik_care_schedules").insert([{
  schedule_type:type,owner_id:user.id,pet_id:petId,treatment_name:el("careName").value.trim()||null,
  interval_days:Number(el("careInterval").value)||null,next_due_date:due,enabled:el("careEnabled").checked,
  advance_notice_days:0,created_by:user.id
 }]);
 if(r.error)throw r.error;
 el("careName").value="";say("careMessage","Reminder saved.");await loadCareSchedules();
}catch(e){say("careMessage","Could not save reminder: "+readableError(e));}
}

async function loadCareSchedules() {
const db=client(),user=await currentUser(),list=el("careList"),petId=el("carePet")?.value;
if(!db||!user||!list)return;list.replaceChildren();
const planMessage = await planAccessMessage("premium");
if(planMessage){list.textContent=planMessage;return;}
if(!petId){list.textContent="Choose a pet to view reminders.";return;}
try{
 const r=await db.from("alfik_care_schedules").select("id,schedule_type,treatment_name,interval_days,next_due_date,enabled").eq("owner_id",user.id).eq("pet_id",petId).order("next_due_date");
 if(r.error)throw r.error;
 (r.data||[]).forEach(s=>{const item=card(list,(s.schedule_type==="flea"?"Flea treatment":s.schedule_type==="worming"?"Worming":"Medication")+(s.treatment_name?" · "+s.treatment_name:""));addText(item,"Next due",s.next_due_date);addText(item,"Repeat",s.interval_days?s.interval_days+" days":"No repeat interval");addText(item,"Status",s.enabled?"On":"Off");
 const edit=document.createElement("button");edit.type="button";edit.className="secondary";edit.textContent="Edit reminder";
 edit.addEventListener("click",async()=>{
  const type=window.prompt("Type: flea, worming or medication",s.schedule_type||"flea");if(type===null)return;
  const name=window.prompt("Treatment name (optional)",s.treatment_name||"");if(name===null)return;
  const due=window.prompt("Next due date (YYYY-MM-DD)",s.next_due_date||"");if(due===null)return;
  const interval=window.prompt("Repeat interval in days (blank for none)",s.interval_days==null?"":String(s.interval_days));if(interval===null)return;
  const enabled=window.confirm("Keep this reminder turned on? Choose OK for On, Cancel for Off.");
  if(!["flea","worming","medication"].includes(type.trim().toLowerCase()))return say("careMessage","Type must be flea, worming or medication.");
  if(!due.trim())return say("careMessage","Next due date is required.");
  const parsedInterval=interval.trim()?Number(interval.trim()):null;
  if(parsedInterval!==null&&(!Number.isInteger(parsedInterval)||parsedInterval<1))return say("careMessage","Repeat interval must be a whole number of days.");
  const current=await currentUser();
  const update=await client().from("alfik_care_schedules").update({schedule_type:type.trim().toLowerCase(),treatment_name:name.trim()||null,next_due_date:due.trim(),interval_days:parsedInterval,enabled}).eq("id",s.id).eq("owner_id",current.id).eq("pet_id",petId);
  if(update.error)return say("careMessage","Could not update reminder: "+readableError(update.error));
  say("careMessage","Reminder updated.");await loadCareSchedules();await loadCareNotifications();
 });item.appendChild(edit);
 const remove=document.createElement("button");remove.type="button";remove.className="secondary";remove.textContent="Delete reminder";
 remove.addEventListener("click",async()=>{
  if(!window.confirm("Delete this care reminder? This cannot be undone."))return;
  const current=await currentUser();
  const deletion=await client().from("alfik_care_schedules").delete().eq("id",s.id).eq("owner_id",current.id).eq("pet_id",petId);
  if(deletion.error)return say("careMessage","Could not delete reminder: "+readableError(deletion.error));
  say("careMessage","Reminder deleted.");await loadCareSchedules();await loadCareNotifications();
 });item.appendChild(remove);
 const b=document.createElement("button");b.className="secondary";b.textContent=s.enabled?"Turn off":"Turn on";b.addEventListener("click",()=>toggleCareSchedule(s.id,!s.enabled));item.appendChild(b);});
 if(!(r.data||[]).length)list.textContent="No reminders set for this pet.";
}catch(e){list.textContent="Could not load reminders: "+readableError(e);}
}

async function toggleCareSchedule(id,enabled){
const db=client();if(!db)return;
const r=await db.from("alfik_care_schedules").update({enabled}).eq("id",id);
if(r.error){say("careMessage","Could not update reminder: "+readableError(r.error));return;}await loadCareSchedules();
}

async function saveRescueCareSchedule(){
const db=client(),user=await currentUser();
if(!db||!user)return say("rescueCareMessage","Please sign in again.");
if(!(await hasPlan("premium")))return say("rescueCareMessage","Rescue reminders require Premium or Pro.");
const animalId=el("rescueCareAnimal").value,due=el("rescueCareDue").value,orgId=el("rescueOrgSelect").value;
if(!animalId||!due||!orgId)return say("rescueCareMessage","Choose an animal and next due date.");
try{
 const r=await db.from("alfik_care_schedules").insert([{
  schedule_type:el("rescueCareType").value,org_id:orgId,rescue_animal_id:animalId,
  treatment_name:el("rescueCareName").value.trim()||null,interval_days:Number(el("rescueCareInterval").value)||null,
  next_due_date:due,enabled:el("rescueCareEnabled").checked,advance_notice_days:0,created_by:user.id
 }]);
 if(r.error)throw r.error;
 el("rescueCareName").value="";say("rescueCareMessage","Rescue reminder saved.");await loadRescueCareSchedules();await refreshRescueDashboardSummary();
}catch(e){say("rescueCareMessage","Could not save rescue reminder: "+readableError(e));}
}

async function loadRescueCareSchedules(){
const db=client(),list=el("rescueCareList"),orgId=el("rescueOrgSelect")?.value,animalId=el("rescueCareAnimal")?.value;
if(!db||!list)return;list.replaceChildren();
if(!orgId||!animalId){list.textContent="Choose an organisation and animal to view reminders.";return;}
try{
 const r=await db.from("alfik_care_schedules").select("id,schedule_type,treatment_name,interval_days,next_due_date,enabled").eq("org_id",orgId).eq("rescue_animal_id",animalId).order("next_due_date");
 if(r.error)throw r.error;
 (r.data||[]).forEach(s=>{const item=card(list,(s.schedule_type==="flea"?"Flea treatment":s.schedule_type==="worming"?"Worming":"Medication")+(s.treatment_name?" · "+s.treatment_name:""));addText(item,"Next due",s.next_due_date);addText(item,"Repeat",s.interval_days?s.interval_days+" days":"No repeat interval");addText(item,"Status",s.enabled?"On":"Off");const b=document.createElement("button");b.className="secondary";b.textContent=s.enabled?"Turn off":"Turn on";b.addEventListener("click",async()=>{const u=await db.from("alfik_care_schedules").update({enabled:!s.enabled}).eq("id",s.id);if(u.error)say("rescueCareMessage","Could not update reminder: "+readableError(u.error));else await loadRescueCareSchedules();});item.appendChild(b);});
 if(!(r.data||[]).length)list.textContent="No reminders set for this rescue animal.";
}catch(e){list.textContent="Could not load rescue reminders: "+readableError(e);}
}

async function loadVetWorkspace() {
const db = client();
const list = el("vetPatientList");
const orgSelect = el("vetOrgSelect");

if (list) list.replaceChildren();
if (orgSelect) {
  orgSelect.replaceChildren();
  const option = document.createElement("option");
  option.value = "";
  option.textContent = "Choose a practice";
  orgSelect.appendChild(option);
}

const user = await currentUser();
if (!user) return;

if (!(await hasPlan("pro"))) {
  if (list) list.textContent = "Upgrade to Pro to use the veterinary workspace.";
  return;
}

if (!db) return;

try {
  const result = await db
    .from("alfik_org_members")
    .select("org_id,alfik_organisations(id,name,org_type,verification_status)")
    .eq("user_id", user.id);

  if (result.error) throw result.error;

  (result.data || []).forEach(row => {
    const org = row.alfik_organisations;
    if (!org || org.org_type !== "veterinary") return;

    const option = document.createElement("option");
    option.value = org.id;
    option.textContent = org.name + " (" + (org.verification_status || "unverified") + ")";
    orgSelect.appendChild(option);
  });

  await loadVetPatients();
} catch (error) {
  console.warn("ALFIK veterinary workspace:", error);
  say("vetPatientMessage", "Could not load veterinary workspaces: " + readableError(error));
}

}

async function createVetOrganisation() {
const db = client();
const user = await currentUser();

if (!db || !user) {
  say("vetOrgMessage", "Please sign in again.");
  return;
}

if (!(await hasPlan("pro"))) {
  say("vetOrgMessage", "The veterinary workspace requires Pro.");
  return;
}

const name = el("vetOrgName").value.trim();
if (!name) {
  say("vetOrgMessage", "Enter a practice name.");
  return;
}

const button = el("createVetOrgBtn");
if (button) button.disabled = true;
say("vetOrgMessage", "Creating veterinary workspace...");

try {
  const result = await db.rpc("alfik_create_organisation", {
    p_name: name,
    p_org_type: "veterinary",
    p_contact_details: el("vetOrgContact").value.trim() || null
  });

  if (result.error) throw result.error;

  say("vetOrgMessage", "Veterinary workspace created. Verification is not automatic.");
  await loadVetWorkspace();
} catch (error) {
  console.error("ALFIK veterinary workspace creation failed:", error);
  say(
    "vetOrgMessage",
    "Could not create the veterinary workspace: " + readableError(error)
  );
} finally {
  if (button) button.disabled = false;
}

}

async function saveVetPatient() {
const db = client();
const user = await currentUser();

if (!db || !user) {
  say("vetPatientMessage", "Please sign in again.");
  return;
}

if (!(await hasPlan("pro"))) {
  say("vetPatientMessage", "The veterinary workspace requires Pro.");
  return;
}

const orgId = el("vetOrgSelect").value;
const name = el("vetPatientName").value.trim();

if (!orgId || !name) {
  say("vetPatientMessage", "Choose a practice and enter a patient name or reference.");
  return;
}

try {
  const result = await db.from("alfik_vet_patients").insert([{
    org_id: orgId,
    patient_name: name,
    species: el("vetSpecies").value,
    owner_reference: el("vetOwnerReference").value.trim() || null,
    clinical_notes: el("vetPatientNotes").value.trim() || null
  }]);

  if (result.error) throw result.error;

  el("vetPatientName").value = "";
  el("vetOwnerReference").value = "";
  el("vetPatientNotes").value = "";

  say("vetPatientMessage", "Patient record saved.");
  await loadVetPatients();
} catch (error) {
  console.error("ALFIK save veterinary patient:", error);
  say("vetPatientMessage", "Could not save the patient: " + readableError(error));
}

}

async function loadVetPatients() {
const db = client();
const user = await currentUser();
const list = el("vetPatientList");
const orgId = el("vetOrgSelect")?.value;

if (!db || !user || !list) return;
list.replaceChildren();

if (!orgId) {
  list.textContent = "Choose a practice to view its patient register.";
  return;
}

try {
  const result = await db
    .from("alfik_vet_patients")
    .select("patient_name,species,owner_reference,clinical_notes")
    .eq("org_id", orgId)
    .order("patient_name")
    .limit(200);

  if (result.error) throw result.error;

  (result.data || []).forEach(patient => {
    const item = card(list, patient.patient_name);
    addText(item, "Species", patient.species);
    addText(item, "Owner reference", patient.owner_reference);
    addText(item, "Clinical notes", patient.clinical_notes);
  });

  if (!(result.data || []).length) {
    list.textContent = "No patients recorded yet.";
  }
} catch (error) {
  console.warn("ALFIK veterinary patients:", error);
  list.textContent = "Could not load the patient register: " + readableError(error);
}

}

async function loadVerifiedRescueDirectory() {
const db = client();
const list = el("verifiedRescueList");
if (!db || !list) return;
list.textContent = "Loading verified rescues...";
try {
  const result = await db.rpc("alfik_list_verified_rescues");
  if (result.error) throw result.error;
  list.replaceChildren();
  const rows = Array.isArray(result.data) ? result.data : [];
  if (!rows.length) {
    list.textContent = "No organisations have completed ALFIK verification yet.";
    return;
  }
  rows.forEach(org => {
    const item = document.createElement("article");
    item.className = "report-card";
    const heading = document.createElement("h3");
    heading.textContent = org.name || "Verified rescue";
    item.appendChild(heading);
    const badge = document.createElement("span");
    badge.className = "badge own";
    badge.textContent = "✓ ALFIK Verified";
    item.appendChild(badge);
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "Reviewed by an ALFIK administrator.";
    item.appendChild(note);
    list.appendChild(item);
  });
} catch (error) {
  list.textContent = "Could not load verified rescues. Please refresh and try again.";
  console.warn("ALFIK verified rescue directory:", error);
}
}

async function loadOrganisationVerificationStatus() {
const db = client();
const orgId = el("rescueOrgSelect")?.value;
const note = el("verificationStatusNote");
const details = el("verificationDetails");
if (!db || !orgId) {
  if (note) note.textContent = "Choose your organisation above to see its current verification status.";
  if (details) details.value = "";
  return;
}
try {
  const result = await db.from("alfik_organisations")
    .select("name,verification_status,verification_details,verification_rejection_reason")
    .eq("id", orgId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error("Organisation details are not available to this account.");
  const org = result.data;
  const status = String(org.verification_status || "unverified").toLowerCase();
  if (note) {
    note.textContent = status === "verified"
      ? "Verified by ALFIK. Thank you for helping keep the community trustworthy."
      : status === "rejected"
        ? "Verification was not approved. Reason: " + (org.verification_rejection_reason || "Please update your details and resubmit.")
        : status === "pending"
          ? "Pending review. Your organisation has not yet been verified."
          : "Not yet submitted for verification.";
  }
  if (details && org.verification_details && !details.value) {
    const match = org.verification_details.split("Rescue information and evidence notes:\n");
    details.value = match.length > 1 ? match.slice(1).join("Rescue information and evidence notes:\n") : org.verification_details;
  }
  const role = el("verificationApplicantRole");
  const websiteInput = el("verificationWebsite");
  const socialInput = el("verificationSocial");
  const regType = el("verificationRegistrationType");
  const regNumber = el("verificationRegistrationNumber");
  const lines = String(org.verification_details || "").split("\n");
  const fieldValue = (prefix) => (lines.find(line => line.startsWith(prefix)) || "").slice(prefix.length).trim();
  if (role && !role.value) role.value = fieldValue("Applicant role: ");
  const savedWebsite = fieldValue("Website: ");
  const savedSocial = fieldValue("Public social page: ");
  // Restore only complete web addresses. Older saved entries without https://
  // can otherwise be mistaken for bad autofill and block an optional submission.
  if (websiteInput && !websiteInput.value && /^https?:\/\//i.test(savedWebsite)) websiteInput.value = savedWebsite;
  if (socialInput && !socialInput.value && /^https?:\/\//i.test(savedSocial)) socialInput.value = savedSocial;
  if (regType && !regType.value) {
    const value = fieldValue("Registration type: ");
    if (Array.from(regType.options).some(option => option.value === value)) regType.value = value;
  }
  if (regNumber && !regNumber.value) regNumber.value = fieldValue("Registration number: ");
} catch (error) {
  if (note) note.textContent = "Could not load verification status: " + readableError(error);
}
}

function isVerificationImage(file) {
  return (file.type || "").toLowerCase().startsWith("image/")
    || /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name || "");
}

async function compressVerificationImage(file) {
  const maxBytes = 5 * 1024 * 1024;
  if (!isVerificationImage(file) || file.size <= maxBytes) return file;

  if (typeof createImageBitmap !== "function") {
    throw new Error("This browser cannot automatically compress this image. Please choose a smaller image or screenshot.");
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    let scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    let blob = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare this image for compression.");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", Math.max(0.58, 0.86 - attempt * 0.04)));
      if (blob && blob.size <= maxBytes) {
        const baseName = file.name.replace(/\.[^.]+$/, "") || "evidence";
        return new File([blob], baseName + "-compressed.jpg", {
          type: "image/jpeg",
          lastModified: Date.now()
        });
      }
      scale *= 0.78;
    }
    throw new Error("This image is still too large after compression. Please choose a smaller image.");
  } finally {
    if (bitmap && typeof bitmap.close === "function") bitmap.close();
  }
}

async function submitOrganisationVerification() {
const db = client();
const orgId = el("rescueOrgSelect")?.value;
const narrative = el("verificationDetails")?.value.trim() || "";
const applicantRole = el("verificationApplicantRole")?.value.trim() || "";
const websiteInput = el("verificationWebsite")?.value.trim() || "";
const socialInput = el("verificationSocial")?.value.trim() || "";
const addHttpsIfMissing = value => value && !/^https?:\/\//i.test(value) ? "https://" + value : value;
const website = addHttpsIfMissing(websiteInput);
const social = addHttpsIfMissing(socialInput);
const registrationType = el("verificationRegistrationType")?.value || "";
const registrationNumber = el("verificationRegistrationNumber")?.value.trim() || "";
let files = Array.from(el("verificationEvidenceFiles")?.files || []);
const details = [
  "Applicant role: " + (applicantRole || "Not provided"),
  "Website: " + (website || "Not provided"),
  "Public social page: " + (social || "Not provided"),
  "Registration type: " + (registrationType || "Not applicable"),
  "Registration number: " + (registrationNumber || "Not provided"),
  "Rescue information and evidence notes:",
  narrative
].join("\n");
const button = el("submitVerificationBtn");
if (!db || !(await currentUser())) {
  say("verificationMessage", "Please sign in again.");
  return;
}
if (!orgId) {
  say("verificationMessage", "Choose your rescue organisation first.");
  return;
}
if (narrative.length < 20) {
  say("verificationMessage", "Please describe your rescue and its work in at least 20 characters.");
  return;
}
if (files.length > 5) {
  say("verificationMessage", "Please upload no more than 5 evidence files.");
  return;
}
try {
  if (files.some(file => isVerificationImage(file) && file.size > 5 * 1024 * 1024)) {
    say("verificationMessage", "Compressing large evidence images on your device...");
    files = await Promise.all(files.map(compressVerificationImage));
  }
} catch (compressionError) {
  say("verificationMessage", readableError(compressionError));
  return;
}
const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
for (const file of files) {
  if (file.size > 5 * 1024 * 1024) {
    say("verificationMessage", "Each evidence file must be 5 MB or smaller.");
    return;
  }
  if (!allowedTypes.includes(file.type)) {
    say("verificationMessage", "Evidence files must be PDF, JPG, PNG or WebP.");
    return;
  }
}
if (website && !/^https:\/\//i.test(website)) {
  say("verificationMessage", "Please enter a valid official website address, or leave it blank.");
  return;
}
if (social && !/^https:\/\//i.test(social)) {
  say("verificationMessage", "Please enter a valid public social page address, or leave it blank.");
  return;
}
if (el("verificationWebsite") && website) el("verificationWebsite").value = website;
if (el("verificationSocial") && social) el("verificationSocial").value = social;
if (button) button.disabled = true;
say("verificationMessage", "Uploading evidence and submitting verification details...");
try {
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    const path = orgId + "/" + crypto.randomUUID() + "-" + safeName;
    const upload = await db.storage.from("alfik-verification-evidence").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type
    });
    if (upload.error) throw upload.error;
  }
  const result = await db.rpc("alfik_submit_organisation_verification", {p_org_id: orgId, p_details: details});
  if (result.error) throw result.error;
  say("verificationMessage", typeof result.data === "string" ? result.data : "Verification details submitted. Status: Pending review.");
  await loadOrganisationVerificationStatus();
  await loadRescueWorkspace();
} catch (error) {
  console.error("ALFIK verification submission:", error);
  say("verificationMessage", "Could not submit verification details: " + readableError(error) + ". Check that the verification SQL migration has been run in Supabase.");
} finally {
  if (button) button.disabled = false;
}
}

async function loadVerificationAdminQueue() {
const db = client();
const panel = el("verificationAdminPanel");
const queue = el("verificationQueue");
if (!panel || !queue) return;
if (!db) {
  panel.classList.remove("hidden");
  queue.textContent = "Supabase is not available on this page. Refresh ALFIK and sign in again.";
  say("verificationAdminMessage", "Admin review could not load because the Supabase client is unavailable.");
  return;
}
try {
  const result = await db.rpc("alfik_admin_list_verification_requests");
  if (result.error) {
    panel.classList.remove("hidden");
    queue.replaceChildren();
    queue.textContent = "Could not load the rescue verification review queue: " + readableError(result.error);
    say("verificationAdminMessage", "Admin review could not load. Check that your account is authorised and the verification migration is installed.");
    console.warn("ALFIK verification admin queue:", result.error);
    return;
  }
  panel.classList.remove("hidden");
  queue.replaceChildren();
  const rows = (Array.isArray(result.data) ? result.data : []).filter(org =>
    ["pending", "unverified"].includes(String(org.verification_status || "unverified").toLowerCase())
  );
  if (!rows.length) {
    queue.textContent = "No organisations are awaiting review.";
    say("verificationAdminMessage", "");
    return;
  }
  rows.forEach(org => {
    const item = document.createElement("article");
    item.className = "report-card";
    const heading = document.createElement("h3");
    heading.textContent = org.name || "Unnamed organisation";
    item.appendChild(heading);
    const info = document.createElement("p");
    info.textContent = "Status: " + (org.verification_status || "unverified") + (org.contact_details ? " | Contact: " + org.contact_details : "");
    item.appendChild(info);
    const evidence = document.createElement("p");
    evidence.textContent = org.verification_details || "No verification details submitted yet.";
    item.appendChild(evidence);
    const filesBox = document.createElement("div");
    filesBox.className = "ai-results";
    const filesHeading = document.createElement("strong");
    filesHeading.textContent = "Private supporting documents";
    filesBox.appendChild(filesHeading);
    const filesList = document.createElement("div");
    filesList.textContent = "Loading evidence documents...";
    filesBox.appendChild(filesList);
    item.appendChild(filesBox);
    (async () => {
      try {
        const storage = db.storage.from("alfik-verification-evidence");
        const listed = await storage.list(org.id, {limit: 20, sortBy: {column: "name", order: "asc"}});
        if (listed.error) throw listed.error;
        filesList.replaceChildren();
        const docs = (listed.data || []).filter(file => file.name && file.id);
        if (!docs.length) {
          filesList.textContent = "No documents uploaded.";
          return;
        }
        for (const file of docs) {
          const path = org.id + "/" + file.name;
          const signed = await storage.createSignedUrl(path, 300);
          const link = document.createElement("a");
          link.textContent = file.name.replace(/^.*?-/, "");
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          if (!signed.error && signed.data?.signedUrl) link.href = signed.data.signedUrl;
          else link.textContent += " (could not create secure link)";
          filesList.appendChild(link);
          filesList.appendChild(document.createElement("br"));
        }
      } catch (err) {
        filesList.textContent = "Could not load evidence documents: " + readableError(err);
      }
    })();
    const submitted = document.createElement("p");
    submitted.textContent = "Submitted: " + (org.verification_submitted_at || "Not submitted");
    item.appendChild(submitted);
    const actions = document.createElement("div");
    actions.className = "actions";
    if (String(org.verification_status || "").toLowerCase() === "verified") {
      const reset = document.createElement("button");
      reset.className = "secondary";
      reset.textContent = "Remove verified badge";
      reset.addEventListener("click", () => returnOrganisationToPending(org.id, org.name));
      actions.appendChild(reset);
    } else {
      const approve = document.createElement("button");
      approve.className = "primary";
      approve.textContent = "Approve and verify";
      approve.addEventListener("click", () => reviewOrganisation(org.id, "verified"));
      const reject = document.createElement("button");
      reject.className = "secondary";
      reject.textContent = "Reject";
      reject.addEventListener("click", () => reviewOrganisation(org.id, "rejected"));
      actions.append(approve, reject);
    }
    item.appendChild(actions);
    queue.appendChild(item);
  });
  say("verificationAdminMessage", "Administrator review queue loaded.");
} catch (error) {
  panel.classList.remove("hidden");
  if (queue) {
    queue.replaceChildren();
    queue.textContent = "Could not load the rescue verification review queue: " + readableError(error);
  }
  say("verificationAdminMessage", "Admin review could not load. Check that your account is authorised and the verification migration is installed.");
  console.warn("ALFIK verification admin queue:", error);
}
}

async function loadVerificationAdminHistory() {
  const db = client(), list = el("verificationHistory");
  if (!db || !list) return;
  try {
    const result = await db.rpc("alfik_admin_list_verification_history");
    if (result.error) throw result.error;
    const panel = el("verificationHistoryPanel"); if (panel) panel.classList.remove("hidden");
    list.replaceChildren();
    const rows = Array.isArray(result.data) ? result.data : [];
    if (!rows.length) { list.textContent = "No completed rescue verification decisions yet."; return; }
    rows.forEach(org => {
      const item = document.createElement("article"); item.className = "report-card";
      const title = document.createElement("h4"); title.textContent = org.name || "Unnamed organisation"; item.appendChild(title);
      const status = document.createElement("p"); status.textContent = "Decision: " + org.verification_status + " | Reviewed: " + (org.verification_reviewed_at ? new Date(org.verification_reviewed_at).toLocaleString() : "Date unavailable"); item.appendChild(status);
      if (org.verification_rejection_reason) { const reason = document.createElement("p"); reason.textContent = "Rejection reason: " + org.verification_rejection_reason; item.appendChild(reason); }
      if (org.verification_details) { const details = document.createElement("p"); details.textContent = "Application details: " + org.verification_details; item.appendChild(details); }
      list.appendChild(item);
    });
  } catch (error) { list.textContent = "Could not load verification history: " + readableError(error) + ". Run the admin history SQL setup."; }
}

async function loadMemberReportsAdminHistory() {
  const db = client(), list = el("memberReportsAdminHistory");
  if (!db || !list) return;
  try {
    const result = await db.rpc("alfik_admin_list_member_safety_report_history");
    if (result.error) throw result.error;
    const panel = el("memberReportsAdminHistoryPanel"); if (panel) panel.classList.remove("hidden");
    list.replaceChildren();
    const rows = Array.isArray(result.data) ? result.data : [];
    if (!rows.length) { list.textContent = "No completed safety reports yet."; return; }
    rows.forEach(report => {
      const item = document.createElement("article"); item.className = "report-card";
      const title = document.createElement("h4"); title.textContent = (report.reason || "other").replace(/_/g, " ").replace(/^./, letter => letter.toUpperCase()); item.appendChild(title);
      const meta = document.createElement("p"); meta.textContent = "Status: " + report.status + " | Submitted: " + (report.created_at ? new Date(report.created_at).toLocaleString() : "Unknown") + " | Reviewed: " + (report.reviewed_at ? new Date(report.reviewed_at).toLocaleString() : "Not recorded"); item.appendChild(meta);
      const details = document.createElement("p"); details.textContent = report.details || "No additional details provided."; item.appendChild(details);
      list.appendChild(item);
    });
  } catch (error) { list.textContent = "Could not load safety report history: " + readableError(error) + ". Run the admin history SQL setup."; }
}

async function returnOrganisationToPending(orgId, orgName) {
const db = client();
if (!db || !(await currentUser())) {
  say("verificationAdminMessage", "Please sign in again.");
  return;
}
const confirmed = window.confirm(
  "Remove the ALFIK verified badge from " + (orgName || "this rescue") +
  "? Its status will return to pending review. The organisation and evidence files will be kept."
);
if (!confirmed) return;
say("verificationAdminMessage", "Removing the verified status...");
try {
  const result = await db.rpc("alfik_admin_return_organisation_to_pending", {p_org_id: orgId});
  if (result.error) throw result.error;
  say("verificationAdminMessage", typeof result.data === "string" ? result.data : "Verification status returned to pending.");
  await loadVerificationAdminQueue();
  await loadVerifiedRescueDirectory();
  await loadOrganisationVerificationStatus();
  await loadRescueWorkspace();
} catch (error) {
  say("verificationAdminMessage", "Could not remove verification: " + readableError(error) + ". Make sure migration 202610240003 has been run in Supabase.");
}
}

async function reviewOrganisation(orgId, decision) {
const db = client();
if (!db || !(await currentUser())) {
  say("verificationAdminMessage", "Please sign in again.");
  return;
}
let reason = null;
if (decision === "rejected") {
  reason = window.prompt("Give the organisation a reason for rejection. They can use this to improve and resubmit:");
  if (reason === null) return;
  if (reason.trim().length < 5) {
    say("verificationAdminMessage", "Please enter a rejection reason of at least 5 characters.");
    return;
  }
}
if (decision === "verified" && !window.confirm("Confirm that you have reviewed the evidence and want to mark this rescue as verified?")) return;
say("verificationAdminMessage", "Saving review decision...");
try {
  const result = await db.rpc("alfik_admin_review_organisation", {p_org_id: orgId, p_decision: decision, p_reason: reason});
  if (result.error) throw result.error;
  say("verificationAdminMessage", typeof result.data === "string" ? result.data : "Review decision saved.");
  await loadVerificationAdminQueue();
  await loadOrganisationVerificationStatus();
  await loadRescueWorkspace();
} catch (error) {
  say("verificationAdminMessage", "Could not save review: " + readableError(error) + ". Check the SQL migration and administrator setup.");
}
}

async function loadMemberReportsAdminQueue() {
const db = client();
const panel = el("memberReportsAdminPanel");
const queue = el("memberReportsAdminQueue");
if (!panel || !queue) return;
if (!db) {
  panel.classList.remove("hidden");
  queue.textContent = "Supabase is not available on this page. Refresh ALFIK and sign in again.";
  say("memberReportsAdminMessage", "Safety reports could not load because the Supabase client is unavailable.");
  return;
}
try {
  const result = await db.rpc("alfik_admin_list_member_safety_reports");
  if (result.error) {
    panel.classList.remove("hidden");
    queue.replaceChildren();
    queue.textContent = "Could not load member safety reports: " + readableError(result.error);
    say("memberReportsAdminMessage", "Safety reports could not load. Check that your account is authorised and the reporting migration is installed.");
    console.warn("ALFIK member safety reports:", result.error);
    return;
  }
  panel.classList.remove("hidden");
  queue.replaceChildren();
  const reports = (Array.isArray(result.data) ? result.data : []).filter(report =>
    ["pending", "reviewing"].includes(String(report.status || "pending").toLowerCase())
  );
  if (!reports.length) {
    queue.textContent = "No member safety reports need action.";
    say("memberReportsAdminMessage", "");
    return;
  }
  reports.forEach(report => {
    const item = document.createElement("article");
    item.className = "report-card";
    const heading = document.createElement("h3");
    heading.textContent = (report.reason || "other").replace(/_/g, " ").replace(/^./, letter => letter.toUpperCase());
    item.appendChild(heading);

    const meta = document.createElement("p");
    meta.textContent = "Status: " + (report.status || "pending") +
      " | Submitted: " + (report.created_at ? new Date(report.created_at).toLocaleString() : "Unknown date");
    item.appendChild(meta);

    const accounts = document.createElement("p");
    accounts.textContent = "Reporter account ending …" + String(report.reporter_id || "").slice(-8) +
      " | Reported account ending …" + String(report.reported_user_id || "").slice(-8);
    item.appendChild(accounts);

    if (report.conversation_id) {
      const conversation = document.createElement("p");
      conversation.textContent = "Private conversation reference: " + report.conversation_id;
      item.appendChild(conversation);
    }

    const details = document.createElement("p");
    details.textContent = report.details || "No additional details provided.";
    item.appendChild(details);

    const actions = document.createElement("div");
    actions.className = "actions";
    const status = String(report.status || "pending").toLowerCase();
    if (status !== "reviewing" && status !== "actioned" && status !== "dismissed") {
      const reviewing = document.createElement("button");
      reviewing.className = "secondary";
      reviewing.textContent = "Mark reviewing";
      reviewing.addEventListener("click", () => reviewMemberSafetyReport(report.id, "reviewing"));
      actions.appendChild(reviewing);
    }
    if (status !== "actioned") {
      const actioned = document.createElement("button");
      actioned.className = "primary";
      actioned.textContent = "Mark actioned";
      actioned.addEventListener("click", () => reviewMemberSafetyReport(report.id, "actioned"));
      actions.appendChild(actioned);
    }
    if (status !== "dismissed") {
      const dismissed = document.createElement("button");
      dismissed.className = "secondary";
      dismissed.textContent = "Dismiss report";
      dismissed.addEventListener("click", () => reviewMemberSafetyReport(report.id, "dismissed"));
      actions.appendChild(dismissed);
    }
    if (actions.childNodes.length) item.appendChild(actions);
    queue.appendChild(item);
  });
  say("memberReportsAdminMessage", "Private member safety report queue loaded.");
} catch (error) {
  panel.classList.remove("hidden");
  if (queue) {
    queue.replaceChildren();
    queue.textContent = "Could not load member safety reports: " + readableError(error);
  }
  say("memberReportsAdminMessage", "Safety reports could not load. Check that your account is authorised and the reporting migration is installed.");
  console.warn("ALFIK member safety admin queue:", error);
}
}

async function reviewMemberSafetyReport(reportId, status) {
const db = client();
const user = await currentUser();
if (!db || !user) {
  say("memberReportsAdminMessage", "Please sign in again before reviewing reports.");
  return;
}
if (!["reviewing", "actioned", "dismissed"].includes(status)) return;
if (status !== "reviewing" && !window.confirm("Confirm you want to mark this safety report as " + status + "?")) return;
say("memberReportsAdminMessage", "Saving moderation decision...");
try {
  const result = await db.from("alfik_user_reports")
    .update({status, reviewed_by: user.id, reviewed_at: new Date().toISOString()})
    .eq("id", reportId)
    .select("id")
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error("No report was updated. Check administrator permissions.");
  say("memberReportsAdminMessage", "Report status updated to " + status + ".");
  await loadMemberReportsAdminQueue();
  await loadVerificationAdminHistory();
  await loadMemberReportsAdminHistory();
} catch (error) {
  say("memberReportsAdminMessage", "Could not update report: " + readableError(error) + ". Check migration 202610240005 and administrator permissions.");
}
}

function wireEvents() {
if (el("premiumPromoDismissBtn")) {
  el("premiumPromoDismissBtn").addEventListener("click", async () => {
    const user = await currentUser();
    if (!user) return;
    const promo = el("premiumPromo");
    if (!promo) return;
    const compact = !promo.classList.contains("compact");
    promo.classList.toggle("compact", compact);
    const heading = el("premiumPromoHeading");
    if (heading) heading.textContent = compact
      ? "Premium pet profiles are available for £5.99/month 🐾"
      : "Make more of your ALFIK account 🐾";
    el("premiumPromoDismissBtn").textContent = compact
      ? "Show Premium details"
      : "Keep this reminder compact";
    try {
      localStorage.setItem("alfik-premium-promo-dismissed-" + user.id, compact ? "yes" : "no");
    } catch (_) {}
  });
}
if (el("petForm")) el("petForm").addEventListener("submit", savePet);
if (el("showAddPetBtn")) el("showAddPetBtn").addEventListener("click", () => {
  resetPetForm();
  el("petForm").classList.remove("hidden");
  el("petForm").scrollIntoView({ behavior: "smooth", block: "start" });
});
if (el("cancelPetEditBtn")) el("cancelPetEditBtn").addEventListener("click", () => {
  resetPetForm();
  el("petForm").classList.add("hidden");
  say("petMessage", "");
});
if (el("saveHealthBtn")) el("saveHealthBtn").addEventListener("click", saveHealthRecord);
if (el("saveVaccinationBtn")) el("saveVaccinationBtn").addEventListener("click", saveVaccination);
if (el("dashboardPetSelect")) el("dashboardPetSelect").addEventListener("change", async () => {
  await loadPetDashboard();
});
if (el("healthPet")) el("healthPet").addEventListener("change", loadHealthRecords);
if (el("vaccinationPet")) el("vaccinationPet").addEventListener("change", loadVaccinations);
if (el("medicationPet")) el("medicationPet").addEventListener("change", loadMedicationList);
if (el("carePet")) el("carePet").addEventListener("change", loadCareSchedules);
if (el("careType")) el("careType").addEventListener("change", () => {
  const interval = el("careInterval");
  if (interval && el("careType").value !== "medication") interval.value = el("careType").value === "flea" ? "28" : "30";
});
if (el("rescueCareType")) el("rescueCareType").addEventListener("change", () => {
  const interval = el("rescueCareInterval");
  if (interval && el("rescueCareType").value !== "medication") interval.value = el("rescueCareType").value === "flea" ? "28" : "30";
});
if (el("saveMedicationBtn")) el("saveMedicationBtn").addEventListener("click", saveMedication);
if (el("refreshCareNotificationsBtn")) el("refreshCareNotificationsBtn").addEventListener("click", loadCareNotifications);
if (el("saveCareBtn")) el("saveCareBtn").addEventListener("click", saveCareSchedule);
if (el("saveRescueCareBtn")) el("saveRescueCareBtn").addEventListener("click", saveRescueCareSchedule);

if (el("createRescueOrgBtn")) {
  el("createRescueOrgBtn").addEventListener("click", createRescueOrganisation);
}

if (el("saveRescueAnimalBtn")) {
  el("saveRescueAnimalBtn").addEventListener("click", saveRescueAnimal);
}

if (el("rescueOrgSelect")) {
  el("rescueOrgSelect").addEventListener("change", async () => {
    await refreshRescueDashboardSummary();
    await loadLifelinePartnerWorkspace();
    await loadRescueAnimals();
    await loadRescueCareSchedules();
    await loadRescueMedicationList();
    await loadOrganisationVerificationStatus();
  });
}
if (el("rescueCareAnimal")) el("rescueCareAnimal").addEventListener("change", loadRescueCareSchedules);
if (el("rescueMedicationAnimal")) el("rescueMedicationAnimal").addEventListener("change", loadRescueMedicationList);
if (el("saveRescueMedicationBtn")) el("saveRescueMedicationBtn").addEventListener("click", saveRescueMedication);
if (el("submitVerificationBtn")) el("submitVerificationBtn").addEventListener("click", submitOrganisationVerification);
if (el("lifelinePartnerListingSelect")) el("lifelinePartnerListingSelect").addEventListener("change", () => {
  const id=el("lifelinePartnerListingSelect").value;
  const row=(window.alfikPartnerLifelineRows||[]).find(x=>x.id===id);
  if(row)fillLifelinePartnerForm(row);else clearLifelinePartnerForm();
});
if (el("saveLifelinePartnerListingBtn")) el("saveLifelinePartnerListingBtn").addEventListener("click", saveLifelinePartnerListing);
if (el("requestLifelineClaimBtn")) el("requestLifelineClaimBtn").addEventListener("click", requestLifelineClaim);
if (el("refreshVerificationQueueBtn")) el("refreshVerificationQueueBtn").addEventListener("click", loadVerificationAdminQueue);
if (el("refreshMemberReportsBtn")) el("refreshMemberReportsBtn").addEventListener("click", loadMemberReportsAdminQueue);
if (el("refreshVerificationHistoryBtn")) el("refreshVerificationHistoryBtn").addEventListener("click", loadVerificationAdminHistory);
if (el("refreshMemberReportsHistoryBtn")) el("refreshMemberReportsHistoryBtn").addEventListener("click", loadMemberReportsAdminHistory);
if (el("refreshVerifiedRescuesBtn")) el("refreshVerifiedRescuesBtn").addEventListener("click", loadVerifiedRescueDirectory);

if (el("createVetOrgBtn")) {
  el("createVetOrgBtn").addEventListener("click", createVetOrganisation);
}

if (el("saveVetPatientBtn")) {
  el("saveVetPatientBtn").addEventListener("click", saveVetPatient);
}

if (el("vetOrgSelect")) {
  el("vetOrgSelect").addEventListener("change", loadVetPatients);
}

}


/* ALFIK Web Push: automatic setup after sign-in, with one browser permission step. */
const ALFIK_VAPID_PUBLIC_KEY = "BP_BnB5gdgMEKR-2BCSvPeoIBHQLF02IpYAa8dSpYgJkf7QXaLGwjsByf0lY1NIYo-51EnC_2qONmGy4fXje23w";
let alfikPushSetupInProgress = false;
let alfikPushAuthListenerAttached = false;

function decodeAlfikVapidKey(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

function ensureAlfikPushPanel() {
  if (!el("alfikPushPanel") && document.querySelector("main")) {
    const panel = document.createElement("section");
    panel.id = "alfikPushPanel";
    panel.innerHTML = '<h2>Phone notifications</h2><p class="note">Allow ALFIK notifications once to receive important updates on this device.</p><button type="button" class="primary wide" id="alfikEnablePushBtn">Allow phone notifications</button><p id="alfikPushMessage" class="note" aria-live="polite"></p>';
    const main = document.querySelector("main");
    const firstSection = main.querySelector("section");
    if (firstSection) firstSection.insertAdjacentElement("afterend", panel);
    else main.prepend(panel);
    el("alfikEnablePushBtn").addEventListener("click", enableAlfikPush);
  }

  // Keep the permission prompt only for people who have not granted it yet.
  // Once permission is granted, hide the entire setup panel from normal users.
  const panel = el("alfikPushPanel");
  if (panel && "Notification" in window && Notification.permission === "granted") {
    panel.hidden = true;
  }

  const db = client();
  if (db && db.auth && !alfikPushAuthListenerAttached) {
    alfikPushAuthListenerAttached = true;
    db.auth.onAuthStateChange((_event, session) => {
      // Defer Supabase calls until its auth-state callback has completed.
      setTimeout(() => {
        if (session && session.user) {
          syncAlfikPushForSignedInUser(false);
          if (window.refreshAlfikNotificationBadge) window.refreshAlfikNotificationBadge();
        } else {
          const bell = el("headerNotificationBell");
          const badge = el("headerNotificationCount");
          if (bell) bell.classList.add("hidden");
          if (badge) badge.classList.add("hidden");
          const status = el("alfikPushMessage");
          if (status) status.textContent = "Sign in to set up phone notifications.";
        }
      }, 0);
    });
  }

  syncAlfikPushForSignedInUser(false);
  if (window.refreshAlfikNotificationBadge) window.refreshAlfikNotificationBadge();
}

async function syncAlfikPushForSignedInUser(requestPermission) {
  if (alfikPushSetupInProgress) return;
  const button = el("alfikEnablePushBtn");
  const status = el("alfikPushMessage");
  const db = client();
  if (!db || !status) return;

  try {
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) {
      status.textContent = "Sign in to ALFIK to set up phone notifications.";
      if (button) button.hidden = false;
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      status.textContent = "Phone notifications are not supported by this browser. Try Chrome on Android.";
      if (button) button.hidden = true;
      return;
    }

    if (Notification.permission !== "granted") {
      if (Notification.permission === "denied") {
        status.textContent = "Notifications are blocked in your browser settings. Allow notifications for alfik.co.uk in Chrome settings, then return here.";
        if (button) button.hidden = true;
        return;
      }
      status.textContent = "One step remains: allow ALFIK to send phone notifications. After that, setup happens automatically whenever you sign in.";
      if (button) {
        button.hidden = false;
        button.textContent = "Allow phone notifications";
      }
      if (!requestPermission) return;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        status.textContent = "Notifications were not enabled. You can allow them in Chrome site settings and return to ALFIK.";
        if (button) button.hidden = false;
        return;
      }
    }

    alfikPushSetupInProgress = true;
    if (button) {
      button.disabled = true;
      button.hidden = true;
    }
    status.textContent = "Setting up phone notifications…";

    const registration = await navigator.serviceWorker.register("/service-worker.js");
    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeAlfikVapidKey(ALFIK_VAPID_PUBLIC_KEY)
      });
    }

    const value = subscription.toJSON();
    const { error: saveError } = await db.from("alfik_push_subscriptions").upsert({
      user_id: user.id,
      endpoint: value.endpoint,
      subscription: value,
      updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });
    if (saveError) throw saveError;

    status.textContent = "Phone notifications are enabled on this device.";
    const panel = el("alfikPushPanel");
    if (panel) panel.hidden = true;
  } catch (error) {
    status.textContent = error && error.message ? error.message : "Could not set up phone notifications.";
    if (button && Notification.permission !== "granted") button.hidden = false;
  } finally {
    alfikPushSetupInProgress = false;
    if (button) button.disabled = false;
  }
}

async function enableAlfikPush() {
  await syncAlfikPushForSignedInUser(true);
}

async function sendAlfikTestPush() {
  const status = el("alfikPushMessage");
  const button = el("alfikTestPushBtn");
  const db = client();
  try {
    button.disabled = true;
    status.textContent = "Sending test notification…";
    const { data, error } = await db.functions.invoke("alfik-test-push", { body: {} });
    if (error) throw error;
    if (data && data.sent) {
      status.textContent = "Push service accepted the notification, but this does not confirm your phone displayed it. Sent: " + data.sent + ", failed: " + (data.failed || 0) + ". If nothing appears, check the function logs for the delivery details.";
    } else {
      status.textContent = "No notification was sent. " + (data && data.error ? data.error : "Check the function logs.");
    }
  } catch (error) {
    status.textContent = error && error.message ? error.message : "The test notification failed.";
  } finally {
    button.disabled = false;
  }
}

window.loadCareNotifications = loadCareNotifications;
window.refreshAlfikNotificationBadge = refreshAlfikNotificationBadge;
window.refreshAlfikProfile = refreshAlfikProfile;
window.renderPayPalButtons = renderPayPalButtons;
window.loadPetWorkspace = loadPetWorkspace;
window.loadRescueWorkspace = loadRescueWorkspace;
window.loadVerifiedRescueDirectory = loadVerifiedRescueDirectory;
window.loadVetWorkspace = loadVetWorkspace;

async function loadAlfikAdminReportQueue() {
  const db = client();
  const panel = el("animalReportsAdminPanel");
  const list = el("animalReportsAdminQueue");
  const status = el("animalReportsAdminMessage");
  if (!panel || !list) return;
  const refreshButton = el("refreshAnimalReportsAdminBtn");
  if (refreshButton && !refreshButton.dataset.wired) {
    refreshButton.dataset.wired = "true";
    refreshButton.addEventListener("click", loadAlfikAdminReportQueue);
  }
  panel.classList.remove("hidden");
  list.textContent = "Loading lost-and-found reports...";
  if (status) status.textContent = "";
  if (!db) { list.textContent = "Supabase is unavailable. Refresh ALFIK and sign in again."; return; }
  try {
    const result = await db.rpc("alfik_admin_list_animal_reports");
    if (result.error) throw result.error;
    const rows = Array.isArray(result.data) ? result.data : [];
    const search = el("animalReportsAdminSearch");
    const render = () => {
      list.replaceChildren();
      const query = String(search?.value || "").trim().toLowerCase();
      const filtered = rows.filter(report => [
        report.report_type, report.animal_type, report.animal_name,
        report.description, report.location_text, report.status, report.owner_id
      ].some(value => String(value || "").toLowerCase().includes(query)));
      if (!filtered.length) {
        list.textContent = rows.length ? "No reports match that search." : "There are no animal reports to display.";
        return;
      }
      filtered.forEach(report => {
        const card = document.createElement("article");
        card.className = "report-card";
        const heading = document.createElement("h3");
        heading.textContent = (report.report_type === "found_deceased" ? "Found deceased" : report.report_type === "found" ? "Found animal" : "Lost animal") + " · " + (report.animal_name || report.animal_type || "Animal");
        card.appendChild(heading);
        const details = document.createElement("p");
        details.textContent = "Type: " + (report.animal_type || "Not specified") + " · Status: " + (report.status || "unknown") + " · Date: " + (report.date_seen || "Not specified");
        card.appendChild(details);
        const location = document.createElement("p");
        location.textContent = "Location: " + (report.location_text || "Not specified");
        card.appendChild(location);
        const description = document.createElement("p");
        description.textContent = report.description || "No description";
        card.appendChild(description);
        const owner = document.createElement("p");
        owner.className = "note";
        owner.textContent = "Report ID: " + report.id + " · Owner ID: " + (report.owner_id || "unknown") + " · Submitted: " + (report.created_at ? new Date(report.created_at).toLocaleString() : "Unknown");
        card.appendChild(owner);
        const actions = document.createElement("div");
        actions.className = "report-actions";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "danger";
        remove.textContent = "Delete this report";
        remove.addEventListener("click", async () => {
          if (!window.confirm("Permanently delete " + (report.animal_name || report.animal_type || "this animal report") + "? This cannot be undone.")) return;
          remove.disabled = true;
          remove.textContent = "Deleting...";
          try {
            const deleted = await db.rpc("alfik_admin_delete_animal_report", { p_report_id: String(report.id) });
            if (deleted.error) throw deleted.error;
            if (deleted.data !== true) throw new Error("The database did not confirm deletion. The report may already be gone.");
            const index = rows.findIndex(item => String(item.id) === String(report.id));
            if (index >= 0) rows.splice(index, 1);
            if (status) status.textContent = "Report deleted successfully.";
            render();
          } catch (error) {
            if (status) status.textContent = "Could not delete report: " + readableError(error);
            remove.disabled = false;
            remove.textContent = "Delete this report";
          }
        });
        actions.appendChild(remove);
        card.appendChild(actions);
        list.appendChild(card);
      });
    };
    if (search) search.oninput = render;
    render();
    if (status) status.textContent = rows.length + " reports loaded. Search by animal, location, status or owner ID.";
  } catch (error) {
    list.textContent = "Could not load reports: " + readableError(error) + ". Run the admin-animal-reports.sql migration in Supabase first.";
    if (status) status.textContent = "Admin report management is not connected yet.";
    console.warn("ALFIK admin animal reports:", error);
  }
}



function lifelinePartnerSelectedOrg(){return el("rescueOrgSelect")?.value||"";}
function lifelinePartnerCsv(value){return String(value||"").split(",").map(x=>x.trim()).filter(Boolean);}
function lifelinePartnerSet(id,value){const f=el(id);if(f)f.value=value==null?"":value;}
function fillLifelinePartnerForm(row){
  lifelinePartnerSet("lifelinePartnerName",row.organisation_name);lifelinePartnerSet("lifelinePartnerSummary",row.summary);
  lifelinePartnerSet("lifelinePartnerCountries",(row.countries||[]).join(", "));lifelinePartnerSet("lifelinePartnerRegions",(row.regions||[]).join(", "));
  lifelinePartnerSet("lifelinePartnerSpecies",(row.species||[]).join(", "));lifelinePartnerSet("lifelinePartnerTypes",(row.support_types||[]).join(", "));
  lifelinePartnerSet("lifelinePartnerEligibility",row.eligibility);lifelinePartnerSet("lifelinePartnerReferral",row.referral_method);
  lifelinePartnerSet("lifelinePartnerWebsite",row.website);lifelinePartnerSet("lifelinePartnerContact",row.public_contact);lifelinePartnerSet("lifelinePartnerCapacity",row.capacity_note);
  const m=el("lifelinePartnerMessage");if(m)m.textContent="Listing status: "+String(row.verification_status||"needs verification").replace(/_/g," ")+(row.partner_update_needs_review?". Your latest changes need ALFIK review before appearing as verified.":".");
}
function clearLifelinePartnerForm(){
  ["lifelinePartnerName","lifelinePartnerSummary","lifelinePartnerCountries","lifelinePartnerRegions","lifelinePartnerSpecies","lifelinePartnerTypes","lifelinePartnerWebsite","lifelinePartnerContact"].forEach(id=>lifelinePartnerSet(id,""));
  lifelinePartnerSet("lifelinePartnerEligibility","Check directly with the service");lifelinePartnerSet("lifelinePartnerReferral","Contact the service directly");lifelinePartnerSet("lifelinePartnerCapacity","Availability must be confirmed directly with the service.");
}
async function loadLifelinePartnerWorkspace(){
 const db=client(),orgId=lifelinePartnerSelectedOrg(),select=el("lifelinePartnerListingSelect"),claimSelect=el("lifelineClaimListingSelect"),msg=el("lifelinePartnerMessage");
 if(!el("lifelinePartnerPanel"))return;
 if(!orgId){if(select)select.replaceChildren(new Option("Create a new listing",""));if(claimSelect)claimSelect.replaceChildren(new Option("Choose a listing",""));if(msg)msg.textContent="Choose your organisation above to manage its Lifeline listing.";return;}
 try{
  const [owned,available,claims]=await Promise.all([
   db.rpc("alfik_partner_list_lifeline_services",{p_org_id:orgId}),
   db.from("alfik_lifeline_services").select("id,organisation_name,organisation_id").eq("verification_status","verified").is("organisation_id",null).order("organisation_name"),
   db.rpc("alfik_partner_list_lifeline_claims",{p_org_id:orgId})
  ]);
  if(owned.error)throw owned.error;
  window.alfikPartnerLifelineRows=owned.data||[];
  const selectedId=select?.value||"";
  if(select){select.replaceChildren(new Option("Create a new listing",""));window.alfikPartnerLifelineRows.forEach(row=>select.appendChild(new Option(row.organisation_name+" · "+String(row.verification_status).replace(/_/g," "),row.id)));if(selectedId&&window.alfikPartnerLifelineRows.some(x=>x.id===selectedId))select.value=selectedId;}
  if(claimSelect){claimSelect.replaceChildren(new Option("Choose a listing",""));if(!available.error)(available.data||[]).forEach(row=>claimSelect.appendChild(new Option(row.organisation_name,row.id)));}
  const box=el("lifelinePartnerClaims");if(box){box.replaceChildren();if(claims.error)box.textContent="Could not load ownership requests: "+readableError(claims.error);else if(!(claims.data||[]).length)box.textContent="No ownership requests yet.";else claims.data.forEach(row=>{const p=document.createElement("p");p.textContent=(row.listing_name||"Listing")+" · "+row.status+(row.admin_notes?" · ALFIK note: "+row.admin_notes:"");box.appendChild(p);});}
  const current=window.alfikPartnerLifelineRows.find(row=>row.id===select?.value);
  if(current)fillLifelinePartnerForm(current);else if(select&&!select.value)clearLifelinePartnerForm();
  if(msg)msg.textContent=window.alfikPartnerLifelineRows.length+" Lifeline listing(s) linked to this organisation.";
 }catch(error){console.warn("ALFIK Lifeline partner workspace:",error);if(msg)msg.textContent="Could not load partner listings: "+readableError(error)+". Run supabase/alfik-lifeline-partner-listings.sql in Supabase if you have not installed it yet.";}
}
async function saveLifelinePartnerListing(){
 const db=client(),orgId=lifelinePartnerSelectedOrg(),selected=el("lifelinePartnerListingSelect")?.value||"",msg=el("lifelinePartnerMessage"),button=el("saveLifelinePartnerListingBtn");
 if(!orgId){if(msg)msg.textContent="Choose your organisation first.";return;}
 const name=el("lifelinePartnerName")?.value.trim()||"";if(!name){if(msg)msg.textContent="Enter the public organisation name.";return;}
 if(button)button.disabled=true;if(msg)msg.textContent="Saving your listing…";
 try{
  const r=await db.rpc("alfik_partner_save_lifeline_service",{p_org_id:orgId,p_service_id:selected||null,p_organisation_name:name,p_summary:el("lifelinePartnerSummary")?.value||"",p_countries:lifelinePartnerCsv(el("lifelinePartnerCountries")?.value),p_regions:lifelinePartnerCsv(el("lifelinePartnerRegions")?.value),p_species:lifelinePartnerCsv(el("lifelinePartnerSpecies")?.value),p_support_types:lifelinePartnerCsv(el("lifelinePartnerTypes")?.value),p_eligibility:el("lifelinePartnerEligibility")?.value||"",p_referral_method:el("lifelinePartnerReferral")?.value||"",p_website:el("lifelinePartnerWebsite")?.value||"",p_public_contact:el("lifelinePartnerContact")?.value||"",p_capacity_note:el("lifelinePartnerCapacity")?.value||""});
  if(r.error)throw r.error;if(msg)msg.textContent="Saved. This listing is awaiting ALFIK review before it can appear as Verified.";
  await loadLifelinePartnerWorkspace();const s=el("lifelinePartnerListingSelect");if(s&&r.data)s.value=r.data;const row=(window.alfikPartnerLifelineRows||[]).find(x=>x.id===r.data);if(row)fillLifelinePartnerForm(row);
 }catch(error){if(msg)msg.textContent="Could not save listing: "+readableError(error);}finally{if(button)button.disabled=false;}
}
async function requestLifelineClaim(){
 const db=client(),orgId=lifelinePartnerSelectedOrg(),serviceId=el("lifelineClaimListingSelect")?.value||"",msg=el("lifelineClaimMessage"),button=el("requestLifelineClaimBtn"),evidence=el("lifelineClaimEvidence")?.value.trim()||"";
 if(!orgId){if(msg)msg.textContent="Choose your organisation first.";return;}if(!serviceId){if(msg)msg.textContent="Choose the existing listing you want to claim.";return;}
 if(evidence.length<20){if(msg)msg.textContent="Please give enough detail for ALFIK to independently check your connection to this organisation.";return;}
 if(button)button.disabled=true;
 try{const r=await db.rpc("alfik_partner_request_lifeline_claim",{p_service_id:serviceId,p_org_id:orgId,p_evidence:evidence});if(r.error)throw r.error;if(msg)msg.textContent="Ownership request submitted. The listing will not be transferred until an ALFIK administrator reviews it.";lifelinePartnerSet("lifelineClaimEvidence","");await loadLifelinePartnerWorkspace();}
 catch(error){if(msg)msg.textContent="Could not submit ownership request: "+readableError(error);}finally{if(button)button.disabled=false;}
}

async function loadLifelineDirectoryAdminQueue() {
  const db = client();
  const panel = el("lifelineDirectoryAdminPanel");
  const list = el("lifelineDirectoryAdminQueue");
  const status = el("lifelineDirectoryAdminMessage");
  if (!panel || !list) return;
  panel.classList.remove("hidden");
  list.textContent = "Loading Lifeline directory listings...";
  if (status) status.textContent = "";
  const search = el("lifelineDirectoryAdminSearch");
  const filter = el("lifelineDirectoryAdminStatus");
  const refresh = el("refreshLifelineDirectoryAdminBtn");
  if (refresh && !refresh.dataset.wired) {
    refresh.dataset.wired = "true";
    refresh.addEventListener("click", loadLifelineDirectoryAdminQueue);
  }
  if (search && !search.dataset.wired) {
    search.dataset.wired = "true";
    search.addEventListener("input", () => renderLifelineDirectoryAdminQueue(window.alfikLifelineAdminRows || []));
  }
  if (filter && !filter.dataset.wired) {
    filter.dataset.wired = "true";
    filter.addEventListener("change", () => renderLifelineDirectoryAdminQueue(window.alfikLifelineAdminRows || []));
  }
  if (!db) { list.textContent = "Supabase is unavailable. Refresh ALFIK and sign in again."; return; }
  try {
    const result = await db.rpc("alfik_admin_list_lifeline_verification");
    if (result.error) throw result.error;
    window.alfikLifelineAdminRows = Array.isArray(result.data) ? result.data : [];
    renderLifelineDirectoryAdminQueue(window.alfikLifelineAdminRows);
    if (status) status.textContent = window.alfikLifelineAdminRows.length + " Lifeline listings loaded.";
  } catch (error) {
    list.textContent = "Could not load Lifeline listings: " + readableError(error) + ". Run supabase/alfik-lifeline-admin-verification.sql in Supabase and add your account to the administrator allow-list.";
    if (status) status.textContent = "Lifeline verification requires authorised administrator access.";
  }
}

function renderLifelineDirectoryAdminQueue(rows) {
  const list = el("lifelineDirectoryAdminQueue");
  const search = String(el("lifelineDirectoryAdminSearch")?.value || "").trim().toLowerCase();
  const filter = String(el("lifelineDirectoryAdminStatus")?.value || "all");
  if (!list) return;
  list.replaceChildren();
  const filtered = (rows || []).filter(org => {
    const status = String(org.verification_status || "needs_verification");
    const searchable = [org.organisation_name, org.summary, ...(org.countries || []), ...(org.regions || []), ...(org.support_types || [])].join(" ").toLowerCase();
    return (filter === "all" || status === filter) && searchable.includes(search);
  });
  if (!filtered.length) {
    list.textContent = rows.length ? "No listings match those filters." : "No Lifeline listings found.";
    return;
  }
  filtered.forEach(org => {
    const item = document.createElement("article");
    item.className = "report-card";
    const heading = document.createElement("h3");
    heading.textContent = org.organisation_name || "Unnamed organisation";
    item.appendChild(heading);
    const meta = document.createElement("p");
    meta.textContent = "Status: " + org.verification_status + " · Region: " + ((org.regions || []).join(", ") || "Not specified") + " · Country: " + ((org.countries || []).join(", ") || "Not specified");
    item.appendChild(meta);
    const summary = document.createElement("p");
    summary.textContent = org.summary || "No summary provided.";
    item.appendChild(summary);
    const support = document.createElement("p");
    support.textContent = "Support: " + ((org.support_types || []).join(", ") || "Not specified");
    item.appendChild(support);
    const eligibility = document.createElement("p");
    eligibility.textContent = "Eligibility: " + (org.eligibility || "Check directly with the service");
    item.appendChild(eligibility);
    const referral = document.createElement("p");
    referral.textContent = "Referral: " + (org.referral_method || "Contact the service directly");
    item.appendChild(referral);
    const website = document.createElement("p");
    website.textContent = "Website: " + (org.website || "Not provided") + " · Contact: " + (org.public_contact || "Not provided");
    item.appendChild(website);
    const capacity = document.createElement("p");
    capacity.textContent = "Availability note: " + (org.capacity_note || "Not recorded");
    item.appendChild(capacity);
    const notesLabel = document.createElement("label");
    notesLabel.textContent = "Verification notes";
    const notes = document.createElement("textarea");
    notes.rows = 2;
    notes.maxLength = 2000;
    notes.value = org.verification_notes || "";
    notes.placeholder = "Record what you checked, source and date, or why the listing is paused.";
    item.append(notesLabel, notes);
    if (org.verified_at) {
      const verified = document.createElement("p");
      verified.className = "note";
      verified.textContent = "Marked verified: " + new Date(org.verified_at).toLocaleString();
      item.appendChild(verified);
    }
    const actions = document.createElement("div");
    actions.className = "actions";
    [
      {label:"Mark Verified", value:"verified", css:"primary"},
      {label:"Needs verification", value:"needs_verification", css:"secondary"},
      {label:"Pause listing", value:"paused", css:"secondary"}
    ].forEach(action => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = action.css;
      button.textContent = action.label;
      button.addEventListener("click", async () => {
        if (action.value === "verified" && !window.confirm("Confirm you have checked the organisation's identity, official details, eligibility and current service availability before publishing this listing?")) return;
        button.disabled = true;
        try {
          const saved = await client().rpc("alfik_admin_review_lifeline_service", {
            p_service_id: org.id,
            p_status: action.value,
            p_notes: notes.value.trim()
          });
          if (saved.error) throw saved.error;
          if (saved.data !== true) throw new Error("The database did not confirm the decision.");
          if (status) status.textContent = org.organisation_name + " updated to " + action.value.replace(/_/g, " ") + ".";
          await loadLifelineDirectoryAdminQueue();
        } catch (error) {
          if (status) status.textContent = "Could not update listing: " + readableError(error);
          button.disabled = false;
        }
      });
      actions.appendChild(button);
    });
    item.appendChild(actions);
    list.appendChild(item);
  });
}


async function loadLifelineClaimsAdminQueue(){
 const db=client(),box=el("lifelineClaimsAdminQueue"),msg=el("lifelineClaimsAdminMessage");if(!box)return;
 const refresh=el("refreshLifelineClaimsAdminBtn");if(refresh&&!refresh.dataset.wired){refresh.dataset.wired="1";refresh.addEventListener("click",loadLifelineClaimsAdminQueue);}
 box.textContent="Loading ownership requests…";
 try{
  const r=await db.rpc("alfik_admin_list_lifeline_claim_requests");if(r.error)throw r.error;
  const rows=r.data||[];box.replaceChildren();
  if(!rows.length){box.textContent="No pending ownership requests.";if(msg)msg.textContent="Ownership queue is clear.";return;}
  rows.forEach(row=>{
   const card=document.createElement("div");card.className="feature-panel";
   const title=document.createElement("h4");title.textContent=row.listing_name||"Lifeline listing";card.appendChild(title);
   const org=document.createElement("p");org.textContent="Claiming organisation: "+(row.claimant_name||"Unknown")+" ("+(row.claimant_type||"type not set")+")";card.appendChild(org);
   const evidence=document.createElement("p");evidence.textContent="Evidence supplied: "+(row.evidence||"No evidence supplied");card.appendChild(evidence);
   const date=document.createElement("p");date.textContent="Requested: "+new Date(row.created_at).toLocaleString();card.appendChild(date);
   const notes=document.createElement("textarea");notes.rows=2;notes.maxLength=2000;notes.placeholder="Review note (optional)";card.appendChild(notes);
   const actions=document.createElement("div");actions.className="button-row";
   [{label:"Approve ownership",decision:"approved"},{label:"Reject claim",decision:"rejected"}].forEach(a=>{
    const b=document.createElement("button");b.type="button";b.className=a.decision==="approved"?"primary":"secondary";b.textContent=a.label;
    b.addEventListener("click",async()=>{
     if(a.decision==="approved"&&!window.confirm("Have you independently confirmed this organisation is entitled to manage this listing? Ownership approval does not mark the listing verified."))return;
     b.disabled=true;
     try{const saved=await client().rpc("alfik_admin_review_lifeline_claim",{p_claim_id:row.id,p_decision:a.decision,p_notes:notes.value.trim()});if(saved.error)throw saved.error;if(saved.data!==true)throw new Error("The database did not confirm the decision.");if(msg)msg.textContent="Claim "+a.decision+".";await loadLifelineClaimsAdminQueue();}
     catch(error){if(msg)msg.textContent="Could not review claim: "+readableError(error);b.disabled=false;}
    });actions.appendChild(b);
   });card.appendChild(actions);box.appendChild(card);
  });
  if(msg)msg.textContent=rows.length+" pending ownership request(s).";
 }catch(error){box.textContent="Could not load ownership requests: "+readableError(error)+". Run supabase/alfik-lifeline-partner-listings.sql in Supabase.";if(msg)msg.textContent="Authorised admin access is required.";}
}

window.loadAlfikAdminTools = async function () {
  await loadLifelineDirectoryAdminQueue();
  await loadLifelineClaimsAdminQueue();
  await loadAlfikAdminReportQueue();
  await loadVerificationAdminQueue();
  await loadMemberReportsAdminQueue();
  await loadVerificationAdminHistory();
  await loadMemberReportsAdminHistory();
};

if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", wireEvents);
} else {
wireEvents();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureAlfikPushPanel); else ensureAlfikPushPanel();
loadVerifiedRescueDirectory();
})();