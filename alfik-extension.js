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
if (!db) return "free";

try {
  const result = await db.rpc("alfik_my_plan");
  if (result.error) return "free";

  const value = result.data;
  if (typeof value === "string") return value.toLowerCase();

  if (value && typeof value === "object") {
    return String(value.plan || value.tier || "free").toLowerCase();
  }

  return "free";
} catch (error) {
  console.warn("ALFIK plan lookup:", error);
  return "free";
}

}

async function hasPlan(required) {
const plan = await getPlan();
const levels = { free: 0, premium: 1, pro: 2 };
return (levels[plan] || 0) >= (levels[required] || 0);
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
const status = el("planStatus");

if (status) {
  status.textContent = "Your current plan: " + plan.toUpperCase();
}

say(
  "healthPlanMessage",
  plan === "pro"
    ? "Your account has Pro access. Health records still require the database setup to be complete."
    : "Pet health records require Pro access and the supporting database setup."
);

say(
  "rescuePlanMessage",
  plan === "premium" || plan === "pro"
    ? "Your account has a paid plan. Rescue features require the supporting database setup."
    : "Rescue workspace access requires Premium or Pro and supporting database setup."
);

say(
  "vetPlanMessage",
  plan === "pro"
    ? "Your account has Pro access. Veterinary features require the supporting database setup."
    : "Veterinary workspace access requires Pro and supporting database setup."
);

}

async function renderPayPalButtons() {
const config = window.ALFIK_CONFIG || {};

const premium = el("paypal-premium");
const pro = el("paypal-pro");

if (premium) {
  premium.textContent =
    config.PAYPAL_CLIENT_ID &&
    config.PAYPAL_CLIENT_ID !== "REPLACE_WITH_PAYPAL_CLIENT_ID"
      ? "PayPal configuration detected. Checkout will be enabled after server verification is configured."
      : "PayPal checkout is not configured yet.";
}

if (pro) {
  pro.textContent =
    config.PAYPAL_CLIENT_ID &&
    config.PAYPAL_CLIENT_ID !== "REPLACE_WITH_PAYPAL_CLIENT_ID"
      ? "PayPal configuration detected. Checkout will be enabled after server verification is configured."
      : "PayPal checkout is not configured yet.";
}

say(
  "billingMessage",
  "Subscriptions are not active until PayPal and secure server-side verification are configured."
);

}

