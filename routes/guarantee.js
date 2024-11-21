const express = require("express");
const router = express.Router();
const Guarantee = require("../models/Guarantee");
const passport = require("passport");
const Response = require("../utils/responseHandler");

router.get(
  "/getUserGuarantees",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const guarantees = await Guarantee.find({ user: req.user.id });
      res.json(guarantees);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);
// Get a single guarantee by ID
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const guarantee = await Guarantee.findById(req.params.id).populate(
        "bill"
      );
      if (!guarantee)
        return res.status(404).json({ msg: "Guarantee not found" });
      res.json(guarantee);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);
// Create a new guarantee
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { user, bill, item, name, expiration } = req.body;
    try {
      const newGuarantee = new Guarantee({
        user,
        bill,
        item,
        name,
        expiration,
      });
      const guarantee = await newGuarantee.save();
      res.json(guarantee);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Update a guarantee by ID
router.put(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { bill, item, name, expiration } = req.body;
    try {
      const guarantee = await Guarantee.findByIdAndUpdate(
        req.params.id,
        { bill, item, name, expiration },
        { new: true }
      );
      if (!guarantee)
        return res.status(404).json({ msg: "Guarantee not found" });
      res.json(guarantee);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Delete a guarantee by ID
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const guarantee = await Guarantee.findByIdAndDelete(req.params.id);
      if (!guarantee)
        return res.status(404).json({ msg: "Guarantee not found" });
      res.json({ msg: "Guarantee deleted" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Get all guarantees
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const guarantees = await Guarantee.find().populate("bill");
      res.json(guarantees);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
