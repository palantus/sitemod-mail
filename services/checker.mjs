import MailSender from "./mailsender.mjs"
import Setup from "../models/setup.mjs";

export function startCheckerService(){
  runJob()
  return setInterval(runJob, 10_000_000) // Run every few hours
}

async function runJob(){
  let setup = Setup.lookup()
  if (!setup.clientId) return;
  let defaultAccount = setup.defaultAccount
  if(!defaultAccount) return;
  let token = defaultAccount.accessToken
  if(!token) return;
  await MailSender.refreshToken(defaultAccount)
  MailSender.log("E-mail token refreshed", "mail")
}