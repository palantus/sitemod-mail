import MailSender from "./mailsender.mjs"
import Setup from "../models/setup.mjs";
import Mail from "../models/mail.mjs";
import LogEntry from "../../../models/logentry.mjs";

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

  //Try to resend failed:
  for(let mail of Mail.allFailed()){
    let successful = await mail.send()
    if(!successful){
      new LogEntry(`Failed to resend email ${mail._id}`)
    }
  }

  //Clean up old emails:
  let todayMinus15 = new Date()
  todayMinus15.setDate(todayMinus15.getDate()-15)
  let todayMinus15Str = todayMinus15.toISOString()

  Mail.all().filter(a => a.timestamp < todayMinus15Str)
            .forEach(a => a.delete());

}