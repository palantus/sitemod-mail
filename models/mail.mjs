import Entity, {query} from "entitystorage"
import LogEntry from "../../../models/logentry.mjs";
import User from "../../../models/user.mjs";
import { getTimestamp } from "../../../tools/date.mjs";
import MailSender from "../services/mailsender.mjs"
import Setup from "./setup.mjs";

export default class Mail extends Entity {
  initNew({to, subject, body, bodyType } = {}) {
    this.to = to||null;
    this.subject = subject||null;
    this.body = body||null;
    this.bodyType = bodyType||"html";
    this.timestamp = getTimestamp()

    this.status = "draft"

    this.tag("mail")
  }

  static lookup(id) {
    if(!id) return null;
    return query.type(Mail).id(id).tag("mail").first
  }

  static all(){
    return query.type(Mail).tag("mail").all
  }

  static allFailed(){
    return query.type(Mail).tag("mail").prop("status", "failed").all
  }

  static allSent(){
    return query.type(Mail).tag("mail").prop("status", "sent").all
  }

  async send(attachments){
    if(!this.to) {
      this.log("Missing 'to' in email");
      return false;
    }
    this.rel(new LogEntry(`Sending email to ${this.to}...`, "mail"), "log")
    let isSent = await new MailSender(this).send({
      to: this.to, 
      subject: this.subject||"<empty subject>", 
      body: this.body||"",
      bodyType: this.bodyType||"Text",
      attachments,
    })

    if(isSent){
      this.status = "sent"
      this.rel(new LogEntry(`Email sent!`, "mail"), "log")
      return true;
    } else {
      this.status = "failed"
      this.rel(new LogEntry(`Could not send email to ${this.to}`, "mail"), "log")
      this.failSendCount = typeof this.failSendCount === "number" ? this.failSendCount + 1 : 1;
      return false;
    }
  }

  getLog(){
    return this.rels.log?.map(entry => LogEntry.from(entry))||[]
  }

  static getUsersFromFilters(filters){
    let users = User.active();
    if(filters.permission) users = users.filter(u => u.permissions.includes(filters.permission))
    if(filters.role) users = users.filter(u => u.roles.includes(filters.role))
    if(filters.roles && Array.isArray(filters.roles) && filters.roles.length > 0) users = users.filter(u => {
      for(let role of filters.roles){
        if(!u.roles.includes(role)) return false;
      }
      return true;
    })
    if(filters.user) users = users.filter(u => u.id == filters.user)
    users = users.filter(u => u.email)
    return users
  }

  static async resendFailed(){
    if(Setup.lookup().tokenStatus().status != "success"){
      new MailSender().log(`Will not try to resend mails, as token is not valid`, "error")
      return null;
    }
    for(let mail of Mail.allFailed()){
      new MailSender().log(`Trying to resend e-mail to ${mail._id}...`, "info")
      let successful = await mail.send()
      if(!successful){
        new MailSender().log(`Failed to resend email ${mail._id}`, "error")
      }
    }
  }

  toObj() {
    return {
      id: this._id,
      to: this.to,
      timestamp: this.timestamp,
      subject: this.subject,
      status: this.status,
      body: this.body,
      bodyType: this.bodyType
    }
  }

  toObjSimple() {
    return {
      id: this._id,
      to: this.to,
      subject: this.subject,
      status: this.status,
      timestamp: this.timestamp
    }
  }
}
