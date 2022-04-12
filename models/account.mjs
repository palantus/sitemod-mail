import Entity, { query } from "entitystorage";

export default class MailAccount extends Entity{
  initNew(type, details){
    this.tag("mailaccount")
    this.type = type
    if(typeof details === "object")
      Object.assign(this, details)
  }

  static lookup(id){
    if(!id) return null;
    return query.type(MailAccount).tag("mailaccount").id(id).first
  }

  toObj(){
    return {
      email: this.email,
      name: this.name
    }
  }
}