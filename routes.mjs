routes.push(...[
  {path: "/mail/setup",           page: "/pages/mail/setup.mjs"},
  {path: "/mail/send",            page: "/pages/mail/mailer.mjs"},
  {path: "/mail/history",         page: "/pages/mail/history.mjs"},
  {path: "/password-reset",       page: "/pages/mail/password-reset.mjs", publicAccess: true},
])