class FibroidFixerPage extends HTMLElement {
  connectedCallback() {
    this.innerHTML = '<div style="padding:48px;background:#F5C84C;color:#15364A;font:700 28px sans-serif;text-align:center">Test OK — Wix is loading the file</div>';
  }
}
if (!customElements.get('fibroid-fixer-page')) customElements.define('fibroid-fixer-page', FibroidFixerPage);
