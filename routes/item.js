const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const passport = require("passport");

// Route to search items by name
router.get(
  "/search",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { name } = req.query;
    if (!name) {
      return res
        .status(400)
        .json({ msg: "Please provide an item name to search." });
    }
    try {
      const items = await Item.find({ name: new RegExp(name, "i") });
      res.json(items);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);
// Get all items
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const items = await Item.find();
      res.json(items);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);
// Get a single item by ID
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const item = await Item.findById(req.params.id);
      if (!item) return res.status(404).json({ msg: "Item not found" });
      res.json(item);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Create a new item
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { name, price, amount, total } = req.body;
    try {
      const newItem = new Item({ name, price, amount, total });
      const item = await newItem.save();
      res.json(item);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);
// Update an item by ID
router.put(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { name, price, amount, total } = req.body;
    try {
      const item = await Item.findByIdAndUpdate(
        req.params.id,
        { name, price, amount, total },
        { new: true }
      );
      if (!item) return res.status(404).json({ msg: "Item not found" });
      res.json(item);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);
// Delete an item by ID
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const item = await Item.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ msg: "Item not found" });
      res.json({ msg: "Item deleted" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
