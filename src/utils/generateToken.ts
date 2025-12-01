import jwt, { SignOptions } from "jsonwebtoken";

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (payload: TokenPayload): string => {
  const expiresIn: string = process.env.JWT_EXPIRE || "24h"; 

  const options: SignOptions = {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  };

  return jwt.sign(payload, process.env.JWT_SECRET as string, options);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
};
