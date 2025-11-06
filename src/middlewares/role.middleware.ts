import { Request, Response, NextFunction } from "express";
import ApiResponse from "../utils/apiResponse";

type UserRole = "admin" | "member";

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !allowedRoles.includes(user.role as UserRole)) {
      return ApiResponse.error(
        res,
        403,
        "Forbidden: You do no have permission to perform this action."
      );
    }

    next();
  };
};
