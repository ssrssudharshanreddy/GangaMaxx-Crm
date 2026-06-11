export class OrdersService {
  static validateOrder(orderData) {
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Order must contain items');
    }

    orderData.items.forEach((item, index) => {
      if (!item.productId) {
        throw new Error(`Item at index ${index} is missing productId`);
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error(`Item ${item.name || item.productId} must have a positive numeric quantity`);
      }
    });
  }
}
