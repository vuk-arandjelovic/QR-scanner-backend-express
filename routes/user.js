const express = require("express");
const router = express.Router();
const User = require("../models/User");
const passport = require("passport");

// Get all users
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const users = await User.find().populate("bills").populate("guarantees");
      res.json(users);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Get a single user by ID
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .populate("bills")
        .populate("guarantees");
      if (!user) return res.status(404).json({ msg: "User not found" });
      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Create a new user
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { username, password, email, bills, guarantees, stores_visited } =
      req.body;
    try {
      const newUser = new User({
        username,
        password,
        email,
        bills,
        guarantees,
        stores_visited,
      });
      const user = await newUser.save();
      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
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

// Delete a user by ID
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ msg: "User not found" });
      res.json({ msg: "User deleted" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
