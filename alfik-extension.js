
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

    if (!(await hasPlan("pro"))) {
      if (list) {
        const p = document.createElement("p");
        p.textContent = "Upgrade to Pro to use pet health records.";
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
      say("petMessage", "Pet profiles need the ALFIK database migration before they can be used.");
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

    if (!(await hasPlan("pro"))) {
      say("petMessage", "Pet health records require the Pro plan.");
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
      say("petMessage", "Could not save the pet profile. The database setup may not be complete.");
      console.error(error);
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
      console.error(error);
      say("healthRecordMessage", "Could not save the record. Check that the database migration is installed.");
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
      container.textContent = "Health records are not available until the database setup is complete.";
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
          option.textContent = org.name + " (" + (org.verification_status || "unverified") + ")";
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
    } catch (error) {
      console.warn("ALFIK rescue workspace:", error);
      say("rescueAnimalMessage", "The rescue database setup is not complete yet.");
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
      console.error(error);
      say("rescueOrgMessage", "Could not create the workspace. The database migration may not be installed.");
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
      console.error(error);
      say("rescueAnimalMessage", "Could not save the animal. Check that the database migration is installed.");
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
      list.textContent = "The animal register is not available until the database setup is complete.";
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
      say("vetPatientMessage", "The veterinary database setup is not complete yet.");
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
      console.error(error);
      say("vetOrgMessage", "Could not create the workspace. The database migration may not be installed.");
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
      console.error(error);
      say("vetPatientMessage", "Could not save the patient. Check that the database migration is installed.");
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
      list.textContent = "The patient register is not available until the database setup is complete.";
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
      el("rescueOrgSelect").addEventListener("change", loadRescueAnimals);
    }

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
  window.loadVetWorkspace = loadVetWorkspace;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireEvents);
  } else {
    wireEvents();
  }
})();
