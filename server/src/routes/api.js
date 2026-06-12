import { Router } from 'express';
import { db } from '../config/firebase.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { CustomerController } from '../controllers/customerController.js';
import { OrdersController } from '../controllers/ordersController.js';
import { ProductsRepository } from '../repositories/productsRepository.js';
import { logAuditAction } from '../utils/audit.js';
import { authLimiter } from '../middlewares/rateLimit.js';

const router = Router();

// Onboarding Registration (public)
router.post('/register', authLimiter, CustomerController.register);

// Authentication Barrier
router.use(authenticate);

// Profile & Settings
router.get('/profile', CustomerController.getProfile);
router.put('/profile', CustomerController.updateProfile);
router.put('/profile/password', CustomerController.changePassword);

// Dashboard
router.get('/dashboard', CustomerController.getDashboard);

// Products Catalog
router.get('/products', async (req, res, next) => {
  try {
    const products = await ProductsRepository.getAllActive();
    res.json(products);
  } catch (error) {
    next(error);
  }
});
router.get('/products/:id', async (req, res, next) => {
  try {
    const product = await ProductsRepository.getById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Orders & Returns
router.get('/orders', OrdersController.getOrders);
router.post('/orders', OrdersController.createOrder);

router.get('/returns', OrdersController.getReturns);
router.post('/returns', OrdersController.createReturn);

// Finance & Billing
router.get('/billing', CustomerController.getBilling);

// Institution Status & Replies
router.post('/institutions/:id/add-reply', async (req, res, next) => {
  try {
    if (!req.user.institutionId || req.user.institutionId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { reply, type = 'reply' } = req.body;
    if (!reply || typeof reply !== 'string' || !reply.trim()) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const instRef = db.collection('institutions').doc(req.params.id);
    const instSnap = await instRef.get();
    if (!instSnap.exists()) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    const replies = instSnap.data().replies || [];
    replies.push({
      type,
      message: reply.trim(),
      from: 'customer',
      customerName: req.user.name,
      customerEmail: req.user.email,
      date: new Date().toISOString(),
      read: false,
    });

    await instRef.update({ replies });

    await logAuditAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'add_reply_to_institution',
      subject: 'institution',
      subjectId: req.params.id,
      description: `Customer ${req.user.name} added a ${type} to institution`,
    });

    res.json({ success: true, message: 'Reply submitted successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/institutions/:id/request-activation', async (req, res, next) => {
  try {
    if (!req.user.institutionId || req.user.institutionId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const instRef = db.collection('institutions').doc(req.params.id);
    const instSnap = await instRef.get();
    if (!instSnap.exists()) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    const instData = instSnap.data();
    if (instData.status === 'Activated') {
      return res.status(400).json({ error: 'Your account is already activated' });
    }

    // Add to activation requests
    const requests = instData.activationRequests || [];
    requests.push({
      requestedAt: new Date().toISOString(),
      requestedBy: req.user.name,
      status: 'pending',
    });

    await instRef.update({ activationRequests: requests });

    await logAuditAction({
      userId: req.user.uid,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'request_activation',
      subject: 'institution',
      subjectId: req.params.id,
      description: `Customer ${req.user.name} requested account activation`,
    });

    res.json({ success: true, message: 'Activation request submitted. Our team will review it shortly.' });
  } catch (error) {
    next(error);
  }
});

export default router;
