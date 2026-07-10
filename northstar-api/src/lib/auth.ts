import crypto from "crypto";
import bcrypt from "bcrypt";

const getPepper = () => {
  const PEPPER = process.env.PASSWORD_PEPPER;
  if (!PEPPER) throw new Error("Server configuration error: Pepper missing.");
  return PEPPER;
};

export const hashPassword = async (password: string): Promise<string> => {
  const pepper = getPepper();

  // Hash with HMAC first, then Bcrypt
  const hmacDigest = crypto
    .createHmac("sha256", pepper)
    .update(password)
    .digest();

  return await bcrypt.hash(hmacDigest, 10);
};

export const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  const pepper = getPepper();

  const hmacDigest = crypto
    .createHmac("sha256", pepper)
    .update(password)
    .digest();

  return await bcrypt.compare(hmacDigest, hash);
};
