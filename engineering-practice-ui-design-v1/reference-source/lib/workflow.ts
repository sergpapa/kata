// P0 simulation. Client rules document UX behavior; they are not an authorization boundary.
export type Variant = "hash" | "version" | "title" | "unresolved";
export type Role = "learner" | "author" | "reviewer" | "assessor" | "operations";
export type Status = "ReviewQueued" | "Reviewing" | "FeedbackReady" | "NeedsContext" | "ServiceDelayed" | "Withdrawn";
export type Finding = { id:string; title:string; result:"met"|"not_met"|"insufficient_evidence"; detail:string; path:string };
export type HelpEvent = { id:string; level:number; scope:"main"; label:string };
export type Snapshot = { variant:Variant; files:{path:string;content:string}[]; notes:string; help:HelpEvent[]; reportedExecution:boolean; bodyTest:boolean; packageVersion:string; rubricVersion:string };
export type Attempt = { id:string; episode:string; revision:number; key:string; fingerprint:string; status:Status; snapshot:Snapshot; review:Finding[]|null; reviewVersion:number; response:string; appealReason:string; appeal:"none"|"open"|"needs_fresh_evidence"|"corrected"; lease:boolean; reviewsRequested:number };
export type State = {
  schema:1; revision:number; studied:number[]; ready:boolean; prediction:string|null; observation:string; reflection:string;
  help:HelpEvent[]; mode:"learning"|"independent"; draftNumber:number; draftVariant:Variant; bodyTest:boolean;
  selected:string[]; notes:string; reportedExecution:boolean; attempts:Attempt[]; activeId:string|null;
  fresh:"not_requested"|"requested"|"exposed"; authorText:string; helpCorrected:boolean;
  contentReviewRequested:boolean; releaseWithdrawn:boolean; appealConflict:boolean;
  notice:string; events:{action:string;target:string}[];
};
export const sourcePaths = ["lab/main/validator.mjs","lab/main/representation.mjs","lab/main/mutation.mjs","test/regression.mjs","learner/Investigation.md","evidence/local-results.txt"];
export const authorSeed = `# Stored does not mean reusable\n\nKeeping a copy, deciding when to reuse it, and validating it are separate decisions.\n\n## Predict\nWhat happens when a conditional request carries an old entity tag after the response body changes?\n\n## Help metadata\nhelp_id: HTTP-MAIN-DIAGNOSIS\nlegacy_level: H4\nactual_disclosure: decisive_diagnosis\ncorrected_level: pending\n\n## Release context\nindicator_id: NET-04.i03\nprerequisite: LS-HTTP-02\nsolution: instructor/Walkthroughs.md\n`;
export function initialState():State {return {schema:1,revision:0,studied:[1,2],ready:true,prediction:null,observation:"",reflection:"",help:[],mode:"learning",draftNumber:1,draftVariant:"hash",bodyTest:false,selected:[...sourcePaths],notes:"Hypothesis: the origin reports that an old copy is still current.\nExperiment: compare unconditional and conditional requests after changing only the body.\nObservation: unconditional content changes; the old tag still receives 304.",reportedExecution:true,attempts:[],activeId:null,fresh:"not_requested",authorText:authorSeed,helpCorrected:false,contentReviewRequested:false,releaseWithdrawn:false,appealConflict:false,notice:"",events:[]};}
export function sourceFor(variant:Variant,path:string,bodyTest=false,notes=""):string {
  if(path==="lab/main/validator.mjs") {
    if(variant==="hash")return 'import { createHash } from "node:crypto";\n\nexport function makeTag(record, representation) {\n  const digest = createHash("sha256").update(representation).digest("hex");\n  return `"${digest}"`;\n}\n';
    if(variant==="version")return '// Valid here only with controlled mutations and one representation.\nexport function makeTag(record) {\n  return `"${record.id}:${record.revision}"`;\n}\n';
    if(variant==="title")return 'import { createHash } from "node:crypto";\n\nexport function makeTag(record) {\n  return `"${createHash("sha256").update(record.title).digest("hex")}"`;\n}\n';
    return '// Investigation unfinished: still the starter.\nexport function makeTag(record) {\n  return `"${record.id}"`;\n}\n';
  }
  if(path==="lab/main/representation.mjs")return 'export function selectRepresentation(record) {\n  return JSON.stringify({ id: record.id, title: record.title, body: record.body }) + "\\n";\n}\n';
  if(path==="lab/main/mutation.mjs")return 'export function update(record, change) {\n  // Every controlled content mutation increments the revision in this fixture.\n  return { ...record, ...change, revision: record.revision + 1 };\n}\n';
  if(path==="test/regression.mjs")return bodyTest?'// Synthetic submitted test summary\n// Covers unchanged content, title-only change, body-only change, and missing resources.\n// Execution is learner-reported. This file was not run by the platform.\n':'// Synthetic submitted test summary\n// Covers unchanged content and a title-only change.\n// Body-only mutation has not been covered.\n';
  if(path==="learner/Investigation.md")return notes;
  if(path==="evidence/local-results.txt")return 'SYNTHETIC learner-reported transcript\nGET current -> 200\nGET matching tag -> 304\nGET old tag after changing content -> 200\nNo platform execution or observation is implied.\n';
  return "[excluded fixture; no real credential]";
}
export function validateSelection(paths:string[]) {const errors:string[]=[];if(paths.length>64)errors.push("Too many files: the proposed limit is 64.");if(new Set(paths).size!==paths.length)errors.push("Duplicate paths are not accepted.");for(const p of paths)if(!sourcePaths.includes(p))errors.push(`${p}: outside this exercise's allowed source set.`);for(const p of sourcePaths.slice(0,3))if(!paths.includes(p))errors.push(`${p}: required source context is missing.`);return errors;}
export function snapshotDraft(s:State):Snapshot {return {variant:s.draftVariant,files:s.selected.map(path=>({path,content:sourceFor(s.draftVariant,path,s.bodyTest,s.notes)})),notes:s.notes,help:structuredClone(s.help),reportedExecution:s.reportedExecution&&s.selected.includes("evidence/local-results.txt"),bodyTest:s.bodyTest,packageVersion:"FSSE-RLP-001@1.0.0 + P0 synthetic adaptation",rubricVersion:"FSSE-APP-001@1.0 demo criteria"};}
export function activeAttempt(s:State){return s.attempts.find(a=>a.id===s.activeId)??null;}
export function maxHelp(events:HelpEvent[]){return Math.max(0,...events.map(h=>h.level));}
export function helpLevel(disclosure:string,declared:number){return disclosure==="decisive_diagnosis"||disclosure==="complete_solution"?5:declared;}
export function reviewSnapshot(p:Snapshot):Finding[]{const ok=p.variant==="hash"||p.variant==="version";return [
  {id:"F-01",title:"Validator follows the selected content",result:ok?"met":"not_met",path:"lab/main/validator.mjs",detail:ok?(p.variant==="version"?"The controlled revision is defensible in this fixture: every content mutation increments it, and one representation is served. A hash is not required by the contract.":"The validator depends on the complete selected bytes. A body-only change affects the tag in this fixture."):p.variant==="title"?"Changing only the body leaves the title hash unchanged. An old client tag can incorrectly validate the previous content.":"The resource ID stays stable when its content changes. The starter does not yet implement the required validator relationship."},
  {id:"F-02",title:"Regression evidence covers a body-only change",result:p.bodyTest?"met":"insufficient_evidence",path:"test/regression.mjs",detail:p.bodyTest?"The submitted test summary includes the original body-only failure. This is static evidence of intent, not a verified test run.":"The submitted test summary covers a title change, but the original incident changes only the body. Add a discriminating case and the actual local result."},
  {id:"F-03",title:"Investigation separates hypotheses from observations",result:p.notes===initialState().notes?"met":"insufficient_evidence",path:"learner/Investigation.md",detail:p.notes===initialState().notes?"The synthetic notes describe a hypothesis and a comparison that distinguishes unconditional content from validation. Process evidence remains useful even with an unfinished repair.":"Edited notes need a real reviewer. This prototype only carries an authored process finding for its unchanged synthetic investigation sample."}
];}
export function authorErrors(text:string){const errors:string[]=[];if(!text.includes("indicator_id: NET-04.i03"))errors.push("indicator_id: expected the known HTTP child indicator NET-04.i03.");if(text.includes("prerequisite: LS-HTTP-03"))errors.push("prerequisite: LS-HTTP-03 cannot depend on itself.");if(!text.includes("solution: instructor/Walkthroughs.md"))errors.push("solution: the required walkthrough reference is missing.");if(!text.includes("corrected_level: H5"))errors.push("HTTP-MAIN-DIAGNOSIS: a decisive diagnosis must be H5. The imported H4 label is incompatible.");return errors;}
export type Action =
 | {type:"study";lesson:number}|{type:"ready";value:boolean}|{type:"prediction";text:string}|{type:"observation";text:string;reflection:string}
 | {type:"help";level:number;label:string;disclosure:string}|{type:"mode";mode:State["mode"]}
 | {type:"draft";variant?:Variant;selected?:string[];notes?:string;bodyTest?:boolean;reportedExecution?:boolean}
 | {type:"submit";key:string}|{type:"select_attempt";id:string}
 | {type:"advance"|"delay"|"retry"|"withdraw"|"lease_revoke"|"claim"|"publish"|"context"|"late_result";id:string}
 | {type:"revise";id:string}|{type:"response";id:string;text:string}|{type:"appeal";id:string;text?:string}
 | {type:"adjudicate";id:string;disposition:"needs_fresh_evidence"|"corrected"}|{type:"fresh";value:State["fresh"]}
 | {type:"author";text:string}|{type:"correct_help"}|{type:"request_content_review"}|{type:"withdraw_release"}|{type:"appeal_conflict";value:boolean}|{type:"reset"};
