import { google } from 'googleapis';
import config from '../../config';
import { WaveModel } from '../wave/wave.model';
import { RippleModel } from '../ripple/ripple.model';
import { UserModel } from '../User/user.model';
import { createToken } from '../Auth/auth.utils';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { sendNotificationToAdmins } from '../../utils/sendNotification';

const getOAuthClient = () => {
  return new google.auth.OAuth2(
    config.google_client_id,
    config.google_client_secret,
    config.google_redirect_uri
  );
};


// const googleLoginAndSync = async (code: string) => {
//   const client = getOAuthClient();

//   try {
//     const { tokens } = await client.getToken(code);
//     client.setCredentials(tokens);

//     const oauth2 = google.oauth2({ auth: client, version: 'v2' });
//     const userInfo = await oauth2.userinfo.get();
//     const { email, given_name, family_name, id: googleId, picture } = userInfo.data;

//     if (!email) throw new AppError(httpStatus.BAD_REQUEST, "Email not found from Google");

//     let user = await UserModel.findOne({ email });

//     if (!user) {
//       user = await UserModel.create({
//         firstName: given_name || 'Google',
//         lastName: family_name || 'User',
//         fullName: `${given_name} ${family_name}`,
//         email: email!,
//         image: picture ?? "",
//         role: 'student',
//         googleId: googleId ?? "",
//         isOtpVerified: true, 
//         status: 'active',
//         isClassroomConnected: true,
//         googleRefreshToken: tokens.refresh_token ?? ""
//       });
//     }

//     const classroom = google.classroom({ version: 'v1', auth: client });
//     const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'] });
//     const courses = coursesRes.data.courses || [];


//     if (user.role === 'teacher') {
//       const teacherClassIds = courses.map(c => c.id!);
//       user = await UserModel.findByIdAndUpdate(
//         user._id, 
//         { teacherClasses: teacherClassIds, isClassroomConnected: true, lastSyncedAt: new Date() },
//         { new: true }
//       );
//     }


//     for (const course of courses) {
//       const courseworkRes = await classroom.courses.courseWork.list({ courseId: course.id! });
//       const assignments = courseworkRes.data.courseWork || [];

//       for (const assignment of assignments) {
//         const attachmentLinks: string[] = [];
//         if (assignment.materials) {
//           assignment.materials.forEach((m: any) => {
//             if (m.driveFile) attachmentLinks.push(m.driveFile.driveFile.alternateLink);
//             else if (m.link) attachmentLinks.push(m.link.url);
//           });
//         }

//         let dueDate = assignment.dueDate ? new Date(assignment.dueDate.year!, assignment.dueDate.month! - 1, assignment.dueDate.day!) : new Date(Date.now() + 7*24*60*60*1000);

      
//         const existingWave = await WaveModel.findOne({ googleAssignmentId: assignment.id });
//         const existingRipple = await RippleModel.findOne({ googleAssignmentId: assignment.id });
//         if (existingWave || existingRipple) continue;

//         const today = new Date();
//         const daysRemaining = (dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

//         if (daysRemaining > 3) {
  
//           await WaveModel.create({
//             user: user!._id,
//             title: assignment.title ?? 'Untitled',
//             subject: course.name ?? 'General',
//             dueDate,
//             files: attachmentLinks,
//             source: 'google-classroom',
  
//             classroomId: course.id?? '', 
//             googleAssignmentId: assignment.id ?? '', 
//             totalRipples: 4,
//           });
//         } else {
       
//           await RippleModel.create({
//             user: user!._id,
//             title: assignment.title ?? 'Untitled',
//             duration: 45,
//             status: 'not-started',
//             source: 'google-classroom',
       
//             classroomId: course.id ?? '', // Course ID
//             googleAssignmentId: assignment.id ?? '', // Assignment ID
//             dueDate,
//             notes: attachmentLinks.length > 0 ? `Links: ${attachmentLinks.join(', ')}` : '',
//             isPriority: daysRemaining <= 1.5 && daysRemaining >= 0,
//             isOverdue: daysRemaining < 0
//           });
//         }
//       }
//     }


//     user = await UserModel.findByIdAndUpdate(
//       user!._id, 
//       {
//         lastSyncedAt: new Date(),
//         activeClassesCount: courses.length,
//         isClassroomConnected: true,
//         googleRefreshToken: tokens.refresh_token || (user as any).googleRefreshToken 
//       },
//       { new: true } 
//     );

//     const jwtPayload = { userId: user!._id.toString(), role: user!.role };
//     const accessToken = createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!);
//     const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!);

//     return { accessToken, refreshToken, user };

//   } catch (error: any) {
//     console.error("GOOGLE API ERROR:", error.response?.data || error.message);
//     throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Google Sync failed.");
//   }
// };


