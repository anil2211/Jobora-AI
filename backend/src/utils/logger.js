import { Logtail } from "@logtail/node";
import pino from "pino";

/**
 * ----------------------------------------
 * Pino Logger (Console)
 * ----------------------------------------
 */
const logger = pino({
  level: process.env.LOG_LEVEL || "info",

  base: {
    service: "job-saver-ai-api",
    environment: process.env.NODE_ENV || "production",
  },

  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * ----------------------------------------
 * Better Stack (Logtail)
 * ----------------------------------------
 */
const logtail = new Logtail(
  process.env.BETTERSTACK_SOURCE_TOKEN,
  {
    endpoint: "https://s2660893.eu-central-1a.betterstackdata.com",
  }
);

/**
 * ----------------------------------------
 * Send logs to Better Stack
 * ----------------------------------------
 */
async function sendToBetterStack(level = "info", message = "", meta = {}) {
  try {
    // Console Log (Pino)
    switch (level) {
      case "error":
        logger.error(meta, message);
        break;

      case "warn":
      case "warning":
        logger.warn(meta, message);
        break;

      case "debug":
        logger.debug(meta, message);
        break;

      default:
        logger.info(meta, message);
    }

    // Better Stack Log
    await logtail.log(message, {
      level,
      timestamp: new Date().toISOString(),
      ...meta,
    });

    await logtail.flush();
  } catch (err) {
    logger.error(
      {
        error: err.message,
      },
      "Better Stack logging failed"
    );
  }
}

/**
 * ----------------------------------------
 * Helper Methods
 * ----------------------------------------
 */

async function logInfo(message, meta = {}) {
  await sendToBetterStack("info", message, meta);
}

async function logWarning(message, meta = {}) {
  await sendToBetterStack("warning", message, meta);
}

async function logError(message, meta = {}) {
  await sendToBetterStack("error", message, meta);
}

async function logDebug(message, meta = {}) {
  await sendToBetterStack("debug", message, meta);
}

/**
 * ----------------------------------------
 * Exports
 * ----------------------------------------
 */

export {
    logDebug, logError, logger, logInfo,
    logWarning, sendToBetterStack
};
