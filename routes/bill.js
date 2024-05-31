const express = require("express");
const router = express.Router();
const Bill = require("../models/Bill");
const passport = require("passport");

// Get all bills
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const bills = await Bill.find().populate("store").populate("items");
      res.json(bills);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Get a single bill by ID
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const bill = await Bill.findById(req.params.id)
        .populate("store")
        .populate("items");
      if (!bill) return res.status(404).json({ msg: "Bill not found" });
      res.json(bill);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Create a new bill
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { store, total, pdv, date, pfr, items } = req.body;
    try {
      const newBill = new Bill({ store, total, pdv, date, pfr, items });
      const bill = await newBill.save();
      res.json(bill);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Update a bill by ID
router.put(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { store, total, pdv, date, pfr, items } = req.body;
    try {
      const bill = await Bill.findByIdAndUpdate(
        req.params.id,
        { store, total, pdv, date, pfr, items },
        { new: true }
      );
      if (!bill) return res.status(404).json({ msg: "Bill not found" });
      res.json(bill);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Delete a bill by ID
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const bill = await Bill.findByIdAndDelete(req.params.id);
      if (!bill) return res.status(404).json({ msg: "Bill not found" });
      res.json({ msg: "Bill deleted" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
