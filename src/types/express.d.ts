// This file extends the global Express Request type
import { UserAttributes } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: UserAttributes; // Add an optional 'user' property
    }
  }
}
