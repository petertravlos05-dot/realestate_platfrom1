export async function sendOtpEmail(email: string, otp: string) {
  // Mock αποστολή email
  console.log(`[MOCK EMAIL] Αποστολή OTP ${otp} στο email: ${email}`);
  // TODO: Implement actual email sending (e.g., using nodemailer, SendGrid, etc.)
  return true;
}

export async function sendOtpSms(phone: string, otp: string) {
  // Mock αποστολή SMS
  console.log(`[MOCK SMS] Αποστολή OTP ${otp} στο τηλέφωνο: ${phone}`);
  // TODO: Implement actual SMS sending (e.g., using Twilio, etc.)
  return true;
}














