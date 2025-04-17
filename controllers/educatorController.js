import { clerkClient } from "@clerk/express";
import { v2 as cloudinary } from "cloudinary";
import Course from "../models/Course.js";
import { Purchase } from "../models/Purchase.js";

export const updateRoleTOEducator = async (req, res) => {
	try {
		const userId = req.auth.userId;
		await clerkClient.users.updateUserMetadata(userId, {
			publicMetadata: {
				role: "educator",
			},
		});
		res.json({ success: true, message: "you can publish a course now " });
	} catch (error) {
		res.json({ success: false, message: error.message });
	}
};

export const addCourse = async (req, res) => {
	try {
		const { courseData } = req.body;
		const imageFile = req.file;
		const educatorId = req.auth.userId;
		if (!imageFile) {
			return res.status(400).json({
				success: false,
				message: "Thumbnail Not Attached",
			});
		}
		const parsedCourseData = JSON.parse(courseData);
		parsedCourseData.educator = educatorId;
		const newCourse = await Course.create(parsedCourseData);
		const imageUpload = await cloudinary.uploader.upload(imageFile.path);
		newCourse.courseThumbnail = imageUpload.secure_url;
		await newCourse.save();
		res.json({ success: true, message: "Course Added" });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
};

export const getEducatorCourses = async (req, res) => {
	try {
		const educator = req.auth.userId;
		const courses = await Course.find({ educator });
		res.json({ success: true, courses });
	} catch (error) {
		res.json({ success: false, message: error.message });
	}
};

export const educatorDashboardData = async () => {
	try {
		const educator = req.auth.userId;
		const courses = await Course.find({ educator });
		const totalCourses = courses.length;
		const courseIds = courses.map((course) => course._id);
		const purchases = await Purchase.find({
			courseId: { $in: courseIds },
			status: "completed",
		});
		const totalEarnings = purchases.reduce(
			(sum, purchase) => sum + purchase.amount,
			0
		);
		const enrolledStudentsData = [];
		for (const course of courses) {
			const students = await User.find(
				{ _id: { $in: course.enrolledStudents } },
				"name imageUrl"
			);
			students.forEach((student) => {
				enrolledStudentsData.push({
					courseTitle: course.courseTitle,
					student,
				});
			});
		}

		res.json({success:true,dashboardData:{
			totalEarnings,enrolledStudentsData,totalCourses
		}})

	} catch (error) {
		res.json({success:false,message:error.message})
	}
};

export const getEnrolledStudentsData = async (req,res) => {
	try {
		const educator = req.auth.userld;
		const courses = await Course.find({ educator });
		const courseIds = courses.map((course) => course._id);
		const purchases = await Purchase.find({
			courseld: { $in: courseIds },
			status: "completed",
		}).populate("usarld", "name imageUrl")
			.populate("courseld", "courseTitle");
			const enrolledStudents = purchases.map(purchase => ({
				student: purchase.userld,
				courseTitle: purchase.courseld.courseTitle,
				purchaseDate: purchase.createdAt
			}));
			res.json({ success: true, enrolledStudents });
		} catch (error) {
			res.json({ success: false, message: error.message });
		}
	}
