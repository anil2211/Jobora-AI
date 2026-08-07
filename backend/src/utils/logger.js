import { Logtail } from "@logtail/node";
import pino from "pino";


const logtail = new Logtail(
    process.env.BETTERSTACK_SOURCE_TOKEN
);


const logger = pino({

    level: process.env.LOG_LEVEL || "info",

    base: {
        service: "job-saver-ai-api",
        environment: process.env.NODE_ENV || "production",
    },

    timestamp: pino.stdTimeFunctions.isoTime,

});


async function sendToBetterStack(
    level,
    message,
    meta = {}
) {

    try {

        await logtail.log(
            message,
            {
                level,
                ...meta
            }
        );

    } catch(error){

        console.error(
            "Better Stack logging failed:",
            error.message
        );

    }
}


export {
    logger,
    sendToBetterStack
};
