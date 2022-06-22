routes.push(...[
  {path: "/mail/setup",            page: "/pages/mail/setup.mjs"},
  {path: "/password-reset",        page: "/pages/mail/password-reset.mjs", publicAccess: true},
])