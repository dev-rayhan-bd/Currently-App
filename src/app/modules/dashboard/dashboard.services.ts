import { RippleModel } from '../ripple/ripple.model';
import { WaveModel } from '../wave/wave.model';
import { UserModel } from '../User/user.model';

// const getDashboardSummaryFromDB = async (userId: string) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   const [user, todaysFocus, teacherRipples, activeWaves, recentRipples] = await Promise.all([

//     UserModel.findById(userId).select('firstName lastName image'),

//     //  Today's Focus: (Priority + Not Completed)
//     RippleModel.findOne({ 
//       user: userId, 
//       status: { $ne: 'completed' } 
//     }).sort({ isPriority: -1, dueDate: 1 }),

//     RippleModel.find({ 
//       user: userId, 
//       source: 'google-classroom',
//       status: { $ne: 'completed' }
//     }).limit(5).sort({ createdAt: -1 }),

//     //   Waves
//     WaveModel.find({ 
//       user: userId, 
//       status: 'active' 
//     }).limit(5).sort({ updatedAt: -1 }),

//     //  Recent Ripples
//     RippleModel.find({ user: userId })
//       .limit(5)
//       .sort({ updatedAt: -1 })
//       .populate('waveId', 'title') 
//   ]);

//   return {
//     user,
//     todaysFocus,
//     teacherRipples,
//     activeWaves,
//     recentRipples
//   };
// };

const getDashboardSummaryFromDB = async (userId: string) => {
  const [user, todaysFocusRipple, teacherRipples, activeWaves, recentRipples] = await Promise.all([
    // ১. ইউজার প্রোফাইল
    UserModel.findById(userId).select('firstName lastName image'),

    // ২. Today's Focus (Populated with Wave info)
    RippleModel.findOne({ user: userId, status: { $ne: 'completed' } })
      .sort({ isPriority: -1, dueDate: 1 })
      .populate('waveId'),

    // ৩. From Your Teachers (Classroom Assignments)
    RippleModel.find({ user: userId, source: 'google-classroom', status: { $ne: 'completed' } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('waveId'),

    // ৪. Your Waves (Active Projects)
    WaveModel.find({ user: userId, status: 'active', isDeleted: false })
      .sort({ updatedAt: -1 })
      .limit(5),

    // ৫. Recent Ripples
    RippleModel.find({ user: userId, isDeleted: false })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('waveId')
  ]);

  // --- ডাটা ফরম্যাটিং (ফিগমা অনুযায়ী) ---

  // Today's Focus Formatting
  let focusData = null;
  if (todaysFocusRipple) {
    const wave: any = todaysFocusRipple.waveId;
    focusData = {
      ...todaysFocusRipple.toObject(),
      waveTitle: wave?.title || "Standalone Task",
      subject: wave?.subject || "General",
      progressText: wave ? `${wave.completedRipples} of ${wave.totalRipples} sessions done` : "In progress"
    };
  }

  // Teacher Ripples Formatting (Adding the "Head" like Math - P3)
  const formattedTeacherRipples = teacherRipples.map((ripple: any) => ({
    ...ripple.toObject(),
    headText: ripple.waveId ? `${ripple.waveId.subject} — P${ripple.order || 1}` : "Classroom",
    subject: ripple.waveId?.subject || "General"
  }));

  // Active Waves Formatting
  const formattedWaves = activeWaves.map((wave: any) => ({
    ...wave.toObject(),
    progressText: `${wave.completedRipples} of ${wave.totalRipples} done`,
    dueText: `Due in ${Math.ceil((new Date(wave.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} days`
  }));

  // Recent Ripples Formatting (Adding Subject and Wave Title)
  const formattedRecent = recentRipples.map((ripple: any) => ({
    ...ripple.toObject(),
    waveTitle: ripple.waveId?.title || "Standalone Task",
    subject: ripple.waveId?.subject || "General"
  }));

  return {
    user,
    todaysFocus: focusData,
    teacherRipples: formattedTeacherRipples,
    activeWaves: formattedWaves,
    recentRipples: formattedRecent
  };
};

export const DashboardServices = {
  getDashboardSummaryFromDB,
};