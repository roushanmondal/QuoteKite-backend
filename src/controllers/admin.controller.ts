import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../models'
import { getDashboardAnalytics } from '../services/adminService'
import ApiResponse from '../utils/apiResponse'

const User = db.User

export async function handleGetDashboardAnalytics(req: Request, res: Response) {
  try {
    const analyticsData = await getDashboardAnalytics()

    return ApiResponse.success(res, 200, analyticsData, 'Dashboard analytics retrieved successfully.')
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error)

    return ApiResponse.error(res, 500, 'Failed to retrieve dashboard analytics.')
  }
}


export const changeAdminPassword = async (req: Request, res: Response) => {
  const adminId = req.user!.id; 
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return ApiResponse.error(res, 400, 'All fields are required.');
    }

    if (newPassword !== confirmPassword) {
      return ApiResponse.error(res, 400, 'New password and confirm password do not match.');
    }

    // Enforce password complexity/length ---
    if (newPassword.length < 8) {
      return ApiResponse.error(res, 400, 'New password must be at least 8 characters long.');
    }

    // --- Fetch the admin user from the database ---
    const adminUser = await User.findByPk(adminId);
    if (!adminUser) {
      return ApiResponse.error(res, 404, 'Admin user not found.');
    }

    const isMatch = await bcrypt.compare(currentPassword, adminUser.password);
    if (!isMatch) {
      return ApiResponse.error(res, 401, 'Incorrect current password.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    
    adminUser.password = hashedNewPassword;
    await adminUser.save();

    console.log(`Admin user ${adminId} successfully changed their password.`);
    return ApiResponse.success(res, 200, {}, 'Password changed successfully.');

  } catch (error: any) {
    console.error(`[Admin Change Password Error] for Admin ID ${adminId}:`, error);
    return ApiResponse.error(res, 500, 'An internal server error occurred.');
  }
};


export const editUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, role } = req.body;

  try {
    const userToUpdate = await User.findByPk(id);
    if (!userToUpdate) {
      return ApiResponse.error(res, 404, 'User not found.');
    }

    // Edge Case: Prevent an admin from changing their own role
    if (String(req.user!.id) === id && role && req.user!.role !== role) {
      return ApiResponse.error(res, 403, 'Admins cannot change their own role.');
    }

    userToUpdate.firstName = firstName ?? userToUpdate.firstName;
    userToUpdate.lastName = lastName ?? userToUpdate.lastName;
    userToUpdate.role = role ?? userToUpdate.role;
    
    await userToUpdate.save();

    const { password, ...userWithoutPassword } = userToUpdate.toJSON();

    return ApiResponse.success(res, 200, userWithoutPassword, 'User updated successfully.');
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    return ApiResponse.error(res, 500, 'Server error while updating user.');
  }
};


export const updateUserStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // Expects a boolean: true for active/unblocked, false for inactive/blocked

  try {
    if (typeof status !== 'boolean') {
      return ApiResponse.error(res, 400, 'A valid boolean `status` is required.');
    }
    
    const userToUpdate = await User.findByPk(id);
    if (!userToUpdate) {
      return ApiResponse.error(res, 404, 'User not found.');
    }

    // Edge Case: Prevent an admin from blocking themselves
    if (String(req.user!.id) === id) {
      return ApiResponse.error(res, 403, 'Admins cannot block their own account.');
    }

    userToUpdate.status = status;
    await userToUpdate.save();

    return ApiResponse.success(res, 200, { id: userToUpdate.id, status: userToUpdate.status }, 'User status updated successfully.');
  } catch (error) {
    console.error(`Error updating status for user ${id}:`, error);
    return ApiResponse.error(res, 500, 'Server error while updating user status.');
  }
};


export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const userToDelete = await User.findByPk(id);
    if (!userToDelete) {
      return ApiResponse.error(res, 404, 'User not found.');
    }

    // Edge Case: Prevent an admin from deleting themselves
    if (String(req.user!.id) === id) {
      return ApiResponse.error(res, 403, 'Admins cannot delete their own account.');
    }

    await userToDelete.destroy();

    return ApiResponse.success(res, 200, {}, 'User deleted successfully.');
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    return ApiResponse.error(res, 500, 'Server error while deleting user.');
  }
};