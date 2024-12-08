const validateUrl = (url) => {
  if (url.startsWith("https://suf.purs.gov.rs/v/?vl=")) return true;
  if (url.startsWith("https://suf.purs.gov.rs:443/v/?vl=")) return true;
  return false;
};
module.exports = validateUrl;
