import setup from "./routes/setup.mjs"
import mail from "./routes/mail.mjs"
import user from "./routes/user.mjs"

export default (app) => {
  
  setup(app)
  mail(app)
  user(app)
	
  return app
}