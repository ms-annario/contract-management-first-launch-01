/* Click-to-sort for every data table. */
import { parse } from "../core/router.js";

/* Global Table Sorting Engine (Ascending / Descending) */
const TABLE_SORTS = new Map();
let isSortingTable = false;
function parseDateVal(str) {
  if (!str) return null;
  const ddmmyyyy = str.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const hours = ddmmyyyy[4] ? parseInt(ddmmyyyy[4], 10) : 0;
    const minutes = ddmmyyyy[5] ? parseInt(ddmmyyyy[5], 10) : 0;
    return new Date(year, month, day, hours, minutes).getTime();
  }
  const yyyymmdd = str.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (yyyymmdd) {
    return new Date(parseInt(yyyymmdd[1], 10), parseInt(yyyymmdd[2], 10) - 1, parseInt(yyyymmdd[3], 10)).getTime();
  }
  return null;
}
function getCellSortValue(cell) {
  if (!cell) return "";
  const select = cell.querySelector("select");
  if (select) {
    return (select.options[select.selectedIndex]?.text || "").trim();
  }
  const dateInput = cell.querySelector('input[type="date"]');
  if (dateInput && dateInput.value) {
    return dateInput.value.trim();
  }
  const textInput = cell.querySelector('input[type="text"]');
  if (textInput && textInput.value) {
    return textInput.value.trim();
  }
  return (cell.innerText || cell.textContent || "").replace(/\s+/g, " ").trim();
}
function compareSortValues(valA, valB, dir) {
  const isAEmpty = !valA || valA === "–" || valA === "—" || valA === "-";
  const isBEmpty = !valB || valB === "–" || valB === "—" || valB === "-";
  if (isAEmpty && isBEmpty) return 0;
  if (isAEmpty) return 1;
  if (isBEmpty) return -1;

  // 1. Date comparison
  const dateA = parseDateVal(valA);
  const dateB = parseDateVal(valB);
  if (dateA !== null && dateB !== null) {
    return dir === "asc" ? dateA - dateB : dateB - dateA;
  }

  // 2. Fractions (e.g. "3/5 approved", "1/8: ...")
  const fracRegex = /^(\d+)\/(\d+)/;
  const fA = valA.match(fracRegex);
  const fB = valB.match(fracRegex);
  if (fA && fB) {
    const fracValA = parseFloat(fA[1]) / parseFloat(fA[2]);
    const fracValB = parseFloat(fB[1]) / parseFloat(fB[2]);
    if (fracValA !== fracValB) {
      return dir === "asc" ? fracValA - fracValB : fracValB - fracValA;
    }
  }

  // 3. Numbers / Currency / Percentages
  const cleanA = valA.replace(/[$€£,\s]/g, "");
  const cleanB = valB.replace(/[$€£,\s]/g, "");
  const numRegex = /^[-+]?\d+(?:\.\d+)?%?$/;
  if (numRegex.test(cleanA) && numRegex.test(cleanB)) {
    const numA = parseFloat(cleanA);
    const numB = parseFloat(cleanB);
    if (numA !== numB) {
      return dir === "asc" ? numA - numB : numB - numA;
    }
  }

  // 4. Natural alphanumeric string comparison
  const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}
function getTableKey(table) {
  if (table.id) return table.id;
  const viewParent = table.closest("[id]");
  if (viewParent && viewParent.id) {
    const tables = Array.from(viewParent.querySelectorAll("table.t"));
    return viewParent.id + "_" + tables.indexOf(table);
  }
  const r = (typeof parse === "function") ? parse() : { name: "page" };
  const allTables = Array.from(document.querySelectorAll("table.t"));
  return (r.name || "page") + "_" + allTables.indexOf(table);
}
function sortTable(table, th, dir, saveState = true) {
  if (isSortingTable) return;
  const tbody = table.querySelector(":scope > tbody");
  if (!tbody) return;

  const trHead = th.parentElement;
  const ths = Array.from(trHead.children);
  const colIndex = ths.indexOf(th);
  if (colIndex === -1) return;

  isSortingTable = true;
  try {
    ths.forEach(otherTh => {
      otherTh.removeAttribute("data-sort-dir");
      otherTh.classList.remove("sort-asc", "sort-desc");
      otherTh.removeAttribute("aria-sort");
      if (otherTh.classList.contains("sortable")) {
        otherTh.setAttribute("title", "Click to sort");
      }
    });

    th.setAttribute("data-sort-dir", dir);
    th.classList.remove("sort-asc", "sort-desc");
    th.classList.add(dir === "asc" ? "sort-asc" : "sort-desc");
    th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
    th.setAttribute("title", dir === "asc" ? "Sorted ascending (click to sort descending)" : "Sorted descending (click to sort ascending)");

    const key = getTableKey(table);
    if (saveState && key) {
      TABLE_SORTS.set(key, { colText: th.textContent.trim(), dir });
    }
    table.dataset.sortedKey = key + ":" + th.textContent.trim() + ":" + dir;

    const rows = Array.from(tbody.children);
    if (rows.length <= 1) {
      if (rows.length === 0 || rows[0].querySelector("td[colspan]")) return;
    }

    const sorted = rows.map((row, origIndex) => ({ row, origIndex }));
    sorted.sort((a, b) => {
      const valA = getCellSortValue(a.row.children[colIndex]);
      const valB = getCellSortValue(b.row.children[colIndex]);
      const res = compareSortValues(valA, valB, dir);
      if (res === 0) return a.origIndex - b.origIndex;
      return res;
    });

    sorted.forEach(s => tbody.appendChild(s.row));
  } finally {
    isSortingTable = false;
  }
}
export function initSortableHeaders() {
  if (isSortingTable) return;
  document.querySelectorAll("table.t").forEach(table => {
    const theadThs = table.querySelectorAll(":scope > thead > tr > th");
    theadThs.forEach(th => {
      const text = th.textContent.trim();
      if (text && !th.classList.contains("no-sort") && !th.querySelector('input[type="checkbox"]')) {
        th.classList.add("sortable");
        if (!th.hasAttribute("title")) {
          th.setAttribute("title", "Click to sort");
        }
      } else {
        th.classList.remove("sortable");
      }
    });

    // Re-apply preserved sort state if present and not already applied
    const key = getTableKey(table);
    const saved = TABLE_SORTS.get(key);
    if (saved) {
      const expectedKey = key + ":" + saved.colText + ":" + saved.dir;
      if (table.dataset.sortedKey !== expectedKey) {
        const matchingTh = Array.from(theadThs).find(th => th.textContent.trim() === saved.colText);
        if (matchingTh) {
          sortTable(table, matchingTh, saved.dir, false);
        }
      }
    }
  });
}
const sortObserver = new MutationObserver(() => {
  if (!isSortingTable) initSortableHeaders();
});

export function initTableSort(){
  document.addEventListener("click", function(e) {
    const th = e.target.closest("table.t thead th");
    if (!th) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON") return;
    const text = th.textContent.trim();
    if (!text || th.classList.contains("no-sort") || th.querySelector('input[type="checkbox"]')) return;
    const table = th.closest("table.t");
    if (!table) return;
  
    const currentDir = th.getAttribute("data-sort-dir");
    const newDir = currentDir === "asc" ? "desc" : "asc";
    sortTable(table, th, newDir, true);
  });
  sortObserver.observe(document.body, { childList: true, subtree: true });
}
