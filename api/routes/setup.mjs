import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import { validateAccess } from "../../../../services/auth.mjs"
import Setup from "../../models/setup.mjs";

export default (app) => {

  app.use("/mail", route)

  route.get('/setup', function (req, res, next) {
    if (!validateAccess(req, res, { permission: "mail.setup" })) return;
    res.json(Setup.lookup().toObj());
  });

  route.patch('/setup', function (req, res, next) {
    if (!validateAccess(req, res, { permission: "mail.setup" })) return;

    let setup = Setup.lookup();

    if(req.body.clientId !== undefined) setup.clientId = req.body.clientId;
    if(req.body.from !== undefined) setup.from = req.body.from;

    res.json(true);
  });
};