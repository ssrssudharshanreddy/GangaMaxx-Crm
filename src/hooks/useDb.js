import { useMemo, useSyncExternalStore } from 'react';
import { db } from '../services';
import { DBNotifier } from '../services/dbNotifier';

const EMPTY_ARRAY = Object.freeze([]);
const subscribeToDb = (listener) => DBNotifier.subscribe(listener);

const getCollectionData = (collectionName) => {
  switch (collectionName) {
    case 'staff':
      return db.getStaff();
    case 'institutions':
      return db.getInstitutions();
    case 'notifications':
      return db.getNotifications();
    case 'orders':
      return db.getOrders();
    case 'invoices':
      return db.getInvoices();
    case 'payments':
      return db.getPayments();
    case 'tickets':
      return db.getTickets();
    case 'products':
      return db.getProducts();
    case 'procurement':
      return db.getProcurement();
    case 'visitLogs':
      return db.getVisitLogs();
    case 'followUps':
      return db.getFollowUps();
    case 'returns':
      return db.getReturns();
    case 'audits':
      return db.getAudits();
    case 'creditAccounts':
      return db.getCreditAccounts();
    case 'categories':
      return db.getCategories();
    default:
      return EMPTY_ARRAY;
  }
};

export function useCollection(collectionName, queryFilter) {
  const data = useSyncExternalStore(
    subscribeToDb,
    () => getCollectionData(collectionName),
    () => getCollectionData(collectionName)
  );
  return useMemo(() => (queryFilter ? queryFilter(data) : data), [data, queryFilter]);
}

export function useNotifications(userId) {
  const notifications = useSyncExternalStore(
    subscribeToDb,
    () => getCollectionData('notifications'),
    () => getCollectionData('notifications')
  );

  return useMemo(
    () => (userId ? notifications.filter((item) => item.recipientId === userId) : notifications),
    [notifications, userId]
  );
}
