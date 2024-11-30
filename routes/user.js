const express = require("express");
const router = express.Router();
const User = require("../models/User");
const passport = require("passport");
const Response = require("../utils/responseHandler");

router.get(
  "/getUserData",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");
      if (!user) {
        return Response.json(res, {
          status: 404,
          message: "User not found",
        });
      }
      return Response.json(res, {
        message: "User found",
        response: user,
      });
    } catch (err) {
      return Response.json(res, {
        status: 500,
        message: "Server error",
      });
    }
  }
);
// Update a user by ID
router.put(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { username, password, email, bills, guarantees, stores_visited } =
      req.body;
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { username, password, email, bills, guarantees, stores_visited },
        { new: true }
      );
      if (!user)
        return Response.json(res, {
          status: 404,
          message: "User not found",
        });
      return Response.json(res, {
        message: "User found",
        response: user,
      });
    } catch (err) {
      console.error(err.message);
      return Response.json(res, {
        status: 500,
        message: "Server error",
      });
    }
  }
);

module.exports = router;
