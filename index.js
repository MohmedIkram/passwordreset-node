// const express = require("express");
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { userRouter } from "./routes/users.js";
const app = express();
const PORT = process.env.PORT || 5000;

// mongo db connection
const url = `mongodb+srv://ikram:${process.env.MongoPassword}@cluster0.rlfdm.mongodb.net/${process.env.dbname}`;

mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
const con = mongoose.connection;
con.on("open", () => console.log("MongoDB is connected"));

// middleware
app.use(express.json());
app.use(cors());

app.get("/", (request, respone) => {
  respone.send("Welcome to node app!!!! Hi Guys");
});

app.use("/users", userRouter);

app.listen(PORT, () => console.log("The server is started in " + PORT));
