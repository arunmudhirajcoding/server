// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import { clerkWebhooks, stripeWebhookHandler } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educatorRoutes.js";
import { clerkMiddleware } from "@clerk/express";
import connectCloudinary from "./configs/cloudinary.js";
import courseRouter from "./routes/courseRoute.js";
import userRouter from "./routes/userRouter.js";

// Initialize Express app
const app = express();

// Connect to MongoDB
await connectDB();
await connectCloudinary();
console.log("✅ MongoDB connected");

// Middlewares
app.use(cors());
app.use(clerkMiddleware());

// Health check route
app.get("/", (req, res) => {
	res.send("🚀 API is up and running!");
});

// Clerk webhook route (must use raw body parser)
app.post("/clerk", bodyParser.raw({ type: "application/json" }), clerkWebhooks);

// Routes with JSON body parser
app.use("/api/educator", express.json(), educatorRouter);

app.use('/api/course',express.json(),courseRouter)

app.use('/api/user',express.json(),userRouter)

app.use('/stripe',express.raw({type:'application/json'}),stripeWebhookHandler)

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`✅ Server is running on http://localhost:${PORT}`);
});
