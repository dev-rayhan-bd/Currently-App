import { Request } from "express";

import config from "../config";
import AppError from "../errors/AppError";
import s3 from "./s3";
 
const uploadImage = async (req: Request) => {
  try {
    if (!req.file) {
      throw new AppError(400, "Please upload a file");
    }
    const params = {
      Bucket: config.aws_bucket_name as string,
      Key: `${Date.now()}-${req.file.originalname}`, 
      Body: req.file.buffer,
      ContentType: req.file.mimetype, 
    };
   const data = await s3.upload(params).promise();
    return data?.Location;
  } catch (err:any) {
    throw new Error(err);
  }
};
 
export default uploadImage;