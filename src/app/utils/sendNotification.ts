import * as admin from 'firebase-admin';
import { NotificationModel } from '../modules/Notification/notification.model';
import { UserModel } from '../modules/User/user.model';
import config from '../config';

// Firebase Initialize
const serviceAccount = require('../../../firebase-admin-config.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = 'general'
) => {
  try {

    await NotificationModel.create({
      user: userId,
      title,
      message,
      type
    });

 
    const user = await UserModel.findById(userId);
    
    if (user && user.fcmToken) {
      const payload = {
        notification: {
          title,
          body: message,
        },
             apns: {
    payload: {
      aps: {
        sound: "default", 
        badge: 1,        
      },
    },
  },

  android: {
    notification: {
      sound: "default",
    },
  },
        token: user.fcmToken, 
      };

      await admin.messaging().send(payload);
      console.log('Successfully sent push notification');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

export const sendNotificationToAdmins = async (
  title: string,
  message: string,
  type: string = 'general'
) => {
  try {

    const admins = await UserModel.find({ 
      role: { $in: ['admin', 'superAdmin'] } 
    });

    for (const admin of admins) {

      await sendNotification(admin._id.toString(), title, message, type);
    }
  } catch (error) {
    console.error('Error sending notification to admins:', error);
  }
};