import { Request, Response } from 'express'
import { db } from '../models'
import ApiResponse from '../utils/apiResponse'

const CompanyProfile = db.CompanyProfile

export const getCompanyProfile = async (req: Request, res: Response) => {
  try {
    const profile = await CompanyProfile.findOne({ where: { userId: req.user!.id } })
    console.log('GET /company/profile for userId:', req.user?.id)
    if (!profile) {
      return ApiResponse.error(res, 404, 'Company profile not found.')
    }
    return ApiResponse.success(res, 200, profile, 'Profile retrieved successfully.')
  } catch (error) {
    console.error('Error fetching company profile:', error)
    return ApiResponse.error(res, 500, 'Failed to retrieve company profile.')
  }
}

export const upsertCompanyProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const dataToUpsert: any = { userId, ...req.body };
    for (const key in dataToUpsert) {
      if (typeof dataToUpsert[key] === "string") {
        try {
          dataToUpsert[key] = JSON.parse(dataToUpsert[key]);
        } catch {
          // keep as string if not JSON
        }
      }
    }

    // Handle logo
    if (req.file) {
      const filename = req.file.filename;
      dataToUpsert.logoUrl = `${req.protocol}://${req.get("host")}/uploads/logos/${filename}`;
    }

    console.log("Upsert Payload:", dataToUpsert);

    // Check if profile exists
    const existingProfile = await CompanyProfile.findOne({ where: { userId } });

    let profile, message, statusCode;

    if (existingProfile) {
      await existingProfile.update(dataToUpsert);
      profile = existingProfile;
      message = "Profile updated successfully.";
      statusCode = 200;
    } else {
      profile = await CompanyProfile.create(dataToUpsert);
      message = "Profile created successfully.";
      statusCode = 201;
    }

    return ApiResponse.success(res, statusCode, profile, message);
  } catch (error) {
    console.error("Error upserting company profile:", error);
    return ApiResponse.error(res, 500, "Failed to save company profile.");
  }
};


