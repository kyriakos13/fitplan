// Personal training flow. Existing fp_* records are retained; this plan uses cb_*.
const PROGRAM = window.CB_PROGRAM || {id:'machines-v1',title:'Consistent Body',weeks:12,frequency:3,sequence:Object.keys(WO)};
const PROGRAM_KEY = 'cb_program_' + PROGRAM.id;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function readProgram(){
  try { const s=JSON.parse(localStorage.getItem(PROGRAM_KEY)); if(s && Number.isInteger(s.cursor) && Array.isArray(s.history)) return s; } catch {}
  return {cursor:0,active:null,history:[],started:null};
}
function writeProgram(state){localStorage.setItem(PROGRAM_KEY,JSON.stringify(state))}
function nextWorkoutKey(){const s=readProgram();return s.active?.wo || PROGRAM.sequence[s.cursor%PROGRAM.sequence.length]}
function programWeek(){const s=readProgram();return Math.min(PROGRAM.weeks||12,1+Math.floor(s.cursor/(PROGRAM.frequency||3)))}
function effectiveExercise(e){
  const state=readProgram(),week=state.active?.week||programWeek();
  const build=state.active?state.active.buildVolume:getSettings().buildVolume;
  return {...e,sets:build?(e.setsByWeek?.[week-1] ?? e.sets):e.sets,rirTarget:e.rirByWeek?.[week-1] ?? e.rirTarget ?? '2–3'};
}
function currentExercise(){return effectiveExercise(WO[ps.wo].ex[ps.ei])}
function beginSession(){
  const s=readProgram();
  if(!s.active){s.active={id:Date.now().toString(36),wo:nextWorkoutKey(),created:new Date().toISOString(),week:programWeek(),buildVolume:!!getSettings().buildVolume,progress:{}};s.started ||= s.active.created;writeProgram(s)}
  return s.active;
}
function woProgKey(){return PROGRAM_KEY}
function getWoProg(){const s=readProgram();return s.active?.wo===selWo?s.active.progress:{}}
function saveWoProg(ei,si,record){
  const s=readProgram();if(!s.active || s.active.wo!==selWo)return;
  const old=s.active.progress[ei]||{si:0,sets:[]};
  s.active.progress[ei]={...old,si,sets:record?[...(old.sets||[]),record]:(old.sets||[])};
  writeProgram(s);
}
function firstIncomplete(key,progress){return WO[key].ex.findIndex((e,i)=>(progress[i]?.si||0)<effectiveExercise(e).sets)}
function startToday(){
  const active=beginSession();selWorkout(active.wo);
  const first=firstIncomplete(active.wo,active.progress);
  if(first<0){ps.wo=active.wo;showWorkoutDone();document.getElementById('player').classList.add('show')}else openPlayer(first);
}
function renderToday(){
  document.getElementById('greeting').textContent='Consistent Body';
  document.getElementById('today-date').textContent=new Date().toLocaleDateString('el-GR',{weekday:'long',day:'numeric',month:'long'});
  const state=readProgram(),key=nextWorkoutKey(),w=WO[key],p=state.active?.progress||{};
  const completed=w.ex.filter((e,i)=>(p[i]?.si||0)>=effectiveExercise(e).sets).length;
  const week=programWeek(),last=state.history.at(-1),today=ymd(new Date());
  const doneToday=last?.date===today;
  const challenge=week===1?'Challenge 1: κατέγραψε σωστά κιλά, επαναλήψεις και ρύθμιση σε κάθε μηχάνημα.':week===2?'Challenge 2: όπου η τεχνική και το περιθώριο το επιτρέπουν, +1 συνολική επανάληψη με τα ίδια κιλά.':'Challenge: περισσότερες καθαρές επαναλήψεις στο ίδιο φορτίο. Αύξηση μόνο όταν πληρούνται τα κριτήρια.';
  document.getElementById('today-workout-area').innerHTML=`
    <div class="focus-card">
      <div class="focus-eyebrow">ULTRAFLEX · ΠΡΟΠΟΝΗΤΙΚΗ ΕΒΔΟΜΑΔΑ ${week}/${PROGRAM.weeks||12}</div>
      ${doneToday?'<p class="focus-note success">✓ Η σημερινή προπόνηση καταγράφηκε. Τώρα αποκατάσταση· η επόμενη σε περιμένει.</p>':''}
      <h1>${esc(w.name)}</h1>
      <p class="focus-note">${w.ex.length} ασκήσεις · ${effectiveExercise(w.ex[0]).sets>2?'50–65':'45–55'} λεπτά${completed?' · '+completed+'/'+w.ex.length+' ολοκληρωμένες':''}</p>
      <button class="btn btn-primary" onclick="startToday()">${state.active?'Συνέχισε εκεί που έμεινες →':doneToday?'Άνοιξε την επόμενη προπόνηση →':'Ξεκίνα την προπόνηση →'}</button>
      <p class="focus-note">${esc(PROGRAM.schedule||'3 επισκέψεις την εβδομάδα, με ημέρα ανάπαυσης ανάμεσα. Αν χάσεις μέρα, η σειρά μένει ίδια. Μην αναπληρώνεις με διπλές προπονήσεις.')}</p>
    </div>
    <div class="card focus-info"><strong>Το μικρό σου challenge</strong><p class="focus-note">${challenge}</p><p class="focus-note">RIR = πόσες ακόμη σωστές επαναλήψεις θα μπορούσες να κάνεις. Δεν χρειάζεται αποτυχία.</p></div>
    <details class="card focus-info"><summary>Το πρόγραμμα και οι κανόνες του</summary><div class="focus-note">${esc(PROGRAM.intro||'Πρώτη εβδομάδα: βρες φορτίο με άνετη, ελεγχόμενη τεχνική. 5–8′ ήπια προθέρμανση και 1–3 ελαφριά προπαρασκευαστικά σετ στα πρώτα μεγάλα μηχανήματα. Τα ζεστάματα δεν καταγράφονται ως κανονικά σετ.')}</div>${PROGRAM.guideUrl?`<a class="source-link" href="${esc(PROGRAM.guideUrl)}" target="_blank" rel="noopener">Οδηγός 12 εβδομάδων και πηγές →</a>`:''}<p class="focus-note">Η προπονητική εβδομάδα προχωρά μετά από ${PROGRAM.frequency||3} ολοκληρωμένες επισκέψεις. Τα κιλά διαφέρουν ανά μηχάνημα· κρατάς την ίδια μονάδα και ρύθμιση.</p></details>`;
}
function initGym(){selWorkout(nextWorkoutKey())}
function selWorkout(key){
  selWo=key;done.clear();const w=WO[key],p=getWoProg();
  document.getElementById('day-sel').innerHTML='';
  document.getElementById('workout-content').innerHTML=`<div class="t-section"><h2>${esc(w.name)}</h2><p class="focus-note">${esc(w.sub)}</p><button class="btn btn-primary" onclick="startToday()">${readProgram().active?'Συνέχισε':'Ξεκίνα'} →</button><p class="focus-note">${esc(PROGRAM.warmup||'5–8′ ήπια προθέρμανση και 1–3 ελαφριά σετ εξοικείωσης πριν από την πρώτη μεγάλη άσκηση. Τα ζεστάματα δεν μετρούν στα παρακάτω σετ.')}</p></div>
    <div class="ex-list">${w.ex.map((raw,i)=>{const e=effectiveExercise(raw),n=p[i]?.si||0,isDone=n>=e.sets;if(isDone)done.add(i);return `<button class="ex-item${isDone?' completed':''}" id="ei${i}" onclick="openPlayer(${i})"><span class="ex-num${isDone?' done':''}" id="en${i}">${isDone?'✓':i+1}</span><span class="ex-info"><span class="ex-name">${esc(e.el)}</span><span class="ex-detail">${n}/${e.sets} σετ · ${esc(e.reps)} επαναλήψεις · ${e.rest}″ ανάπαυση</span></span><span class="ex-chev">›</span></button>`}).join('')}</div>
    <details class="card focus-info" style="margin:16px"><summary>Όλη η σειρά προπονήσεων</summary>${PROGRAM.sequence.map(k=>`<p class="focus-note"><strong>${esc(WO[k].name)}</strong><br>${WO[k].ex.map(e=>esc(e.el)).join(' · ')}</p>`).join('')}</details>`;
}
function repRange(ex){const n=String(ex.reps).match(/\d+/g)?.map(Number)||[8,12];return [n[0],n[1]||n[0]]}
function exerciseId(e){return e.id||e.en||e.el}
function previousExercise(e){
  for(const h of [...readProgram().history].reverse()){
    const match=h.exercises?.find(x=>x.id===exerciseId(e)&&x.machine===e.machine);if(match?.sets?.length&&match.sets.every(s=>s.unit===loadUnit(e)))return match;
  }
  return null;
}
function loadAdvice(e,previous){
  const [low,high]=repRange(e);
  if(!previous)return `Βρες τη βάση σου: ξεκίνα ελαφριά και βρες βάρος για ${low}–${high} καθαρές επαναλήψεις με ${e.rirTarget} RIR. Δεν υπάρχει ασφαλές προκαθορισμένο kg. Κατέγραψε μόνο τα κανονικά σετ.`;
  const sets=previous.sets,last=sets.at(-1);
  const minRir=programWeek()<=2?3:2;
  const exposures=[...readProgram().history].reverse().map(h=>h.exercises?.find(x=>x.id===exerciseId(e))).filter(Boolean).slice(0,2);
  const comparable=exposures.length===2&&exposures.every(x=>x.machine===e.machine&&x.sets.length>=e.sets&&x.sets.every(s=>s.kg===last.kg&&s.setup===last.setup&&s.setup&&s.unit===loadUnit(e)&&s.clean===true&&s.reps>=high&&s.rir>=minRir));
  if(comparable)return `Δύο συγκρίσιμες προπονήσεις στο πάνω όριο, με καθαρή τεχνική και ≥${minRir} RIR. Βάση: ${last.kg} ${last.unit}. Δοκίμασε το μικρότερο διαθέσιμο βήμα στο ίδιο μηχάνημα/ρύθμιση. Αν πέσεις κάτω από ${low} ή χαλάσει η τεχνική, γύρνα πίσω.`;
  if(sets.some(s=>s.reps<low||s.rir===0))return `Την προηγούμενη φορά υπήρξε σετ κάτω από ${low} επαναλήψεις ή χωρίς περιθώριο. Μείωσε ένα μικρό βήμα ή κράτησε φορτίο με λιγότερη κόπωση, ώστε να μείνουν ${e.rirTarget} RIR.`;
  return `Κράτα τη βάση σου (${last.kg} ${last.unit}, ίδια ρύθμιση). Στόχος: +1 συνολική καθαρή επανάληψη, μόνο με ${e.rirTarget} RIR. Αύξηση μετά από δύο συγκρίσιμες προπονήσεις με όλα τα σετ στο ${high} και ≥${minRir} RIR, χωρίς πόνο. Δεν είναι υποχρεωτική εβδομαδιαία αύξηση.`;
}
function loadUnit(e){return e.loadUnit||'kg στη στοίβα'}
function renderSetComparison(e,previous,progress){
  const format=s=>s?`${esc(s.kg)} × ${esc(s.reps)}`:'—';
  document.getElementById('set-comparison').innerHTML=`<table class="set-comparison"><caption>Κιλά × επαναλήψεις · ${esc(loadUnit(e))}</caption><thead><tr><th>Σετ</th><th>Πριν</th><th>Σήμερα</th></tr></thead><tbody>${Array.from({length:e.sets},(_,i)=>`<tr class="${i===ps.si?'current-set':''}"><th>${i+1}</th><td>${format(previous?.sets?.[i])}</td><td>${progress?.sets?.[i]?'✓ '+format(progress.sets[i]):i===ps.si?'Τώρα':'—'}</td></tr>`).join('')}</tbody></table>`;
  document.getElementById('copy-previous-set').hidden=!previous?.sets?.[ps.si];
}
function copyPreviousSet(){
  const previous=previousExercise(currentExercise())?.sets?.[ps.si];if(!previous||ps.resting)return;
  document.getElementById('set-load').value=previous.kg;
  document.getElementById('set-repetitions').value=previous.reps;
  document.getElementById('machine-setup').value=previous.setup||'';
  document.getElementById('set-rir').value='';document.getElementById('set-clean').checked=false;
  toast('Συμπληρώθηκαν τιμές. Έλεγξέ τες μετά το σετ και βάλε το σημερινό RIR.');
}
function renderSetEntry(){
  const e=currentExercise(),p=getWoProg()[ps.ei],previous=previousExercise(e),last=p?.sets?.at(-1)||previous?.sets?.[ps.si]||previous?.sets?.at(-1);
  document.getElementById('load-advice').textContent=loadAdvice(e,previous);
  document.getElementById('set-load').value=last?.kg??'';
  document.getElementById('set-repetitions').value='';
  document.getElementById('set-rir').value='';
  document.getElementById('set-clean').checked=false;
  document.getElementById('machine-setup').value=last?.setup||'';
  document.getElementById('load-unit').textContent=loadUnit(e);
  document.getElementById('set-target').textContent=`Στόχος: ${e.reps} επαναλήψεις · ${e.rirTarget} RIR`;
  document.getElementById('previous-sets').textContent=previous?`Προηγούμενη φορά: ${previous.sets.map(s=>s.kg+' × '+s.reps+' ('+s.rir+' RIR)').join(' · ')}. Ρύθμιση: ${previous.sets.at(-1).setup||'δεν καταγράφηκε'}`:'Πρώτη καταγραφή σε αυτό το μηχάνημα.';
  renderSetComparison(e,previous,p);
}
function renderMachine(e){
  const mb=document.getElementById('p-machine'),photo=e.photo;
  mb.style.display='block';
  mb.innerHTML=`<strong>${esc(e.machine)}</strong><button class="quick-action busy-button" onclick="deferExercise()">Το όργανο είναι πιασμένο →</button>`;
  const di=document.getElementById('ex-demo-inner');di.style.cssText='width:100%;padding:14px';
  if(photo?.src){
    const label=photo.status==='exact'?'Φωτογραφία από το UltraFlex Περιστερίου':photo.status==='model'?'Φωτογραφία μοντέλου — δεν επιβεβαιώνει το συγκεκριμένο μηχάνημα του χώρου':'Μη επιβεβαιωμένη ταύτιση μηχανήματος';
    di.innerHTML=`<img src="${esc(photo.src)}" alt="${esc(e.machine)}" class="machine-photo" onerror="this.hidden=true;this.nextElementSibling.textContent='Η φωτογραφία δεν είναι διαθέσιμη. Άνοιξε την πηγή.'"><p class="photo-status">${photo.status==='exact'?'Φωτογραφία χώρου':'Μοντέλο του PDF · επιβεβαίωσε το στον χώρο'}</p><details><summary class="photo-status">Πηγή και ταυτοποίηση</summary><p class="focus-note">${esc(label)}${photo.caption?' · '+esc(photo.caption):''}</p>${photo.sourceUrl?`<a class="source-link" href="${esc(photo.sourceUrl)}" target="_blank" rel="noopener">Επίσημη πηγή →</a>`:''}</details>`;
  }else di.innerHTML='<p class="focus-note">Δεν βρέθηκε επιβεβαιωμένη φωτογραφία αυτού του μηχανήματος στον χώρο. Ζήτησε από τον γυμναστή να σου δείξει ποιο είναι πριν το πρώτο σετ.</p>';
  document.getElementById('mch-link').style.display='none';
  const yt=document.getElementById('yt-link');yt.style.display=e.videoUrl?'flex':'none';
  if(e.videoUrl){yt.href=e.videoUrl;yt.target='_blank';yt.onclick=null;yt.querySelector('span:last-child').textContent='Οδηγίες τεχνικής'}
}
function openPlayer(ei){
  if(selWo!==nextWorkoutKey()){toast('Ακολούθησε πρώτα την επόμενη προπόνηση');return}
  const active=beginSession();clearInterval(ps.rint);
  const saved=active.progress[ei]||{si:0};ps={wo:selWo,ei,si:saved.si,resting:false,rint:null};
  const e=currentExercise();
  document.getElementById('done-screen').style.display='none';document.getElementById('done-btn').style.display='none';
  document.getElementById('set-dots').style.display='';document.querySelector('.cue-card').style.display='';
  document.getElementById('ex-demo').style.display='flex';
  document.getElementById('p-name').textContent=e.el;
  document.getElementById('p-sub').textContent=`Άσκηση ${ei+1}/${WO[selWo].ex.length} · ${WO[selWo].name}`;
  document.getElementById('p-cue').textContent=e.cue;
  renderMachine(e);renderSetEntry();updatePlayer();document.getElementById('pbody').scrollTop=0;
  if(active.restUntil>Date.now())startRest(Math.ceil((active.restUntil-Date.now())/1000));
  document.getElementById('player').classList.add('show');
}
function startRest(secs){
  const state=readProgram();if(!state.active)return;
  clearInterval(ps.rint);const deadline=Date.now()+secs*1000;state.active.restUntil=deadline;writeProgram(state);ps.resting=true;
  const tick=()=>{const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));document.getElementById('rest-secs').textContent=remaining;document.getElementById('rr-fill').style.strokeDashoffset=427*(1-remaining/secs);if(!remaining){skipRest();playRestDone();vib([200,100,200])}};
  updatePlayer();tick();ps.rint=setInterval(tick,250);
}
function skipRest(){clearInterval(ps.rint);ps.resting=false;const s=readProgram();if(s.active){delete s.active.restUntil;writeProgram(s)}updatePlayer()}
function updatePlayer(){
  const w=WO[ps.wo],e=currentExercise(),p=getWoProg();
  const total=w.ex.reduce((n,x)=>n+effectiveExercise(x).sets,0),completed=w.ex.reduce((n,x,i)=>n+Math.min(p[i]?.si||0,effectiveExercise(x).sets),0);
  document.getElementById('p-prog').style.width=(completed/total*100)+'%';
  document.getElementById('set-dots').innerHTML=Array.from({length:e.sets},(_,i)=>`<div class="sd${i<ps.si?' done':i===ps.si?' cur':''}" aria-label="Σετ ${i+1}${i<ps.si?' ολοκληρωμένο':''}"></div>`).join('');
  document.getElementById('set-area').style.display=ps.resting?'none':'block';
  document.getElementById('rest-area').classList.toggle('show',ps.resting);
  const finished=ps.si>=e.sets;
  document.getElementById('set-lbl').textContent=finished?'Όλα τα σετ ✓':`Σετ ${ps.si+1} από ${e.sets}`;
  document.getElementById('set-big').textContent=finished?'✓':ps.si+1;
  document.getElementById('set-reps').textContent=finished?'':e.reps+' επαναλήψεις';
  document.getElementById('set-entry').hidden=ps.resting||finished;
  document.getElementById('set-btn').style.display=ps.resting||finished?'none':'block';
  document.getElementById('next-btn').style.display=!ps.resting&&finished?'block':'none';
  document.getElementById('next-btn').textContent=firstIncomplete(ps.wo,p)<0?'Ολοκλήρωσε την προπόνηση ✓':'Επόμενη εκκρεμής άσκηση →';
  document.getElementById('session-set-log').textContent=(p[ps.ei]?.sets||[]).map((s,i)=>`Σετ ${i+1}: ${s.kg} × ${s.reps} · ${s.rir} RIR`).join(' | ');
}
function doSet(){
  const e=currentExercise();if(ps.resting||ps.si>=e.sets)return;
  const kgText=document.getElementById('set-load').value,repsText=document.getElementById('set-repetitions').value,rirText=document.getElementById('set-rir').value;
  const kg=Number(kgText),reps=Number(repsText),rir=Number(rirText);
  if(kgText===''||repsText===''||rirText===''||!Number.isFinite(kg)||kg<0||!Number.isInteger(reps)||reps<1||reps>100||!Number.isInteger(rir)||rir<0||rir>5){toast('Συμπλήρωσε κιλά, πραγματικές επαναλήψεις και RIR');return}
  const record={kg,reps,rir,unit:loadUnit(e),setup:document.getElementById('machine-setup').value.trim(),clean:document.getElementById('set-clean').checked,at:new Date().toISOString()};
  ps.si++;saveWoProg(ps.ei,ps.si,record);renderSetEntry();
  if(ps.si<e.sets)startRest(e.rest);else{updatePlayer();markDone(ps.ei);toast('Άσκηση καταγράφηκε ✓');vib([100,50,100])}
}
function nextEx(){
  clearInterval(ps.rint);const p=getWoProg(),w=WO[ps.wo];
  const indices=[...w.ex.keys()].filter(i=>(p[i]?.si||0)<effectiveExercise(w.ex[i]).sets);
  const next=indices.find(i=>i>ps.ei)??indices[0];
  if(next===undefined)showWorkoutDone();else openPlayer(next);
}
function deferExercise(){
  const p=getWoProg(),w=WO[ps.wo];
  const remaining=[...w.ex.keys()].filter(i=>i!==ps.ei&&(p[i]?.si||0)<effectiveExercise(w.ex[i]).sets);
  const next=remaining.find(i=>i>ps.ei)??remaining[0];
  if(next===undefined){toast('Αυτή είναι η τελευταία εκκρεμής άσκηση. Μπορείς να συνεχίσεις αργότερα.');return}
  openPlayer(next);toast('Αλλάξαμε σειρά. Η προηγούμενη άσκηση παραμένει σε εκκρεμότητα.');
}
function showWorkoutDone(){
  const s=readProgram();if(!s.active)return;
  if(firstIncomplete(s.active.wo,s.active.progress)>=0){toast('Υπάρχουν ακόμη σετ. Η πρόοδος έχει αποθηκευτεί.');return}
  const active=s.active,w=WO[active.wo];
  s.history.push({id:active.id,wo:active.wo,date:ymd(new Date()),finished:new Date().toISOString(),week:active.week,exercises:w.ex.map((e,i)=>({id:exerciseId(e),name:e.el,machine:e.machine,sets:active.progress[i]?.sets||[]}))});
  s.cursor++;s.active=null;writeProgram(s);logWorkout(active.wo);
  clearInterval(ps.rint);
  document.getElementById('p-name').textContent='Η προπόνηση ολοκληρώθηκε';document.getElementById('p-sub').textContent='Κιλά και επαναλήψεις αποθηκεύτηκαν';
  document.getElementById('p-prog').style.width='100%';
  ['set-dots','set-area','set-btn','next-btn','p-machine','ex-demo','yt-link'].forEach(id=>document.getElementById(id).style.display='none');
  document.getElementById('set-entry').hidden=true;document.getElementById('session-set-log').textContent='';
  document.getElementById('rest-area').classList.remove('show');document.querySelector('.cue-card').style.display='none';
  document.getElementById('done-screen').style.display='block';document.getElementById('done-btn').style.display='block';
  document.getElementById('done-meal-name').textContent='Ξεκούραση και επόμενη επίσκεψη';
  document.getElementById('done-meal-foods').textContent='Δώσε χρόνο για αποκατάσταση. Η επόμενη προπόνηση μένει στη σειρά σου, ακόμη κι αν αλλάξει η ημέρα.';
  document.getElementById('done-meal-macros').textContent='Επόμενη: '+WO[nextWorkoutKey()].name;
  document.getElementById('pbody').scrollTop=0;vib([100,50,100]);
}
function resetCurrentEx(){
  const s=readProgram();if(!s.active)return;
  const p=s.active.progress[ps.ei];if(!p?.si)return;
  clearInterval(ps.rint);ps.resting=false;ps.si=Math.max(0,p.si-1);
  delete s.active.restUntil;
  s.active.progress[ps.ei]={si:ps.si,sets:(p.sets||[]).slice(0,-1)};writeProgram(s);
  done.delete(ps.ei);renderSetEntry();updatePlayer();toast('Αναιρέθηκε το τελευταίο σετ');
}
function closePlayer(){
  clearInterval(ps.rint);document.getElementById('player').classList.remove('show');
  document.getElementById('done-screen').style.display='none';document.getElementById('done-btn').style.display='none';
  selWorkout(nextWorkoutKey());renderToday();
}
function ymd(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function logWorkout(type){const log=getWoLog(),date=ymd(new Date());if(!log.some(e=>e.date===date&&e.type===type)){log.push({date,type});localStorage.setItem('fp_wo_log',JSON.stringify(log))}}
function renderSettings(){
  document.getElementById('gym-time-input').value=getSettings().gymTime;
  document.getElementById('days-editor').innerHTML='<p class="focus-note">Η σειρά προπονήσεων προχωρά όταν ολοκληρωθούν όλα τα σετ. Οι χαμένες ημέρες δεν τη μηδενίζουν.</p><label class="entry-label"><input id="build-volume-opt" type="checkbox" '+(getSettings().buildVolume?'checked':'')+'> Έχω 50–65′ και αναρρώνω καλά: πρόσθετα σετ από την 3η προπονητική εβδομάδα.</label><p class="focus-note">Αλλιώς μένουν 2 σετ ανά άσκηση. Η αλλαγή ισχύει από την επόμενη νέα προπόνηση.</p><label class="entry-label"><input id="meal-alerts-opt" type="checkbox" '+(getSettings().mealAlerts?'checked':'')+'> Ειδοποιήσεις παλιού πλάνου γευμάτων (προαιρετικές)</label>';
}
function saveSettings(){const s={...getSettings(),gymTime:document.getElementById('gym-time-input').value,buildVolume:document.getElementById('build-volume-opt').checked,mealAlerts:document.getElementById('meal-alerts-opt').checked};localStorage.setItem('fp_settings',JSON.stringify(s));renderToday();initGym();toast('Οι ρυθμίσεις αποθηκεύτηκαν')}
const legacyCheckAlert=checkAlert;
checkAlert=function(){if(getSettings().mealAlerts)legacyCheckAlert()};
function exportData(){
  const storage={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('fp_')||k.startsWith('cb_'))storage[k]=localStorage.getItem(k)}
  const txt=JSON.stringify({version:2,storage,exported:new Date().toISOString()},null,2),blob=new Blob([txt],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='consistent-body-backup-'+ymd(new Date())+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Το backup περιλαμβάνει όλες τις καταγραφές');
}
function importData(){
  const raw=prompt('Επικόλλησε το JSON του backup σου. Οι αντίστοιχες αποθηκευμένες καταγραφές θα αντικατασταθούν.');if(!raw)return;
  try{const data=JSON.parse(raw);if(data.version===2&&data.storage){const entries=Object.entries(data.storage);if(!entries.every(([k,v])=>(k.startsWith('fp_')||k.startsWith('cb_'))&&typeof v==='string'))throw new Error();entries.forEach(([k,v])=>localStorage.setItem(k,v))}else{const log=data.log||data;if(!Array.isArray(log))throw new Error();localStorage.setItem('fp_log',JSON.stringify(log));localStorage.setItem('fp_log_bak',JSON.stringify(log))}renderTrack();renderToday();initGym();toast('Το backup επανήλθε')}catch{toast('Το backup δεν έχει έγκυρη μορφή')}
}
// Put machine recognition before logging. Remote pictures retain their source.
const playerBody=document.getElementById('pbody'),setDots=document.getElementById('set-dots');
playerBody.insertBefore(document.getElementById('p-machine'),setDots);
playerBody.insertBefore(document.getElementById('ex-demo'),setDots);
Object.assign(WO_COLORS,{A:'#FF6B35',B:'#0a84ff',C:'#30d158'});
Object.assign(WO_LABELS,{A:'A',B:'B',C:'C'});

// A session-wide notebook: drafts persist independently of set order.
startToday=function(){renderPlan(nextWorkoutKey());nav('plan')};
function startLogging(){beginSession();selWorkout(nextWorkoutKey());nav('gym')}
function sheetValue(active,i,j){return active?.sheet?.[i]?.[j] ?? active?.progress?.[i]?.sets?.[j] ?? {}}
function saveSheet(input,i,j,field){
  const s=readProgram();if(!s.active)return;
  const value={...sheetValue(s.active,i,j),[field]:input.type==='checkbox'?input.checked:input.value};
  s.active.sheet ||= {};s.active.sheet[i] ||= {};s.active.sheet[i][j]=value;
  writeProgram(s);document.getElementById('sheet-status').textContent='Αποθηκεύτηκε στη συσκευή';
}
selWorkout=function(key){
  selWo=key;const a=readProgram().active,w=WO[key];
  document.getElementById('day-sel').innerHTML='';
  document.getElementById('workout-content').innerHTML=`<div class="sheet-head"><span class="sheet-kicker">ΚΑΤΑΓΡΑΦΗ / ${key}</span><h2>${esc(w.name)}</h2><p>Όλα τα σετ εδώ. Συμπλήρωσε με τη σειρά που σε βολεύει.</p><span id="sheet-status" role="status">${a?'Αυτόματη αποθήκευση στη συσκευή':'Ξεκίνα για να καταγράψεις'}</span>${!a?'<button class="btn btn-primary" onclick="startLogging()">Άνοιγμα καταγραφής</button>':''}</div>
  ${w.ex.map((raw,i)=>{const e=effectiveExercise(raw),prev=previousExercise(e);return `<section class="sheet-ex"><header><span class="sheet-index">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(e.el)}</h3><p>${e.sets} σετ × ${esc(e.reps)} επαναλήψεις · ${e.rest}″ διάλειμμα · ${esc(loadUnit(e))}</p></div></header>${e.photo?.src?`<figure class="sheet-photo"><img loading="lazy" src="${esc(e.photo.src)}" alt="${esc(e.machine)}"><figcaption>${esc(e.machine)} · Φωτογραφία μοντέλου, όχι επιβεβαιωμένη λήψη του χώρου</figcaption></figure>`:''}<table class="log-grid"><thead><tr><th>Σετ</th><th>Πριν</th><th>Κιλά</th><th>Επαν.</th><th>RIR*</th></tr></thead><tbody>${Array.from({length:e.sets},(_,j)=>{const v=sheetValue(a,i,j),old=prev?.sets[j];return `<tr><th>${j+1}</th><td>${old?esc(old.kg)+' × '+esc(old.reps):'—'}</td>${['kg','reps','rir'].map(f=>`<td><input aria-label="${esc(e.el)} σετ ${j+1} ${f}" type="number" inputmode="${f==='kg'?'decimal':'numeric'}" min="0" ${f==='rir'?'max="10"':''} step="${f==='kg'?'0.5':'1'}" value="${esc(v[f]??'')}" ${a?'':'disabled'} oninput="saveSheet(this,${i},${j},'${f}')"></td>`).join('')}</tr>`}).join('')}</tbody></table><details class="sheet-details"><summary>Μηχάνημα & τεχνική</summary><p>${esc(e.machine)}</p><p>${esc(e.cue)}</p><p>${esc(loadAdvice(e,prev))}</p></details></section>`}).join('')}
  <div class="sheet-footer"><p>* RIR: πόσες σωστές επαναλήψεις σου έμεναν. Προαιρετικό· χωρίς αυτό δεν προτείνεται αύξηση κιλών.</p><button class="btn btn-primary" onclick="finishSheet()" ${a?'':'disabled'}>Ολοκλήρωση προπόνησης</button><p id="sheet-error" role="alert"></p></div>`;
};
function finishSheet(){
  const s=readProgram();if(!s.active)return;const a=s.active,w=WO[a.wo],progress={};
  for(let i=0;i<w.ex.length;i++){
    const e=effectiveExercise(w.ex[i]),sets=[];
    for(let j=0;j<e.sets;j++){
      const v=sheetValue(a,i,j),kg=Number(v.kg),reps=Number(v.reps),hasRir=v.rir!==''&&v.rir!=null,rir=hasRir?Number(v.rir):null;
      if(v.kg==null||v.kg===''||!Number.isFinite(kg)||kg<0||!Number.isInteger(reps)||reps<1||reps>100||(hasRir&&(!Number.isInteger(rir)||rir<0||rir>10))){
        document.getElementById('sheet-error').textContent=`${e.el}, σετ ${j+1}: έλεγξε κιλά και επαναλήψεις${hasRir?' / RIR':''}. Οι υπόλοιπες τιμές έχουν αποθηκευτεί.`;return;
      }
      sets.push({...v,kg,reps,rir,unit:loadUnit(e),setup:v.setup||'',clean:v.clean===true,at:v.at||new Date().toISOString()});
    }progress[i]={si:sets.length,sets};
  }
  a.progress=progress;writeProgram(s);ps.wo=a.wo;showWorkoutDone();renderToday();selWorkout(nextWorkoutKey());nav('today');toast('Η προπόνηση αποθηκεύτηκε');
}
renderToday=function(){
  const s=readProgram(),w=WO[nextWorkoutKey()];
  document.getElementById('greeting').textContent='Consistent / Body';
  document.getElementById('today-date').textContent=new Date().toLocaleDateString('el-GR',{weekday:'long',day:'numeric',month:'long'});
  document.getElementById('today-workout-area').innerHTML=`<div class="session-cover"><span class="sheet-kicker">ULTRAFLEX / ΕΒΔΟΜΑΔΑ ${programWeek()}</span><h1>${esc(w.name)}</h1><p>${w.ex.length} ασκήσεις · 3 επισκέψεις / εβδομάδα</p><button class="btn btn-primary" onclick="startToday()">${s.active?'Συνέχεια καταγραφής':'Άνοιγμα προπόνησης'} ↗</button></div><div class="session-preview">${w.ex.map((e,i)=>`<div><span>${String(i+1).padStart(2,'0')}</span><strong>${esc(e.el)}</strong><small>${effectiveExercise(e).sets} × ${esc(e.reps)}</small></div>`).join('')}</div><details class="sheet-details"><summary>Προθέρμανση & οδηγός</summary><p>${esc(PROGRAM.warmup||PROGRAM.intro)}</p><a href="training-guide.html">Οδηγός προγράμματος ↗</a></details>`;
};
// Preserve existing logs and remap the active session by exercise identity.
{
 const state=readProgram();
 if(state.revision!==PROGRAM.revision){
  if(state.active){
   localStorage.setItem(PROGRAM_KEY+'_before_split',JSON.stringify(state));
   const active=state.active,old=PROGRAM.previousWorkouts[active.wo],next=WO[active.wo],progress={},sheet={};
   next.ex.forEach((e,i)=>{const j=old.ex.findIndex(x=>x.id===e.id);if(j>=0){if(active.progress[j])progress[i]=active.progress[j];if(active.sheet?.[j])sheet[i]=active.sheet[j]}});
   active.progress=progress;active.sheet=sheet;
  }
  state.revision=PROGRAM.revision;writeProgram(state);
 }
}
function renderPlan(key=nextWorkoutKey()){
 const w=WO[key];
 document.getElementById('plan-content').innerHTML=`<div class="sheet-head"><span class="sheet-kicker">ΠΡΟΓΡΑΜΜΑ / 3 ΗΜΕΡΕΣ</span><h2>${esc(w.name)}</h2><div style="display:flex;gap:8px;margin:16px 0">${PROGRAM.sequence.map(k=>`<button class="btn ${k===key?'btn-primary':'btn-secondary'}" onclick="renderPlan('${k}')">${k==='C'?'Γ · Πόδια':k}</button>`).join('')}</div><p>Εικόνα, σετ και επαναλήψεις. Η καταγραφή βρίσκεται στη δική της καρτέλα.</p></div>${w.ex.map(raw=>{const e=effectiveExercise(raw);return `<section class="sheet-ex"><header><div><h3>${esc(e.el)}</h3><p>${esc(e.machine)}</p></div></header>${e.photo?.src?`<figure class="sheet-photo"><img loading="lazy" src="${esc(e.photo.src)}" alt="${esc(e.machine)}" onerror="this.hidden=true;this.nextElementSibling.textContent='Η εικόνα δεν φορτώθηκε. Άνοιξε την πηγή παρακάτω.'"><figcaption>Φωτογραφία μοντέλου · όχι επιβεβαιωμένη λήψη του χώρου</figcaption><a class="source-link" href="${esc(e.photo.sourceUrl)}" target="_blank" rel="noopener">Πηγή εικόνας</a></figure>`:''}<div style="padding:0 18px 20px"><strong style="font-size:24px">${e.sets} σετ × ${esc(e.reps)}</strong><p class="focus-note">${e.rest}″ διάλειμμα</p><details class="sheet-details"><summary>Τεχνική</summary><p>${esc(e.cue)}</p></details></div></section>`}).join('')}`;
}
const notebookNav=nav;
nav=function(page){if(page==='plan')renderPlan();if(page==='gym')selWorkout(nextWorkoutKey());notebookNav(page)};
