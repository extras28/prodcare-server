import { Router } from "express";
import { accountRouter } from "./account.router.js";
import { authRouter } from "./auth.router.js";
import { componentRouter } from "./component.router.js";
import { customerRouter } from "./customer.router.js";
import { productRouter } from "./product.router.js";
import { projectRouter } from "./project.router.js";
import { userRouter } from "./user.router.js";
import { issueRouter } from "./issue.router.js";
import { eventRouter } from "./event.router.js";
import { dashboardRouter } from "./dashboard.router.js";

export const apiRouter = Router();

apiRouter.use(authRouter);
apiRouter.use(accountRouter);
apiRouter.use(userRouter);
apiRouter.use(projectRouter);
apiRouter.use(customerRouter);
apiRouter.use(productRouter);
apiRouter.use(componentRouter);
apiRouter.use(issueRouter);
apiRouter.use(eventRouter);
apiRouter.use(dashboardRouter);
