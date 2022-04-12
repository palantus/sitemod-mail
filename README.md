# Mail module for SiteCore

This module adds support for sending mails using a Microsoft account (Outlook).

## Setup

To make it work, you need a Client Id from a App Registration in Azure.

The app registration needs a redirect URL, which is:
`MYINSTANCEAPIURL/mail/auth/redirect` (eg. `https://mysite.com/api/mail/auth/redirect`)

Additionally, the App Registration needs the following permissions defined:
- User.Read
- Mail.Read (Microsoft Graph)
- Mail.Send (Microsoft Graph)

## Status:

Currently, it only adds a setup page and code to support other mods that needs to be able to send mails. It is planned for the near future, that users will be able to setup mail notifications and maybe be able to read mails.