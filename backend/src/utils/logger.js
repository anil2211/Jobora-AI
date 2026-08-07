import { Logtail } from "@logtail/node";
import pino from "pino";


const logger = pino({

    level: process.env.LOG_LEVEL || "info",

    base: {
        service: "job-saver-ai-api",
        environment: process.env.NODE_ENV || "production",
    },

    timestamp: pino.stdTimeFunctions.isoTime,

});


const logtail = new Logtail(
    process.env.BETTERSTACK_SOURCE_TOKEN,
    {
        endpoint: "https://s2660893.eu-central-1a.betterstackdata.com"
    }
);



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

        await logtail.flush();

    }
    catch(error){

        logger.error(
            {
                error:error.message
            },
            "Better Stack logging failed"
        );

    }

}


export {
    logger,
    sendToBetterStack
};
