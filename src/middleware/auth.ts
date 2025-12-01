import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/generateToken";
import { asyncHandler } from "../utils/asyncHandler";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Protect middleware
export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest; 

    let token;

    if (
      authReq.headers.authorization &&
      authReq.headers.authorization.startsWith("Bearer")
    ) {
      token = authReq.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, token missing");
    }

    try {
      const decoded = verifyToken(token);
      authReq.user = decoded; // set user to request
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Invalid or expired token");
    }
  }
);

// Role authorization
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      res.status(401);
      throw new Error("Not authorized, user missing");
    }

    if (!roles.includes(authReq.user.role)) {
      res.status(403);
      throw new Error(
        `Role ${authReq.user.role} is not allowed to access this resource`
      );
    }

    next();
  };
};
