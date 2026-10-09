/* Route and action registries. No imports, so every module can register safely at load time. */

/* routing */
export const ROUTES={};
export const route=(name,fn)=>ROUTES[name]=fn;
/* delegated actions */
export const ACT={};
