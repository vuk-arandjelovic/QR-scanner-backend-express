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
      const response = await User.findById(req.user.id).select("-password");
      if (!response) {
        Response.json(res, {
          status: 404,
          message: "User not found",
        });
      }
      Response.json(res, {
        message: "User found",
        response,
      });
    } catch (err) {
      Response.json(res, {
        status: 400,
        message: "User not found",
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
      if (!user) return res.status(404).json({ msg: "User not found" });
      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
