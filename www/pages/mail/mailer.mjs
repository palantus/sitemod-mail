const elementName = 'mailer-page'

import api from "../../system/api.mjs"
import "../../components/field-edit.mjs"
import "../../components/field-list.mjs"
import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"
import "../../components/richtext.mjs"
import "../../components/list-inline.mjs"
import {on, off} from "../../system/events.mjs"
import {goto, stylesheets} from "../../system/core.mjs"
import { alertDialog, promptDialog } from "../../components/dialog.mjs"
import {userPermissions} from "../../system/user.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{
        padding: 10px;
        position: relative;
    }
    .group input{
      width: 350px;
    }
    field-list{
      width: 600px;
    }
    #rec-count{
      color: var(--link);
      cursor: pointer;
    }
    .hidden{display: none;}
  </style>  

  <action-bar>
      <action-bar-item id="history-btn" class="hidden">History</action-bar-item>
  </action-bar>

  <div id="container">

    <h1>Mailer</h1>

    <h2>Recipient filters</h2>
    <div class="section">
      <field-list labels-pct="30">
        <field-edit type="select" label="Role" id="role" lookup="role"></field-edit>
        <list-inline-component label="Multiple roles" id="role-list" wrap></list-inline-component>
        <field-edit type="select" label="Permission" id="permission" lookup="permission"></field-edit>
        <field-edit type="select" label="User" id="user" lookup="user"></field-edit>
      </field-list>
      <div>Recipient count: <span id="rec-count">0</span></div>
    </div>
    <br>

    <h2>E-mail content</h2>
    <div class="section">
      <field-list labels-pct="30">
        <field-edit type="text" label="Subject" id="subject"></field-edit>
      </field-list>
      <br>
      <richtext-component id="body-editor" noclose nosave></richtext-component>
    </div>

    <button class="styled" id="send">Send!</button>
  </div>
`;

class Element extends HTMLElement {
  selectedRoleList = []
  setupDone = false;

  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global];
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    this.send = this.send.bind(this);
    this.showRecipients = this.showRecipients.bind(this);

    this.shadowRoot.getElementById("history-btn").addEventListener("click", () => goto("/mail/history"))
    this.shadowRoot.getElementById("rec-count").addEventListener("click", () => this.showRecipients());

    this.shadowRoot.getElementById("role").addEventListener("value-changed", this.refreshData)
    this.shadowRoot.getElementById("user").addEventListener("value-changed", this.refreshData)
    this.shadowRoot.getElementById("permission").addEventListener("value-changed", this.refreshData)

    this.shadowRoot.getElementById("send").addEventListener("click", this.send)

    userPermissions().then(permissions => {
      if(permissions.includes("mail.setup")){
        this.shadowRoot.getElementById("history-btn").classList.remove("hidden")
      }

      //Hide actionbar if there aren't any buttons visible
      this.shadowRoot.querySelector("action-bar").classList.toggle("hidden", !!!this.shadowRoot.querySelector("action-bar action-bar-item:not(.hidden)"))
    })
  }

  async refreshData(){
    this.shadowRoot.getElementById("rec-count").innerText = await this.getCurCount()

    if(!this.setupDone){
      this.shadowRoot.getElementById("role-list").setup({
        getData: async () => this.selectedRoleList,
        toHTML: i => `<span title="${i}">${i}</span>`,
        add: async () => {
          let role = await promptDialog("Enter role:", "", {lookup: "role", type: "select"})
          if(!role) return;
          this.selectedRoleList.push(role)
          this.refreshData();
        },
        remove: async role => {
          this.selectedRoleList = this.selectedRoleList.filter(r => r != role)
          this.refreshData();
        }
      })
      this.setupDone = true;
    }
  }

  async send(){
    if((await this.getCurCount()) < 1) return alertDialog("No users in filter")

    this.shadowRoot.getElementById("send").toggleAttribute("disabled", true)
    await api.post("mail/send", {
      role: this.shadowRoot.getElementById("role").getValue(),
      roles: this.selectedRoleList,
      permission: this.shadowRoot.getElementById("permission").getValue(),
      user: this.shadowRoot.getElementById("user").getValue(),
      subject: this.shadowRoot.getElementById("subject").getValue(),
      body: this.shadowRoot.getElementById("body-editor").value(),
    })

    alertDialog("Mail sent!", {title: "Success"})
    this.shadowRoot.getElementById("send").toggleAttribute("disabled", false)
  }

  async getCurCount(){
    return (await this.getRecipients()).length;
  }
  
  async getRecipients(){
    return await api.post('mail/recipients', {
      role: this.shadowRoot.getElementById("role").getValue(),
      roles: this.selectedRoleList,
      permission: this.shadowRoot.getElementById("permission").getValue(),
      user: this.shadowRoot.getElementById("user").getValue(),
    })
  }

  async showRecipients(){
    let recipients = await this.getRecipients();
    alertDialog(recipients.sort((a,b) => a.name < b.name ? -1 : 1).map(r => `<span title="${r.id}, ${r.email||"N/A"}">${r.name}</span>`).join("<br>"), {title: "Recipients"});
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
