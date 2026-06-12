import { OrdersRepository } from '../repositories/ordersRepository.js';
import { ReturnsRepository } from '../repositories/returnsRepository.js';
import { OrdersService } from '../services/ordersService.js';
import { logAuditAction } from '../utils/audit.js';

export class OrdersController {
  static async getOrders(req, res, next) {
    try {
      const orders = await OrdersRepository.getOrdersByInstitution(req.user.institutionId);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  static async createOrder(req, res, next) {
    try {
      const orderData = req.body;
      OrdersService.validateOrder(orderData);
      const createdOrder = await OrdersRepository.createOrder({
        ...orderData,
        institutionId: req.user.institutionId,
        customerEmail: req.user.email,
        customerId: req.user.uid,
      });

      await logAuditAction({
        userId: req.user.uid,
        userEmail: req.user.email,
        role: req.user.role,
        action: 'create_order',
        module: 'orders',
        newValue: createdOrder,
      });

      res.status(201).json(createdOrder);
    } catch (error) {
      next(error);
    }
  }

  static async getReturns(req, res, next) {
    try {
      const returns = await ReturnsRepository.getReturnsByInstitution(req.user.institutionId);
      res.json(returns);
    } catch (error) {
      next(error);
    }
  }

  static async createReturn(req, res, next) {
    try {
      const returnData = req.body;
      const createdReturn = await ReturnsRepository.createReturnRequest({
        ...returnData,
        institutionId: req.user.institutionId,
      });
      res.status(201).json(createdReturn);
    } catch (error) {
      next(error);
    }
  }
}
