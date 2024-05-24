const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BillSchema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
  total: { type: Number, required: true },
  pdv: { type: Number, required: true },
  date: { type: Date, required: true },
  pfr: { type: String, required: true },
  items: [{ type: Schema.Types.ObjectId, ref: "Item" }],
});

module.exports = mongoose.model("Bill", BillSchema);
