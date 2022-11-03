import fetch from 'node-fetch'
import Setup from '../models/setup.mjs'
import MailAccount from '../models/account.mjs';
import User from '../../../models/user.mjs';
import LogEntry from "../../../models/logentry.mjs"

// SEE https://docs.microsoft.com/en-us/graph/auth-v2-user?view=graph-rest-1.0

export default class MailSender {
  static scope = "offline_access%20user.read%20mail.read%20mail.send%20mail.send.shared"

  constructor(logger){
    this.logger = logger || ((text, type) => {
      console.log(text); 
      if(type == "error") User.lookupAdmin()?.notify("mail", typeof text === "string" ? text : JSON.stringify(text), {title: "Alert"})
      else new LogEntry(typeof text === "string" ? text : JSON.stringify(text), "mail")
    })
  }

  async send({to, subject, body, bodyType}) {
    let setup = Setup.lookup()
    let signature = setup.signatureHTML ? bodyType == "html" ? `<br>${setup.signatureHTML}` 
                                                             : "\n" + setup.signatureBody 
                                        : ""
    let response = await this.callAPI(`${setup.from ? `users/${setup.from}` : "me"}/sendMail`, "post", {
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
        ]
      }
    })
    if(response) {
      this.logger(response, "error")
    }
    return response
  }

  async callAPI(path, method = "get", body, returnRawResponse = false, refreshTokenIfNecessary = true) {
    let defaultAccount = Setup.lookup().defaultAccount
    if(!defaultAccount) return {error: "No default account defined in setup"};
    let token = defaultAccount.accessToken
    if(!token) return "Could not get token";
    let url = `https://graph.microsoft.com/v1.0/${path}`;
    let response = await fetch(url, {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": method == "get" ? undefined : method == "patch" ? "application/json-patch+json" : "application/json"
      }
    })

    if(response.status == 401 && refreshTokenIfNecessary){
      this.refreshToken(defaultAccount)
      return this.callAPI(path, method, body, returnRawResponse, false)
    }

    if(returnRawResponse)
      return response
    if(response.headers.get("content-type")?.startsWith("application/json"))
      return await response.json()
    return null;
  }

  getAuthLink(){
    let state = ''
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${Setup.lookup().clientId}&response_type=code&redirect_uri=${this.getRedirectUrl()}&response_mode=query&scope=${MailSender.scope}&state=${state}`
  }

  getRedirectUrl(){
    return encodeURIComponent(`${global.sitecore.apiURL}/mail/auth/redirect`)
  }
  
  async login(code, redirect) {
    if (!Setup.lookup().clientId)
      return null;

    let res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        // Note offline_access: necessary for getting refresh_token
        body: `client_id=${Setup.lookup().clientId}&scope=${MailSender.scope}&code=${encodeURIComponent(code)}&redirect_uri=${this.getRedirectUrl()}&grant_type=authorization_code`
      })
    res = await res.json();
    this.logger(response, "info")

    if (res.error) {
      this.logger("Got error logging user in. Please re-auth.", "error")
      this.logger(res, "error")
      return;
    }

    let msUserRemote = await (await fetch("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${res.access_token}` } })).json()

    if (!msUserRemote){
      this.logger("Did not get any info back from MS when asking from info", "error")
      return null;
    }

    if (msUserRemote.error) {
      this.logger("Got error asking for user info", "error")
      console.log(msUserRemote.error)
      return;
    }

    let email = msUserRemote.userPrincipalName
    let name = msUserRemote.displayName
    let id = msUserRemote.id

    let account = new MailAccount("ms", {email, name, id, accessToken: res.access_token, refreshToken: res.refresh_token})
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
    //console.log(res)

    if (res.error) {
      this.logger(`Could not send email due to authentication issues. Please re-auth.`, "error")
      this.logger(JSON.stringify(res), "error")
      console.log(res)
      return;
    }

    let msUserRemote = await (await fetch("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${res.access_token}` } })).json()

    if (!msUserRemote){
      this.logger(`Did not get any info back from MS when asking from info`, "error")
      return null;
    }

    if (msUserRemote.error) {
      this.logger(`Got error asking for user info`, "error")
      console.log(msUserRemote.error)
      return;
    }

    account.accessToken = res.access_token
    account.refreshToken = res.refresh_token
  }
}