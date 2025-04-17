// controllers/webhooks.js
import { Webhook } from "svix";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";
import User from "../models/User.js";

import dotenv from "dotenv";
dotenv.config();

export const clerkWebhooks = async (req, res) => {
	console.log("📩 Webhook function called");

	try {
		// Step 1: Verify Clerk webhook using Svix
		const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

		const payloadString = req.body.toString("utf8");
		const headers = {
			"svix-id": req.headers["svix-id"],
			"svix-timestamp": req.headers["svix-timestamp"],
			"svix-signature": req.headers["svix-signature"],
		};

		// Verify the webhook
		whook.verify(payloadString, headers);
		console.log("✅ Webhook verified");

		// Step 2: Parse the payload manually
		const payload = JSON.parse(payloadString);
		const { data, type } = payload;

		// Step 3: Handle different webhook event types
		switch (type) {
			case "user.created": {
				const userData = {
					_id: data.id,
					email: data.email_addresses[0]?.email_address,
					name: data.first_name + " " + data.last_name,
					imageUrl: data.image_url,
				};
				await User.create(userData);
				console.log("✅ User created in DB:", userData);
				break;
			}
			case "user.updated": {
				const userData = {
					email: data.email_addresses[0]?.email_address,
					name: data.first_name + " " + data.last_name,
					imageUrl: data.image_url,
				};
				await User.findByIdAndUpdate(data.id, userData);
				console.log("📝 User updated:", userData);
				break;
			}
			case "user.deleted": {
				await User.findByIdAndDelete(data.id);
				console.log("🗑️ User deleted:", data.id);
				break;
			}
			default:
				console.log("⚠️ Unhandled webhook type:", type);
				break;
		}

		res.status(200).json({ success: true });
	} catch (error) {
		console.error("❌ Webhook processing error:", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

// controllers/webhooks.js

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhookHandler = async (req, res) => {
	const sig = req.headers["stripe-signature"];

	let event;

	try {
		event = stripe.webhooks.constructEvent(
			req.body,
			sig,
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch (err) {
		console.error("⚠️ Webhook signature verification failed.", err.message);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	switch (event.type) {
		case "payment_intent.succeeded": {
			const paymentIntent = event.data.object;
			const paymentIntentId = paymentIntent.id;

			try {
				// Get Checkout Session from paymentIntent
				const sessions = await stripe.checkout.sessions.list({
					payment_intent: paymentIntentId,
				});

				const session = sessions.data[0];
				const { purchaseId } = session.metadata;

				const purchase = await Purchase.findById(purchaseId);
				const user = await User.findById(purchase.userId);
				const course = await Course.findById(purchase.courseId);

				if (!user || !course || !purchase) {
					console.log("❌ User, Course, or Purchase not found");
					return res.status(404).send("Missing data");
				}

				// Add course to user's enrolledCourses
				if (!user.enrolledCourses.includes(course._id)) {
					user.enrolledCourses.push(course._id);
					await user.save();
				}

				// Add user to course's enrolledStudents
				if (!course.enrolledStudents.includes(user._id)) {
					course.enrolledStudents.push(user._id);
					await course.save();
				}

				purchase.status = "completed";
				await purchase.save();

				console.log(
					`✅ Payment succeeded. Course enrolled for user: ${user.email}`
				);
				res.status(200).json({ received: true });
			} catch (err) {
				console.error("❌ Error handling succeeded payment:", err);
				res.status(500).send("Server Error");
			}
			break;
		}

		case "payment_intent.payment_failed": {
			const paymentIntent = event.data.object;
			const paymentIntentId = paymentIntent.id;

			try {
				const sessions = await stripe.checkout.sessions.list({
					payment_intent: paymentIntentId,
				});

				const session = sessions.data[0];
				const { purchaseId } = session.metadata;

				const purchase = await Purchase.findById(purchaseId);

				if (purchase) {
					purchase.status = "failed";
					await purchase.save();
				}

				console.log(`❌ Payment failed for purchase: ${purchaseId}`);
				res.status(200).json({ received: true });
			} catch (err) {
				console.error("❌ Error handling failed payment:", err);
				res.status(500).send("Server Error");
			}
			break;
		}

		default:
			console.log(`🔔 Unhandled event type: ${event.type}`);
			res.status(200).json({ received: true });
	}
};
