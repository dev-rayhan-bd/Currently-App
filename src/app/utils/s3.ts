import AWS from "aws-sdk"; 
import config from "../config";



 
const s3 = new AWS.S3({
  accessKeyId: config.aws_access_key,
  secretAccessKey: config.aws_secret_key,
  region: config.aws_region
});
 
export default s3;