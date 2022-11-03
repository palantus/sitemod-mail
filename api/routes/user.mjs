import express from "express"
const { Router, Request, Response } = express;
import User from "../../../../models/user.mjs"
import {getTimestamp} from "../../../../tools/date.mjs"
import Mail from "../../models/mail.mjs";
import CoreSetup from "../../../../models/setup.mjs"
import {service as userService} from "../../../../services/user.mjs"
import { v4 as uuidv4 } from 'uuid';

export default (app) => {

  const userRoute = Router();
  app.use("/user", userRoute)

  userRoute.post('/:id/reset-password-mail', function (req, res, next) {
    let user = User.lookup(req.params.id)
    if (!user) throw "Unknown user"
    if(user.passwordResetLinkTimestamp && new Date(user.passwordResetLinkTimestamp).getTime() > new Date().getTime() - 60000){
      throw "You cannot reset your password again yet. Try later."
    }
    if(!user.email) throw "The user doesn't have an email associated";

    user.passwordResetLinkTimestamp = getTimestamp()
    if(user.name !== req.body.name) throw "Invalid name provided. For security you have been locked out from trying again for the next minute."

    user.passwordResetKey = uuidv4()
    let resetLink = `${global.sitecore.siteURL}/password-reset?token=${userService.getTempAuthToken(user)}&single=true&resetKey=${user.passwordResetKey}`

    new Mail({
      to: user.email, 
      subject: `${CoreSetup.lookup().siteTitle}: Password reset`, 
      body: `<h1>Hi ${user.name}!</h1><p>Use the following link to change your password:</p><a href="${resetLink}">Reset password</a><br><br>If you did not request the change of password, then please ignore this e-mail.`,
      bodyType: "html"
    }).send().then(success => {
      res.json({success})
    })
  });

  userRoute.post('/:id/reset-password', (req, res, next) => {
    let user = User.lookup(req.params.id)
    if (!user) throw "Unknown user"
    if(!req.body.resetKey || req.body.resetKey !== user.passwordResetKey) throw "Invalid reset key for user"
    let newPassword = uuidv4()
    user.setPassword(newPassword)
    user.removeProp("passwordResetKey")

    new Mail({
      to: user.email, 
      subject: `${CoreSetup.lookup().siteTitle}: Password reset`, 
      body: `<h1>Hi ${user.name}!</h1><p>Here is your new password:</p><div>${newPassword}</div><br>You can change your new password to something of your choice <a href="${global.sitecore.siteURL}/profile">here</a>.<br>If you just want to go to the site and log in, follow <a href="${global.sitecore.siteURL}/login">this link</a>.`,
      bodyType: "html"
    }).send().then(success => {
      res.json({success})
    })
  })
};