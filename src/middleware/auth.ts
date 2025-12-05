import { Request, Response, NextFunction, RequestHandler } from "express";
import { verifyToken, TokenPayload } from "../utils/generateToken";
import User from "../user/user"; // Add this import

// Authenticated request type
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Protect middleware with detailed error handling
export const protect: RequestHandler = async (req, res, next) => {
  try {
    let token: string | undefined;

    // 1. Check Authorization header first
    const authHeader = req.headers.authorization;
    console.log("Authorization header:", authHeader);

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    // 2. Check cookies as fallback
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    // 3. Check for token in query params (for testing)
    else if (req.query.token) {
      token = req.query.token as string;
    }

    // If no token found
    if (!token) {
      console.error("No token provided from any source");
      return res.status(401).json({
        success: false,
        message: "Not authorized, please login",
      });
    }

    // Clean the token - remove any quotes and trim whitespace
    const cleanToken = token.replace(/^['"]|['"]$/g, "").trim();

    // Log token length for debugging (first 10 chars only)
    console.log(`Token length: ${cleanToken.length} chars`);
    console.log(`Token sample: ${cleanToken.substring(0, 20)}...`);

    // Verify token
    let decoded: TokenPayload;
    try {
      decoded = verifyToken(cleanToken);
      console.log("Token decoded successfully for user:", decoded.email);
    } catch (err: any) {
      console.error("Token verification failed:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });

      if (err.name === "JsonWebTokenError") {
        console.error("Token string that caused error:", cleanToken);
        return res.status(401).json({
          success: false,
          message: "Invalid token format",
          error: err.message,
        });
      }

      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Session expired, please login again",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Authentication failed",
        error: err.message,
      });
    }

    // Optional: Verify user still exists in database
    try {
      const user = await User.findById(decoded.userId).select("_id email role");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User no longer exists",
        });
      }

      // Attach user info to request
      (req as AuthRequest).user = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      console.log(`User authenticated: ${user.email} (${user.role})`);
    } catch (dbError: any) {
      console.error("Database error during authentication:", dbError);
      return res.status(500).json({
        success: false,
        message: "Authentication service error",
      });
    }

    next();
  } catch (error: any) {
    console.error("Unexpected error in protect middleware:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

// Authorize middleware (role-based access)
export const authorize = (...roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(authReq.user.role)) {
      console.warn(
        `Access denied for user ${authReq.user.email} (role: ${authReq.user.role}). Required roles: ${roles.join(", ")}`
      );
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};

// Optional: Add a simple test endpoint to verify auth is working
export const testAuth = (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  if (!authReq.user) {
    return res.json({
      success: false,
      message: "No user found in request",
    });
  }

  res.json({
    success: true,
    message: "Authentication is working",
    user: authReq.user,
    headers: {
      authorization: req.headers.authorization,
    },
  });
};
