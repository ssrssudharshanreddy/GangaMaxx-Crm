import { db } from '../config/firebase.js';

export class CustomerService {
  static async validateRegistration(data) {
    if (!data.name || !data.gstNumber || !data.panNumber || !data.contactEmail) {
      throw new Error('Missing mandatory fields');
    }

    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(data.gstNumber)) {
      throw new Error('Invalid GST Number format');
    }

    const existingGstSnap = await db.collection('institutions')
      .where('taxId', '==', data.gstNumber)
      .limit(1)
      .get();
    if (!existingGstSnap.empty) {
      throw new Error('GST Number is already registered');
    }
  }
}
