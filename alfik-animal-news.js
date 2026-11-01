(function(){
"use strict";
const $=id=>document.getElementById(id), PREF="alfik-news-pref-v1", LAST="alfik-news-last-v1";
const cats=[["local","Local animal news"],["rescue","Rescue and welfare"],["health","Animal health"],["wildlife","Wildlife"],["legislation","Animal legislation"],["community","Community and events"],["general","Wider animal news"]];
const defaults={enabled:false,area:"",frequency:"weekly",categories:["local","rescue","health","wildlife","legislation","community"]};
let busy=false;
const read=()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(PREF)||"{}")}}catch(_){return {...defaults}}};
const save=p=>{try{localStorage.setItem(PREF,JSON.stringify(p))}catch(_){}};
const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n};
function choices(selected){const host=$("animalNewsCategories");host.replaceChildren();cats.forEach(([v,t])=>{const l=el("label",null,"animal-news-check"),i=document.createElement("input");i.type="checkbox";i.value=v;i.checked=selected.includes(v);l.append(i,document.createTextNode(" "+t));host.append(l)})}
function fill(p){$("animalNewsOptIn").checked=!!p.enabled;$("animalNewsArea").value=p.area||"";$("animalNewsFrequency").value=p.frequency||"weekly";choices(p.categories||defaults.categories)}
function form(){return {enabled:$("animalNewsOptIn").checked,area:$("animalNewsArea").value.trim(),frequency:$("animalNewsFrequency").value,categories:[...$("animalNewsCategories").querySelectorAll("input:checked")].map(i=>i.value)}}
function status(t){$("animalNewsStatus").textContent=t}
function card(s){const c=el("article",null,"animal-news-card"),m=el("p",null,"animal-news-meta"),tag=el("span",s.category||"Animal news","animal-news-tag"),src=el("span",(s.source||"Publisher")+" · "+(s.publishedAt?new Date(s.publishedAt).toLocaleDateString():"Date not supplied")),h=el("h3",s.title),p=el("p",s.summary||"Open the original article for the full story."),a=el("a","Read original article ↗");m.append(tag,src);a.href=s.link;a.target="_blank";a.rel="noopener noreferrer";c.append(m,h,p,a);return c}
async function fetchNews(p,quiet){
 if(busy)return;if(!p.enabled){status("Switch on Animal Newswire to receive a local digest.");return}if(!p.area){status("Please enter your town, city, county or postcode area.");return}if(!p.categories.length){status("Choose at least one news category.");return}
 busy=true;const b=$("animalNewsRefresh");b.disabled=true;b.textContent="Finding animal news…";if(!quiet)status("Searching public animal news feeds for "+p.area+"…");
 try{const days=p.frequency==="daily"?1:7,{data,error}=await window.supabaseClient.functions.invoke("alfik-animal-news",{body:{area:p.area,categories:p.categories,days}});if(error)throw error;if(data?.error)throw Error(data.error);
 const host=$("animalNewsResults");host.replaceChildren();if(!data.stories?.length)host.append(el("p","No matching stories found for "+p.area+". Try a wider area or different categories."));else{host.append(el("p",data.stories.length+" stories found · "+(p.frequency==="daily"?"Daily":"Weekly")+" digest","animal-news-count"));data.stories.forEach(s=>host.append(card(s)))}
 const now=new Date(data.fetchedAt||Date.now());try{localStorage.setItem(LAST,now.toISOString())}catch(_){}status("Updated "+now.toLocaleString()+". Headlines link to their original publishers. Nothing is archived in ALFIK's database.");
 }catch(e){status("Animal news couldn't be loaded: "+(e.message||"Please try again later."))}
 finally{busy=false;b.disabled=false;b.textContent="Refresh animal news"}
}
window.loadAlfikAnimalNews=function(){const p=read();fill(p);if(!p.enabled){status("Animal Newswire is optional. Choose your area and switch it on to see your digest.");return}let last=null;try{last=localStorage.getItem(LAST)}catch(_){}const interval=p.frequency==="daily"?86400000:604800000;if(!last||Date.now()-new Date(last).getTime()>=interval||!$("animalNewsResults").children.length)fetchNews(p,true);else status("Your "+p.frequency+" digest is up to date. Refresh whenever you like.")};
function init(){fill(read());$("animalNewsSave").addEventListener("click",()=>{const p=form();if(p.enabled&&p.area.length<2){status("Please enter your local area before switching on Animal Newswire.");return}if(p.enabled&&!p.categories.length){status("Please choose at least one category.");return}save(p);status(p.enabled?"Preferences saved on this device. Your digest refreshes when you open this section, according to your chosen frequency.":"Animal Newswire is switched off.");if(p.enabled)fetchNews(p,false);else $("animalNewsResults").replaceChildren()});$("animalNewsRefresh").addEventListener("click",()=>fetchNews(read(),false))}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();