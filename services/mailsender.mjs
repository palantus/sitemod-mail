import fetch from 'node-fetch'
import Setup from '../models/setup.mjs'
import MailAccount from '../models/account.mjs';
import User from '../../../models/user.mjs';
import LogEntry from "../../../models/logentry.mjs"
import { getTimestamp } from '../../../tools/date.mjs';

// SEE https://docs.microsoft.com/en-us/graph/auth-v2-user?view=graph-rest-1.0

export default class MailSender {
  static scope = "offline_access%20user.read%20mail.read%20mail.send%20mail.send.shared"

  constructor(mail){
    this.mail = mail
  }

  log(text, type){
    if(type == "error") {
      User.lookupAdmin()?.notify("mail", typeof text === "string" ? text : JSON.stringify(text), {title: "Alert"})
      console.log(text); 
    }
    let entry = new LogEntry(typeof text === "string" ? text : JSON.stringify(text), "mail")
    this.mail?.rel(entry, "log")
  }

  /*
   * attachments: {name: 'test.csv', contentType: 'text/csv', contentBytes: 'SGVsbG8gV29ybGQh'}
  */
  async send({to, subject, body, bodyType, attachments}) {
    let setup = Setup.lookup()
    let signature = setup.signatureHTML ? bodyType == "html" ? `<br>${setup.signatureHTML}` 
                                                             : "\n" + setup.signatureBody 
                                        : "";

    if(attachments){
      for(let a of attachments){
        a['@odata.type'] = '#microsoft.graph.fileAttachment';
        if(!a.contentType)
          a.contentType = 'application/octet-stream';
      }
    }

    try{
      let result = await this.callAPI(`${setup.from ? `users/${setup.from}` : "me"}/sendMail`, "post", {
        "message": {
          "subject": subject || "No subject",
          "body": {
            "contentType": bodyType || "Text",
            "content": (body || "<empty mail>") + signature
          },
          "toRecipients": [
            {
              "emailAddress": {
                "address": to
              }
            }
          ],
          attachments
        }
      })
      if(!result.success) {
        this.log(result.error, "error")
        return false;
      }
    } catch(err){
      this.log(err, "error")
      return false;
    }
    return true;
  }

  async callAPI(path, method = "get", body, returnRawResponse = false) {
    let defaultAccount = Setup.lookup().defaultAccount
    if(!defaultAccount) return {success: false, error: "No default account defined in setup"};
    if(defaultAccount.expires <= getTimestamp()) {
      this.log("Access token has expired. Trying to refresh it using refresh token...")
      let refreshTokenError = await this.refreshToken(defaultAccount)
      if(refreshTokenError) return {success: false, error: refreshTokenError};
      this.log("Access token refreshed")
    }
    let token = defaultAccount.accessToken
    if(!token) return {success: false, error: "Could not get token"};
    let url = `https://graph.microsoft.com/v1.0/${path}`;
    let response = await fetch(url, {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": method == "get" ? undefined : method == "patch" ? "application/json-patch+json" : "application/json"
      }
    })

    if(response.status == 401){
      let refreshTokenError = await this.refreshToken(defaultAccount)
      if(refreshTokenError) return {success: false, error: refreshTokenError};
      return this.callAPI(path, method, body, returnRawResponse, false)
    }

    if(returnRawResponse)
      return {success: response.status >= 200 && response.status < 300, response}
    if(response.headers.get("content-type")?.startsWith("application/json"))
      return {success: response.status >= 200 && response.status < 300, response: await response.json()}
    return {success: response.status >= 200 && response.status < 300, response: null};
  }

  getAuthLink(){
    let state = ''
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${Setup.lookup().clientId}&response_type=code&redirect_uri=${this.getRedirectUrl()}&response_mode=query&scope=${MailSender.scope}&state=${state}`
  }

  getRedirectUrl(){
    return encodeURIComponent(`${global.sitecore.apiURL}/mail/auth/redirect`)
  }
  
  async login(code) {
    let clientId = Setup.lookup().clientId;
    if (!clientId)
      return null;

    this.log(`Client id: ${clientId}`);
    let res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        // Note offline_access: necessary for getting refresh_token
        body: `client_id=${clientId}&scope=${MailSender.scope}&code=${encodeURIComponent(code)}&redirect_uri=${this.getRedirectUrl()}&grant_type=authorization_code`
      })
    res = await res.json();
    this.log(JSON.stringify(res), "info")

    if (res.error) {
      this.log("Got error logging user in. Please re-auth.", "error")
      this.log(res, "error")
      return;
    }

    let msUserRemote = await (await fetch("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${res.access_token}` } })).json()

    if (!msUserRemote){
      this.log("Did not get any info back from MS when asking from info", "error")
      return null;
    }

    if (msUserRemote.error) {
      this.log("Got error asking for user info", "error")
      console.log(msUserRemote.error)
      return;
    }

    let email = msUserRemote.userPrincipalName
    let name = msUserRemote.displayName
    let id = msUserRemote.id

    let account = MailAccount.lookup(id) || new MailAccount("ms", id, {email, name})
    account.accessToken = res.access_token
    account.refreshToken = res.refresh_token
    account.expires = getTimestamp(res.expires_in*1000)
    account.lastTokenRefreshStatus = "success"

    let setup = Setup.lookup()
    setup.rel(account, "account", true)
    return account
  }
  
  async refreshToken(account) {
    if (!Setup.lookup().clientId)
      return null;

    let res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        // Note offline_access: necessary for getting refresh_token
        body: `client_id=${Setup.lookup().clientId}&scope=${MailSender.scope}&refresh_token=${encodeURIComponent(account.refreshToken)}&redirect_uri=${this.getRedirectUrl()}&grant_type=refresh_token`
      })
    res = await res.json();
    if (res.error) {
      account.lastTokenRefreshStatus = "fail"
      return `Could not send refresh access token. Please re-auth. Res: ${JSON.stringify(res)}`
    }

    let msUserRemote = await (await fetch("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${res.access_token}` } })).json()
    if (!msUserRemote) {
      account.lastTokenRefreshStatus = "fail"
      return `Did not get any info back from MS when asking from info`
    }
    if (msUserRemote.error) {
      account.lastTokenRefreshStatus = "fail"
      return `Got error asking for user info: ${msUserRemote.error}`
    }

    account.accessToken = res.access_token
    account.refreshToken = res.refresh_token
    account.expires = getTimestamp(res.expires_in*1000)
    account.lastTokenRefreshStatus = "success"
    return null;
  }
}
