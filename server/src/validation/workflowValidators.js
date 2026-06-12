import { z } from 'zod';

export const InstitutionStateEnum = z.enum([
  'Draft', 'Submitted', 'Under Review', 'Additional Information Required',
  'Approved By Sales', 'On Hold', 'Activated', 'Rejected',
  'Credit Restricted', 'Suspended', 'Inactive', 'Blacklisted', 'Expired', 'Paused',
  'Pending Finance Setup', 'Credit Assessment'
]);

export const InstitutionTransitionSchema = z.object({
  fromState: z.string().optional(),
  toState: InstitutionStateEnum,
  actorRole: z.string(),
}).superRefine((val, ctx) => {
  const { toState, actorRole } = val;

  // Sales Executive Matrix
  const salesAllowed = ['Approved By Sales', 'Rejected', 'Additional Information Required', 'On Hold', 'Under Review'];
  if (salesAllowed.includes(toState) && !['Sales Executive', 'Super Admin'].includes(actorRole)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only Sales Executive or Super Admin can set this status" });
  }

  // Accounts Executive Matrix
  const accountsAllowed = ['Activated', 'Credit Restricted', 'Suspended', 'Pending Finance Setup', 'Credit Assessment', 'Paused'];
  if (accountsAllowed.includes(toState) && !['Accounts Executive', 'Super Admin'].includes(actorRole)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only Accounts Executive or Super Admin can activate or modify financial standing" });
  }

  // Pure Super Admin
  const adminOnly = ['Blacklisted'];
  if (adminOnly.includes(toState) && actorRole !== 'Super Admin') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only Super Admin can Blacklist an institution" });
  }
});

export const OrderStateEnum = z.enum([
  'Created', 'Confirmed', 'Assigned', 'Packed', 'Dispatched', 'Delivered', 'Cancelled'
]);

export const OrderTransitionSchema = z.object({
  fromState: OrderStateEnum,
  toState: OrderStateEnum,
  actorRole: z.string(),
}).superRefine((val, ctx) => {
  const { fromState, toState, actorRole } = val;

  // Basic transition rules
  if (fromState === 'Draft' && toState !== 'Created') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Draft can only move to Created" });
  }

  // Authorizations
  if (toState === 'Confirmed' && !['Super Admin', 'Sales Executive'].includes(actorRole)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only Sales Executive or Super Admin can approve orders" });
  }

  if (toState === 'Dispatched' && !['Super Admin', 'Warehouse Executive', 'Warehouse Staff'].includes(actorRole)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only Warehouse team can dispatch orders" });
  }
});

export const ReturnStateEnum = z.enum([
  'Requested', 'Approved', 'Rejected', 'Collected', 'Verified', 'Closed'
]);

export const ReturnTransitionSchema = z.object({
  fromState: ReturnStateEnum,
  toState: ReturnStateEnum,
  actorRole: z.string()
}).superRefine((val, ctx) => {
  const { fromState, toState, actorRole } = val;
  if (toState === 'Approved' && !['Super Admin', 'Warehouse Executive', 'Salesman', 'Sales Executive'].includes(actorRole)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only authorized personnel can approve returns" });
  }
  if (toState === 'Closed' && !['Super Admin', 'Warehouse Executive'].includes(actorRole)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only Warehouse Executive can close returns" });
  }
});