export function transition(state:State,a:Action):State {
  if(a.type==="reset")return {...initialState(),revision:state.revision+1,notice:"The synthetic demo has been reset."};
  const s=structuredClone(state);s.revision++;s.notice="";
  const target="id" in a?s.attempts.find(x=>x.id===a.id):undefined;
  const tell=(message:string)=>{s.notice=message;return s;};
  switch(a.type){
    case "study":if(!s.studied.includes(a.lesson))s.studied.push(a.lesson);return tell("Lesson marked studied. Competency evidence is unchanged.");
    case "ready":s.ready=a.value;break;
    case "prediction":if(s.prediction!==null)return tell("The original prediction is saved. Add your reflection separately.");if(!a.text.trim())return tell("Write a prediction first.");s.prediction=a.text.trim();return tell("Original prediction saved on this device.");
    case "observation":if(s.prediction===null)return tell("Save your original prediction before adding observations here.");s.observation=a.text;s.reflection=a.reflection;return tell("Observation and reflection saved separately from the prediction.");
    case "mode":if(a.mode==="independent"&&maxHelp(s.help)>0)return tell("This episode already includes help. A fresh assignment is needed for an independent demonstration.");s.mode=a.mode;break;
    case "help":{const level=helpLevel(a.disclosure,a.level);if(!s.help.some(h=>h.label===a.label))s.help.push({id:`help-${s.help.length+1}`,level,scope:"main",label:a.label});if(level>0)s.mode="learning";return tell(`H${level} recorded for this investigation. Continue learning; fresh evidence can demonstrate independence later.`);}
    case "draft":if(a.variant!==undefined)s.draftVariant=a.variant;if(a.selected)s.selected=[...a.selected];if(a.notes!==undefined)s.notes=a.notes;if(a.bodyTest!==undefined)s.bodyTest=a.bodyTest;if(a.reportedExecution!==undefined)s.reportedExecution=a.reportedExecution;break;
    case "submit":{if(!s.ready)return tell("Complete preparation before this practice submission.");if(s.releaseWithdrawn)return tell("This release is withdrawn. Submission is paused pending recovery.");const errors=validateSelection(s.selected);if(errors.length)return tell(errors.join(" "));const snap=snapshotDraft(s),fp=JSON.stringify(snap),prior=s.attempts.find(x=>x.key===a.key);if(prior){if(prior.fingerprint!==fp)return tell("This request key belongs to different content. Start an explicit revision.");s.activeId=prior.id;return tell("Existing submission recovered. No duplicate attempt or review was created.");}const id=`ATT-${String(s.attempts.length+1).padStart(3,"0")}`;s.attempts.push({id,episode:"DEMO-HTTP-MAIN-01",revision:s.attempts.length+1,key:a.key,fingerprint:fp,status:"ReviewQueued",snapshot:snap,review:null,reviewVersion:0,response:"",appealReason:"",appeal:"none",lease:false,reviewsRequested:1});s.activeId=id;s.events.push({action:"submitted",target:id});return tell("Demo submission created locally. Waiting for review.");}
    case "select_attempt":if(target)s.activeId=target.id;break;
    case "advance":if(!target)break;if(target.status==="ReviewQueued"){target.status="Reviewing";target.lease=true;return tell("The demo reviewer is inspecting the pinned snapshot.");}if(target.status==="Reviewing"&&target.lease){target.review=reviewSnapshot(target.snapshot);target.reviewVersion++;target.status="FeedbackReady";target.lease=false;return tell("Scripted feedback is ready. No code was executed and no model was called.");}return tell("This attempt cannot advance from its current state.");
    case "publish":if(!target||target.status!=="Reviewing"||!target.lease)return tell("Publication blocked: no current assignment lease for an active review.");target.review=reviewSnapshot(target.snapshot);target.reviewVersion++;target.status="FeedbackReady";target.lease=false;return tell("Demo feedback published for the pinned snapshot.");
    case "claim":if(target&&target.status==="ReviewQueued"){target.status="Reviewing";target.lease=true;return tell("Review claimed in this local simulation.");}return tell("This review is not available to claim.");
    case "lease_revoke":if(target){target.lease=false;if(target.status==="Reviewing")target.status="ReviewQueued";}return tell("Demo assignment revoked. Stale publication is blocked.");
    case "context":if(target&&target.status==="Reviewing"&&target.lease){target.status="NeedsContext";target.lease=false;return tell("Request the exact conditional header and response after a body-only change. Add context in a new revision.");}return tell("A current assignment is required to request context.");
    case "delay":if(target&&["ReviewQueued","Reviewing"].includes(target.status)){target.status="ServiceDelayed";target.lease=false;}return tell("Review is delayed. The demo snapshot is retained.");
    case "retry":if(target?.status==="ServiceDelayed"){target.status="ReviewQueued";s.events.push({action:"same_request_requeued",target:target.id});}return tell("The same review request is queued; no new demonstration was counted.");
    case "withdraw":if(target){target.status="Withdrawn";target.lease=false;s.events.push({action:"withdrawn",target:target.id});}return tell("Submission withdrawn. New feedback will not publish. Withdrawal does not delete retained history.");
    case "late_result":if(!target||target.status==="Withdrawn"||!target.lease){s.events.push({action:"late_result_discarded",target:target?.id??"unknown"});return tell("Late result discarded. Current state and assignment do not allow publication.");}return tell("Result still needs current publication checks; it is not automatically accepted.");
    case "revise":if(!target)break;s.draftNumber++;s.draftVariant=target.snapshot.variant;s.bodyTest=target.snapshot.bodyTest;s.notes=target.snapshot.notes;s.selected=target.snapshot.files.map(f=>f.path);return tell("New draft ready. The submitted snapshot stays fixed; this remains the same investigation episode.");
    case "response":if(target?.status==="FeedbackReady"){target.response=a.text;return tell("Response saved separately. Submit a revision to provide changed source.");}return tell("Open published feedback before responding.");
    case "appeal":if(target?.status==="FeedbackReady"){target.appeal="open";target.appealReason=a.text??"Synthetic appeal";return tell("Demo appeal opened against the pinned review. Independent adjudication is required.");}return tell("An appeal needs a published review.");
    case "adjudicate":if(s.appealConflict)return tell("Decision blocked: an independent adjudicator is required.");if(target?.appeal==="open"){target.appeal=a.disposition;return tell(a.disposition==="corrected"?"Demo disposition: correct the disputed attribution. This does not award a competency target.":"Demo disposition: obtain genuinely fresh evidence before deciding independence.");}return tell("There is no open appeal to adjudicate.");
    case "fresh":s.fresh=a.value;return tell(a.value==="exposed"?"Prior exposure recorded. The public transfer example cannot establish fresh independent performance.":"Fresh-task request recorded locally. An assessor must assign an unexposed comparable task.");
    case "author":s.authorText=a.text;s.helpCorrected=a.text.includes("corrected_level: H5");s.contentReviewRequested=false;break;
    case "correct_help":s.authorText=s.authorText.replace(/corrected_level: .*/,"corrected_level: H5");s.helpCorrected=true;s.contentReviewRequested=false;return tell("Candidate diagnosis classified H5. The original H4 label remains in provenance.");
    case "request_content_review":{const errors=authorErrors(s.authorText);if(errors.length)return tell(errors.join(" "));s.contentReviewRequested=true;return tell("Candidate entered the simulated review queue. Independent sign-off and runtime gates remain pending.");}
    case "withdraw_release":s.releaseWithdrawn=true;return tell("Demo release withdrawn. Existing attempts stay pinned; new submissions are paused.");
    case "appeal_conflict":s.appealConflict=a.value;break;
  }return s;
}
