/* Prototype only: Reset demo. */
import { ACT } from "../js/core/registry.js";
import { go } from "../js/core/router.js";
import { S, save, setState } from "../js/core/store.js";
import { resetSearchState } from "../js/pages/home/state.js";
import { openModal, toast } from "../js/ui/feedback.js";
import { migrate } from "./migrations.js";
import { seed } from "./sample-data.js";

ACT.resetDemo=()=>openModal({title:"Reset demo data?",body:'<p>This clears every change you made in this browser and starts again with no master projects. Documents in the Document library are kept.</p>',submit:"Reset",danger:true,onSubmit:()=>{const who=S.me;setState(seed());migrate();S.me=who;save();resetSearchState();toast("Demo data reset");go("#/search");}});