const googleLoginAndSync = async (code: string) => {
  const client = getOAuthClient();

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: client, version: 'v2' });
    const userInfo = await oauth2.userinfo.get();
    const { email, given_name, family_name, id: googleId, picture } = userInfo.data;

    if (!email) throw new AppError(httpStatus.BAD_REQUEST, "Email not found from Google");

    let user = await UserModel.findOne({ email }).select('+googleRefreshToken +status');

   
    if (!user) {
      user = await UserModel.create({
        firstName: given_name || 'Google',
        lastName: family_name || 'User',
        fullName: `${given_name} ${family_name}`,
        email: email!,
        image: picture ?? "",
        role: 'student', 
        googleId: googleId ?? "",
        isOtpVerified: true, 
        status: 'pending', 
        isClassroomConnected: true,
        googleRefreshToken: tokens.refresh_token ?? ""
      });


      await sendNotificationToAdmins(
        "New User Approval Required 🎓",
        `${user.fullName} (${user.role}) has joined and needs approval.`,
        "approval"
      );
    }


    await syncData(client, user, tokens.refresh_token);

    if (user.status === 'pending') {
      throw new AppError(
        httpStatus.FORBIDDEN, 
        "Your account is waiting for Admin Approval. You will be notified once active."
      );
    }

    if (user.status === 'blocked') {
      throw new AppError(httpStatus.FORBIDDEN, "Your account has been blocked.");
    }

    const jwtPayload = { userId: user._id.toString(), role: user.role };
    const accessToken = createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!);
    const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!);

    return { accessToken, refreshToken, user };

  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Google Sync failed: " + error.message);
  }
};


const syncData = async (client: any, user: any, newRefreshToken: any) => {
    const classroom = google.classroom({ version: 'v1', auth: client });
    const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'] });
    const courses = coursesRes.data.courses || [];


    if (user.role === 'teacher') {
        const teacherClassIds = courses.map(c => c.id!);
        await UserModel.findByIdAndUpdate(user._id, { teacherClasses: teacherClassIds });
    }

    for (const course of courses) {
      const courseworkRes = await classroom.courses.courseWork.list({ courseId: course.id! });
      const assignments = courseworkRes.data.courseWork || [];

      for (const assignment of assignments) {
 
        const exists = await WaveModel.exists({ googleAssignmentId: assignment.id }) || 
                       await RippleModel.exists({ googleAssignmentId: assignment.id });
        if (exists) continue;

        let dueDate = assignment.dueDate ? new Date(assignment.dueDate.year!, assignment.dueDate.month! - 1, assignment.dueDate.day!) : new Date(Date.now() + 7*24*60*60*1000);
        const today = new Date();
        const daysRemaining = (dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

        if (daysRemaining > 3) {
          await WaveModel.create({
            user: user._id,
            title: assignment.title ?? 'Untitled',
            subject: course.name ?? 'General',
            dueDate,
            source: 'google-classroom',

            classroomId: course.id ?? "", 
            googleAssignmentId: assignment.id ?? "",
            totalRipples: 4,
          });
        } else {
          await RippleModel.create({
            user: user._id,
            title: assignment.title ?? 'Untitled',
            duration: 45,
            status: 'not-started',
            source: 'google-classroom',
  
            classroomId: course.id ?? "",
            googleAssignmentId: assignment.id ?? "",
            dueDate,
            isPriority: daysRemaining <= 1.5 && daysRemaining >= 0,
            isOverdue: daysRemaining < 0
          });
        }
      }
    }


    await UserModel.findByIdAndUpdate(user._id, {
      lastSyncedAt: new Date(),
      activeClassesCount: courses.length,
      isClassroomConnected: true,
      googleRefreshToken: newRefreshToken || user.googleRefreshToken 
    });
};




const disconnectGoogleClassroomFromDB = async (userId: string) => {
    const result = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { isClassroomConnected: false, googleRefreshToken: null } },
      { new: true }
    );
    if (!result) throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
    return result;
};

const disconnectedUsers= async(userID:string)=>{
  const res = await UserModel.findByIdAndUpdate(
    userID,
    {$set:{isClassroomConnected: true}},
    {new:true}
  )
  if(!res) throw new AppError(httpStatus.NOT_FOUND,'User Not found')
return res
  }

export const refreshAndSyncClassroom = async (userId: string, refreshToken: string) => {
  const client = new google.auth.OAuth2(
    config.google_client_id,
    config.google_client_secret,
    config.google_redirect_uri
  );
  
  client.setCredentials({ refresh_token: refreshToken });

 
  await UserModel.findByIdAndUpdate(userId, { lastSyncedAt: new Date() });
};


export const IntegrationServices = {
  googleLoginAndSync,
  disconnectGoogleClassroomFromDB,
  refreshAndSyncClassroom,
  disconnectedUsers
};