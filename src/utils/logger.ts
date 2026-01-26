import pino from "pino";

export const baseLogger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      messageFormat: "{msg}",
      ignore: "hostname,pid,avengers",
    },
  },
});
