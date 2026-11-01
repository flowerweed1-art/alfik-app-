(function(){
  const country=document.getElementById("animalVoiceCountry");
  const concern=document.getElementById("animalVoiceConcern");
  const urgency=document.getElementById("animalVoiceUrgency");
  const button=document.getElementById("animalVoiceFindHelp");
  const output=document.getElementById("animalVoiceGuidance");
  if(!country||!concern||!urgency||!button||!output)return;
  const data={
    england:{
      neglect:["Report suspected cruelty or neglect","Contact the RSPCA about animal welfare concerns in England.",[["RSPCA: report a concern","https://www.rspca.org.uk/en/reportaconcern"],["Call RSPCA: 0300 1234 999","tel:03001234999"]]],
      injured:["Help for an injured or sick pet","Contact the RSPCA for advice. If urgent veterinary treatment is needed, contact a local vet immediately.",[["RSPCA: help an animal in need","https://www.rspca.org.uk/en/reportaconcern"]]],
      wildlife:["Help for injured wildlife","For many injured wild animals, a local vet may be the quickest route. Call ahead first. The RSPCA can advise if specialist help is needed.",[["RSPCA: report a concern","https://www.rspca.org.uk/en/reportaconcern"]]],
      farm:["Farm animal welfare","The Animal and Plant Health Agency handles farm animal welfare concerns in England.",[["GOV.UK: report farm animal welfare concerns","https://www.gov.uk/guidance/report-farm-animal-welfare-concerns"],["Call APHA: 03000 200 301","tel:03000200301"]]],
      stray:["Stray or abandoned animal","For a stray dog, contact your local council dog warden. For suspected neglect or injury, contact the RSPCA.",[["RSPCA: report a concern","https://www.rspca.org.uk/en/reportaconcern"],["Find your local council","https://www.gov.uk/find-local-council"]]],
      urgent:["Get urgent help now","If a serious incident is happening now or a person is in immediate danger, call 999. For non-emergency animal cruelty concerns, contact the RSPCA or police on 101.",[["Call 999","tel:999"],["RSPCA: report a concern","https://www.rspca.org.uk/en/reportaconcern"],["Police non-emergency: 101","tel:101"]]]
    },
    scotland:{
      neglect:["Report suspected cruelty or neglect","Contact the Scottish SPCA. You can also report animal cruelty to Police Scotland on 101.",[["Scottish SPCA: contact and report","https://www.scottishspca.org/contact-/"],["Police non-emergency: 101","tel:101"]]],
      injured:["Help for an injured or sick pet","Contact the Scottish SPCA for advice. If urgent veterinary treatment is needed, contact a local vet immediately.",[["Scottish SPCA: contact and report","https://www.scottishspca.org/contact-/"]]],
      wildlife:["Help for injured wildlife","Contact the Scottish SPCA for guidance. If urgent veterinary treatment is needed, contact a local vet and call ahead.",[["Scottish SPCA: contact and report","https://www.scottishspca.org/contact-/"]]],
      farm:["Farm animal welfare","Contact the Animal and Plant Health Agency in Scotland.",[["GOV.UK: animal welfare contacts","https://www.gov.uk/report-dead-animal"],["Call APHA Scotland: 03000 600 704","tel:03000600704"]]],
      stray:["Stray or abandoned animal","For an uninjured stray dog, contact your local council. For an injured animal or suspected neglect, contact the Scottish SPCA.",[["Scottish SPCA: contact and report","https://www.scottishspca.org/contact-/"],["Find your local council","https://www.mygov.scot/find-your-local-council"]]],
      urgent:["Get urgent help now","If an animal or person is in immediate danger, call 999. For non-emergency cruelty concerns, contact Police Scotland on 101 or the Scottish SPCA.",[["Call 999","tel:999"],["Scottish SPCA: contact and report","https://www.scottishspca.org/contact-/"],["Police non-emergency: 101","tel:101"]]]
    }
  };
  button.addEventListener("click",function(){
    if(!concern.value){output.classList.remove("hidden");output.textContent="Please choose the type of concern first.";return;}
    const key=urgency.value==="yes"?"urgent":concern.value;
    const item=data[country.value][key];
    output.replaceChildren();
    const h=document.createElement("h3");h.textContent=item[0];output.appendChild(h);
    const p=document.createElement("p");p.textContent=item[1];output.appendChild(p);
    if(urgency.value==="yes"||concern.value==="urgent"){const w=document.createElement("p");w.textContent="Do not wait for ALFIK or use this page instead of emergency services if there is immediate danger.";output.appendChild(w);}
    item[2].forEach(function(entry){const a=document.createElement("a");a.className="animal-voice-link";a.textContent=entry[0];a.href=entry[1];a.target="_blank";a.rel="noopener noreferrer";output.appendChild(a);});
    const note=document.createElement("p");note.className="note";note.textContent="You are leaving ALFIK to contact the organisation directly. ALFIK has not sent or stored your answers. The organisation own reporting and privacy rules apply.";output.appendChild(note);
    output.classList.remove("hidden");
  });
})();
