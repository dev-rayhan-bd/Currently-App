import cron from 'node-cron';
import { UserModel } from '../modules/User/user.model';
import { refreshAndSyncClassroom } from '../modules/classroom/intigration.services';

const setupSyncCron = () => {
 //every 2 hours at minute 0 (e.g., 12:00, 2:00, 4:00, etc.)
  cron.schedule('0 */2 * * *', async () => {
    console.log('⏳ Background Sync Started...');
    
    
    const connectedUsers = await UserModel.find({
      isClassroomConnected: true,
      googleRefreshToken: { $ne: null },
      status: 'active'
    }).select('+googleRefreshToken');

  
    for (const user of connectedUsers) {
      try {
        await refreshAndSyncClassroom(user._id.toString(), user.googleRefreshToken!);
        console.log(`✅ Synced for: ${user.email}`);
      } catch (error) {
        console.error(`❌ Sync failed for ${user.email}:`, error);
      }
    }
  });
};

export default setupSyncCron;