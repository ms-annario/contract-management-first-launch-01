/* Workflow stages, document and package statuses, and platform roles. */

export const DAY=864e5;
export const STAGES=["Sub-project & lead","Tender & IC","SME team","Assign documents","Drafting","Approval","Collate package","TEC approval","Contracts review","Send to Tender Division"];
export const DEFAULT_DUR=[3,3,3,5,15,5,3,5,5,2];
export const DS={NS:"Not started",DR:"Drafting",IR:"Published",PA:"Pending approval",RT:"Returned",AP:"Approved",CR:"Changes requested",FI:"Final",NR:"Not required"};
export const isApproved=d=>[DS.AP,DS.FI].includes(d.status);
export const PS={COL:"Collating",ICR:"In contracts review",CHG:"Changes requested",CLR:"Cleared for TEC",TEC:"Submitted to TEC",POST:"Post-TEC review",FIN:"Finalised",TD:"Sent to Tender Division"};
/* Package states after contracts approval, waiting to be sent to Tender Division */
export const TD_READY=[PS.CLR,PS.TEC,PS.POST,PS.FIN];
export const PLATFORM_ROLES=["System admin","Project lead","Sub-project lead","Contract project IC","SME","SME superior","Contracts team reviewer","TEC member"];
export const ROLE_OF={"u-admin":"System admin","u-pl":"Project lead","u-spl":"Sub-project lead","u-spl2":"Sub-project lead","u-ic":"Contract project IC","u-sup":"SME superior",
 "u-sme1":"SME","u-sme2":"SME","u-sme3":"SME","u-sme4":"SME","u-rev":"SME","u-ctr":"Contracts team reviewer","u-tec":"TEC member","u-tec2":"TEC member","u-tec3":"TEC member","u-ext":"SME"};
export const DRAFTY=[DS.NS,DS.DR,DS.RT];
export const EDITABLE=[DS.NS,DS.DR,DS.IR,DS.RT];
export const DOC_LOCKED=[DS.PA,DS.CR];
