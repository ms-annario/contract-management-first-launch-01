/* Entry point: loads state, wires up listeners in a fixed order, then renders the first page. */
import "../prototype/index.js"; // Prototype-only tooling: sample data, role switcher, Reset demo. Delete this line for production.
import { load } from "./core/store.js";
import { initRouter, render } from "./core/router.js";
import { initActions } from "./core/actions.js";
import { initSidebar } from "./layout/sidebar.js";
import { initLogin, isUnlocked } from "./layout/login.js";
import { initSearchDropdowns } from "./pages/home/dropdowns.js";
import { initTableSort } from "./ui/table-sort.js";
import { initPagination } from "./ui/pagination.js";

// Pages and features register their routes and actions when imported
import "./ui/activity-feed.js";
import "./pages/my-tasks.js";
import "./pages/admin.js";
import "./pages/home/state.js";
import "./pages/home/search-engine.js";
import "./pages/home/dropdowns.js";
import "./pages/home/details.js";
import "./pages/home/home-page.js";
import "./pages/projects.js";
import "./pages/tenders/tender-forms.js";
import "./pages/tenders/tender-page.js";
import "./pages/tenders/team-tab.js";
import "./pages/tenders/documents-tab.js";
import "./pages/tenders/ai-recommendations.js";
import "./pages/tenders/package.js";
import "./pages/tenders/metrics-tab.js";
import "./pages/tenders/tec.js";
import "./pages/library.js";
import "./pages/document/document-details.js";
import "./pages/document/document-page.js";
import "./pages/document/document-actions.js";
import "./pages/document/ai-writer.js";
import "./features/export/libraries.js";
import "./features/export/documents.js";
import "./features/export/zip.js";
import "./features/export/package-export.js";

load();

// Listener order matters (several document-level click handlers), so keep this sequence
initRouter();
initActions();
initSidebar();
initSearchDropdowns();
initTableSort();
initPagination();

if(!location.hash)history.replaceState(null,"","#/search");
// The app renders once the access password is entered (see layout/login.js)
initLogin(render);
if(isUnlocked())render();
