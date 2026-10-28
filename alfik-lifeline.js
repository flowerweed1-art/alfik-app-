/* ALFIK Lifeline MVP: owner-controlled safety plans, help requests and referral tracking. */
(function () {
  "use strict";
  const db = () => window.supabaseClient || null;
  const byId = id => document.getElementById(id);
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const safeUrl = value => { try { const u = new URL(String(value || "").trim()); return (u.protocol === "https:" || u.protocol === "http:") ? u.href : ""; } catch (_) { return ""; } };
  const msg = (id, value, bad) => { const n=byId(id); if(n){n.textContent=value||"";n.style.color=bad?"#a32222":"";} };
  const nowIso = () => new Date().toISOString();
  let activeCaseId = null;
  let plans = [];
  let cases = [];
  let services = [];

  function addStyles() {
    if(byId("alfikLifelineStyles")) return;
    const s=document.createElement("style"); s.id="alfikLifelineStyles";
    s.textContent = `
      #lifelineView .ll-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:14px}
      #lifelineView .ll-card{border:1px solid #d3e3ef;border-radius:14px;padding:15px;background:#f8fbfe;margin:12px 0;min-width:0}
      #lifelineView .ll-card h3{margin-top:0}
      #lifelineView .ll-quick-panel{border:2px solid #1769aa;border-radius:14px;padding:14px;background:#f0f7fd;margin:14px 0}
      #lifelineView .ll-quick-panel h3{margin:0 0 6px;color:#123b63}
      #lifelineView .ll-quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}
      #lifelineView .ll-quick-grid button{min-height:58px;white-space:normal;line-height:1.3;text-align:left;justify-content:flex-start;padding:12px}
      #lifelineView .ll-quick-grid button:first-child{grid-column:1/-1;background:#1769aa;color:#fff}
      #lifelineView .ll-quick-grid button:first-child:hover{filter:brightness(.95)}
      #lifelineView .ll-availability{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:8px;background:#fff5df;color:#704b00;font-size:12px;font-weight:700;margin:4px 0 8px}
      #lifelineView .ll-availability-current{background:#e6f5e9;color:#1c6530}
      #lifelineView .ll-verified-note{display:inline-block;padding:4px 8px;border-radius:999px;background:#e6f2fb;color:#164f7a;font-size:12px;font-weight:700;margin:4px 5px 8px 0}
      #lifelineView .ll-service-contact{overflow-wrap:anywhere}
      @media(max-width:420px){#lifelineView .ll-quick-grid{grid-template-columns:1fr}#lifelineView .ll-quick-grid button:first-child{grid-column:auto}}
      #lifelineView .ll-status{display:inline-block;padding:4px 9px;border-radius:999px;background:#e6f2fb;color:#164f7a;font-size:12px;font-weight:700}
      #lifelineView .ll-priority{display:inline-block;margin:0 6px 6px 0;padding:4px 9px;border-radius:999px;background:#fff0e8;color:#8a3414;font-size:12px;font-weight:700}
      #lifelineView .ll-next-action{padding:10px 12px;border-left:4px solid #1769aa;background:#eef6fc;border-radius:8px;margin:10px 0}
      #lifelineView .ll-small{font-size:13px;color:#52697c}
      #lifelineView .ll-actions{display:flex;flex-wrap:wrap;gap:8px}
      #lifelineView .ll-actions button{flex:1 1 140px}
      #lifelineView .ll-checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:6px}
      #lifelineView .ll-checks label{display:flex;align-items:center;gap:8px;font-weight:500;margin:5px 0}
      #lifelineView .ll-checks input{width:auto}
      #lifelineView .ll-warning{padding:12px;border-left:4px solid #c78a21;background:#fff8e9;border-radius:8px}
      #lifelineView .ll-empty{padding:16px;border:1px dashed #b8cddd;border-radius:10px;color:#52697c}
      #lifelineView .ll-directory-tools{margin:12px 0}
      #lifelineView .ll-directory-actions{margin:10px 0}
      #lifelineView .ll-directory-actions button{flex:1 1 150px}
      #lifelineView #llAreaPostcode,#lifelineView #llSupportFilter,#lifelineView #llSituationFilter{width:100%;min-width:0}
      #lifelineView .ll-relevance{display:inline-block;margin:0 0 8px;padding:4px 8px;border-radius:999px;background:#e4f1fb;color:#174e78;font-size:12px;font-weight:700}
      #lifelineView details.ll-card{padding:0;overflow:hidden}
      #lifelineView details.ll-card>summary{display:flex;flex-direction:column;gap:5px;cursor:pointer;list-style:none;padding:16px;min-height:58px;justify-content:center;background:#eef6fc;color:#123b63;font-weight:700}
      #lifelineView details.ll-card>summary::-webkit-details-marker{display:none}
      #lifelineView details.ll-card>summary:after{content:"＋ Open section";font-size:13px;font-weight:700;color:#1769aa}
      #lifelineView details.ll-card[open]>summary:after{content:"− Close section"}
      #lifelineView details.ll-card>summary:focus-visible{outline:3px solid #1769aa;outline-offset:-3px}
      #lifelineView .ll-accordion-content{padding:0 15px 15px}
      #lifelineView #llOrganisationTools{margin:12px 0}
      @media(max-width:520px){#lifelineView .ll-card{padding:12px}#lifelineView details.ll-card{padding:0}#lifelineView details.ll-card>summary{padding:14px}#lifelineView .ll-accordion-content{padding:0 12px 12px}}
    `;
    document.head.appendChild(s);
  }

  function inject() {
    const nav=byId("alfikMainNav"), site=byId("siteContent");
    if(!nav || !site || byId("lifelineView")) return;
    const b=document.createElement("button");
    b.type="button"; b.className="secondary"; b.dataset.view="lifelineView"; b.dataset.accountTypes="public,rescue,veterinary";
    b.textContent="🛟 ALFIK Lifeline";
    const anchor=nav.querySelector('[data-view="petsView"]');
    if(anchor) anchor.insertAdjacentElement("afterend",b); else nav.appendChild(b);
    const section=document.createElement("section"); section.id="lifelineView"; section.className="hidden";
    section.innerHTML = `
      <h2>🛟 ALFIK Lifeline</h2>
      <p>Plan ahead, ask for help and keep track of the next safe step for your animal when life becomes difficult.</p>
      <div class="ll-warning"><strong>Important:</strong> ALFIK Lifeline is a coordination tool, not an emergency response service. It cannot guarantee a placement, funding or a service response. If an animal or person is in immediate danger, contact the appropriate emergency service. In the UK, call 999 for an immediate threat to life or safety.</div>
      <div class="ll-quick-panel" aria-labelledby="llQuickTitle">
        <h3 id="llQuickTitle">Need help quickly?</h3>
        <p class="ll-small">Choose the closest option to jump to the help form. You can change your answers before saving.</p>
        <div class="ll-quick-grid">
          <button type="button" class="primary" data-ll-quick="today">🆘 I need help today</button>
          <button type="button" class="secondary" data-ll-quick="care">🐾 Temporary care for my animal</button>
          <button type="button" class="secondary" data-ll-quick="food">🥫 Pet food or supplies</button>
          <button type="button" class="secondary" data-ll-quick="housing">🏠 Homelessness or housing crisis</button>
          <button type="button" class="secondary" data-ll-quick="safety">❤️ I'm unsafe at home</button>
          <button type="button" class="secondary" data-ll-quick="vet">🩺 Veterinary costs or advice</button>
        </div>
      </div>
      <div class="ll-card">
        <h3>My animal safety plan</h3>
        <p class="ll-small">Save the essential care information you may need if illness, hospitalisation or another crisis makes normal care difficult. Only enter contact details you are comfortable storing in your private account.</p>
        <form id="llPlanForm">
          <input type="hidden" id="llPlanId">
          <label for="llPlanAnimal">Animal's name</label><input id="llPlanAnimal" required maxlength="100" placeholder="e.g. Mabel">
          <label for="llPlanSpecies">Species</label><select id="llPlanSpecies"><option>Cat</option><option>Dog</option><option>Rabbit</option><option>Small animal</option><option>Bird</option><option>Reptile</option><option>Horse or pony</option><option>Other</option></select>
          <label for="llPlanCare">Essential care and routine</label><textarea id="llPlanCare" rows="3" maxlength="3000" placeholder="Food, routine, handling, access needs..."></textarea>
          <label for="llPlanMeds">Medication and important health needs</label><textarea id="llPlanMeds" rows="3" maxlength="2000" placeholder="Medication, dose as prescribed, allergies or vet instructions..."></textarea>
          <div class="ll-grid"><div><label for="llPlanVet">Veterinary practice</label><input id="llPlanVet" maxlength="160"></div><div><label for="llPlanVetContact">Vet phone or contact</label><input id="llPlanVetContact" maxlength="160"></div></div>
          <div class="ll-grid"><div><label for="llPlanTrusted">Trusted contact name</label><input id="llPlanTrusted" maxlength="120"></div><div><label for="llPlanTrustedPhone">Trusted contact phone</label><input id="llPlanTrustedPhone" maxlength="100"></div></div>
          <label for="llPlanSharing">Information-sharing preference</label><select id="llPlanSharing"><option>Ask me first</option><option>Only share with my trusted contact</option><option>No sharing without my explicit approval</option></select>
          <div class="ll-actions"><button class="primary" type="submit">Save safety plan</button><button class="secondary" id="llPlanReset" type="button">Clear form</button></div>
          <p id="llPlanMessage" role="status" class="message"></p>
        </form>
        <div id="llPlanList" aria-live="polite"><p class="ll-empty">Loading your safety plans…</p></div>
      </div>
      <div class="ll-card">
        <h3>I need help caring for my animal</h3>
        <p class="ll-small">Share only what is needed to find support. Avoid passwords, exact safe-house locations or details that could put you or someone else at risk. Your request is private to your account in this first version.</p>
        <form id="llCaseForm">
          <input type="hidden" id="llCasePetId"><label for="llCaseAnimal">Animal's name (or description)</label><input id="llCaseAnimal" required maxlength="120" placeholder="Name or short description">
          <label for="llCaseSpecies">Species</label><select id="llCaseSpecies"><option>Cat</option><option>Dog</option><option>Rabbit</option><option>Small animal</option><option>Bird</option><option>Reptile</option><option>Horse or pony</option><option>Multiple animals</option><option>Other</option></select>
          <label for="llCaseType">What's making care difficult?</label><select id="llCaseType" required><option value="">Choose the situation</option><option>Owner illness or hospitalisation</option><option>Homelessness or housing crisis</option><option>Domestic abuse or personal safety</option><option>Financial hardship or food costs</option><option>Bereavement or owner incapacity</option><option>Relationship breakdown</option><option>Temporary inability to provide care</option><option>Risk of surrender</option><option>Other</option></select>
          <label for="llUrgency">How soon is help needed?</label><select id="llUrgency"><option>Emergency</option><option>Today</option><option selected>Soon</option><option>Planning ahead</option></select>
          <label>What support would help? Select any that apply.</label>
          <div class="ll-checks">
            <label><input type="checkbox" name="llHelp" value="Temporary animal care"> Temporary animal care</label>
            <label><input type="checkbox" name="llHelp" value="Pet food or supplies"> Pet food or supplies</label>
            <label><input type="checkbox" name="llHelp" value="Veterinary costs or advice"> Veterinary costs or advice</label>
            <label><input type="checkbox" name="llHelp" value="Housing that accepts pets"> Housing that accepts pets</label>
            <label><input type="checkbox" name="llHelp" value="Domestic abuse specialist support"> Domestic abuse specialist support</label>
            <label><input type="checkbox" name="llHelp" value="Bereavement or contingency planning"> Bereavement or contingency planning</label>
            <label><input type="checkbox" name="llHelp" value="Advice to avoid surrender"> Advice to avoid surrender</label>
          </div>
          <label for="llContactMethod">Safest way to contact you</label><select id="llContactMethod"><option>In-app only</option><option>Email</option><option>Phone call</option><option>Text message</option><option>Trusted contact</option></select>
          <label for="llContactTime">Safe contact time or limits (optional)</label><input id="llContactTime" maxlength="240" placeholder="e.g. weekdays after 5pm; no voicemail">
          <label class="ll-checks"><span><input id="llLeaveMessage" type="checkbox"> It is safe to leave a message</span></label>
          <label for="llCaseDetails">Anything else support services need to know? (optional)</label><textarea id="llCaseDetails" rows="3" maxlength="2000" placeholder="Keep this brief. Do not include information that could put anyone at risk."></textarea>
          <label class="ll-checks"><span><input id="llConsent" type="checkbox"> I understand this first version stores my request privately in my ALFIK account. No service is contacted automatically, and I must contact services myself unless a future agreed partner workflow says otherwise.</span></label>
          <button class="primary wide" type="submit">Save private help request</button>
          <p id="llCaseMessage" role="status" class="message"></p>
        </form>
      </div>
      <div class="ll-card">
        <h3>My open need loop</h3>
        <p class="ll-small">Track each request from seeking help through referral and confirmed outcome. If a service cannot help, record that and try an alternative.</p>
        <div id="llNeedsAttention" aria-live="polite"></div>
        <div id="llCaseList" aria-live="polite"><p class="ll-empty">Loading your requests…</p></div>
      </div>
      <div class="ll-card">
        <h3>Find help in your area</h3>
        <p class="ll-small">Search by UK postcode or use your device location. ALFIK uses this only to filter the directory for this search. Your precise location is not saved to your Lifeline case.</p>
        <div class="ll-grid ll-directory-tools">
          <div><label for="llAreaPostcode">UK postcode or area</label><input id="llAreaPostcode" maxlength="20" autocomplete="postal-code" placeholder="e.g. ME7 1AA or Maidstone"></div>
          <div><label for="llSupportFilter">Type of support</label><select id="llSupportFilter"><option value="">All types of support</option></select></div>
          <div><label for="llSituationFilter">Prioritise help for</label><select id="llSituationFilter"><option value="">Any situation</option><option value="temporary-care">Emergency or temporary animal care</option><option value="food">Pet food or supplies</option><option value="vet">Veterinary costs or advice</option><option value="housing">Housing or homelessness</option><option value="domestic-abuse">Domestic abuse or personal safety</option><option value="illness">Illness or hospitalisation</option><option value="bereavement">Bereavement or owner incapacity</option><option value="avoid-surrender">Help to avoid surrender</option></select></div>
        </div>
        <div class="ll-actions ll-directory-actions">
          <button type="button" class="primary" id="llFindArea">Search directory</button>
          <button type="button" class="secondary" id="llUseLocation">Use my location</button>
          <button type="button" class="secondary" id="llClearArea">Show all services</button>
        </div>
        <p id="llAreaMessage" class="ll-small" role="status" aria-live="polite">All verified listings are shown below. Search to narrow results to your area and type of support.</p>
        <div id="llServiceList" aria-live="polite"><p class="ll-empty">Loading verified services…</p></div>
      <div class="ll-card" id="llOrganisationTools">
        <h3>Organisation or rescue account</h3>
        <p class="ll-small">Represent a rescue, charity, food bank, fostering project or other animal-support service? Request to manage an existing directory listing or submit a new one. ALFIK reviews requests before linking accounts or publishing listings.</p>
        <form id="llOrgRequestForm">
          <label for="llOrgRequestType">What do you want to do?</label>
          <select id="llOrgRequestType"><option value="claim_existing">Request access to an existing listing</option><option value="new_listing">Request a new directory listing</option></select>
          <div id="llOrgExistingWrap"><label for="llOrgExisting">Possible existing listing</label><select id="llOrgExisting"><option value="">Choose a listing to request</option></select><p class="ll-small">Choose the closest match. If you cannot find your organisation, choose “Request a new directory listing”.</p></div>
          <label for="llOrgName">Organisation or rescue name</label><input id="llOrgName" maxlength="180" required placeholder="Official organisation name">
          <label for="llOrgWebsite">Official website</label><input id="llOrgWebsite" maxlength="500" placeholder="https://">
          <label for="llOrgContact">Public contact details</label><input id="llOrgContact" maxlength="250" placeholder="Public email or phone, not private personal details">
          <label for="llOrgSummary">What help does your organisation offer?</label><textarea id="llOrgSummary" maxlength="2000" rows="3" placeholder="Brief description of services and who you help"></textarea>
          <label for="llOrgCountries">Countries covered (comma-separated)</label><input id="llOrgCountries" maxlength="300" placeholder="e.g. England">
          <label for="llOrgRegions">Regions or areas covered (comma-separated)</label><input id="llOrgRegions" maxlength="1000" placeholder="e.g. Kent, Medway, South East England">
          <label for="llOrgSpecies">Species supported (comma-separated)</label><input id="llOrgSpecies" maxlength="300" placeholder="e.g. Cats, Dogs">
          <label for="llOrgSupport">Types of support offered (comma-separated)</label><input id="llOrgSupport" maxlength="700" placeholder="e.g. Temporary fostering, Pet food">
          <label for="llOrgEligibility">Eligibility / restrictions</label><textarea id="llOrgEligibility" maxlength="1200" rows="2" placeholder="Who can apply, referral rules, areas or restrictions"></textarea>
          <label for="llOrgReferral">How should people contact or refer to you?</label><input id="llOrgReferral" maxlength="500" placeholder="e.g. Contact through official website">
          <button class="primary wide" type="submit">Submit for ALFIK approval</button>
          <p id="llOrgRequestMessage" class="message" role="status"></p>
        </form>
        <div id="llOrgRequestList"><p class="ll-small">Your submitted requests will appear here.</p></div>
        <div id="llOrgOwnedListings"></div>
      </div>
      </div>
      <p id="llGlobalMessage" class="message" role="status"></p>
    `;
    // Keep urgent help immediately available while folding the longer tools into compact, accessible sections.
    function makeCollapsible(card, openByDefault) {
      if (!card || card.tagName === "DETAILS") return card;
      const heading = card.querySelector(":scope > h3");
      if (!heading) return card;
      const details = document.createElement("details");
      details.className = card.className;
      if (card.id) details.id = card.id;
      if (openByDefault) details.open = true;
      const summary = document.createElement("summary");
      summary.appendChild(heading);
      const subtitle = heading.nextElementSibling;
      if (subtitle && subtitle.matches("p.ll-small")) summary.appendChild(subtitle);
      const content = document.createElement("div");
      content.className = "ll-accordion-content";
      while (card.firstChild) content.appendChild(card.firstChild);
      details.appendChild(summary);
      details.appendChild(content);
      card.replaceWith(details);
      return details;
    }
    // Fold the organisation request form inside the directory before folding the directory itself.
    makeCollapsible(byId("llOrganisationTools"), false);
    const sectionCards = Array.from(section.querySelectorAll(":scope > .ll-card"));
    const order = [
      ["I need help caring for my animal", true],
      ["My open need loop", false],
      ["Find help in your area", false],
      ["My animal safety plan", false]
    ];
    const foldedCards = new Map();
    sectionCards.forEach(card => {
      const heading = card.querySelector(":scope > h3");
      if (!heading) return;
      const setting = order.find(item => item[0] === heading.textContent.trim());
      foldedCards.set(heading.textContent.trim(), makeCollapsible(card, setting ? setting[1] : false));
    });
    order.forEach(([heading]) => {
      const card = foldedCards.get(heading);
      if (card) section.insertBefore(card, byId("llGlobalMessage"));
    });
    const admin=byId("adminView");
    if(admin) admin.insertAdjacentElement("beforebegin",section);
    else site.appendChild(section);
    b.addEventListener("click",()=>{ if(window.alfikShowView) window.alfikShowView("lifelineView"); });
    byId("llPlanForm").addEventListener("submit",savePlan);
    byId("llPlanReset").addEventListener("click",resetPlan);
    byId("llCaseForm").addEventListener("submit",saveCase);
    byId("llOrgRequestForm").addEventListener("submit",submitOrgRequest);
    byId("llOrgRequestType").addEventListener("change",toggleOrgRequestType);
    section.querySelectorAll("[data-ll-quick]").forEach(button=>button.addEventListener("click",()=>openQuickHelp(button.dataset.llQuick)));
    byId("llFindArea").addEventListener("click",searchDirectory);
    byId("llUseLocation").addEventListener("click",useDeviceLocation);
    byId("llClearArea").addEventListener("click",clearDirectorySearch);
    byId("llSupportFilter").addEventListener("change",renderServices);
    byId("llSituationFilter").addEventListener("change",renderServices);
    section.addEventListener("click",handleAction);
    addStyles();
  }

  function openQuickHelp(kind) {
    const situation=byId("llCaseType"), urgency=byId("llUrgency");
    const helpValues={
      care:["Temporary inability to provide care",["Temporary animal care"]],
      food:["Financial hardship or food costs",["Pet food or supplies"]],
      housing:["Homelessness or housing crisis",["Housing that accepts pets"]],
      safety:["Domestic abuse or personal safety",["Domestic abuse specialist support"]],
      vet:["Financial hardship or food costs",["Veterinary costs or advice"]],
      today:["",[]]
    };
    const choice=helpValues[kind]||helpValues.today;
    if(situation && choice[0]) situation.value=choice[0];
    if(urgency && kind==="today") urgency.value="Today";
    if(urgency && kind!=="today") urgency.value="Today";
    document.querySelectorAll('input[name="llHelp"]').forEach(input=>{
      if(choice[1].length) input.checked=choice[1].includes(input.value);
    });
    const card=byId("llCaseForm");
    if(card) {
      card.scrollIntoView({behavior:"smooth",block:"start"});
      window.setTimeout(()=>byId("llCaseAnimal")?.focus({preventScroll:true}),350);
    }
  }
  function resetPlan() {
    byId("llPlanForm").reset(); byId("llPlanId").value=""; msg("llPlanMessage","");
  }
  async function loadPlans() {
    const d=db(); if(!d) return;
    const {data,error}=await d.from("alfik_lifeline_safety_plans").select("*").order("updated_at",{ascending:false});
    if(error) { byId("llPlanList").innerHTML='<p class="ll-empty">Safety plans are not connected yet. Please run the Lifeline SQL setup from the ALFIK repository in Supabase SQL Editor.</p>'; return; }
    plans=data||[];
    byId("llPlanList").innerHTML=plans.length?plans.map(p=>`<article class="ll-card"><strong>${esc(p.animal_name)}</strong> · ${esc(p.species)}<p class="ll-small">Updated ${esc(new Date(p.updated_at).toLocaleDateString())}</p><div class="ll-actions"><button type="button" class="secondary" data-ll-action="edit-plan" data-id="${esc(p.id)}">Edit</button><button type="button" class="danger" data-ll-action="delete-plan" data-id="${esc(p.id)}">Delete</button></div></article>`).join(""):'<p class="ll-empty">No safety plans yet. Create one above for each animal you want to plan for.</p>';
  }
  async function savePlan(event) {
    event.preventDefault(); const d=db(); if(!d) return;
    const id=byId("llPlanId").value;
    const row={animal_name:byId("llPlanAnimal").value.trim(),species:byId("llPlanSpecies").value,essential_care:byId("llPlanCare").value.trim(),medication:byId("llPlanMeds").value.trim(),vet_name:byId("llPlanVet").value.trim(),vet_contact:byId("llPlanVetContact").value.trim(),trusted_contact_name:byId("llPlanTrusted").value.trim(),trusted_contact_phone:byId("llPlanTrustedPhone").value.trim(),handover_preference:byId("llPlanSharing").value,updated_at:nowIso()};
    if(!row.animal_name){msg("llPlanMessage","Please enter the animal's name.",true);return;}
    const result=id?await d.from("alfik_lifeline_safety_plans").update(row).eq("id",id).select().single():await d.from("alfik_lifeline_safety_plans").insert(row).select().single();
    if(result.error){msg("llPlanMessage","Could not save the safety plan: "+result.error.message,true);return;}
    msg("llPlanMessage","Safety plan saved privately to your account."); resetPlan(); await loadPlans();
  }
  function editPlan(id) {
    const p=plans.find(x=>x.id===id); if(!p)return;
    byId("llPlanId").value=p.id; byId("llPlanAnimal").value=p.animal_name||""; byId("llPlanSpecies").value=p.species||"Other"; byId("llPlanCare").value=p.essential_care||""; byId("llPlanMeds").value=p.medication||""; byId("llPlanVet").value=p.vet_name||""; byId("llPlanVetContact").value=p.vet_contact||""; byId("llPlanTrusted").value=p.trusted_contact_name||""; byId("llPlanTrustedPhone").value=p.trusted_contact_phone||""; byId("llPlanSharing").value=p.handover_preference||"Ask me first"; byId("llPlanAnimal").focus(); window.scrollTo({top:byId("llPlanForm").getBoundingClientRect().top+window.scrollY-80,behavior:"smooth"});
  }
  async function deletePlan(id) {
    if(!confirm("Delete this safety plan permanently?"))return;
    const {error}=await db().from("alfik_lifeline_safety_plans").delete().eq("id",id);
    if(error){msg("llGlobalMessage","Could not delete plan: "+error.message,true);return;} await loadPlans();
  }
  async function saveCase(event) {
    event.preventDefault(); const d=db(); if(!d)return;
    if(!byId("llConsent").checked){msg("llCaseMessage","Please confirm you understand how this private request works.",true);return;}
    const help=Array.from(document.querySelectorAll('input[name="llHelp"]:checked')).map(n=>n.value);
    if(!help.length){msg("llCaseMessage","Please choose at least one type of support.",true);return;}
    const row={pet_id:byId("llCasePetId").value||null,animal_name:byId("llCaseAnimal").value.trim(),species:byId("llCaseSpecies").value,crisis_type:byId("llCaseType").value,urgency:byId("llUrgency").value,help_needed:help,safe_contact_method:byId("llContactMethod").value,safe_contact_time:byId("llContactTime").value.trim(),safe_to_leave_message:byId("llLeaveMessage").checked,details:byId("llCaseDetails").value.trim(),status:"Seeking support",next_step:"Review the verified directory and contact a suitable service. Confirm availability directly.",consent_to_referrals:false,updated_at:nowIso()};
    if(!row.crisis_type){msg("llCaseMessage","Please choose the situation making care difficult.",true);return;}
    const {error}=await d.from("alfik_lifeline_cases").insert(row);
    if(error){msg("llCaseMessage","Could not save the request: "+error.message,true);return;}
    msg("llCaseMessage","Your private request has been saved. No organisation has been contacted automatically.");
    byId("llCaseForm").reset(); byId("llCasePetId").value=""; await loadCases(); window.dispatchEvent(new CustomEvent("alfik:lifeline-refresh"));
  }
  function suggestedNextAction(c) {
    const urgency=String(c.urgency||"").toLowerCase();
    const status=String(c.status||"").toLowerCase();
    if(urgency==="emergency")return "Act now: contact the appropriate emergency service or an established animal-welfare organisation directly. ALFIK does not provide emergency response or guarantee a placement.";
    if(urgency==="today"&&status!=="help confirmed"&&status!=="closed")return "Priority today: contact a suitable service directly, explain the time limit, and confirm whether it can actually help.";
    if(status==="help confirmed")return "Confirm the care arrangements, timing, costs (if any), medication instructions and who is responsible for the animal.";
    if(status==="alternative needed")return "Try another suitable service and record the result. If the need is urgent, contact services directly rather than waiting for the directory.";
    if(status==="referred")return "Follow up with the service and ask about eligibility, capacity and when you can expect an answer.";
    if(status==="closed")return "This request is marked closed. Reopen it by changing the status if the need returns.";
    if(status==="seeking support"||status==="draft")return "Choose a relevant service, contact it directly, then add a referral and record the response.";
    return "Review the request and record the next practical step.";
  }
  async function loadCases() {
    const d=db(); if(!d)return;
    const {data,error}=await d.from("alfik_lifeline_cases").select("*").order("updated_at",{ascending:false});
    if(error){byId("llCaseList").innerHTML='<p class="ll-empty">Help-request storage is not connected yet. Run the Lifeline SQL setup in Supabase.</p>';byId("llNeedsAttention").innerHTML="";return;}
    cases=data||[];
    if(!cases.length){byId("llCaseList").innerHTML='<p class="ll-empty">No help requests yet. Saved requests will appear here.</p>';byId("llNeedsAttention").innerHTML='<div class="ll-card"><h3>No requests to track yet</h3><p class="ll-small">When you save a help request, ALFIK will flag urgent cases and follow-ups that may need attention.</p></div>';return;}
    const urgencyRank={Emergency:0,Today:1,Soon:2,"Planning ahead":3};
    const statusRank={"Seeking support":0,"Alternative needed":1,Referred:2,Draft:3,"Help confirmed":4,Closed:5};
    const ordered=[...cases].sort((a,b)=>(urgencyRank[a.urgency]??4)-(urgencyRank[b.urgency]??4)||(statusRank[a.status]??6)-(statusRank[b.status]??6)||new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));
    byId("llCaseList").innerHTML=ordered.map(c=>{
      const urgent=["Emergency","Today"].includes(c.urgency);
      const action=suggestedNextAction(c);
      return '<article class="ll-card">'+(urgent?'<span class="ll-priority">'+(c.urgency==="Emergency"?"URGENT: emergency":"PRIORITY: help needed today")+'</span> ':"")+'<div class="ll-status">'+esc(c.status)+'</div><h3>'+esc(c.animal_name)+' · '+esc(c.species)+'</h3><p><strong>Need:</strong> '+esc(c.crisis_type)+'</p><p><strong>Urgency:</strong> '+esc(c.urgency)+'</p><p><strong>Support:</strong> '+esc((c.help_needed||[]).join(", "))+'</p><p class="ll-small">Created '+esc(new Date(c.created_at).toLocaleDateString())+'</p><div class="ll-next-action"><strong>Suggested next step</strong><p>'+esc(action)+'</p></div>'+(c.next_step?'<p><strong>Your recorded next step:</strong> '+esc(c.next_step)+'</p>':"")+'<label for="llStatus-'+esc(c.id)+'">Update request status</label><select id="llStatus-'+esc(c.id)+'" data-status-id="'+esc(c.id)+'"><option>Draft</option><option>Seeking support</option><option>Referred</option><option>Help confirmed</option><option>Alternative needed</option><option>Closed</option></select><label for="llNext-'+esc(c.id)+'">Your next step</label><input id="llNext-'+esc(c.id)+'" data-next-id="'+esc(c.id)+'" maxlength="500" value="'+esc(c.next_step||"")+'" placeholder="What will happen next?"><label for="llOutcome-'+esc(c.id)+'">Outcome notes (optional)</label><input id="llOutcome-'+esc(c.id)+'" data-outcome-id="'+esc(c.id)+'" maxlength="1000" value="'+esc(c.closed_outcome||"")+'" placeholder="e.g. temporary care confirmed"><div class="ll-actions"><button class="primary" type="button" data-ll-action="update-case" data-id="'+esc(c.id)+'">Save update</button><button class="secondary" type="button" data-ll-action="add-referral" data-id="'+esc(c.id)+'">Add referral</button><button class="danger" type="button" data-ll-action="delete-case" data-id="'+esc(c.id)+'">Delete request</button></div><div id="llReferrals-'+esc(c.id)+'"></div></article>';
    }).join("");
    ordered.forEach(c=>{const select=byId("llStatus-"+c.id);if(select)select.value=c.status;});
    for(const c of ordered) await loadReferrals(c.id);
    await renderNeedsAttention(ordered);
  }
  async function renderNeedsAttention(orderedCases) {
    const box=byId("llNeedsAttention"); if(!box)return;
    const active=(orderedCases||[]).filter(c=>!["Help confirmed","Closed"].includes(c.status));
    const {data:refs,error}=await db().from("alfik_lifeline_referrals").select("id,case_id,service_name,referral_status,updated_at,created_at,outcome_notes").order("updated_at",{ascending:false});
    const referrals=error?[]:(refs||[]);
    const alerts=[];
    const now=Date.now(), twoDays=2*24*60*60*1000;
    active.forEach(c=>{
      const age=now-new Date(c.updated_at||c.created_at).getTime();
      if(c.urgency==="Emergency")alerts.push({rank:0,title:"Emergency request: "+c.animal_name,detail:"This tracker is not an emergency service. Contact the appropriate emergency service or animal-welfare organisation directly.",caseId:c.id});
      else if(c.urgency==="Today")alerts.push({rank:1,title:"Help needed today: "+c.animal_name,detail:"Contact a suitable service directly and confirm it can help within the required time.",caseId:c.id});
      else if(age>=twoDays)alerts.push({rank:3,title:"Request may need a follow-up: "+c.animal_name,detail:"This request has not been updated for at least two days. Check whether help has been arranged or record the next step.",caseId:c.id});
    });
    referrals.forEach(r=>{
      const c=(orderedCases||[]).find(x=>x.id===r.case_id);
      if(!c||["Help confirmed","Closed"].includes(c.status))return;
      const age=now-new Date(r.updated_at||r.created_at).getTime();
      if(["No capacity","Not eligible","Alternative needed"].includes(r.referral_status))alerts.push({rank:0,title:"Alternative needed: "+r.service_name,detail:"The service recorded “"+r.referral_status+"”. Try another suitable service and update the request.",caseId:c.id});
      else if(r.referral_status==="Waiting for reply"&&age>=twoDays)alerts.push({rank:2,title:"Follow up with "+r.service_name,detail:"No update has been recorded for this referral in at least two days. Contact the service directly if appropriate.",caseId:c.id});
      else if(r.referral_status==="Not contacted"&&age>=twoDays)alerts.push({rank:3,title:"Referral not yet contacted: "+r.service_name,detail:"Contact the service if it is still suitable, then record its response.",caseId:c.id});
    });
    alerts.sort((a,b)=>a.rank-b.rank);
    box.innerHTML=alerts.length?'<div class="ll-card"><h3>⚠️ Needs attention</h3><p class="ll-small">These reminders are generated from your saved statuses and dates. ALFIK does not contact services or monitor replies automatically.</p>'+alerts.slice(0,12).map(a=>'<div class="ll-next-action"><strong>'+esc(a.title)+'</strong><p>'+esc(a.detail)+'</p></div>').join("")+'</div>':'<div class="ll-card"><h3>✓ No outstanding reminders</h3><p class="ll-small">No urgent or overdue follow-ups were detected from your saved requests. Keep statuses up to date so this stays useful.</p></div>';
  }
  function toggleOrgRequestType() {
    const isExisting=byId("llOrgRequestType").value==="claim_existing";
    byId("llOrgExistingWrap").classList.toggle("hidden",!isExisting);
    byId("llOrgExisting").required=isExisting;
  }
  function csvValues(value) { return String(value||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,40); }
  async function submitOrgRequest(event) {
    event.preventDefault();
    const d=db(); if(!d){msg("llOrgRequestMessage","Please sign in first.",true);return;}
    const requestType=byId("llOrgRequestType").value;
    const serviceId=requestType==="claim_existing"?byId("llOrgExisting").value:null;
    const name=byId("llOrgName").value.trim();
    const website=byId("llOrgWebsite").value.trim();
    if(website&&!safeUrl(website)){msg("llOrgRequestMessage","Please enter a valid http or https website address.",true);return;}
    if(requestType==="claim_existing"&&!serviceId){msg("llOrgRequestMessage","Choose the existing listing you want to claim.",true);return;}
    const {data:userData,error:userError}=await d.auth.getUser();
    if(userError||!userData.user){msg("llOrgRequestMessage","Please sign in again and retry.",true);return;}
    const payload={owner_id:userData.user.id,service_id:serviceId,request_type:requestType,organisation_name:name,website,public_contact:byId("llOrgContact").value.trim(),summary:byId("llOrgSummary").value.trim(),countries:csvValues(byId("llOrgCountries").value),regions:csvValues(byId("llOrgRegions").value),species:csvValues(byId("llOrgSpecies").value),support_types:csvValues(byId("llOrgSupport").value),eligibility:byId("llOrgEligibility").value.trim()||"Check directly with the service",referral_method:byId("llOrgReferral").value.trim()||"Contact the service directly",status:"pending"};
    const {error}=await d.from("alfik_lifeline_org_requests").insert(payload);
    if(error){msg("llOrgRequestMessage","Could not submit the request. Make sure the organisation-claims SQL setup has been run. "+error.message,true);return;}
    msg("llOrgRequestMessage","Request submitted for ALFIK review. Your listing will not be linked or published until it is approved.");
    byId("llOrgRequestForm").reset();toggleOrgRequestType();await loadOrganisationTools();
  }
  async function loadOrganisationTools() {
    const d=db(); if(!d)return;
    const {data:userData}=await d.auth.getUser();
    const user=userData&&userData.user;
    if(!user)return;
    const existing=byId("llOrgExisting");
    if(existing){
      const selected=existing.value;
      existing.innerHTML='<option value="">Choose a listing to request</option>'+services.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.organisation_name)+'</option>').join("");
      if(services.some(s=>s.id===selected))existing.value=selected;
    }
    const {data:requests,error:requestError}=await d.from("alfik_lifeline_org_requests").select("*").order("created_at",{ascending:false});
    const requestBox=byId("llOrgRequestList");
    if(requestBox){
      if(requestError) requestBox.innerHTML='<p class="ll-small">Request history is unavailable until the organisation-claims SQL setup has been run.</p>';
      else if(!(requests||[]).length) requestBox.innerHTML='<p class="ll-small">You have not submitted an organisation request yet.</p>';
      else {
        const cards=(requests||[]).map(r=>{
          const kind=r.request_type==="claim_existing"?"Request to manage an existing listing":"New listing request";
          const notes=r.review_notes?'<p><strong>Review notes:</strong> '+esc(r.review_notes)+'</p>':"";
          return '<div class="ll-card"><strong>'+esc(r.organisation_name)+'</strong><p>Status: <strong>'+esc(r.status)+'</strong></p><p class="ll-small">'+kind+' · Submitted '+esc(new Date(r.created_at).toLocaleDateString())+'</p>'+notes+'</div>';
        });
        requestBox.innerHTML='<h4>Your approval requests</h4>'+cards.join("");
      }
    }
    const {data:listings,error:listError}=await d.from("alfik_lifeline_services").select("*").eq("claimed_by",user.id).order("organisation_name");
    const owned=byId("llOrgOwnedListings");
    if(!owned)return;
    if(listError){owned.innerHTML='<p class="ll-small">Your managed listings are unavailable until the organisation-claims SQL setup has been run.</p>';return;}
    const rows=listings||[];
    if(!rows.length){owned.innerHTML='<h4>Your managed directory listings</h4><p class="ll-small">No listings have been linked to your account yet. Submit a claim or new listing request above.</p>';return;}
    owned.innerHTML='<h4>Your managed directory listings</h4>'+rows.map(s=>{
      const visibility=s.verification_status==="verified"?"Visible in the directory.":"Not visible in the directory until ALFIK verifies it.";
      return '<form class="ll-card" data-ll-org-edit="'+esc(s.id)+'"><strong>'+esc(s.organisation_name)+'</strong><p>Status: <strong>'+esc(s.verification_status)+'</strong>. '+visibility+'</p><label>Organisation name</label><input name="organisation_name" maxlength="180" required value="'+esc(s.organisation_name)+'"><label>Official website</label><input name="website" maxlength="500" value="'+esc(s.website||"")+'"><label>Public contact</label><input name="public_contact" maxlength="250" value="'+esc(s.public_contact||"")+'"><label>Summary</label><textarea name="summary" maxlength="2000" rows="3">'+esc(s.summary||"")+'</textarea><label>Countries (comma-separated)</label><input name="countries" value="'+esc((s.countries||[]).join(", "))+'"><label>Regions (comma-separated)</label><input name="regions" value="'+esc((s.regions||[]).join(", "))+'"><label>Species (comma-separated)</label><input name="species" value="'+esc((s.species||[]).join(", "))+'"><label>Support types (comma-separated)</label><input name="support_types" value="'+esc((s.support_types||[]).join(", "))+'"><label>Eligibility</label><textarea name="eligibility" rows="2" maxlength="1200">'+esc(s.eligibility||"")+'</textarea><label>Referral method</label><input name="referral_method" maxlength="500" value="'+esc(s.referral_method||"")+'"><label>Capacity / availability note</label><input name="capacity_note" maxlength="1000" value="'+esc(s.capacity_note||"")+'"><button class="primary" type="submit">Save listing changes</button><p class="message" role="status"></p></form>';
    }).join("");
    owned.querySelectorAll("form[data-ll-org-edit]").forEach(form=>form.addEventListener("submit",saveOwnedListing));
  }
  async function saveOwnedListing(event) {
    event.preventDefault();
    const form=event.currentTarget,id=form.dataset.llOrgEdit;
    const field=name=>form.elements.namedItem(name);
    const website=field("website").value.trim();
    if(website&&!safeUrl(website)){form.querySelector('[role="status"]').textContent="Please enter a valid http or https website.";return;}
    const payload={organisation_name:field("organisation_name").value.trim(),website,public_contact:field("public_contact").value.trim(),summary:field("summary").value.trim(),countries:csvValues(field("countries").value),regions:csvValues(field("regions").value),species:csvValues(field("species").value),support_types:csvValues(field("support_types").value),eligibility:field("eligibility").value.trim()||"Check directly with the service",referral_method:field("referral_method").value.trim()||"Contact the service directly",capacity_note:field("capacity_note").value.trim()||"Availability must be confirmed directly with the service.",updated_at:nowIso()};
    const {error}=await db().from("alfik_lifeline_services").update(payload).eq("id",id);
    const note=form.querySelector('[role="status"]');
    if(error){note.textContent="Could not save listing. Check the SQL setup and try again. "+error.message;return;}
    note.textContent="Listing details saved. Verification status is controlled by ALFIK and has not changed.";
    await loadServices();await loadOrganisationTools();
  }
  async function updateCase(id) {
    const status=byId("llStatus-"+id).value;
    const row={status,next_step:byId("llNext-"+id).value.trim(),closed_outcome:byId("llOutcome-"+id).value.trim(),updated_at:nowIso()};
    const {error}=await db().from("alfik_lifeline_cases").update(row).eq("id",id);
    if(error){msg("llGlobalMessage","Could not update request: "+error.message,true);return;}
    msg("llGlobalMessage","Request updated."); await loadCases();
  }
  async function deleteCase(id) {
    if(!confirm("Delete this help request and its referral history permanently?"))return;
    const {error}=await db().from("alfik_lifeline_cases").delete().eq("id",id);
    if(error){msg("llGlobalMessage","Could not delete request: "+error.message,true);return;} await loadCases();
  }
  async function addReferral(id) {
    const service=prompt("Service or organisation name:");
    if(!service||!service.trim())return;
    const website=prompt("Official website (optional, http/https only):","https://");
    if(website && website.trim() && !safeUrl(website)){msg("llGlobalMessage","Please enter a valid http or https website address.",true);return;}
    const method=prompt("Contact/referral method (optional):","");
    const {error}=await db().from("alfik_lifeline_referrals").insert({case_id:id,service_name:service.trim(),service_website:(website||"").trim(),contact_method:(method||"").trim(),referral_status:"Not contacted",updated_at:nowIso()});
    if(error){msg("llGlobalMessage","Could not add referral: "+error.message,true);return;} await loadReferrals(id); msg("llGlobalMessage","Referral added. Remember to confirm eligibility and capacity directly.");
  }
  async function loadReferrals(id) {
    const box=byId("llReferrals-"+id); if(!box)return;
    const {data,error}=await db().from("alfik_lifeline_referrals").select("*").eq("case_id",id).order("created_at",{ascending:false});
    if(error){box.innerHTML='<p class="ll-small">Referral tracking is not available until the SQL setup is installed.</p>';return;}
    const refs=data||[];
    box.innerHTML='<h4>Referral tracking</h4>'+ (refs.length?refs.map(r=>`<div class="ll-card"><strong>${esc(r.service_name)}</strong>${safeUrl(r.service_website)?'<p><a href="'+esc(safeUrl(r.service_website))+'" target="_blank" rel="noopener noreferrer">Open service website</a></p>':""}<label for="llRefStatus-${esc(r.id)}">Referral status</label><select id="llRefStatus-${esc(r.id)}" data-refstatus-id="${esc(r.id)}"><option>Not contacted</option><option>Contacted</option><option>Waiting for reply</option><option>Help confirmed</option><option>Not eligible</option><option>No capacity</option><option>Alternative needed</option><option>Closed</option></select><label for="llRefNotes-${esc(r.id)}">Outcome / notes</label><input id="llRefNotes-${esc(r.id)}" maxlength="1000" data-refnotes-id="${esc(r.id)}" value="${esc(r.outcome_notes||"")}" placeholder="Keep notes brief and safe"><div class="ll-actions"><button type="button" class="secondary" data-ll-action="update-referral" data-id="${esc(r.id)}">Save referral update</button><button type="button" class="danger" data-ll-action="delete-referral" data-id="${esc(r.id)}">Delete referral</button></div></div>`).join(""):'<p class="ll-small">No referrals recorded for this request yet.</p>');
    refs.forEach(r=>{const s=byId("llRefStatus-"+r.id);if(s)s.value=r.referral_status;});
  }
  async function updateReferral(id) {
    const status=byId("llRefStatus-"+id).value, notes=byId("llRefNotes-"+id).value.trim();
    const {data:ref,error}=await db().from("alfik_lifeline_referrals").update({referral_status:status,outcome_notes:notes,updated_at:nowIso(),last_checked_at:nowIso()}).eq("id",id).select("case_id").single();
    if(error){msg("llGlobalMessage","Could not update referral: "+error.message,true);return;}
    if(ref && ref.case_id){const linkedStatus=status==="Help confirmed"?"Help confirmed":(["Not eligible","No capacity","Alternative needed"].includes(status)?"Alternative needed":(["Contacted","Waiting for reply"].includes(status)?"Referred":null));if(linkedStatus){await db().from("alfik_lifeline_cases").update({status:linkedStatus,next_step:linkedStatus==="Help confirmed"?"Confirm the animal's safe care plan and any agreed handover.":linkedStatus==="Alternative needed"?"Try another verified service or contact ALFIK through its published channels.":"Follow up with the service and confirm eligibility/capacity.",updated_at:nowIso()}).eq("id",ref.case_id);}}
    msg("llGlobalMessage","Referral updated and the linked request status reviewed."); await loadCases();
  }
  async function deleteReferral(id) {
    if(!confirm("Delete this referral record?"))return;
    const {error}=await db().from("alfik_lifeline_referrals").delete().eq("id",id);
    if(error){msg("llGlobalMessage","Could not delete referral: "+error.message,true);return;} await loadCases();
  }
  function populateSupportFilter() {
    const select=byId("llSupportFilter"); if(!select)return;
    const selected=select.value;
    const types=[...new Set(services.flatMap(s=>s.support_types||[]))].sort((a,b)=>a.localeCompare(b));
    select.innerHTML='<option value="">All types of support</option>'+types.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join("");
    if(types.includes(selected))select.value=selected;
  }
  function renderServices() {
    const box=byId("llServiceList"); if(!box)return;
    const area=(byId("llAreaPostcode")?.dataset.areaTerms||"").toLowerCase().split("|").filter(Boolean);
    const type=byId("llSupportFilter")?.value||"";
    const situation=byId("llSituationFilter")?.value||"";
    const normalise=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    const nationalTags=new Set(["england","scotland","wales","northern ireland","united kingdom","uk","nationwide","national","uk wide","all england","england wide","scotland wide","wales wide"]);
    const needs={
      "temporary-care":{support:["temporary animal care","temporary fostering","fostering","emergency boarding","crisis care","pet fostering"],words:["temporary care","temporary foster","foster project","emergency care","crisis care","hospital","domestic abuse"]},
      food:{support:["pet food or supplies","pet food","food bank","pet supplies"],words:["pet food","food bank","food support","pet supplies","foodbank"]},
      vet:{support:["veterinary costs or advice","veterinary costs","veterinary advice","vet care","vet bills"],words:["veterinary","vet costs","vet bills","veterinary care","animal health"]},
      housing:{support:["housing that accepts pets","housing advice","homelessness support","temporary animal care"],words:["housing","homeless","accommodation","tenancy","keeping pets"]},
      "domestic-abuse":{support:["domestic abuse specialist support","domestic abuse fostering","temporary fostering","pet fostering"],words:["domestic abuse","domestic violence","refuge","women s aid","safe accommodation","foster project"]},
      illness:{support:["temporary animal care","temporary fostering","pet fostering","crisis support"],words:["hospital","illness","medical","temporary care","foster","crisis support"]},
      bereavement:{support:["bereavement or contingency planning","temporary animal care","rehoming advice"],words:["bereavement","owner incapacity","contingency","legacy","long term care","rehoming advice"]},
      "avoid-surrender":{support:["advice to avoid surrender","rehoming advice","pet food or supplies","veterinary costs or advice","crisis support"],words:["avoid surrender","keep your pet","pet retention","crisis support","financial hardship","rehoming advice"]}
    };
    const scoreService=s=>{
      if(!situation||!needs[situation])return 0;
      const need=needs[situation];
      const support=(s.support_types||[]).map(normalise);
      const details=normalise([s.organisation_name,s.summary,s.eligibility,s.capacity_note,...(s.regions||[])].join(" "));
      let score=0;
      if(support.some(t=>need.support.some(k=>t.includes(normalise(k))||normalise(k).includes(t))))score+=8;
      const hits=need.words.filter(k=>details.includes(normalise(k))).length;
      score+=Math.min(hits,3)*2;
      return score;
    };
    const results=services.filter(s=>{
      const regions=(s.regions||[]).map(normalise).filter(Boolean);
      const areaMatch=!area.length||area.some(rawTerm=>{
        const term=normalise(rawTerm);
        const localMatch=regions.some(region=>region===term||region.includes(term)||term.includes(region));
        const nationalMatch=nationalTags.has(term)&&regions.some(region=>["nationwide","national","uk wide","united kingdom","uk"].includes(region)||region===term);
        return localMatch||nationalMatch;
      });
      const supportMatch=!type||(s.support_types||[]).some(t=>t===type);
      return areaMatch&&supportMatch;
    }).map(s=>({...s,_relevance:scoreService(s)})).sort((a,b)=>b._relevance-a._relevance||String(a.organisation_name||"").localeCompare(String(b.organisation_name||"")));
    const suggested=results.filter(s=>s._relevance>0).length;
    const note=byId("llAreaMessage");
    if(note&&situation){
      const label=byId("llSituationFilter")?.selectedOptions?.[0]?.textContent||"your situation";
      const areaLabel=area.length?" in the selected area":"";
      note.textContent=suggested
        ? "Showing "+suggested+" suggested listing"+(suggested===1?"":"s")+" first for "+label.toLowerCase()+areaLabel+". Other matching listings remain below. Confirm eligibility and capacity directly."
        : "No clear support-type match was found for that situation"+areaLabel+". All other listings matching your filters are still shown. Try another situation or support type.";
    }
    box.innerHTML=results.length?results.map(s=>{
      const contact=String(s.public_contact||"").trim();
      const contactHref=/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(contact)?"mailto:"+contact:"";
      const website=safeUrl(s.website);
      const capacityLabels={"accepting_referrals":"Currently marked as accepting referrals","limited_capacity":"Limited capacity reported","no_capacity":"No capacity reported","not_accepting":"Not accepting referrals","not_confirmed":"Current availability not confirmed"};
      const capacityLabelsStale={"accepting_referrals":"Previously reported accepting referrals · recheck overdue","limited_capacity":"Previously reported limited capacity · recheck overdue","no_capacity":"Previously reported no capacity · recheck overdue","not_accepting":"Previously reported not accepting referrals · recheck overdue","not_confirmed":"Current availability not confirmed"};
      const checkedDate=s.capacity_checked_at?new Date(s.capacity_checked_at):null;
      const validCheckedDate=checkedDate&&!Number.isNaN(checkedDate.getTime());
      const isStale=!validCheckedDate||(Date.now()-checkedDate.getTime()>30*86400000);
      const capacityStatus=isStale?(capacityLabelsStale[s.capacity_status]||capacityLabelsStale.not_confirmed):(capacityLabels[s.capacity_status]||capacityLabels.not_confirmed);
      const checkedLabel=validCheckedDate?"Last capacity check: "+checkedDate.toLocaleDateString():"No capacity check recorded";
      const statusClass=s.capacity_status==="accepting_referrals"&&!isStale?"ll-availability ll-availability-current":"ll-availability";
      return '<article class="ll-card">'+(s._relevance>0?'<span class="ll-relevance">Suggested for your situation</span>':'')+'<h3>'+esc(s.organisation_name)+'</h3><div class="'+statusClass+'" role="status">● '+esc(capacityStatus)+'</div><p class="ll-small">'+esc(checkedLabel)+'. Capacity information can change quickly.</p><p>'+esc(s.summary||"Contact the service to confirm what support it offers.")+'</p><p><strong>Support:</strong> '+esc((s.support_types||[]).join(", ")||"Ask service")+'</p><p><strong>Species:</strong> '+esc((s.species||[]).join(", ")||"Check directly")+'</p><p><strong>Coverage:</strong> '+esc([...(s.countries||[]),...(s.regions||[])].join(", ")||"Check directly")+'</p><p><strong>Eligibility:</strong> '+esc(s.eligibility||"Check directly with the service")+'</p>'+(contact?'<p class="ll-service-contact"><strong>Public contact:</strong> '+(contactHref?'<a href="'+esc(contactHref)+'">'+esc(contact)+'</a>':esc(contact))+'</p>':'')+(s.referral_method?'<p><strong>How to contact:</strong> '+esc(s.referral_method)+'</p>':'')+'<p class="ll-small">'+esc(s.capacity_note||"Please contact the service directly to confirm current availability.")+'</p>'+(s.verified_at?'<span class="ll-verified-note">Directory listing verified '+esc(new Date(s.verified_at).toLocaleDateString())+'</span>':'<span class="ll-verified-note">Directory listing status: check with ALFIK</span>')+(website?'<p><a href="'+esc(website)+'" target="_blank" rel="noopener noreferrer">Visit official website</a></p>':'')+'<p class="ll-small">Availability labels are based on the last recorded check, not a live feed. Confirm capacity, eligibility and referral steps directly before relying on this listing.</p><button type="button" class="secondary" data-ll-action="refer-service" data-id="'+esc(s.id)+'">Track this service in my help request</button></article>';
    }).join(""):'<p class="ll-empty">No listings match those filters yet. Try a broader area or choose “All types of support”. You can also contact a service directly to ask whether it covers your area.</p>';
  }
  async function searchDirectory() {
    const input=byId("llAreaPostcode"), raw=input.value.trim();
    if(!raw){input.dataset.areaTerms="";msg("llAreaMessage","Enter a postcode or area, or use your device location.");renderServices();return;}
    msg("llAreaMessage","Checking postcode or area…");
    try {
      const postcodeLike=/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(raw);
      if(postcodeLike){
        const response=await fetch("https://api.postcodes.io/postcodes/"+encodeURIComponent(raw.replace(/\s+/g,"")));
        const json=await response.json();
        if(!response.ok||!json.result)throw new Error("That postcode could not be found. Check it and try again, or enter a town or area.");
        const p=json.result;
        const terms=[p.admin_district,p.admin_county,p.region,p.parliamentary_constituency,p.country].filter(Boolean);
        input.dataset.areaTerms=[...new Set(terms.map(t=>String(t).toLowerCase()))].join("|");
        msg("llAreaMessage","Searching around "+p.postcode+" ("+[p.admin_district,p.region,p.country].filter(Boolean).join(", ")+"). Results depend on each service’s listed coverage.");
      } else {
        input.dataset.areaTerms=[raw.toLowerCase()];
        msg("llAreaMessage",'Searching listings that mention "'+raw+'". For the most accurate postcode-area match, enter a full UK postcode.');
      }
      renderServices();
    } catch(e) {input.dataset.areaTerms="";msg("llAreaMessage",e.message||"Could not look up that location. Try entering a town or area.",true);}
  }
  async function useDeviceLocation() {
    if(!navigator.geolocation){msg("llAreaMessage","Location is not available in this browser. Enter your postcode instead.");return;}
    const button=byId("llUseLocation"); button.disabled=true; msg("llAreaMessage","Waiting for your permission to use your location…");
    navigator.geolocation.getCurrentPosition(async position=>{
      try{
        const url="https://api.postcodes.io/postcodes?lon="+encodeURIComponent(position.coords.longitude)+"&lat="+encodeURIComponent(position.coords.latitude);
        const response=await fetch(url); const json=await response.json();
        const p=json&&json.result&&json.result[0];
        if(!response.ok||!p||!p.postcode)throw new Error("We could not match your location to a UK postcode. Please enter your postcode or town instead.");
        byId("llAreaPostcode").value=p.postcode;
        await searchDirectory();
      }catch(e){msg("llAreaMessage",e.message||"Location lookup failed. Please enter your postcode instead.",true);}
      finally{button.disabled=false;}
    },error=>{
      button.disabled=false;
      msg("llAreaMessage",error.code===1?"Location permission was declined. You can still enter your postcode manually.":"Could not get your location. Check device location settings or enter your postcode manually.");
    },{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
  }
  function clearDirectorySearch() {
    const input=byId("llAreaPostcode"); input.value=""; input.dataset.areaTerms="";
    byId("llSupportFilter").value="";
    msg("llAreaMessage","Showing all verified listings. No location is being used.");
    renderServices();
  }
  async function loadServices() {
    const d=db(); if(!d)return;
    const {data,error}=await d.from("alfik_lifeline_services").select("*").eq("verification_status","verified").order("organisation_name");
    if(error){byId("llServiceList").innerHTML='<p class="ll-empty">The verified directory will appear after the Lifeline SQL setup is installed and ALFIK adds checked listings.</p>';return;}
    services=data||[];
    populateSupportFilter();
    renderServices();
    await loadOrganisationTools();
  }
  async function referService(id) {
    const service=services.find(s=>s.id===id); if(!service)return;
    if(!cases.length){msg("llGlobalMessage","Create a private help request first, then you can attach a service referral.");return;}
    const choice=prompt("Add "+service.organisation_name+" to which request? Enter the number shown below:\n"+cases.map((c,i)=>(i+1)+". "+c.animal_name+" ("+c.crisis_type+")").join("\n"));
    const index=Number(choice)-1, c=cases[index]; if(!c)return;
    const {error}=await db().from("alfik_lifeline_referrals").insert({case_id:c.id,service_name:service.organisation_name,service_website:service.website||"",contact_method:service.referral_method||"",referral_status:"Not contacted",updated_at:nowIso()});
    if(error){msg("llGlobalMessage","Could not attach service: "+error.message,true);return;} await loadCases(); msg("llGlobalMessage","Service added to the request. Please confirm eligibility and availability directly.");
  }
  async function handleAction(event) {
    const b=event.target.closest("[data-ll-action]"); if(!b)return;
    const id=b.dataset.id, action=b.dataset.llAction;
    if(action==="edit-plan")editPlan(id);
    if(action==="delete-plan")await deletePlan(id);
    if(action==="update-case")await updateCase(id);
    if(action==="delete-case")await deleteCase(id);
    if(action==="add-referral")await addReferral(id);
    if(action==="update-referral")await updateReferral(id);
    if(action==="delete-referral")await deleteReferral(id);
    if(action==="refer-service")await referService(id);
  }
  async function loadAll() {
    const d=db(); if(!d){msg("llGlobalMessage","Please sign in to use ALFIK Lifeline.",true);return;}
    const {data,error}=await d.auth.getUser();
    if(error||!data.user){msg("llGlobalMessage","Please sign in to use ALFIK Lifeline.",true);return;}
    await Promise.all([loadPlans(),loadCases(),loadServices(),loadOrganisationTools()]);
  }
  function init() {
    inject();
    if(!byId("lifelineView"))return;
    if(!window.alfikShowView) {
      window.alfikShowView=function(id) {
        document.querySelectorAll("#siteContent section[id]").forEach(s=>s.classList.toggle("hidden",s.id!==id));
        const target=byId(id); if(target)target.classList.remove("hidden");
        if(id==="lifelineView")loadAll();
      };
    }
    const oldShow=window.alfikShowView;
    window.alfikShowView=function(id){oldShow(id);if(id==="lifelineView")loadAll();};
    loadAll();
  }
  window.alfikOpenLifelineForPet=function(pet){
    if(!pet||!pet.id)return;
    if(window.alfikShowView)window.alfikShowView("lifelineView");
    const hidden=byId("llCasePetId");
    const animal=byId("llCaseAnimal");
    const species=byId("llCaseSpecies");
    if(hidden)hidden.value=String(pet.id);
    if(animal)animal.value=pet.name||"";
    if(species){
      const s=String(pet.species||"").toLowerCase();
      species.value=/cat|feline/.test(s)?"Cat":/dog|canine/.test(s)?"Dog":/rabbit/.test(s)?"Rabbit":/bird/.test(s)?"Bird":/reptile/.test(s)?"Reptile":/horse|pony|equine/.test(s)?"Horse or pony":/hamster|guinea pig|mouse|rat|ferret|small/.test(s)?"Small animal":"Other";
    }
    const form=byId("llCaseForm");
    if(form){form.scrollIntoView({behavior:"smooth",block:"start"});if(animal)animal.focus({preventScroll:true});}
  };
  window.loadAlfikLifeline=loadAll;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
  window.addEventListener("alfik:lifeline-refresh",loadAll);
})();