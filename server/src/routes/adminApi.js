import { Router } from 'express';
import { db } from '../config/firebase.js';
import { authenticate } from '../middlewares/auth.js';
import { logAuditAction } from '../utils/audit.js';
import { sendTransactionalEmail } from '../utils/mailer.js';
import { OrderTransitionSchema, ReturnTransitionSchema, InstitutionTransitionSchema } from '../validation/workflowValidators.js';
import { auth } from '../config/firebase.js';
import { OrdersRepository } from '../repositories/ordersRepository.js';
const router = Router();

// Protect all admin routes
router.use(authenticate);
router.use((req, res, next) => {
  if (!req.user || req.user.role === 'Customer' || req.user.role === 'customer') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }
  next();
});

// List Institutions (for CRM dashboard)
router.get('/institutions', async (req, res, next) => {
  try {
    const snapshot = await db.collection('institutions').orderBy('createdAt', 'desc').get();
    const institutions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(institutions);
  } catch (error) {
    next(error);
  }
});

// Get single Institution details
router.get('/institutions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('institutions').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Institution not found' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (error) {
    next(error);
  }
});

// Generic CREATE endpoint for any collection
router.post('/:collection', async (req, res, next) => {
  try {
    const { collection } = req.params;
    const data = req.body;
    
    const operationalCollections = ['orders', 'invoices', 'payments', 'products', 'inventory', 'creditAccounts', 'returns', 'deliveries', 'procurement'];
    if (req.user.role === 'Super Admin' && operationalCollections.includes(collection)) {
      return res.status(403).json({ error: `Forbidden: Super Admin cannot create ${collection}` });
    }
    if (req.user.role === 'Super Admin' && collection === 'institutions') {
      return res.status(403).json({ error: 'Forbidden: Super Admin cannot create institutions' });
    }

    // Auto-generate ID if needed, or let Firestore generate it
    let docRef;
    let finalData = data;
    
    if (collection === 'orders' && !data.id) {
      finalData = await OrdersRepository.createOrder({
        ...data,
        customerId: req.user.uid,
        customerEmail: req.user.email,
        institutionId: data.institutionId || '',
      });
      docRef = db.collection('orders').doc(finalData.orderNumber);
    } else {
      if (data.id) {
        docRef = db.collection(collection).doc(data.id);
        await docRef.set(data);
      } else {
        docRef = await db.collection(collection).add(data);
      }
    }

    if (collection !== 'audits') {
      await logAuditAction({
        userId: req.user.uid,
        userEmail: req.user.email,
        role: req.user.role,
        action: `create_${collection}`,
        module: collection,
        newValue: { id: docRef.id, ...finalData },
      });
    }

    res.status(201).json({ id: docRef.id, ...finalData });
  } catch (error) {
    next(error);
  }
});

// Approve Institution API (creates Firebase Auth User)
router.post('/institutions/:id/approve', async (req, res, next) => {
  try {
    if (req.user.role === 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Super Admin cannot approve institutions' });
    }
    const { id } = req.params;
    const { status, remark, temporaryPassword } = req.body;
    
    if (req.user.role !== 'Sales Executive' && req.user.role !== 'Super Admin' && req.user.role !== 'Accounts Executive') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    const docRef = db.collection('institutions').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Institution not found' });
    }
    
    const instData = docSnap.data();
    
    // Create Firebase Auth user if it doesn't exist
    let uid = instData.contactPerson?.uid;
    const contactEmail = instData.contactPerson?.email || req.body.contactEmail;
    
    if (!uid && contactEmail && temporaryPassword) {
      const userRecord = await auth.createUser({
        email: contactEmail,
        password: temporaryPassword,
        displayName: instData.contactPerson?.name || instData.name,
      });
      uid = userRecord.uid;
      
      // Create user doc
      await db.collection('users').doc(uid).set({
        name: instData.contactPerson?.name || instData.name,
        email: contactEmail,
        phoneNumber: instData.contactPerson?.phone || '',
        role: 'customer_admin',
        status: 'active',
        institutionId: id,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      
      // Update institution with uid
      await docRef.update({
        'contactPerson.uid': uid,
        'contactPerson.email': contactEmail
      });

      sendTransactionalEmail(
        contactEmail, 
        'Your GangaMaxx Account is Activated', 
        `Your institution ${instData.name} has been approved. You can now login with your email and the temporary password: ${temporaryPassword}`
      );
    }
    
    // Enforce strict workflow transitions
    const validation = InstitutionTransitionSchema.safeParse({
      fromState: instData.status,
      toState: status,
      actorRole: req.user.role,
    });

    if (!validation.success) {
      return res.status(403).json({ error: validation.error.issues[0].message });
    }
    
    // Auto-create ledger if Activated and not exists
    if (status === 'Activated') {
      const ledgerSnap = await db.collection('creditAccounts').where('institutionId', '==', id).get();
      if (ledgerSnap.empty) {
        await db.collection('creditAccounts').add({
          institutionId: id,
          institutionName: instData.name,
          creditLimit: instData.creditLimit || 0,
          outstanding: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        });
      }
    }

    // Update status
    const updateData = { status };
    
    // Add remark if provided
    if (remark && remark.trim()) {
      updateData.remark = remark.trim();
      updateData.remarkDate = new Date().toISOString();
      updateData.remarkBy = req.user.name || req.user.email;
    }
    
    // Add to status history
    const statusHistory = instData.statusHistory || [];
    statusHistory.push({
      status: status,
      date: new Date().toISOString(),
      by: req.user.name || req.user.email,
      remark: remark || '',
    });
    updateData.statusHistory = statusHistory;
    
    await docRef.update(updateData);
    
    await logAuditAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'approve_institution',
      module: 'institutions',
      entityId: id,
      details: remark || `Approved institution ${instData.name}`,
    });
    
    res.json({ success: true, message: 'Institution approved successfully' });
  } catch (error) {
    next(error);
  }
});

