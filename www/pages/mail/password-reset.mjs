const elementName = 'mail-password-reset-page'

import api from "/system/api.mjs"
import {goto, state, pushStateQuery} from "/system/core.mjs"
import {getUser} from "/system/user.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
        padding: 10px;
        position: relative;
    }
    #missing-key-info{color: red;}
    .hidden{display: none;}
  </style>  

  <div id="container">
    <h1>Password reset</h1>

    <p id="missing-key-info" class="hidden">
      Invalid link for password reset
    </p>
    <div id="reset-container">
      <p>Hi <span id="user-name"></span></p>
      <p>
        This will reset your password. 
        Press the following button to confirm and to get a new password.
      </p>
      <button class="styled" id="confirm">Confirm reset</button>
    </div>
    <div id="success-container" class="hidden">
      <p>
        Password reset was successful!<br>
        Your new password has been mailed to you.
      </p>
      <button class="styled" id="continue-btn">Log in now</button>
    </div>
    <div id="failed-container" class="hidden">
      <p>Password reset failed! Try again with a new link.</p>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.reset = this.reset.bind(this)

    this.resetKey = state().query.resetKey
    pushStateQuery({})

    this.shadowRoot.getElementById("missing-key-info").classList.toggle("hidden", !!this.resetKey)
    this.shadowRoot.getElementById("reset-container").classList.toggle("hidden", !this.resetKey)

    this.shadowRoot.getElementById("confirm").addEventListener("click", this.reset)
    this.shadowRoot.getElementById("continue-btn").addEventListener("click", () => {
      window.location = "/login"
    })

    getUser().then(user => {
      this.shadowRoot.getElementById("user-name").innerText = user.name
    })
  }

  async reset(){
    try{
      let res = await api.post(`user/${(await getUser()).id}/reset-password`, {resetKey: this.resetKey})
      if(res?.success === true){
        this.shadowRoot.getElementById("success-container").classList.toggle("hidden", false)
        this.shadowRoot.getElementById("reset-container").classList.toggle("hidden", true)
      } else {
        this.shadowRoot.getElementById("failed-container").classList.toggle("hidden", false)
        this.shadowRoot.getElementById("reset-container").classList.toggle("hidden", true)
      }
    } catch(err){
      console.log(err)
      this.shadowRoot.getElementById("failed-container").classList.toggle("hidden", false)
      this.shadowRoot.getElementById("reset-container").classList.toggle("hidden", true)
    }
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}