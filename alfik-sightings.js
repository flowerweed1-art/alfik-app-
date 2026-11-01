/* ALFIK Live Sightings: private owner/reporter timeline and linked messaging. */
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? "" : value);
  const style = document.createElement("style");
  style.textContent = `
    .alfik-sightings{margin-top:16px;padding:14px;border:1px solid #c9ddec;border-radius:13px;background:#f6faff}
    .alfik-sighting-entry{padding:12px;margin:10px 0;background:#fff;border:1px solid #d9e5ef;border-radius:10px}
    .alfik-sighting-entry h4{margin:0 0 6px;color:#123b63}
    .alfik-sighting-form{margin-top:12px;padding-top:12px;border-top:1px solid #d7e5f0}
    .alfik-sighting-form label{display:block;margin:10px 0 4px;font-weight:700}
    .alfik-sighting-form input,.alfik-sighting-form select,.alfik-sighting-form textarea{width:100%;padding:10px;border:1px solid #bdcedd;border-radius:8px;font:inherit;background:#fff}
    .alfik-sighting-actions{display:flex;gap:8px;flex-wrap:wrap}
    .alfik-sighting-actions button{flex:1 1 150px}
    .alfik-sighting-map{height:190px;border-radius:9px;margin-top:10px;overflow:hidden;border:1px solid #cbddea}
    .alfik-sighting-status{font-size:13px;color:#36566f;white-space:pre-wrap}
  `;
  document.head.appendChild(style);

  function node(tag,text,className){
    const el=document.createElement(tag);
    if(text)el.textContent=text;
    if(className)el.className=className;
    return el;
  }
  function labelFor(text,control){
    const label=node("label",text);
    label.appendChild(control);
    return label;
  }
  function addField(form,title,control){
    form.appendChild(labelFor(title,control));
  }
  async function currentUser(){
    const result=await supabaseClient.auth.getUser();
    return result.data?.user?.id||null;
  }

  async function fetchSightings(reportId){
    const {data,error}=await supabaseClient.from("alfik_animal_sightings")
      .select("id,report_id,submitted_by,location_text,observed_at,direction,condition,notes,latitude,longitude,review_status,created_at")
      .eq("report_id",reportId).order("observed_at",{ascending:false}).limit(100);
    if(error)throw error;
    return data||[];
  }

  function statusLabel(status){
    if(status==="owner_confirmed")return "Owner confirmed";
    if(status==="not_this_animal")return "Not this animal";
    return "Unconfirmed sighting";
  }

  async function renderTimeline(panel,sightings,report,isOwner){
    const list=node("div");
    const viewerId=await currentUser();
    if(!sightings.length)list.appendChild(node("p","No sightings have been reported yet. When someone spots this animal, the update will appear here."));
    sightings.forEach(s=>{
      const item=node("article",null,"alfik-sighting-entry");
      item.appendChild(node("h4","📍 "+s.location_text));
      const when=new Date(s.observed_at);
      item.appendChild(node("p",when.toLocaleString()+" · "+statusLabel(s.review_status)));
      if(s.direction)item.appendChild(node("p","Direction: "+s.direction));
      if(s.condition)item.appendChild(node("p","Condition: "+s.condition));
      if(s.notes)item.appendChild(node("p",s.notes));
      if(s.latitude!=null&&s.longitude!=null){
        const map=node("div",null,"alfik-sighting-map");
        map.setAttribute("role","img");
        map.setAttribute("aria-label","Private map of this sighting location");
        item.appendChild(map);
        if(isOwner||s.submitted_by===viewerId){
          if(typeof L!=="undefined"){
            const mapInstance=L.map(map,{scrollWheelZoom:false,dragging:true,zoomControl:true}).setView([s.latitude,s.longitude],14);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(mapInstance);
            L.marker([s.latitude,s.longitude]).addTo(mapInstance).bindPopup("Reported sighting");
            setTimeout(()=>mapInstance.invalidateSize(),100);
          }else map.textContent="Map unavailable. Location: "+s.latitude+", "+s.longitude;
        }else map.remove();
      }
      if(isOwner && s.submitted_by!==viewerId){
        const msg=node("button","🔒 Message this person privately","primary wide");
        msg.type="button";
        msg.addEventListener("click",()=>messageSighter(s.id,msg));
        item.appendChild(msg);
      }
      list.appendChild(item);
    });
    panel.appendChild(list);
  }

  async function messageSighter(sightingId,button){
    button.disabled=true;
    const original=button.textContent;
    button.textContent="Opening private conversation…";
    try{
      const {data,error}=await supabaseClient.rpc("alfik_start_sighting_conversation",{p_sighting_id:sightingId});
      if(error)throw error;
      window.alfikShowView("messagesView");
      if(typeof window.loadPrivateConversations==="function")await window.loadPrivateConversations(data);
    }catch(error){
      alert("Could not open the private conversation: "+(error.message||"Please try again."));
    }finally{button.disabled=false;button.textContent=original;}
  }

  function buildSightingForm(report){
    const form=node("form",null,"alfik-sighting-form");
    form.appendChild(node("h4","📍 Report a sighting"));
    form.appendChild(node("p","Tell the owner where and when you saw this animal. Your details are shared privately with the report owner, not displayed publicly."));
    const location=document.createElement("input");
    location.type="text";location.required=true;location.maxLength=240;
    location.placeholder="Town, street or nearby landmark";
    addField(form,"Where did you see the animal?",location);

    const observed=document.createElement("input");
    observed.type="datetime-local";observed.required=true;
    observed.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
    addField(form,"When did you see it?",observed);

    const direction=document.createElement("input");
    direction.type="text";direction.maxLength=160;
    direction.placeholder="e.g. heading towards the park";
    addField(form,"Which direction was it travelling? (optional)",direction);

    const condition=document.createElement("select");
    [["","Choose if known"],["safe","Appeared safe"],["injured","Appeared injured"],["frightened","Appeared frightened"],["in_vehicle","Inside / near a vehicle"],["unsure","Not sure"]].forEach(([v,t])=>{
      const option=node("option",t);option.value=v;condition.appendChild(option);
    });
    addField(form,"What was the animal's condition? (optional)",condition);

    const notes=document.createElement("textarea");
    notes.maxLength=1500;notes.rows=3;
    notes.placeholder="Colour, markings, behaviour or anything else that may help.";
    addField(form,"Additional details (optional)",notes);

    const gpsButton=node("button","Use my current location (optional)","secondary");
    gpsButton.type="button";
    const gpsStatus=node("p","Your location is not collected unless you choose this button.","alfik-sighting-status");
    let coords=null;
    gpsButton.addEventListener("click",()=>{
      if(!navigator.geolocation){gpsStatus.textContent="Location services are not available on this device.";return;}
      gpsButton.disabled=true;gpsStatus.textContent="Waiting for location permission…";
      navigator.geolocation.getCurrentPosition(pos=>{
        coords={latitude:pos.coords.latitude,longitude:pos.coords.longitude};
        gpsStatus.textContent="Location added. It will only be visible to you and the report owner.";
        gpsButton.disabled=false;
      },err=>{
        gpsStatus.textContent=err.code===1?"Location permission was not granted. You can enter the area manually.":"Could not get your location. You can enter the area manually.";
        gpsButton.disabled=false;
      },{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
    });
    form.append(gpsButton,gpsStatus);

    const status=node("p","","alfik-sighting-status");
    const submit=node("button","Send sighting to the owner","primary wide");
    submit.type="submit";
    form.append(status,submit);
    form.addEventListener("submit",async event=>{
      event.preventDefault();
      const user=(await supabaseClient.auth.getUser()).data?.user;
      if(!user){status.textContent="Please sign in before reporting a sighting.";return;}
      if(!location.value.trim()){status.textContent="Please enter the area where you saw the animal.";return;}
      submit.disabled=true;status.textContent="Sending your sighting…";
      try{
        const payload={
          report_id:report.id,submitted_by:user.id,location_text:location.value.trim(),
          observed_at:new Date(observed.value).toISOString(),
          direction:direction.value.trim()||null,condition:condition.value||null,
          notes:notes.value.trim()||null,latitude:coords?.latitude??null,longitude:coords?.longitude??null
        };
        const {error}=await supabaseClient.from("alfik_animal_sightings").insert(payload);
        if(error)throw error;
        status.textContent="Sighting sent. The report owner can now see it and message you privately through ALFIK.";
        form.reset();
        observed.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
        coords=null;
        await refreshPanel(form.parentElement,report,false);
      }catch(error){
        status.textContent="Could not send the sighting: "+(error.message||"Please try again.");
      }finally{submit.disabled=false;}
    });
    return form;
  }

  async function refreshPanel(panel,report,isOwner){
    const existing=panel.querySelector(".alfik-sighting-timeline");
    if(existing)existing.replaceChildren(node("p","Loading sightings…"));
    try{
      const sightings=await fetchSightings(report.id);
      const timeline=existing||node("div",null,"alfik-sighting-timeline");
      timeline.replaceChildren();
      await renderTimeline(timeline,sightings,report,isOwner);
      if(!existing)panel.appendChild(timeline);
    }catch(error){
      const timeline=existing||node("div",null,"alfik-sighting-timeline");
      timeline.replaceChildren(node("p","Sightings are not available yet: "+(error.message||"Please try again.")));
      if(!existing)panel.appendChild(timeline);
    }
  }

  async function decorateCard(card){
    if(card.dataset.sightingsWired==="true")return;
    const reportId=card.dataset.reportId;
    if(!reportId)return;
    const report=[...(window.alfikActiveReports||[]),...(window.alfikMyReports||[])].find(item=>String(item.id)===String(reportId));
    const own=Boolean(card.querySelector(".badge.own"));
    if(!report||report.report_type!=="lost"||report.status!=="active")return;
    card.dataset.sightingsWired="true";
    const panel=node("section",null,"alfik-sightings");
    panel.appendChild(node("h3",own?"📍 Sightings of your missing animal":"📍 Seen this animal?"));
    panel.appendChild(node("p",own
      ?"Sightings reported by members appear here. You can open a private conversation with each person who spotted your animal."
      :"Seen an animal that could be this one? Send the owner a private sighting update."));
    if(!own && report.owner_id){
      const user=(await supabaseClient.auth.getUser()).data?.user;
      if(user&&user.id!==report.owner_id)panel.appendChild(buildSightingForm(report));
      else if(!user)panel.appendChild(node("p","Sign in to report a sighting."));
    }
    card.appendChild(panel);
    await refreshPanel(panel,report,own);
  }

  function scan(){
    document.querySelectorAll("#reportsList .report-card,#myReportsList .report-card").forEach(card=>decorateCard(card));
  }
  const observer=new MutationObserver(scan);
  function start(){
    const reports=$("reportsList"),mine=$("myReportsList");
    if(reports)observer.observe(reports,{childList:true,subtree:true});
    if(mine)observer.observe(mine,{childList:true,subtree:true});
    scan();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
  window.alfikRefreshSightings=scan;
})();