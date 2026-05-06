import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marketRouter from "./market";
import tokensRouter from "./tokens";
import narrativesRouter from "./narratives";
import signalsRouter from "./signals";
import portfolioRouter from "./portfolio";
import newsRouter from "./news";

const router: IRouter = Router();

router.use(healthRouter);
router.use(marketRouter);
router.use(tokensRouter);
router.use(narrativesRouter);
router.use(signalsRouter);
router.use(portfolioRouter);
router.use(newsRouter);

export default router;
