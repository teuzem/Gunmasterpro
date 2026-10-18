import serverless from "serverless-http";
import { createApp } from "../../server/_core/index";

const buildHandler = async () =>
  serverless(await createApp(), {
    basePath: "/.netlify/functions/app",
  });

let handlerPromise: ReturnType<typeof buildHandler> | undefined;

const getHandler = () => {
  handlerPromise ??= buildHandler();
  return handlerPromise;
};

export const handler = async (...args: Parameters<Awaited<ReturnType<typeof buildHandler>>>) => {
  const expressHandler = await getHandler();
  return expressHandler(...args);
};
