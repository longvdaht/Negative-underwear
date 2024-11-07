class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.content = this.mainDetailsToggle.querySelector('summary').nextElementSibling;

    this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

class HeaderMenu extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelectorAll('.item-menu-dropdown');
    this.header = document.querySelector('.header-wrapper');
    this.mainDetailsToggle.forEach(item => item.addEventListener('mouseover', this.onHover.bind(this)));
    this.mainDetailsToggle.forEach(item => item.addEventListener('mouseleave',this.onFocusOut.bind(this)));
  }

  onHover() {
    this.classList.add('item-hover');
  }
  onFocusOut() {
    setTimeout(() => {
      if (this.classList.contains('item-hover')) this.classList.remove('item-hover');
    });
  }
}

customElements.define('header-menu', HeaderMenu);
