class Tools {
  static mediaQuery(string) {
    return window.matchMedia(string).matches
  }

  static makeSticky(selectorObserved, selectorSticky, cb) {
    document.addEventListener('scroll', () => {
      const sticky = document.querySelector(selectorSticky);
      const observed = document.querySelector(selectorObserved);

      const stickyDisplayPosition = observed.offsetHeight;
      let scroll = window.scrollY;

      if (scroll > stickyDisplayPosition) {
        sticky.classList.add('sticky');
      } else {
        sticky.classList.remove('sticky');
        if (cb) cb()
      }
    });
  }

  static toggle({ control, target }) {
    const trigger = document.querySelector(control)
    const targetEl = document.querySelector(target)

    if (!trigger && targetEl) {
      if (targetEl.getAttribute('open')) targetEl.removeAttribute('open', null)
    }

    trigger && trigger.addEventListener('click', () => {
      if (targetEl && !targetEl.getAttribute('open')) targetEl.setAttribute('open', null)
    })
  }
}