export async function sendOtpEmail(email: string, otp: string) {
  // Mock αποστολή email
  console.log(`[MOCK EMAIL] Αποστολή OTP ${otp} στο email: ${email}`);
  return true;
}
 
export async function sendOtpSms(phone: string, otp: string) {
  // Mock αποστολή SMS
  console.log(`[MOCK SMS] Αποστολή OTP ${otp} στο κινητό: ${phone}`);
  return true;
} 