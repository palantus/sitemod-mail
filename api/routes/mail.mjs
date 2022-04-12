import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import { validateAccess } from "../../../../services/auth.mjs"
import MailSender from "../../services/mailsender.mjs";

export default (app) => {

  app.use("/mail", route)

  route.get('/authorize-link', (req, res) => {
    res.json(MailSender.getAuthLink())
  })

  route.post('/send-test', function (req, res, next) {
    if (!validateAccess(req, res, { permission: "mail.setup" })) return;
    if(!req.body.to || typeof req.body.to !== "string" || !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(req.body.to)) throw "Invalid or missing destination email"
    new MailSender().send({to: req.body.to, subject: "Test mail", body: "This mail confirms that you can send mail from your SiteCore instance"}).then(error => {
      res.json({success: !!!error, error})
    })
  });

  route.get('/auth/redirect', async function (req, res, next) {
    const requestToken = req.query.code
    const state = req.query.state
    try{
      await MailSender.login(requestToken)
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