/**
 * GangaMaxx CRM — Central RBAC Permission Matrix
 * Single source of truth for all role-based access control.
 *
 * Roles (canonical, PascalCase):
 *  - Super Admin
 *  - Sales Executive
 *  - Salesman
 *  - Accounts Executive
 *  - Warehouse Executive
 *  - Warehouse Staff
 */

// ─── Canonical Role Constants ───────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN:       'Super Admin',
  SALES_EXECUTIVE:   'Sales Executive',
  SALESMAN:          'Salesman',
  ACCOUNTS_EXECUTIVE:'Accounts Executive',
  WAREHOUSE_EXECUTIVE:'Warehouse Executive',
  WAREHOUSE_STAFF:   'Warehouse Staff',
};

export const ALL_ROLES = Object.values(ROLES);

// ─── Menu / Navigation Permissions ──────────────────────────────────────────
export const MENU_PERMISSIONS = {
  dashboard:         ALL_ROLES,
  staff:             [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE],
  customerApplications:[ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE],
  institutions:      [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.SALESMAN, ROLES.ACCOUNTS_EXECUTIVE],
  customer360:       [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.SALESMAN, ROLES.ACCOUNTS_EXECUTIVE, ROLES.WAREHOUSE_EXECUTIVE],
  businessCalendar:  [ROLES.SALES_EXECUTIVE, ROLES.SALESMAN],
  followUps:         [ROLES.SALESMAN],
  visitLogs:         [ROLES.SALESMAN],
  orders:            [ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  deliveries:        [ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  returns:           [ROLES.WAREHOUSE_EXECUTIVE],
  returnCollections: [ROLES.WAREHOUSE_STAFF],
  products:          [ROLES.WAREHOUSE_EXECUTIVE],
  categories:        [ROLES.WAREHOUSE_EXECUTIVE],
  inventory:         [ROLES.WAREHOUSE_EXECUTIVE],
  procurement:       [],
  creditAccounts:    [ROLES.ACCOUNTS_EXECUTIVE],
  invoices:          [ROLES.ACCOUNTS_EXECUTIVE],
  payments:          [ROLES.ACCOUNTS_EXECUTIVE],
  supportTickets:    [],
  reports:           [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.ACCOUNTS_EXECUTIVE, ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  notifications:     ALL_ROLES,
  compliance:        [ROLES.SUPER_ADMIN],
  auditCenter:       [ROLES.SUPER_ADMIN],
};

// ─── Page-level Permissions (can user even land on this route?) ──────────────
export const PAGE_PERMISSIONS = {
  '/dashboard':        ALL_ROLES,
  '/staff':            [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE],
  '/customer-applications': [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE],
  '/institutions':     [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.SALESMAN, ROLES.ACCOUNTS_EXECUTIVE],
  '/customer-360':     [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.SALESMAN, ROLES.ACCOUNTS_EXECUTIVE, ROLES.WAREHOUSE_EXECUTIVE],
  '/business-calendar':[ROLES.SALES_EXECUTIVE, ROLES.SALESMAN],
  '/follow-ups':       [ROLES.SALESMAN],
  '/visit-logs':       [ROLES.SALESMAN],
  '/orders':           [ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  '/deliveries':       [ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  '/returns':          [ROLES.WAREHOUSE_EXECUTIVE],
  '/return-collections': [ROLES.WAREHOUSE_STAFF],
  '/products':         [ROLES.WAREHOUSE_EXECUTIVE],
  '/categories':       [ROLES.WAREHOUSE_EXECUTIVE],
  '/inventory':        [ROLES.WAREHOUSE_EXECUTIVE],
  '/procurement':      [],
  '/credit-accounts':  [ROLES.ACCOUNTS_EXECUTIVE],
  '/invoices':         [ROLES.ACCOUNTS_EXECUTIVE],
  '/payments':         [ROLES.ACCOUNTS_EXECUTIVE],
  '/support-tickets':  [],
  '/reports':          [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.ACCOUNTS_EXECUTIVE, ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  '/notifications-center': ALL_ROLES,
  '/compliance':       [ROLES.SUPER_ADMIN],
  '/audit-center':     [ROLES.SUPER_ADMIN],
};

// ─── Button / Action Permissions ────────────────────────────────────────────
export const ACTION_PERMISSIONS = {
  // Staff Management
  'staff.create':                [ROLES.SUPER_ADMIN],
  'staff.read':                  [ROLES.SUPER_ADMIN],
  'staff.update':                [ROLES.SUPER_ADMIN],
  'staff.archive':               [ROLES.SUPER_ADMIN],
  'staff.reset_password':        [ROLES.SUPER_ADMIN],
  'staff.reassign_role':         [ROLES.SUPER_ADMIN],

  // Institutions
  // Institutions
  'institutions.create':         [ROLES.SALESMAN],
  'institutions.read':           [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.SALESMAN, ROLES.ACCOUNTS_EXECUTIVE],
  'institutions.update':         [ROLES.SALES_EXECUTIVE, ROLES.ACCOUNTS_EXECUTIVE],
  'institutions.archive':        [ROLES.SUPER_ADMIN],
  'institutions.approve':        [ROLES.SALES_EXECUTIVE],
  'institutions.credit_setup':   [ROLES.ACCOUNTS_EXECUTIVE],
  'institutions.export':         [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.ACCOUNTS_EXECUTIVE],
  'institutions.suspend':        [ROLES.SUPER_ADMIN],
  'institutions.blacklist':      [ROLES.SUPER_ADMIN],
  'institutions.pause':          [ROLES.SUPER_ADMIN],
  'institutions.reactivate':     [ROLES.SUPER_ADMIN],

  // Orders
  'orders.create':               [ROLES.SALESMAN],
  'orders.read':                 ALL_ROLES,
  'orders.update_status':        [ROLES.SALES_EXECUTIVE, ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  'orders.approve':              [ROLES.SALES_EXECUTIVE],
  'orders.cancel':               [ROLES.SALES_EXECUTIVE],
  'orders.export':               [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.ACCOUNTS_EXECUTIVE],

  // Invoices
  'invoices.create':             [ROLES.ACCOUNTS_EXECUTIVE],
  'invoices.read':               [ROLES.ACCOUNTS_EXECUTIVE],
  'invoices.update':             [ROLES.ACCOUNTS_EXECUTIVE],
  'invoices.print':              [ROLES.ACCOUNTS_EXECUTIVE],
  'invoices.export':             [ROLES.SUPER_ADMIN, ROLES.ACCOUNTS_EXECUTIVE],

  // Payments
  'payments.create':             [ROLES.ACCOUNTS_EXECUTIVE],
  'payments.read':               [ROLES.ACCOUNTS_EXECUTIVE],
  'payments.update':             [ROLES.ACCOUNTS_EXECUTIVE],
  'payments.export':             [ROLES.SUPER_ADMIN, ROLES.ACCOUNTS_EXECUTIVE],

  // Credit Accounts
  'credit.read':                 [ROLES.ACCOUNTS_EXECUTIVE],
  'credit.adjust':               [ROLES.ACCOUNTS_EXECUTIVE],
  'credit.override':             [ROLES.ACCOUNTS_EXECUTIVE], // Migrated from SUPER_ADMIN
  'credit.export':               [ROLES.SUPER_ADMIN, ROLES.ACCOUNTS_EXECUTIVE],

  // Returns
  'returns.create':              [ROLES.SALESMAN],
  'returns.read':                [ROLES.SALES_EXECUTIVE, ROLES.SALESMAN, ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  'returns.update':              [ROLES.SALESMAN, ROLES.WAREHOUSE_EXECUTIVE],
  'returns.approve':             [ROLES.SALESMAN],
  'returns.reject':              [ROLES.SALESMAN, ROLES.WAREHOUSE_EXECUTIVE],
  'returns.verify_receipt':      [ROLES.WAREHOUSE_EXECUTIVE],

  // Products
  'products.create':             [ROLES.WAREHOUSE_EXECUTIVE],
  'products.read':               [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.SALESMAN, ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  'products.update':             [ROLES.WAREHOUSE_EXECUTIVE],
  'products.archive':            [ROLES.WAREHOUSE_EXECUTIVE],
  'products.import':             [ROLES.WAREHOUSE_EXECUTIVE],
  'products.export':             [ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_EXECUTIVE, ROLES.SALES_EXECUTIVE],

  // Inventory
  'inventory.read':              [ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  'inventory.adjust':            [ROLES.WAREHOUSE_EXECUTIVE],
  'inventory.import':            [ROLES.WAREHOUSE_EXECUTIVE],
  'inventory.export':            [ROLES.SUPER_ADMIN, ROLES.WAREHOUSE_EXECUTIVE],

  // Procurement
  'procurement.create':          [],
  'procurement.read':            [],
  'procurement.approve':         [],
  'procurement.receive':         [],

  // Returns
  'returns.create':              [ROLES.SALESMAN],
  'returns.read':                [ROLES.SALES_EXECUTIVE, ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  'returns.approve':             [],
  'returns.process':             [ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],

  // Deliveries
  'deliveries.read':             [ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  'deliveries.update':           [ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
  'deliveries.confirm':          [ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],

  // Follow-Ups
  'followUps.create':            [ROLES.SALESMAN],
  'followUps.read':              [ROLES.SALES_EXECUTIVE, ROLES.SALESMAN],
  'followUps.update':            [ROLES.SALES_EXECUTIVE, ROLES.SALESMAN],
  'followUps.close':             [ROLES.SALES_EXECUTIVE],

  // Visit Logs
  'visitLogs.create':            [ROLES.SALESMAN],
  'visitLogs.read':              [ROLES.SALES_EXECUTIVE, ROLES.SALESMAN],

  // Support Tickets
  'tickets.create':              [ROLES.SALESMAN],
  'tickets.read':                [ROLES.SALES_EXECUTIVE, ROLES.SALESMAN, ROLES.ACCOUNTS_EXECUTIVE],
  'tickets.update':              [ROLES.SALES_EXECUTIVE],
  'tickets.close':               [ROLES.SALES_EXECUTIVE],

  // Reports
  'reports.view':                [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.ACCOUNTS_EXECUTIVE],
  'reports.export':              [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.ACCOUNTS_EXECUTIVE],

  // Compliance / Audit
  'compliance.view':             [ROLES.SUPER_ADMIN],
  'compliance.export':           [ROLES.SUPER_ADMIN],
};

// ─── Firestore Collection-Level Permissions ──────────────────────────────────
export const FIRESTORE_PERMISSIONS = {
  staff: {
    create:  [ROLES.SUPER_ADMIN],
    read:    [ROLES.SUPER_ADMIN],
    update:  [ROLES.SUPER_ADMIN],
    delete:  [],                   // Archive Only — no hard deletes
  },
  institutions: {
    create:  [ROLES.SALES_EXECUTIVE],
    read:    [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.SALESMAN, ROLES.ACCOUNTS_EXECUTIVE],
    update:  [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.ACCOUNTS_EXECUTIVE], // Super Admin needs update for suspend/blacklist
    delete:  [],                   // Archive Only
  },
  orders: {
    create:  [ROLES.SALES_EXECUTIVE, ROLES.SALESMAN],
    read:    ALL_ROLES,
    update:  [ROLES.SALES_EXECUTIVE, ROLES.ACCOUNTS_EXECUTIVE, ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
    delete:  [],                   // Archive Only
  },
  invoices: {
    create:  [ROLES.ACCOUNTS_EXECUTIVE],
    read:    [ROLES.ACCOUNTS_EXECUTIVE],
    update:  [ROLES.ACCOUNTS_EXECUTIVE],
    delete:  [],
  },
  payments: {
    create:  [ROLES.ACCOUNTS_EXECUTIVE],
    read:    [ROLES.ACCOUNTS_EXECUTIVE],
    update:  [ROLES.ACCOUNTS_EXECUTIVE],
    delete:  [],
  },
  products: {
    create:  [ROLES.WAREHOUSE_EXECUTIVE],
    read:    [ROLES.SUPER_ADMIN, ROLES.SALES_EXECUTIVE, ROLES.SALESMAN, ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
    update:  [ROLES.WAREHOUSE_EXECUTIVE],
    delete:  [],
  },
  inventory: {
    create:  [ROLES.WAREHOUSE_EXECUTIVE],
    read:    [ROLES.WAREHOUSE_EXECUTIVE, ROLES.WAREHOUSE_STAFF],
    update:  [ROLES.WAREHOUSE_EXECUTIVE],
    delete:  [],
  },
  creditAccounts: {
    create:  [ROLES.ACCOUNTS_EXECUTIVE],
    read:    [ROLES.ACCOUNTS_EXECUTIVE],
    update:  [ROLES.ACCOUNTS_EXECUTIVE],
    delete:  [],
  },
  audits: {
    create:  ALL_ROLES,            // All roles emit audit events
    read:    [ROLES.SUPER_ADMIN],
    update:  [],                   // Immutable
    delete:  [],                   // Immutable
  },
  notifications: {
    create:  ALL_ROLES,
    read:    ALL_ROLES,
    update:  ALL_ROLES,            // Mark as read
    delete:  [],
  },
};

// ─── Permission Helper Functions ─────────────────────────────────────────────

/**
 * Check if a role has permission for a given action.
 * @param {string} role - Canonical role string (e.g. 'Sales Executive')
 * @param {string} action - Permission key (e.g. 'orders.create')
 * @returns {boolean}
 */
export function can(role, action) {
  const allowed = ACTION_PERMISSIONS[action];
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * Check if a role can access a given menu item.
 * @param {string} role
 * @param {string} menuKey - e.g. 'institutions'
 * @returns {boolean}
 */
export function canAccessMenu(role, menuKey) {
  const allowed = MENU_PERMISSIONS[menuKey];
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * Check if a role can access a given page route.
 * @param {string} role
 * @param {string} path - e.g. '/orders'
 * @returns {boolean}
 */
export function canAccessPage(role, path) {
  const allowed = PAGE_PERMISSIONS[path];
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * React hook-friendly permission checker.
 * Usage: const { can } = usePermissions();
 */
export function createPermissionChecker(role) {
  return {
    can: (action) => can(role, action),
    canAccessMenu: (menuKey) => canAccessMenu(role, menuKey),
    canAccessPage: (path) => canAccessPage(role, path),
    role,
  };
}

export default {
  ROLES,
  ALL_ROLES,
  MENU_PERMISSIONS,
  PAGE_PERMISSIONS,
  ACTION_PERMISSIONS,
  FIRESTORE_PERMISSIONS,
  can,
  canAccessMenu,
  canAccessPage,
  createPermissionChecker,
};
