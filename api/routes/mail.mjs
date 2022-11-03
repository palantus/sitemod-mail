import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import { validateAccess } from "../../../../services/auth.mjs"
import MailSender from "../../services/mailsender.mjs";
import User from "../../../../models/user.mjs";
import SiteSetup from "../../../../models/setup.mjs"
import Mail from "../../models/mail.mjs";

export default (app) => {

  app.use("/mail", route)

  route.get('/authorize-link', (req, res) => {
    res.json(new MailSender().getAuthLink())
  })

  route.post('/send-test', function (req, res, next) {
    if (!validateAccess(req, res, { permission: "mail.setup" })) return;
    if(!req.body.to || typeof req.body.to !== "string" || !User.validateEmailAddress(req.body.to)) throw "Invalid or missing destination email"
    new Mail({
      to: req.body.to, 
      subject: "Test mail", 
      body: `Hi ${res.locals.user.name}.<br>This e-mail confirms that you can send mail from your site '${SiteSetup.lookup().siteTitle||"SiteCore"}'.`, 
      bodyType: "html"
    }).send().then(success => res.json(success))
  });

  route.get('/auth/redirect', async function (req, res, next) {
    const requestToken = req.query.code
    const state = req.query.state
    try{
      await new MailSender().login(requestToken)
      if (state.startsWith("http")) {
        let url = new URL(decodeURIComponent(state))
        url.searchParams.set("token", token);
        res.redirect(url)
      } else {
        res.redirect(`${global.sitecore.siteURL}/mail/setup`)
      }
    } catch(err){
      console.log(err)
      res.status(501).json({success: false, error: "Failed to log in"})
    }
  });
};