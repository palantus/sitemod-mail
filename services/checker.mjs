import MailSender from "./mailsender.mjs"
import Setup from "../models/setup.mjs";
import Mail from "../models/mail.mjs";
import LogEntry from "../../../models/logentry.mjs";
import MailAccount from "../models/account.mjs";

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
  let refreshTokenError = await new MailSender().refreshToken(defaultAccount)
  if(refreshTokenError) new MailSender().log("Could not refresh e-mail token", "error");
  else new MailSender().log("E-mail token refreshed", "info")

  if(setup.tokenStatus().status == "success"){
    //Try to resend failed:
    for(let mail of Mail.allFailed()){
      if(typeof mail.failSendCount === "number" && mail.failSendCount >= 5){
        new MailSender().log(`Email ${mail._id} has failed to send 5 times and will not be attempted again...`, "info");
        mail.status = "failed-aborted";
        return;
      }
      new MailSender().log(`Trying to resend e-mail to ${mail._id}...`, "info")
      let successful = await mail.send()
      if(!successful){
        new MailSender().log(`Failed to resend email ${mail._id}`, "error")
      }
    }
  } else {
    new MailSender().log(`Will not try to resend mails, as token is not valid`, "info");
  }  

  //Clean up old emails:
  let todayMinus15 = new Date()
  todayMinus15.setDate(todayMinus15.getDate()-15)
  let todayMinus15Str = todayMinus15.toISOString()

  Mail.all().filter(a => a.timestamp < todayMinus15Str)
            .forEach(a => a.delete());

  //Clean up accounts not in use
  for(let account of MailAccount.all()){
    if(account._id == defaultAccount._id) continue;
    account.delete()
  }
}