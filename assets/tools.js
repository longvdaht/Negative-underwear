class Tools {
  static mediaQuery(string) {
    return window.matchMedia(string).matches
  }

  static makeSticky(selectorObserved, selectorSticky, cb) {
    document.addEventListener('scroll', () => {
      const sticky = document.querySelector(selectorSticky);
      const observed = document.querySelector(selectorObserved);

      let stickyDisplayPosition = observed.offsetHeight;

      const matchingSetSection = document.querySelector('.js-product .matching-set.js-matching-set');
      const accordionDescription = document.querySelector('.js-product .product-single__description');

      stickyDisplayPosition = stickyDisplayPosition - (matchingSetSection ? matchingSetSection.offsetHeight : 0) - (accordionDescription ? accordionDescription.offsetHeight : 0)
      
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
      if (targetEl && !targetEl.getAttribute('open')) {
        targetEl.setAttribute('open', null);
        
        const atcBtn = document.querySelector('.js-sticky-add-to-cart .AddToCart');
        if(atcBtn) {
          atcBtn.setAttribute('disabled', 'disabled');
          atcBtn.querySelector('span').innerHTML = 'Select Size';
          
        }

        const variants = document.querySelectorAll('.js-sticky-add-to-cart .pdp-input-option');
        variants.forEach(variant => {
          variant.removeAttribute('data-active')
        })
      }
    })
  }
}