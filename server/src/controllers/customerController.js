import { db, auth } from '../config/firebase.js';
import { CustomerRepository } from '../repositories/customerRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { OrdersRepository } from '../repositories/ordersRepository.js';
import { ReturnsRepository } from '../repositories/returnsRepository.js';
import { NotificationsRepository } from '../repositories/notificationsRepository.js';
import { CustomerService } from '../services/customerService.js';
import { logAuditAction } from '../utils/audit.js';

export class CustomerController {
  static async register(req, res, next) {
    let userRecord = null;

    try {
      const data = req.body;
      await CustomerService.validateRegistration(data);

      const email = String(data.contactEmail || '').trim().toLowerCase();
      const password = String(data.password || '');
      const displayName = String(data.contactName || email.split('@')[0]).trim();

      if (!email || !password || password.length < 8) {
        return res.status(400).json({ error: 'Password is required and must be at least 8 characters long.' });
      }

      userRecord = await auth.createUser({
        email,
        password,
        displayName,
      });

      const newInstRef = await db.collection('institutions').add({
        name: data.name,
        type: data.type || 'corporate_office',
        taxId: data.gstNumber,
        panNumber: data.panNumber,
        address: data.address || '',
        status: 'Submitted',
        creditLimit: 0,
        contractTerms: 'cod',
        contactPerson: {
          name: displayName,
          email,
          phone: data.contactPhone || '',
          uid: userRecord.uid,
        },
        createdAt: new Date().toISOString().slice(0, 10),
      });

      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        name: data.contactName || data.contactEmail.split('@')[0],
        email: data.contactEmail,
        phoneNumber: data.contactPhone || '',
        role: 'Customer',
        status: 'active',
        institutionId: newInstRef.id,
        permissions: [],
        createdAt: new Date().toISOString().slice(0, 10),
      });

      await db.collection('customer_timelines').add({
        institutionId: newInstRef.id,
        status: 'Submitted',
        note: 'Customer registration application submitted.',
        updatedBy: 'Self Registration',
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({ id: newInstRef.id, status: 'Submitted', message: 'Registration submitted successfully!' });
    } catch (error) {
      if (userRecord && userRecord.uid) {
        try {
          await auth.deleteUser(userRecord.uid);
        } catch {
          // ignore cleanup failures
        }
      }
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const data = await UserRepository.getById(req.user.uid);
      res.json(data || {});
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      await UserRepository.update(req.user.uid, req.body);
      res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      if (!newPassword) {
        return res.status(400).json({ error: 'Password is required' });
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ 
          error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#).' 
        });
      }

      await auth.updateUser(req.user.uid, { password: newPassword });

      await logAuditAction({
        userId: req.user.uid,
        userEmail: req.user.email,
        role: req.user.role,
        action: 'PASSWORD_RESET',
        module: 'Profile & Settings',
        reason: 'User self-reset password via settings panel'
      });

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getDashboard(req, res, next) {
    try {
      if (req.user.role === 'Customer') {
        const instId = req.user.institutionId;
        if (!instId) return res.json({ message: 'No institution mapped' });

        const [institution, creditAccount, orders, quotations, returns, notifications, timelines] = await Promise.all([
          CustomerRepository.getInstitution(instId),
          CustomerRepository.getCreditAccount(instId),
          OrdersRepository.getOrdersByInstitution(instId),
          OrdersRepository.getQuotationsByInstitution(instId),
          ReturnsRepository.getReturnsByInstitution(instId),
          NotificationsRepository.getNotificationsByUser(req.user.uid),
          CustomerRepository.getTimelines(instId),
        ]);

        res.json({
          institution,
          creditAccount,
          recentOrders: orders.slice(0, 5),
          recentQuotations: quotations.slice(0, 5),
          recentReturns: returns.slice(0, 5),
          notifications: notifications.slice(0, 5),
          timelines,
        });
      } else {
        const [insts, orders, quotes, prods] = await Promise.all([
          db.collection('institutions').get(),
          db.collection('orders').get(),
          db.collection('quotations').get(),
          db.collection('products').get(),
        ]);
        res.json({
          institutionsCount: insts.size,
          ordersCount: orders.size,
          quotationsCount: quotes.size,
          productsCount: prods.size,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  static async getBilling(req, res, next) {
    try {
      const instId = req.user.role === 'Customer' ? req.user.institutionId : req.query.institutionId;
      if (!instId) return res.status(400).json({ error: 'Missing institution ID' });

      const [creditAccount, invoices, payments] = await Promise.all([
        CustomerRepository.getCreditAccount(instId),
        CustomerRepository.getInvoices(instId),
        CustomerRepository.getPayments(instId),
      ]);

      res.json({ creditAccount, invoices, payments });
    } catch (error) {
      next(error);
    }
  }
}
