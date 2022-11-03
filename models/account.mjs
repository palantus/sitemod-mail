import Entity, { query } from "entitystorage";

export default class MailAccount extends Entity{
  initNew(type, id, details){
    this.tag("mailaccount")
    this.type = type
    this.id = id
    if(typeof details === "object")
      Object.assign(this, details)
  }

  static lookup(id){
    if(!id) return null;
    return query.type(MailAccount).tag("mailaccount").prop("id", id).first
  }

  static all(){
    return query.type(MailAccount).tag("mailaccount").all
  }

  toObj(){
    return {
      email: this.email,
      name: this.name
    }
  }
}