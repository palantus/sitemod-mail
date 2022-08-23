const elementName = 'mail-setup-page'

import api from "/system/api.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import "/components/richtext.mjs"
import {getUser} from "/system/user.mjs"
import {on, off} from "/system/events.mjs"
import { promptDialog, confirmDialog } from "/components/dialog.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
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
    <button id="send-test">Send test email</button>
    <button id="auth">Authorize / switch account</button>
    <br>
    <br>

    <h3>Mail signature</h3>
    <richtext-component id="signature-editor" noclose></richtext-component>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    this.sendTest = this.sendTest.bind(this)
    this.auth = this.auth.bind(this)

    this.shadowRoot.getElementById("send-test").addEventListener("click", this.sendTest)
    this.shadowRoot.getElementById("auth").addEventListener("click", this.auth)
    this.shadowRoot.getElementById("signature-editor").addEventListener("save", ({detail: {text}}) => api.patch("mail/setup", {signatureBody: text}))
    
    this.refreshData();
  }

  async refreshData(){

    let setup = await api.get("mail/setup")

    this.shadowRoot.getElementById("clientId").setAttribute("value", setup.clientId||"")
    this.shadowRoot.getElementById("from").setAttribute("value", setup.from||"")

    this.shadowRoot.getElementById("send-test").toggleAttribute("disabled", !setup.defaultAccount)

    if(setup.defaultAccount){
      this.shadowRoot.getElementById("status").innerHTML = `Signed in as ${setup.defaultAccount.email} (${setup.defaultAccount.name})`
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