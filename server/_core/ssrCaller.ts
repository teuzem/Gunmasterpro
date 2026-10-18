import type { Request, Response } from "express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import type { SsrPrefetch } from "../../client/src/ssr/prefetch";

export async function buildSsrPrefetch(req: Request, res: Response): Promise<SsrPrefetch> {
  const context = await createContext({ req, res } as never);
  const caller = appRouter.createCaller(context);
  return {
    catalogueList: (input) => caller.catalogue.list(input),
    catalogueBySlug: (input) => caller.catalogue.bySlug(input),
    categoriesList: () => caller.categories.list(),
    heroSlides: () => caller.homepage.heroSlides(),
    reviewsList: (input) => caller.reviews.list(input),
  };
}
