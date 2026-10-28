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
      #lifelineView .ll-status{display:inline-block;padding:4px 9px;border-radius:999px;background:#e6f2fb;color:#164f7a;font-size:12px;font-weight:700}
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
      #lifelineView #llAreaPostcode,#lifelineView #llSupportFilter{width:100%;min-width:0}
      @media(max-width:520px){#lifelineView .ll-card{padding:12px}}
    `;
    document.head.appendChild(s);
  }

  function inject() {
    const nav=byId("alfikMainNav"), site=byId("siteContent");
    if(!nav || !site || byId("lifelineView")) return;
    const b=document.createElement("button");
    b.type="button"; b.className="secondary"; b.dataset.view="lifelineView"; b.dataset.accountTypes="public";
    b.textContent="🛟 ALFIK Lifeline";
    const anchor=nav.querySelector('[data-view="petsView"]');
    if(anchor) anchor.insertAdjacentElement("afterend",b); else nav.appendChild(b);
    const section=document.createElement("section"); section.id="lifelineView"; section.className="hidden";
    section.innerHTML = `
      <h2>🛟 ALFIK Lifeline</h2>
      <p>Plan ahead, ask for help and keep track of the next safe step for your animal when life becomes difficult.</p>
      <div class="ll-warning"><strong>Important:</strong> ALFIK Lifeline is a coordination tool, not an emergency response service. It cannot guarantee a placement, funding or a service response. If an animal or person is in immediate danger, contact the appropriate emergency service. In the UK, call 999 for an immediate threat to life or safety.</div>
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
        <div id="llCaseList" aria-live="polite"><p class="ll-empty">Loading your requests…</p></div>
      </div>
      <div class="ll-card">
        <h3>Find help in your area</h3>
        <p class="ll-small">Search by UK postcode or use your device location. ALFIK uses this only to filter the directory for this search. Your precise location is not saved to your Lifeline case.</p>
        <div class="ll-grid ll-directory-tools">
          <div><label for="llAreaPostcode">UK postcode or area</label><input id="llAreaPostcode" maxlength="20" autocomplete="postal-code" placeholder="e.g. ME7 1AA or Maidstone"></div>
          <div><label for="llSupportFilter">Type of support</label><select id="llSupportFilter"><option value="">All types of support</option></select></div>
        </div>
        <div class="ll-actions ll-directory-actions">
          <button type="button" class="primary" id="llFindArea">Search directory</button>
          <button type="button" class="secondary" id="llUseLocation">Use my location</button>
          <button type="button" class="secondary" id="llClearArea">Show all services</button>
        </div>
        <p id="llAreaMessage" class="ll-small" role="status" aria-live="polite">All verified listings are shown below. Search to narrow results to your area and type of support.</p>
        <div id="llServiceList" aria-live="polite"><p class="ll-empty">Loading verified services…</p></div>
      </div>
      <p id="llGlobalMessage" class="message" role="status"></p>
    `;
    const admin=byId("adminView");
    if(admin) admin.insertAdjacentElement("beforebegin",section);
    else site.appendChild(section);
    b.addEventListener("click",()=>{ if(window.alfikShowView) window.alfikShowView("lifelineView"); });
    byId("llPlanForm").addEventListener("submit",savePlan);
    byId("llPlanReset").addEventListener("click",resetPlan);
    byId("llCaseForm").addEventListener("submit",saveCase);
    byId("llFindArea").addEventListener("click",searchDirectory);
    byId("llUseLocation").addEventListener("click",useDeviceLocation);
    byId("llClearArea").addEventListener("click",clearDirectorySearch);
    byId("llSupportFilter").addEventListener("change",renderServices);
    section.addEventListener("click",handleAction);
    addStyles();
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
  async function loadCases() {
    const d=db(); if(!d)return;
    const {data,error}=await d.from("alfik_lifeline_cases").select("*").order("updated_at",{ascending:false});
    if(error){byId("llCaseList").innerHTML='<p class="ll-empty">Help-request storage is not connected yet. Run the Lifeline SQL setup in Supabase.</p>';return;}
    cases=data||[];
    if(!cases.length){byId("llCaseList").innerHTML='<p class="ll-empty">No help requests yet. Saved requests will appear here.</p>';return;}
    byId("llCaseList").innerHTML=cases.map(c=>`<article class="ll-card"><div class="ll-status">${esc(c.status)}</div><h3>${esc(c.animal_name)} · ${esc(c.species)}</h3><p><strong>Need:</strong> ${esc(c.crisis_type)}</p><p><strong>Urgency:</strong> ${esc(c.urgency)}</p><p><strong>Support:</strong> ${esc((c.help_needed||[]).join(", "))}</p><p class="ll-small">Created ${esc(new Date(c.created_at).toLocaleDateString())}</p>${c.next_step?'<p><strong>Next step:</strong> '+esc(c.next_step)+'</p>':""}<label for="llStatus-${esc(c.id)}">Update request status</label><select id="llStatus-${esc(c.id)}" data-status-id="${esc(c.id)}"><option>Draft</option><option>Seeking support</option><option>Referred</option><option>Help confirmed</option><option>Alternative needed</option><option>Closed</option></select><label for="llNext-${esc(c.id)}">Next step</label><input id="llNext-${esc(c.id)}" data-next-id="${esc(c.id)}" maxlength="500" value="${esc(c.next_step||"")}" placeholder="What will happen next?"><label for="llOutcome-${esc(c.id)}">Outcome notes (optional)</label><input id="llOutcome-${esc(c.id)}" data-outcome-id="${esc(c.id)}" maxlength="1000" value="${esc(c.closed_outcome||"")}" placeholder="e.g. temporary care confirmed"><div class="ll-actions"><button class="primary" type="button" data-ll-action="update-case" data-id="${esc(c.id)}">Save update</button><button class="secondary" type="button" data-ll-action="add-referral" data-id="${esc(c.id)}">Add referral</button><button class="danger" type="button" data-ll-action="delete-case" data-id="${esc(c.id)}">Delete request</button></div><div id="llReferrals-${esc(c.id)}"></div></article>`).join("");
    cases.forEach(c=>{const s=byId("llStatus-"+c.id);if(s)s.value=c.status;});
    for(const c of cases) await loadReferrals(c.id);
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
    const results=services.filter(s=>{
      const coverage=[...(s.countries||[]),...(s.regions||[])].map(x=>String(x).toLowerCase());
      const areaMatch=!area.length||area.some(term=>coverage.some(c=>c===term||c.includes(term)||term.includes(c))||
        (term==="england"&&coverage.some(c=>c.includes("united kingdom")||c==="uk"))||
        (term==="scotland"&&coverage.some(c=>c.includes("united kingdom")||c==="uk")));
      const supportMatch=!type||(s.support_types||[]).some(t=>t===type);
      return areaMatch&&supportMatch;
    });
    box.innerHTML=results.length?results.map(s=>`<article class="ll-card"><h3>${esc(s.organisation_name)}</h3><p>${esc(s.summary)}</p><p><strong>Support:</strong> ${esc((s.support_types||[]).join(", ")||"Ask service")}</p><p><strong>Species:</strong> ${esc((s.species||[]).join(", ")||"Check directly")}</p><p><strong>Coverage:</strong> ${esc([...(s.countries||[]),...(s.regions||[])].join(", ")||"Check directly")}</p><p><strong>Eligibility:</strong> ${esc(s.eligibility)}</p><p class="ll-small">${esc(s.capacity_note)} ${s.verified_at?"Last verified: "+esc(new Date(s.verified_at).toLocaleDateString()):""}</p>${safeUrl(s.website)?'<p><a href="'+esc(safeUrl(s.website))+'" target="_blank" rel="noopener noreferrer">Visit official website</a></p>':""}<button type="button" class="secondary" data-ll-action="refer-service" data-id="${esc(s.id)}">Add to a help request</button></article>`).join(""):'<p class="ll-empty">No listings match those filters yet. Try a broader area or choose “All types of support”. You can also contact a service directly to ask whether it covers your area.</p>';
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
        const terms=[p.admin_district,p.admin_county,p.region,p.country,p.parliamentary_constituency].filter(Boolean);
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
    await Promise.all([loadPlans(),loadCases(),loadServices()]);
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