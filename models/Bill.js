const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BillSchema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
  total: { type: Number, required: true },
  pdv: { type: Number, required: true },
  date: { type: Date, required: true },
  pfr: { type: String, required: true },
  items: [
    {
      itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
      amount: { type: Number, required: true },
      total: { type: Number, required: true },
    },
  ],
});

module.exports = mongoose.model("Bill", BillSchema);
