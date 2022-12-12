routes.push(...[
  {path: "/mail/setup",           page: "/pages/mail/setup.mjs"},
  {path: "/mail/send",            page: "/pages/mail/mailer.mjs"},
  {path: "/password-reset",       page: "/pages/mail/password-reset.mjs", publicAccess: true},
])