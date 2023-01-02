import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import { validateAccess } from "../../../../services/auth.mjs"
import MailSender from "../../services/mailsender.mjs";
import User from "../../../../models/user.mjs";
import SiteSetup from "../../../../models/setup.mjs"
import Mail from "../../models/mail.mjs";
import Setup from "../../models/setup.mjs";
import Permission from "../../../../models/permission.mjs";
import { md2html } from "../../../../tools/markdown.mjs";

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
      body: "", 
      bodyType: "html"
    }).send().then(success => res.json(success))
  });

  route.post('/send', function (req, res, next) {
    if (!validateAccess(req, res, { permission: "mail.send" })) return;
    let recipients = Mail.getUsersFromFilters(req.body)
    if(recipients.length < 1) throw "No recipients"
    for(let user of recipients){
      return new Mail({
        to: user.email, 
        subject: req.body.subject, 
        body: md2html(req.body.body), 
        bodyType: "html"
      }).send()
    }
    res.json({success: true})
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

  route.get('/token-status', function (req, res, next) {
    if (!validateAccess(req, res, { permission: "mail.setup" })) return;
    let setup = Setup.lookup()
    if (!setup.clientId) return res.json({status: "setup", error: "Missing clientId"});
    let defaultAccount = setup.defaultAccount
    if(!defaultAccount) return res.json({status: "setup", error: "Missing account"});
    let token = defaultAccount.accessToken
    if(!token) return res.json({status: "setup", error: "Missing token"});;
    res.json({
      status: defaultAccount.lastTokenRefreshStatus == "fail" ? "fail" : defaultAccount.lastTokenRefreshStatus == "success" ? "success" : "unknown",
      error: defaultAccount.lastTokenRefreshStatus == "success" ? null : defaultAccount.lastTokenRefreshStatus == "fail" ? "Failed last refresh of token" : "No status"
    })
  })
  
  route.post('/recipient-count', function (req, res, next) {
    if (!validateAccess(req, res, { permission: "mail.send" })) return;
    res.json({count: Mail.getUsersFromFilters(req.body).length})
  })
  
  route.get('/history', (req, res) => {
    if (!validateAccess(req, res, { permission: "mail.setup" })) return;
    res.json(Mail.all().sort((a, b) => a.timestamp < b.timestamp ? 1 : -1).slice(0, 100).map(m => m.toObjSimple()))
  })
  
  route.get('/:id/log', (req, res) => {
    if (!validateAccess(req, res, { permission: "mail.setup" })) return;
    let mail = Mail.lookup(req.params.id)
    if(!mail) return res.sendStatus(404);
    res.json(mail.getLog().map(e => e.toObj()))
  })
};