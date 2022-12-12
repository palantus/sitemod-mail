const elementName = 'mailer-page'

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
    .group input{
      width: 350px;
    }
    field-list{
      width: 600px;
    }
    .hidden{display: none;}
  </style>  

  <div id="container">

    <h1>Mailer</h1>

    <h2>Recipient filters</h2>
    <div class="section">
      <field-list labels-pct="30">
        <field-edit type="select" label="Role" id="role" lookup="role"></field-edit>
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
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    this.send = this.send.bind(this);
    
    this.shadowRoot.getElementById("role").addEventListener("value-changed", this.refreshData)
    this.shadowRoot.getElementById("user").addEventListener("value-changed", this.refreshData)
    this.shadowRoot.getElementById("permission").addEventListener("value-changed", this.refreshData)

    this.shadowRoot.getElementById("send").addEventListener("click", this.send)
  }

  async refreshData(){
    let {count} = await api.post('mail/recipient-count', {
      role: this.shadowRoot.getElementById("role").getValue(),
      permission: this.shadowRoot.getElementById("permission").getValue(),
      user: this.shadowRoot.getElementById("user").getValue(),
    })
    this.shadowRoot.getElementById("rec-count").innerText = count
  }

  async send(){
    await api.post("mail/send", {
      role: this.shadowRoot.getElementById("role").getValue(),
      permission: this.shadowRoot.getElementById("permission").getValue(),
      user: this.shadowRoot.getElementById("user").getValue(),
      subject: this.shadowRoot.getElementById("subject").getValue(),
      body: this.shadowRoot.getElementById("body-editor").value(),
    })
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