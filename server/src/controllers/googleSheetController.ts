import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { GoogleSheetService } from '../services/GoogleSheetService';

export const getMoveDataSheet = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { spreadsheetId, sheetName } = req.query;

    const data = await GoogleSheetService.getMoveDataSheet(
      spreadsheetId as string | undefined,
      sheetName as string | undefined
    );

    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Không thể đọc dữ liệu từ Google Sheet',
    });
  }
};
