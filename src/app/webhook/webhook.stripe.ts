// c:\STA\El-afrik\src\app\webhook\webhook.stripe.ts
import { Request, Response } from 'express';
import Stripe from 'stripe';
import config from '../config';
import { OrderService } from '../modules/Orders/orders.services';
import { CateringService } from '../modules/CateringBooking/cateringBooking.services';
import { UberService } from '../modules/Uber/uber.services';
import { ProductModel } from '../modules/product/product.model';
import { RewardServices } from '../modules/Reward/reward.services';
import { PaymentStatus } from '../modules/Orders/orders.interface';
import { OrderModel } from '../modules/Orders/orders.model';
import { PointRedemptionService } from '../modules/PointRedemtion/pointredemtion.services';
import { sendNotification } from '../utils/sendNotification';
import { BirthdayService } from '../modules/Birthday/birthday.services';

const stripe = new Stripe(config.stripe_secret_key as string);
const webhookSecret = config.stripe_webhook_secret_key as string;

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    // console.error('❌ No Stripe signature found');
    return res.status(400).send('No signature');
  }

  if (!webhookSecret) {
    // console.error('❌ Webhook secret not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    // console.log(`✅ Webhook verified: ${event.type}`);
  } catch (err: any) {
    // console.error(`❌ Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle specific events
  try {
    switch (event.type) {


// case 'checkout.session.completed': {
//   const session = event.data.object as Stripe.Checkout.Session;
  
//   if (session.payment_status === 'paid') {

//     if (session.metadata?.type === 'catering') {
//       await CateringService.handlePaymentSuccess(session.metadata.bookingId);
//       // console.log(`✅Catering Booking confirmed: ${session.metadata.bookingId}`);
//     } else {
   
//       await OrderService.handlePaymentSuccess(session);
//     }
//   }
//   break;
// }
case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status === 'paid') {
          const type = session.metadata?.type;

          if (type === 'catering') {
            await CateringService.handlePaymentSuccess(session.metadata!.bookingId);
          } 

          else if (type === 'point_redemption_delivery') {
   await handleRedemptionPayment(session); 
          } 
         else if (type === 'birthday_reward') {
      await BirthdayService.handleBirthdaySuccess(session.metadata!.orderId);
    } 
          else {
            await OrderService.handlePaymentSuccess(session);
          }
        }
        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        // console.log(`💳 Async payment succeeded: ${session.id}`);
        await OrderService.handlePaymentSuccess(session);
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId || session.client_reference_id;
        // console.log(`❌ Async payment failed: ${session.id}`);
        
        if (orderId) {
          await OrderService.handlePaymentFailure(orderId);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId || session.client_reference_id;
        // console.log(`⏰ Session expired: ${session.id}`);
        
        if (orderId) {
          await OrderService.handlePaymentFailure(orderId);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // console.log(`💰 Payment intent succeeded: ${paymentIntent.id}`);
        // Already handled by checkout.session.completed
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // console.log(`❌ Payment intent failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: any) {
    // console.error(`❌ Error processing webhook:`, error);
    // Still return 200 to prevent Stripe retries for processing errors
    res.status(200).json({ received: true, error: error.message });
  }
};




async function handleRedemptionPayment(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  const order = await OrderModel.findById(orderId).populate('user');

  if (!order || order.paymentStatus === PaymentStatus.POINTS_PAID) return;


  order.paymentStatus = PaymentStatus.POINTS_PAID;
  order.paidAt = new Date();
  await order.save();


  await RewardServices.redeemPoints({
    userId: order.user._id.toString(),
    points: order.pointsUsed,
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
  });


  for (const item of order.items) {
    await ProductModel.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
  }


  if (order.uberQuoteId) {
    try {
   
      const uberRes = await UberService.createUberDeliveryOrder(order, order.uberQuoteId);
      
      if (uberRes) {
        order.uberDeliveryId = uberRes.deliveryId;
        order.uberTrackingUrl = uberRes.tracking_url;
        order.uberStatus = uberRes.status;
        

        await order.save();
        // console.log("✅ Uber Tracking URL Added:", uberRes.tracking_url);
      }
    } catch (err) {
      // console.error("❌ Uber Dispatch Failed:", err);
    }
  }


  await PointRedemptionService.sendRedemptionConfirmationEmail(order, order.user);
  await sendNotification(order.user._id.toString(), 'Redemption Confirmed! 🎁', `Tracking URL added to your order.`);
}