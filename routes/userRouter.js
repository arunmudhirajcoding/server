import express from "express";
import {
	addUserRating,
	getUserCourseProgress,
	getUserData,
	getUserEnrolledCourses,
	purchaseCourse,
	UpdateUserCourseProgress,
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/data", getUserData);
userRouter.get("/enrolled-courses", getUserEnrolledCourses);
userRouter.post("/purchase", purchaseCourse);
userRouter.post("/update-course-progress", UpdateUserCourseProgress);
userRouter.post("/get-course-progress", getUserCourseProgress);
userRouter.post("/add-rating", addUserRating);
export default userRouter;
