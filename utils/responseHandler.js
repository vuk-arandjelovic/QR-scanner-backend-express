const Response = {
  json: function (res, object = {}) {
    const { status = 200, message, response } = object;
    const _response = {
      status: status.toString().startsWith("2") ? "success" : "error",
      message,
      response,
    };
    res.setHeader("Content-Type", "application/json");
    return res.status(status).json(_response);
  },
};
module.exports = Response;
