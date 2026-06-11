// MOCK MAILER UTILITY
// In a real environment, this would integrate with SendGrid, AWS SES, or Firebase Extensions (Trigger Email from Firestore).

export const sendTransactionalEmail = async (to, subject, body) => {
  console.log('=========================================');
  console.log(`[EMAIL DISPATCH] To: ${to}`);
  console.log(`[EMAIL SUBJECT]: ${subject}`);
  console.log(`[EMAIL BODY]:\n${body}`);
  console.log('=========================================');
  return true;
};
