import serverless from "serverless-http";
import { createApp } from "../server/_core/index";

const appPromise = createApp();
const handlerPromise = appPromise.then((app) => serverless(app));

export default async function handler(...args: Parameters<Awaited<typeof handlerPromise>>) {
  const expressHandler = await handlerPromise;
  return expressHandler(...args);
}
