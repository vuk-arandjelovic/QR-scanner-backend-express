const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../models/User");
const Response = require("../utils/responseHandler");

router.get(
  "/login",
  passport.authenticate("jwt", {
    session: false,
  }),
  async (req, res) => {
    console.log(req);
    const user = req.user;
    try {
      if (!user)
        return Response.json(res, {
          status: 400,
          message: "Server error",
        });
      return Response.json(res, {
        message: "User found",
        response: user,
      });
    } catch (err) {
      console.error(err.message);
      return Response.json(res, {
        status: 400,
        message: "Server error",
      });
    }
  }
);
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return Response.json(res, {
        status: 400,
        message: "User doesn't exist",
      });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return Response.json(res, {
        status: 400,
        message: "Invalid credentials",
      });

    const payload = { id: user._id };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
      (err, token) => {
        if (err) throw err;
        return Response.json(res, {
          message: "Token granted",
          response: { token },
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    return Response.json(res, {
      status: 400,
      message: "Server error",
    });
  }
});
router.get("/check", async (req, res) => {
  const { username } = req.query;
  try {
    let user = await User.findOne({ username });
    if (user)
      return Response.json(res, {
        status: 400,
        message: "Username already taken",
      });
    return Response.json(res, {
      message: "Username available",
    });
  } catch (err) {
    console.error(err.message);
    return Response.json(res, {
      status: 400,
      message: "Server error",
    });
  }
});
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // Add check for username that returns error "Username already taken"
    let user = await User.findOne({ email });
    if (user)
      return Response.json(res, {
        status: 400,
        message: "User already exists",
      });
    user = await User.findOne({ username });
    if (user)
      return Response.json(res, {
        status: 400,
        message: "Username already taken",
      });
    user = new User({ username, email, password });
    await user.save();
    return Response.json(res, {
      message: "User registered",
    });
  } catch (err) {
    console.error(err.message);
    return Response.json(res, {
      status: 400,
      message: "Server error",
    });
  }
});

module.exports = router;
