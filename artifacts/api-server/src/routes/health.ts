import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  // Return a minimal health shape inline to avoid needing workspace type packages
  res.json({ status: "ok" });
});

export default router;
