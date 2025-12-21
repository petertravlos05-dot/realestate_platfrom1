export function generateOTP(): string {
  // Δημιουργία 8ψήφιου αριθμού
  const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
  return otp;
} 