async function loadPetWorkspace() {
const db = client();
const list = el("petList");
const petSelect = el("healthPet");

if (list) list.replaceChildren();
if (petSelect) {
  petSelect.replaceChildren();
  const option = document.createElement("option");
  option.value = "";
  option.textContent = "Select a pet";
  petSelect.appendChild(option);
}

const user = await currentUser();
if (!user) return;

if (!(await hasPlan("premium"))) {
  if (list) {
    const p = document.createElement("p");
    p.textContent = "Upgrade to Premium to use pet profiles and Pro for health records.";
    list.appendChild(p);
  }
  return;
}

if (!db) return;

try {
  const result = await db
    .from("alfik_pets")
    .select("id,name,species,breed,date_of_birth,microchip,notes")
    .eq("owner_id", user.id)
    .order("name");

  if (result.error) throw result.error;

  (result.data || []).forEach(pet => {
    if (list) {
      const item = card(list, pet.name || "Unnamed pet");
      addText(item, "Species", pet.species);
      addText(item, "Breed", pet.breed);
      addText(item, "Date of birth", pet.date_of_birth);
      addText(item, "Microchip", pet.microchip);
      addText(item, "Notes", pet.notes);
    }

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

  await loadHealthRecords();
} catch (error) {
  console.warn("ALFIK pet profiles:", error);
  say("petMessage", "Pet profiles could not be loaded: " + readableError(error));
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

if (!(await hasPlan("premium"))) {
  say("petMessage", "Saving pet profiles requires Premium or Pro.");
  return;
}

const pet = {
  owner_id: user.id,
  name: el("petName").value.trim(),
  species: el("petSpecies").value,
  breed: el("petBreed").value.trim() || null,
  date_of_birth: el("petDob").value || null,
  microchip: el("petMicrochip").value.trim() || null,
  notes: el("petNotes").value.trim() || null
};

if (!pet.name || !pet.species) {
  say("petMessage", "Please enter the pet's name and species.");
  return;
}

const button = event.submitter;
if (button) button.disabled = true;

try {
  const result = await db.from("alfik_pets").insert([pet]);
  if (result.error) throw result.error;

  el("petForm").reset();
  say("petMessage", "Pet profile saved.");
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

  await loadRescueAnimals();
  await loadOrganisationVerificationStatus();
  await loadVerificationAdminQueue();
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
  notes: el("rescueAnimalNotes").value.trim() || null
};

try {
  const result = await db.from("alfik_rescue_animals").insert([animal]);
  if (result.error) throw result.error;

  el("rescueAnimalName").value = "";
  el("rescueAnimalNotes").value = "";

  say("rescueAnimalMessage", "Rescue animal saved.");
  await loadRescueAnimals();
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
    .select("name,species,status,notes")
    .eq("org_id", orgId)
    .order("name");

  if (result.error) throw result.error;

  (result.data || []).forEach(animal => {
    const item = card(list, animal.name);
    addText(item, "Species", animal.species);
    addText(item, "Status", animal.status);
    addText(item, "Notes", animal.notes);
  });

  if (!(result.data || []).length) {
    list.textContent = "No rescue animals recorded yet.";
  }
} catch (error) {
  console.warn("ALFIK rescue animals:", error);
  list.textContent = "Could not load the animal register: " + readableError(error);
}

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
if (!db || !panel || !queue) return;
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
  const rows = Array.isArray(result.data) ? result.data : [];
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
if (!db || !panel || !queue) return;
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
  const reports = Array.isArray(result.data) ? result.data : [];
  if (!reports.length) {
    queue.textContent = "No member safety reports have been submitted.";
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
} catch (error) {
  say("memberReportsAdminMessage", "Could not update report: " + readableError(error) + ". Check migration 202610240005 and administrator permissions.");
}
}

function wireEvents() {
if (el("petForm")) el("petForm").addEventListener("submit", savePet);
if (el("saveHealthBtn")) el("saveHealthBtn").addEventListener("click", saveHealthRecord);
if (el("healthPet")) el("healthPet").addEventListener("change", loadHealthRecords);

if (el("createRescueOrgBtn")) {
  el("createRescueOrgBtn").addEventListener("click", createRescueOrganisation);
}

if (el("saveRescueAnimalBtn")) {
  el("saveRescueAnimalBtn").addEventListener("click", saveRescueAnimal);
}

if (el("rescueOrgSelect")) {
  el("rescueOrgSelect").addEventListener("change", async () => {
    await loadRescueAnimals();
    await loadOrganisationVerificationStatus();
  });
}
if (el("submitVerificationBtn")) el("submitVerificationBtn").addEventListener("click", submitOrganisationVerification);
if (el("refreshVerificationQueueBtn")) el("refreshVerificationQueueBtn").addEventListener("click", loadVerificationAdminQueue);
if (el("refreshMemberReportsBtn")) el("refreshMemberReportsBtn").addEventListener("click", loadMemberReportsAdminQueue);
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

window.refreshAlfikProfile = refreshAlfikProfile;
window.renderPayPalButtons = renderPayPalButtons;
window.loadPetWorkspace = loadPetWorkspace;
window.loadRescueWorkspace = loadRescueWorkspace;
window.loadVerifiedRescueDirectory = loadVerifiedRescueDirectory;
window.loadVetWorkspace = loadVetWorkspace;
window.loadAlfikAdminTools = async function () {
  await loadVerificationAdminQueue();
  await loadMemberReportsAdminQueue();
};

if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", wireEvents);
} else {
wireEvents();
}
loadVerifiedRescueDirectory();
})();