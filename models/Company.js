const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CompanySchema = new Schema({
  pib: { type: Number, required: true },
  name: { type: String, required: true },
  stores: [{ type: Schema.Types.ObjectId, ref: "Store" }],
});

module.exports = mongoose.model("Company", CompanySchema);
