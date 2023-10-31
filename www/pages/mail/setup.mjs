const elementName = 'mail-setup-page'

import api from "../../system/api.mjs"
import "../../components/field-edit.mjs"
import "../../components/field-list.mjs"
import "../../components/richtext.mjs"
import {on, off} from "../../system/events.mjs"
import { promptDialog, confirmDialog, alertDialog } from "../../components/dialog.mjs"
import { stylesheets } from "../../system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{
        padding: 10px;
        position: relative;
    }
    div.group:not(:first-child){
      margin-top: 10px;
    }
    .group input{
      width: 350px;
    }
    field-list{
      width: 600px;
    }
    .hidden{display: none;}
  </style>  

  <div id="container">

    <h1>Mail setup</h1>
    <field-list labels-pct="30">
      <field-edit type="text" label="Client Id" id="clientId" placeholder="Get from App registrations in Azure"></field-edit>
      <field-edit type="text" label="From address/account" id="from" placeholder="Optional. Defaults to 'me'."></field-edit>
    </field-list>
    <br>

    <h3>Status</h3>
    <div id="status"></div>
    <button id="send-test" class="styled">Send test email</button>
    <button id="resendfailed" class="styled" title="Attempt to re-send failed e-mails">Re-send failed</button>
    <button id="auth" class="styled">Authorize</button>
    <br>
    <br>

    <h3>Mail signature</h3>
    <richtext-component id="signature-editor" noclose></richtext-component>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global];
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    this.sendTest = this.sendTest.bind(this)
    this.auth = this.auth.bind(this)

    this.shadowRoot.getElementById("send-test").addEventListener("click", this.sendTest)
    this.shadowRoot.getElementById("auth").addEventListener("click", this.auth)
    this.shadowRoot.getElementById("signature-editor").addEventListener("save", ({detail: {text}}) => api.patch("mail/setup", {signatureBody: text}))
    this.shadowRoot.getElementById("resendfailed").addEventListener("click", async () => {
      await api.post("mail/resend-failed")
      alertDialog(`Successfully initiated re-send of failed e-mails. Visit <field-ref ref="/logs?area=mail">Logs</field-ref> to view progress`)
    })
    
    this.refreshData();
  }

  async refreshData(){

    let setup = await api.get("mail/setup")

    this.shadowRoot.getElementById("clientId").setAttribute("value", setup.clientId||"")
    this.shadowRoot.getElementById("from").setAttribute("value", setup.from||"")

    this.shadowRoot.getElementById("send-test").toggleAttribute("disabled", !setup.defaultAccount)

    if(setup.defaultAccount){
      this.shadowRoot.getElementById("status").innerHTML = `Signed in as ${setup.defaultAccount.email} (${setup.defaultAccount.name}). <br>Token status: ${setup.tokenStatus.error||setup.tokenStatus.status}<br><br>`
    } else {
      this.shadowRoot.getElementById("status").innerHTML = `Not signed in. Use Authorize button to do so.`
    }

    this.shadowRoot.getElementById("signature-editor").value(setup.signatureBody||"")

    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `mail/setup`));
  }

  async sendTest(){
    let user = (await api.query("{me{email}}")).me
    let to = await promptDialog("Enter email address to send the email to", user.email||"")
    if(!to) return;
    await api.post("mail/send-test", {to})
  }

  async auth(){
    if(!(await confirmDialog("This will open a new page where you can authorize this site to use your Microsoft account to handle mails on your behalf. Are you sure that you want to continue?"))) return;
    let url = await api.get("mail/authorize-link")
    if(!url) return;
    window.open(url)
    if(!(await confirmDialog("After authorizing, click Ok to refresh status and confirm that everything works again"))) return;
    this.refreshData();
  }

  connectedCallback() {
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}