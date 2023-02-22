import Role from "../../models/role.mjs"
import { startCheckerService } from "./services/checker.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("admin").addPermission(["mail.setup", "mail.send"], true)

  return {
    checkerService: startCheckerService()
  }
}