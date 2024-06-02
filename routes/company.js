const express = require("express");
const router = express.Router();
const Company = require("../models/Company");
const Store = require("../models/Store");
const passport = require("passport");

router.get(
  "/getUserCompanies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const stores = await Store.find({
        _id: { $in: req.user.stores_visited },
      });
      const companyIds = stores.map((store) => store.company);
      const companies = await Company.find({ _id: { $in: companyIds } });
      res.json(companies);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);
// Get all companies
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const companies = await Company.find().populate("stores");
      res.json(companies);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Get a single company by ID
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const company = await Company.findById(req.params.id).populate("stores");
      if (!company) return res.status(404).json({ msg: "Company not found" });
      res.json(company);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Create a new company
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { pib, name, stores } = req.body;
    try {
      const newCompany = new Company({ pib, name, stores });
      const company = await newCompany.save();
      res.json(company);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Update a company by ID
router.put(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
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
  }
);

// Delete a company by ID
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const company = await Company.findByIdAndDelete(req.params.id);
      if (!company) return res.status(404).json({ msg: "Company not found" });
      res.json({ msg: "Company deleted" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
