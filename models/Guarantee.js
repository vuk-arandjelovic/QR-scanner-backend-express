const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GuaranteeSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  bill: { type: Schema.Types.ObjectId, ref: "Bill", required: true },
  item: { type: Schema.Types.Mixed, required: true }, // Object
  name: { type: String, required: true },
  expiration: { type: Date, required: true },
});

module.exports = mongoose.model("Guarantee", GuaranteeSchema);
