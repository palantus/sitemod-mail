import setup from "./routes/setup.mjs"
import mail from "./routes/mail.mjs"

export default (app) => {
  
  setup(app)
  mail(app)
	
  return app
}