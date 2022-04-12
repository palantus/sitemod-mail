import Permission from "../../models/permission.mjs"
import Role from "../../models/role.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("admin").addPermission(["mail.setup"], true)

  return {
  }
}