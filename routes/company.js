const express = require("express");
const router = express.Router();
const Company = require("../models/Company");
const Store = require("../models/Store");
const Response = require("../utils/responseHandler");
const authMiddleware = require("../middleware/auth-wrapper");

router.get("/getUserCompanies", authMiddleware, async (req, res) => {
  try {
    const stores = await Store.find({
      _id: { $in: req.user.stores_visited },
    });
    const companyIds = stores.map((store) => store.company);
    const companies = await Company.find({ _id: { $in: companyIds } });
    return Response.json(res, {
      message: "Companies found",
      response: companies,
    });
  } catch (err) {
    console.error(err);
    return Response.json(res, {
      status: 500,
      message: "Server error",
    });
  }
});
module.exports = router;
