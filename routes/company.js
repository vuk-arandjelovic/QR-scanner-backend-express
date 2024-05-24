const express = require("express");
const router = express.Router();
const Company = require("../models/Company");

// Get all companies
router.get("/", async (req, res) => {
  try {
    const companies = await Company.find().populate("stores");
    res.json(companies);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Get a single company by ID
router.get("/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).populate("stores");
    if (!company) return res.status(404).json({ msg: "Company not found" });
    res.json(company);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Create a new company
router.post("/", async (req, res) => {
  const { pib, name, stores } = req.body;
  try {
    const newCompany = new Company({ pib, name, stores });
    const company = await newCompany.save();
    res.json(company);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Update a company by ID
router.put("/:id", async (req, res) => {
  const { pib, name, stores } = req.body;
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { pib, name, stores },
      { new: true }
    );
    if (!company) return res.status(404).json({ msg: "Company not found" });
    res.json(company);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Delete a company by ID
router.delete("/:id", async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ msg: "Company not found" });
    res.json({ msg: "Company deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
