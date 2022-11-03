import Entity, {query} from "entitystorage"
import { getTimestamp } from "../../../tools/date.mjs";
import MailSender from "../services/mailsender.mjs"

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

  async send(){
    try{
      if(!this.to) throw "Missing 'to' in email";
      await new MailSender().send({
        to: this.to, 
        subject: this.subject||"<empty subject>", 
        body: this.body||"",
        bodyType: this.bodyType||"Text"
      })
      this.status = "sent"
      return true;
    } catch(err){
      this.status = "failed"
      new LogEntry(`Could not send email to ${user.email}. Error: ${err}`, "forum")
      return false;
    }
  }

  toObj() {
    return {
      to: this.to,
      subject: this.subject,
      body: this.body,
      bodyType: this.bodyType
    }
  }
}