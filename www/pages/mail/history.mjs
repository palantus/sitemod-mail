const elementName = 'mail-history-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import {on, off} from "/system/events.mjs"
import {showDialog } from "/components/dialog.mjs"

const template = document.createElement('template');
template.innerHTML = `

  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
      padding: 10px;
    }
    field-list{
      width: 300px;
    }
    h3{margin-top: 20px;}
    .subheader{text-decoration: underline;}
    .hidden{display: none;}
  </style>
  
  <action-bar>
      <action-bar-item id="refresh-btn">Refresh</action-bar-item>
  </action-bar>

  <div id="container">
    <h2>E-mail history</h2>
    <table class="datalist">
      <thead>
        <tr>
          <th>Id</th>
          <th>Timestamp</th>
          <th>To</th>
          <th>Subject</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="emails">
      </tbody>
    </table>
  </div>

  <dialog-component title="Log" id="log-dialog">
    <table></table>
  </dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this)
    this.tabClick = this.tabClick.bind(this)

    this.shadowRoot.getElementById("refresh-btn").addEventListener("click", this.refreshData)
    this.shadowRoot.getElementById("emails").addEventListener("click", this.tabClick)
  }

  async refreshData(id = this.sprintId){

    let emails = this.emails = await api.get("mail/history")

    this.shadowRoot.getElementById("emails").innerHTML = emails.map(mail => `
      <tr data-id="${mail.id}">
        <td>${mail.id}</td>
        <td>${mail.timestamp}</td>
        <td>${mail.to}</td>
        <td>${mail.subject}</td>
        <td>${mail.status}</td>
        <td><button>Log</button></td>
      </tr>
    
    `).join("")
  }

  async tabClick(e){
    if(e.target.tagName != "BUTTON") return;
    let id = e.target.closest("tr").getAttribute("data-id")

    let dialog = this.shadowRoot.getElementById("log-dialog")

    let log = await api.get(`mail/${id}/log`)
    dialog.querySelector("table").innerHTML = log.map(l => `
      <tr>
        <td>${l.timestamp.substring(0, 19).replace("T", " ")}:</td>
        <td>${l.text}</td>
      </tr>
    `).join("")

    showDialog(dialog)
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