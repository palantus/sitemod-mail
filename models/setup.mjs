import Entity, { query } from "entitystorage";
import MailAccount from "./account.mjs";

export default class Setup extends Entity{
  initNew(){
    this.tag("mailsetup")
  }

  static lookup(){
    return query.type(Setup).tag("mailsetup").first || new Setup()
  }

  get defaultAccount(){
    return MailAccount.from(this.related.account) || null
  }

  tokenStatus(){
    let setup = Setup.lookup()
    if (!setup.clientId) return {status: "setup", error: "Missing clientId"};
    let defaultAccount = setup.defaultAccount
    if(!defaultAccount) return {status: "setup", error: "Missing account"};
    let token = defaultAccount.accessToken
    if(!token) return {status: "setup", error: "Missing token"}
    return {
      status: defaultAccount.lastTokenRefreshStatus == "fail" ? "fail" : defaultAccount.lastTokenRefreshStatus == "success" ? "success" : "unknown",
      error: defaultAccount.lastTokenRefreshStatus == "success" ? null : defaultAccount.lastTokenRefreshStatus == "fail" ? "Failed last refresh of token" : "No status"
    }
  }

  toObj(){
    return {
      clientId: this.clientId || null,
      from: this.from || null,
      defaultAccount: this.defaultAccount?.toObj() || null,
      signatureBody: this.signatureBody || null
    }
  }
}