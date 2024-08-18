const express = require("express");
const router = express.Router();
const Company = require("../models/Company");
const Store = require("../models/Store");
const passport = require("passport");
const Response = require("../utils/responseHandler");

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
module.exports = router;
