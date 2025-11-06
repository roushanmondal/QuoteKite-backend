import { Response } from "express";

class ApiResponse {
  /**
   * Sends a success response.
   * @param res - The Express response object.
   * @param statusCode - The HTTP status code.
   * @param data - The payload to send.
   * @param message - A descriptive message.
   */
  public static success(
    res: Response,
    statusCode: number,
    data: object,
    message: string
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }
  /**
   * Sends an error response.
   * @param res - The Express response object.
   * @param statusCode - The HTTP status code.
   * @param message - The error message.
   */
  public static error(res: Response, statusCode: number, message: string) {
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
}

export default ApiResponse;
