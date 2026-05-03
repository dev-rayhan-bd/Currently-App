import { Request } from 'express';

import AppError from '../errors/AppError';
import httpStatus from 'http-status';
import cloudinary from '../utils/cloudinary';

const uploadImage = async (
  req: Request,
  file?: Express.Multer.File,
): Promise<string> => {
  const target = file ?? req.file;

  if (!target) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please upload a file');
  }


  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'el-afrik', 
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          return reject(new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Cloudinary Upload Failed'));
        }
        resolve(result?.secure_url as string);
      }
    );


    uploadStream.end(target.buffer);
  });
};

export default uploadImage;