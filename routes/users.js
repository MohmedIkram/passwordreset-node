import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";

import { auth as nice } from "../middleware/auth.js";
import { Users } from "../models/users.js";

import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// nodemailer
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MailId,
    pass: process.env.PASSWORD,
  },
});

// get all the users present
router.route("/").get(async (request, respone) => {
  const users = await Users.find();
  respone.send(users);
});

// find user by id
router
  .route("/:id")
  .get(nice, async (request, respone) => {
    const { id } = request.params;
    const user = await Users.findById(id);
    respone.send(user);
  })
  // delete particular user by id
  .delete(async (request, respone) => {
    const { id } = request.params;
    try {
      const user = await Users.findById(id);
      await user.remove();

      respone.send({
        name: user.name,
        id: user.id,
        message: "Deleted successfully",
      });
    } catch (err) {
      respone.status(500);
      respone.send("User is missing");
    }
  })

  // upadte the details of user
  .patch(async (request, respone) => {
    const { id } = request.params;
    const { name, email } = request.body;

    try {
      const user = await Users.findById(id);
      if (name) {
        user.name = name;
      }
      if (email) {
        user.email = email;
      }
      await user.save();
      respone.send(user);
    } catch (err) {
      respone.status(500);
      respone.send(err);
    }
  });

// login route

router.route("/login").post(async (request, respone) => {
  const { email, password } = request.body;
  try {
    const user = await Users.findOne({ email });
    const inDbStoredPassword = user.password;
    const isMatch = await bcrypt.compare(password, inDbStoredPassword);
    if (!isMatch) {
      respone.status(500);
      respone.send({ message: "Invalid credentials!!!" });
    } else {
      const token = jwt.sign({ id: user._id }, "secretkey");
      respone.cookie("jwtoken", token, {
        expires: new Date(Date.now() + 25892000000),
        httpOnly: true,
      });
      respone.send({
        ...user.toObject(),
        token,
        message: "Successful login",
      });
      // response.redirect(`${process.env.url}/users/forgot-password`);
    }
  } catch (err) {
    respone.status(500);
    respone.send(err);
  }
});

// Creating user SiginUp route
router.route("/signup").post(async (request, respone) => {
  const { name, email, password } = request.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    console.log(passwordHash);

    const user = new Users({
      name,
      email,
      password: passwordHash,
    });

    await user.save();
    // db to store it
    respone.send(user);
    // response.redirect(`${process.env.url}/users/login`);
  } catch (err) {
    respone.status(500);
    respone.send(err);
  }
});

// forgoten password route to getenate random string and semt it via mail

router.route("/forgot-password").post(async (request, response) => {
  const { email } = request.body;
  try {
    const user = await Users.findOne({ email: email });

    crypto.randomBytes(32, async (err, buffer) => {
      if (err) {
        console.log(err);
        return response.status(500).send({ message: "Can't generate token" });
      }
      const token = buffer.toString("hex");
      if (!user) {
        response.send({
          message: `No user Found for this email ${email} Kindly Register and then try again `,
        });
      }
      user.resetToken = token;
      user.expiryTime = Date.now() + 3600000;
      await user.save();
      console.log("mail is going to be sent");
      let ForgotMail = await transporter.sendMail({
        from: process.env.MailId,
        to: `${user.email}`,
        subject: "Password reset",
        html: `<h4>Your request for password reset has been accepted </h4><br/> <p> To reset your password,
           <a href="https://quizzical-dubinsky-95e207.netlify.app/ResetPassword/${token}"> click here </a>`,
        //  html: `<h4>Your request for password reset has been accepted </h4><br/> <p> To reset your password,
        //  <a href="http://localhost:3000/ResetPassword/${token}"> click here </a>`,
      });
      console.log("Forgotmail is", ForgotMail);
      if (ForgotMail.accepted.length > 0) {
        response.send({
          message: "Mail Sent for Forgot Password!",
        });
        console.log(user);
      } else if (ForgotMail.rejected.length == 1) {
        response.send({ message: "Errors" });
      }
    });
  } catch (err) {
    console.log(err);
  }
});

// passworde reset route to change the password though the link sent to the users mail

router.route("/reset-password/:resetToken").post(async (request, response) => {
  const { resetToken } = request.params;
  const { newPassword } = request.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const newpasswordHash = await bcrypt.hash(newPassword, salt);
    const user = await Users.findOne({
      resetToken: resetToken,
    });

    console.log("found User by Token", user);
    if (user) {
      user.password = newpasswordHash;
      user.resetToken = undefined;
      user.expiryTime = undefined;
      await user.save();
    }
    console.log("updated User by Token", user);

    response.send({ message: "changed password successfully", user });
    // response.redirect(`${process.env.url}/users/login`);
    //       response.redirect(`${process.env.url}/users/forgot-password/${token}`);
  } catch (err) {
    response.send(err);
    console.log(err);
  }
});

//User Logout
router.route("/signout").get(async (request, respone) => {
  response.status(200).send("Logged out successfully");
});

export const userRouter = router;
