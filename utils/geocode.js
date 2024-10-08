const axios = require("axios");
const geoApiCall = async (address, city) => {
  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
      `${address} ${city} ${"Srbija"}`
    )}&apiKey=${process.env.GEOCODING_API_KEY}`;
    const response = await axios.get(url);
    const { data } = response;

    if (!data) throw new Error(`Geocoding API error: ${data.status}`);
    const lng = data.features[0].geometry.coordinates[0];
    const lat = data.features[0].geometry.coordinates[1];

    return { x: lat, y: lng };
  } catch (error) {
    console.error("Error in geoApiCall:", error.message);
    throw error;
  }
};
module.exports = geoApiCall;