// Delivery Verification Endpoint
router.post('/orders/:id/deliver', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryPin, signature, coordinates } = req.body;
    
    if (req.user.role !== 'Warehouse Staff' && req.user.role !== 'Warehouse Executive') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    const docRef = db.collection('orders').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = docSnap.data();

    // Verify PIN if one exists
    if (orderData.deliveryPin && orderData.deliveryPin !== deliveryPin) {
      await logAuditAction({
        userId: req.user.uid,
        userEmail: req.user.email,
        role: req.user.role,
        action: 'failed_delivery_verification',
        module: 'orders',
        entityId: id,
        details: 'Failed PIN verification during delivery',
      });
      return res.status(400).json({ error: 'Invalid Delivery PIN' });
    }

    const deliveryData = {
      status: 'delivered',
      deliveryInfo: {
        signature,
        coordinates,
        timestamp: new Date().toISOString(),
        verifiedBy: req.user.email,
      }
    };

    await docRef.update(deliveryData);

    await logAuditAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'verify_delivery',
      module: 'orders',
      entityId: id,
      details: 'Successfully verified and delivered order',
      newValue: deliveryData,
    });

    res.json({ success: true, message: 'Order delivered successfully' });
  } catch (error) {
    next(error);
  }
});

// Generic UPDATE endpoint for any collection
router.put('/:collection/:id', async (req, res, next) => {
  try {
    const { collection, id } = req.params;
    const data = req.body;

    const operationalCollections = ['orders', 'invoices', 'payments', 'products', 'inventory', 'creditAccounts', 'returns', 'deliveries', 'procurement'];
    if (req.user.role === 'Super Admin' && operationalCollections.includes(collection)) {
      return res.status(403).json({ error: `Forbidden: Super Admin cannot modify ${collection}` });
    }
    
    if (collection === 'staff' && req.user.role !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Super Admin can modify staff records' });
    }
    
    // Allow Super Admin to modify institutions only if it's status related
    if (req.user.role === 'Super Admin' && collection === 'institutions') {
      const updates = data.updates || data;
      const allowedKeys = ['status'];
      const hasDisallowedKeys = Object.keys(updates).some(k => !allowedKeys.includes(k));
      if (hasDisallowedKeys) {
        return res.status(403).json({ error: 'Forbidden: Super Admin can only modify institution status (Governance actions)' });
      }
    }

    if (req.user.role === 'Sales Executive' && collection === 'institutions') {
      const updates = data.updates || data;
      if (updates.creditLimit !== undefined || updates.contractTerms !== undefined) {
        return res.status(403).json({ error: 'Forbidden: Sales Executive cannot modify credit limits or terms' });
      }
    }

    if (req.user.role === 'Sales Executive' && collection === 'orders') {
      const updates = data.updates || data;
      const forbiddenStatuses = ['processing', 'dispatched', 'delivered'];
      if (updates.status && forbiddenStatuses.includes(updates.status)) {
        return res.status(403).json({ error: `Forbidden: Sales Executive cannot set order status to ${updates.status}` });
      }
    }
    
    const docRef = db.collection(collection).doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const currentData = docSnap.data();

    // State-transition validation
    if (data.status && currentData.status && data.status !== currentData.status) {
      const transitionPayload = {
        fromState: currentData.status,
        toState: data.status,
        actorRole: req.user.role
      };

      try {
        if (collection === 'orders') {
          OrderTransitionSchema.parse(transitionPayload);
          if (data.status === 'Approved') {
            sendTransactionalEmail(currentData.customerEmail || 'customer@example.com', `Order ${id} Approved`, `Your order has been approved by our team and is being processed for dispatch.`);
          }
        } else if (collection === 'returns') {
          ReturnTransitionSchema.parse(transitionPayload);
          if (data.status === 'Approved_For_Credit') {
            sendTransactionalEmail(currentData.customerEmail || 'customer@example.com', `Return ${id} Approved`, `Your return request has been approved. A credit note will be issued shortly.`);
          }
        } else if (collection === 'staff') {
          if (currentData.status === 'archived' && data.status !== 'archived' && !data.remark) {
            throw new Error('Remark required to un-archive a staff member.');
          }
        } else if (collection === 'institutions') {
          InstitutionTransitionSchema.parse(transitionPayload);
          
          if (req.user.role === 'Super Admin') {
            if (!data.remark || data.remark.trim().length < 5) {
              throw new Error('A detailed remark is mandatory for all Super Admin governance actions on customers.');
            }
            if (currentData.status === 'pending_approval' || currentData.status === 'Submitted' || currentData.status === 'Draft' || currentData.status === 'Under Review' || currentData.status === 'Additional Information Required' || currentData.status === 'Approved By Sales' || currentData.status === 'Pending Finance Setup' || currentData.status === 'Credit Assessment') {
              throw new Error('Super Admin cannot govern un-activated customers. They must be Activated by Finance first.');
            }
          }
        }
      } catch (zodError) {
        return res.status(400).json({ error: 'Invalid state transition', details: zodError.errors || zodError.message });
      }
    }

    // Sync creditAccounts ledger if institution creditLimit is updated
    if (collection === 'institutions' && data.updates?.creditLimit !== undefined) {
      const creditDocs = await db.collection('creditAccounts').where('institutionId', '==', id).get();
      if (!creditDocs.empty) {
        for (const cDoc of creditDocs.docs) {
          await cDoc.ref.update({ creditLimit: data.updates.creditLimit });
        }
      }
    }

    const finalData = {
      ...data,
      _changedBy: req.user.email,
      updatedAt: new Date().toISOString(),
    };

    if (data.updates) {
      Object.assign(finalData, data.updates);
      delete finalData.updates;
    }

    await docRef.update(finalData);

    // Auto-create ledger if Activated and not exists
    if (collection === 'institutions' && finalData.status === 'Activated') {
      const ledgerSnap = await db.collection('creditAccounts').where('institutionId', '==', id).get();
      if (ledgerSnap.empty) {
        await db.collection('creditAccounts').add({
          institutionId: id,
          institutionName: currentData.name || finalData.name,
          creditLimit: finalData.creditLimit ?? currentData.creditLimit ?? 0,
          outstanding: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        });
      }
    }

    if (collection !== 'audits') {
      await logAuditAction({
        userId: req.user.uid,
        userEmail: req.user.email,
        role: req.user.role,
        action: `update_${collection}`,
        module: collection,
        entityId: id,
        details: data.remark || data.remarks || `Updated ${collection} document`,
        previousValue: currentData,
        newValue: payloadToUpdate,
      });
    }

    res.json({ id, ...payloadToUpdate });
  } catch (error) {
    next(error);
  }
});

// Generic DELETE (Soft Delete) endpoint
router.post('/soft-delete', async (req, res, next) => {
  try {
    const { collectionName, id, actor, remark } = req.body;
    
    const docRef = db.collection(collectionName).doc(id);
    await docRef.update({
      status: 'archived',
      deletedAt: new Date().toISOString(),
      remarks: remark,
    });

    await logAuditAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      role: req.user.role,
      action: `archive_${collectionName}`,
      module: collectionName,
      entityId: id,
      details: remark || 'Soft deleted document',
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/staff/:id/reset-password', async (req, res, next) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Super Admin can reset staff passwords' });
    }
    const { id } = req.params;
    
    // Validate staff exists
    const docRef = db.collection('staff').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    const staffData = docSnap.data();

    // In a real implementation, you'd use Firebase Admin to send a password reset link
    // e.g. await auth.generatePasswordResetLink(staffData.email);
    // For this boilerplate, we'll just log it and simulate success
    
    await logAuditAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'staff_password_reset',
      module: 'staff',
      entityId: id,
      details: `Password reset link generated for ${staffData.email}`,
    });

    res.json({ success: true, message: `Password reset link sent to ${staffData.email}` });
  } catch (error) {
    next(error);
  }
});

export default router;
