const express = require("express");
const router = express.Router();
const Store = require("../models/Store");

// Get all stores
router.get("/", async (req, res) => {
  try {
    const stores = await Store.find().populate("company");
    res.json(stores);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Get a single store by ID
router.get("/:id", async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).populate("company");
    if (!store) return res.status(404).json({ msg: "Store not found" });
    res.json(store);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Create a new store
router.post("/", async (req, res) => {
  const { company, name, address, city, x, y } = req.body;
  try {
    const newStore = new Store({ company, name, address, city, x, y });
    const store = await newStore.save();
    res.json(store);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Update a store by ID
router.put("/:id", async (req, res) => {
  const { company, name, address, city, x, y } = req.body;
  try {
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { company, name, address, city, x, y },
      { new: true }
    );
    if (!store) return res.status(404).json({ msg: "Store not found" });
    res.json(store);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Delete a store by ID
router.delete("/:id", async (req, res) => {
  try {
    const store = await Store.findByIdAndDelete(req.params.id);
    if (!store) return res.status(404).json({ msg: "Store not found" });
    res.json({ msg: "Store deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
