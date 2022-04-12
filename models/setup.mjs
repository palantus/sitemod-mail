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

  toObj(){
    return {
      clientId: this.clientId || null,
      from: this.from || null,
      defaultAccount: this.defaultAccount?.toObj() || null
    }
  }
}