import { Router } from 'express';
import { AuthRoutes } from '../modules/Auth/auth.routes';
import { UserRoutes } from '../modules/User/user.routes';
import aboutRouter from '../modules/about/about.route';
import privacyPolicyRouter from '../modules/PrivacyPolicy/privacyPolicy.routes';
import termsRouter from '../modules/Terms/terms.route';
import { FaqRoutes } from '../modules/FAQ/faq.routes';
import { ContactRoutes } from '../modules/ContactUs/contact.route';
import { WaveRoutes } from '../modules/wave/wave.routes';
import { RippleRoutes } from '../modules/ripple/rippler.routes';
import { IntegrationRoutes } from '../modules/classroom/intigration.routes';
import { DashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { AdminRoutes } from '../modules/Admin/admin.routes';
import { FeedbackRoutes } from '../modules/feedback/feedback.routes';
import { TeacherRoutes } from '../modules/Teacher/teacher.routes';
import { NotificationRoutes } from '../modules/Notification/notification.routes';






const router = Router();

const moduleRoutes = [
  {
    path: '/auth',
    route:AuthRoutes
  },
  {
    path: '/user',
    route:UserRoutes
  },
  {
    path: '/about',
    route:aboutRouter
  },
  {
    path: '/privacy',
    route:privacyPolicyRouter
  },
  {
    path: '/terms',
    route:termsRouter
  },
  {
    path: '/faq',
    route:FaqRoutes
  },
  {
    path: '/contact',
    route:ContactRoutes
  },
  {
    path: '/waves',
    route:WaveRoutes
  },
  {
    path: '/ripples',
    route:RippleRoutes
  },
  { path: '/integrations', route: IntegrationRoutes },
  { path: '/dashboard', route: DashboardRoutes },
  { path: '/admin', route: AdminRoutes },
  { path: '/feedback', route: FeedbackRoutes },
  { path: '/teachers', route: TeacherRoutes },  
  { path: '/notification', route: NotificationRoutes },  

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
