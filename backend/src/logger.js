const log4js = require("log4js");

log4js.configure({
  appenders: { out: { type: "stdout" } },
  categories: { default: { appenders: ["out"], level: "info" } },
});

const logger = log4js.getLogger("api");
module.exports = { logger };

