const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StoreSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  x: { type: Schema.Types.Mixed, required: true }, // Number or String
  y: { type: Schema.Types.Mixed, required: true }, // Number or String
});

module.exports = mongoose.model("Store", StoreSchema);
