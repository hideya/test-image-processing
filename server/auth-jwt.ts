import { Request, Response, NextFunction, Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { User as SelectUser } from "@shared/schema";

// Create a scrypt that returns a promise
const scryptAsync = promisify(scrypt);

// Use JWT_SECRET from environment variable with fallback
const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-me";
const JWT_EXPIRY = "7d"; // 7 days

// Log if we're using default secret in non-production environments
if (JWT_SECRET === "dev-jwt-secret-change-me" && process.env.NODE_ENV !== "production") {
  console.log('WARNING: Using default JWT_SECRET - this should not happen in production!');
}

/**
 * Hash a password with a salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compare a supplied password with a stored hash
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

/**
 * Generate a JWT token from user object
 */
export function generateToken(user: SelectUser): string {
  console.log("*** Generating JWT token for user:", user.id, user.username);
  // Never include sensitive information (like password) in JWT
  const { password, ...userWithoutPassword } = user;
  const token = jwt.sign(userWithoutPassword, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  console.log("*** JWT token generated, length:", token.length);
  return token;
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): any {
  console.log("*** Verifying JWT token");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log("*** JWT token verified successfully for user ID:", (payload as any).id);
    return payload;
  } catch (error) {
    console.log("*** JWT token verification failed:", error);
    return null;
  }
}

/**
 * Extract token from authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  console.log("*** Auth header:", authHeader ? `${authHeader.substring(0, 15)}...` : "undefined");
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("*** No valid Bearer token in header");
    return null;
  }
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  console.log("*** Token extracted, length:", token.length);
  return token;
}

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  console.log("*** JWT authentication middleware called for path:", req.path);
  const token = extractToken(req);
  if (!token) {
    console.log("*** No token found, authentication failed");
    return res.status(401).json({ message: "Authentication required" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    console.log("*** Invalid token, authentication failed");
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // Set user information in request
  req.user = payload;
  console.log("*** Authentication successful for user ID:", payload.id);
  next();
}

/**
 * Initialize JWT authentication for Express app
 */
export function setupJWTAuth(app: Express) {
  // Login route
  app.post("/api/login", async (req, res) => {
    console.log("*** Processing login request");
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        console.log("*** Login failed: Missing username or password");
        return res.status(400).json({ message: "Username and password are required" });
      }

      console.log("*** Looking up user:", username);
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log("*** Login failed: User not found");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("*** Verifying password for user:", user.id);
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        console.log("*** Login failed: Invalid password");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("*** Password verified successfully");
      const token = generateToken(user);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      
      // Log the response structure for debugging
      console.log('*** Login response prepared:', { 
        user: { id: userWithoutPassword.id, username: userWithoutPassword.username },
        tokenProvided: !!token
      });
      
      res.status(200).json({ 
        user: userWithoutPassword,
        token
      });
      console.log("*** Login response sent");
    } catch (error) {
      console.error("*** Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Register route
  app.post("/api/register", async (req, res) => {
    try {
      // Check if username exists
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email exists
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Generate token for the newly registered user
      const token = generateToken(user);
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user route
  app.get("/api/user", authenticateJWT, (req, res) => {
    // User is already attached to req by the authenticateJWT middleware
    res.json(req.user);
  });

  // Logout route (just a formality for JWT, client should discard token)
  app.post("/api/logout", (req, res) => {
    res.status(200).json({ message: "Logged out successfully" });
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // Get the latest user data
  storage.getUser(payload.id)
    .then(user => {
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Set user in request
      req.user = user;
      next();
    })
    .catch(error => {
      console.error("Error retrieving user:", error);
      res.status(500).json({ message: "Internal server error" });
    });
}

// Extend the Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}