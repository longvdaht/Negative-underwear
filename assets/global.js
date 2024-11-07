function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });

    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', value <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this))
    );
    this.querySelectorAll('button:not(.localization-selector)').forEach((button) =>
      button.addEventListener('click', this.onCloseButtonClick.bind(this))
    );
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 990px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches
          ? addTrapFocus()
          : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add('menu-opening');
    //document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach((details) => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach((submenu) => {
      submenu.classList.remove('submenu-open');
    });
    document.body.classList.remove('menu-opening');
    //document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent) elementToFocus?.setAttribute('aria-expanded', false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement))
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
    this.setAnnouncementHeight();
    this.setCouponHeight();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector('.section-header');
    this.borderOffset =
      this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty(
      '--header-bottom-position',
      `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
    );
    this.header.classList.add('menu-open');
    document.querySelector('html').classList.add('overflow-hidden');
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    window.addEventListener('resize', this.onResize);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add('menu-opening');
    //document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
    this.setCouponHeight();
  }
  setAnnouncementHeight() {
    document.documentElement.style.setProperty('--announcement-bar-height', `-${document.querySelector('.announcement-bar-section').offsetHeight}px`);
  }
  setCouponHeight() {
    const couponHeight = document.querySelector('.bxc.bx-custom');
    if (couponHeight) {
      document.documentElement.style.setProperty('--coupon-bar-height', `${couponHeight.offsetHeight}px`);
    } else {
      document.documentElement.style.setProperty('--coupon-bar-height', `0px`);
    }
  }
  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
    document.querySelector('html').classList.remove('overflow-hidden');
    window.removeEventListener('resize', this.onResize);
  }
  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        '--header-bottom-position',
        `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
      );
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener('click', this.hide.bind(this, false));
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
      if (deferredElement.nodeName == 'VIDEO' && deferredElement.getAttribute('autoplay')) {
        // force autoplay for safari
        deferredElement.play();
      }
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');
    this.dotActive = this.querySelector('button[name="dot"].active');
    
    this.dotButton = this.querySelectorAll('button[name="dot"]')
    this.dotButton?.forEach((dot) => {
      dot.addEventListener('click', this.onDotClick.bind(this));
    })
    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver((entries) => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));
    this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
    this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter((element) => element.clientHeight > 0);
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset = this.sliderItemsToShow[1].offsetTop - this.sliderItemsToShow[0].offsetTop;
    this.slidesPerPage = Math.floor(
      (this.slider.clientHeight - this.sliderItemsToShow[0].offsetTop) / this.sliderItemOffset
    );
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    // Temporarily prevents unneeded updates resulting from variant changes
    // This should be refactored as part of https://github.com/Shopify/dawn/issues/2057
    if (!this.slider || !this.nextButton) return;

    const previousPage = this.currentPage;
    this.currentPage = Math.round(this.slider.scrollTop / this.sliderItemOffset) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if(this.querySelector('.slider-dots')) {
      if(this.querySelector('.slider-dots').innerHTML == false) {
        var dotList = '';
        if(this.totalPages > 0) {
          for( var i =1 ; i <= this.totalPages ; i++) {
            if(i==1){ 
              var active = 'active';
            }
            var dotItem = '<button type="button" aria-label="Dots" name="dot" class="dotslide '+active+'" data-position="'+i+'"></button>'
            dotList += dotItem;
          }
        }
        this.querySelector('.slider-dots').innerHTML += dotList;
        this.dotActive = this.querySelector('button[name="dot"].active');
      
        this.dotButton = this.querySelectorAll('button[name="dot"]');
        this.dotButton.forEach((dot) => {
          dot.addEventListener('click', this.onDotClick.bind(this));
        })
      }
    }





    if (this.currentPage != previousPage) {
      this.dispatchEvent(
        new CustomEvent('slideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: this.sliderItemsToShow[this.currentPage - 1],
          },
        })
      );
    }

    if (this.enableSliderLooping) return;

    if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollTop === 0) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.slider.clientHeight + this.slider.scrollTop - offset;
    return element.offsetTop + element.clientHeight <= lastVisibleSlide && element.offsetTop >= this.slider.scrollTop;
  }
  onDotClick(event) {
    event.preventDefault();
    let number = parseInt(event.currentTarget.getAttribute("data-position"));
    this.dotActive.classList.remove("active");
    this.dotButton?.forEach((dot) => {
      dot.classList.remove("active");
    })
    let currentPosition = parseInt(this.dotActive.getAttribute("data-position"));
    this.dotActive = event.currentTarget;
    event.currentTarget.classList.add("active");
    let slideScrollPosition = this.slider.scrollLeft + this.sliderItems[0].clientWidth * (number - currentPosition);
    this.slider.scrollTo({
      left: slideScrollPosition,
      behavior: 'smooth'
    });

  }
  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition =
      event.currentTarget.name === 'next'
        ? this.slider.scrollTop + step * this.sliderItemOffset
        : this.slider.scrollTop - step * this.sliderItemOffset;
    this.slider.scrollTo({
      top: this.slideScrollPosition,
    });
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.sliderControlLinksArray = Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link'));
    this.sliderControlLinksArray.forEach((link) => link.addEventListener('click', this.linkToSlide.bind(this)));
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    this.setSlideVisibility();


    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    if (this.querySelector('.slideshow__autoplay')) {
      this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
      this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
      this.autoplayButtonIsSetToPlay = true;
      this.play();
    } else {
      this.reducedMotion.matches || this.announcementBarArrowButtonWasClicked || !this.desktopLayout.matches ? this.pause() : this.play();
    }
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) return;

    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition =
        this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }
    this.slider.scrollTo({
      left: this.slideScrollPosition,
    });
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
      this.play();
    } else if (!this.reducedMotion.matches && !this.announcementBarArrowButtonWasClicked && this.desktopLayout.matches) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
        this.play();
      } else if (this.autoplayButtonIsSetToPlay) {
        this.pause();
      }
    } else if (this.querySelector('.announcement-bar-slider').contains(event.target)) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    const slideScrollPosition =
      this.currentPage === this.sliderItems.length
        ? 0
        : this.slider.scrollLeft + this.slider.querySelector('.slideshow__slide').clientWidth;
    this.slider.scrollTo({
      left: slideScrollPosition,
    });
  }

  setSlideVisibility() {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a');
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute('tabindex');
          });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute('tabindex', '-1');
          });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition =
      this.slider.scrollLeft +
      this.sliderFirstItemNode.clientWidth *
        (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition,
    });
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
    this.customSelect();
    document.addEventListener("click", this.closeAllSelect);
    this.addEventListener('change:custom', this.updateSource);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }
  updateSource(event) {
    const target = event.target;
    // console.log(target);
    this.updateOptions();
    this.updateMasterId();
    if (this.currentVariant) {
      fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&view=source`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const sourceID = document.getElementById('pdp_source');
        const sourceIDSource = html.getElementById('pdp_source');
        if (sourceID) {
          sourceID.innerHTML = sourceIDSource.innerHTML;
        }
      })
    }
  }

  customSelect() {
    const $this = this;
    const variantSelectWrapper = this.querySelectorAll('.custom-select');
    variantSelectWrapper.forEach((variantWrapper) => {
      const customSelect = variantWrapper.querySelector('.select-selected');
      if (customSelect) {
        $this.toggleAddButton(true, '', true);
        $this.setChooseSize();

        customSelect.addEventListener("click", function(e) {
          e.stopPropagation();
          $this.closeAllSelect(customSelect);
          this.nextElementSibling.classList.toggle("select-hide");
          this.classList.toggle("select-arrow-active");
        });

        const defaultSelect = variantWrapper.querySelector('select');
        const defaultSelectName = defaultSelect.getAttribute('name');
        const customSelectOptions = variantWrapper.querySelectorAll('.select-items .option-item');

        customSelectOptions.forEach((option) => {
          option.addEventListener("click", function(e) {
            // Remove "selected" class from all other options
            customSelectOptions.forEach((otherOption) => {
              otherOption.classList.remove('selected');
            });
            this.classList.add('selected');

            const optionValue = this.getAttribute('data-value');
            customSelect.innerHTML = optionValue;
            defaultSelect.value = optionValue;

            if (document.querySelector('.select-Size .select-selected').textContent == window.variantStrings.customSelect) return;
            defaultSelect.dispatchEvent(new Event('change', { bubbles: true }));
          });
        });
      }
    });
  }

  closeAllSelect(elmnt) {
    /*a function that will close all select boxes in the document,
    except the current select box:*/
    var x, y, i, xl, yl, arrNo = [];
    x = document.getElementsByClassName("select-items");
    y = document.getElementsByClassName("select-selected");
    xl = x.length;
    yl = y.length;
    for (i = 0; i < yl; i++) {
      if (elmnt == y[i]) {
        arrNo.push(i)
      } else {
        y[i].classList.remove("select-arrow-active");
      }
    }
    for (i = 0; i < xl; i++) {
      if (arrNo.indexOf(i)) {
        x[i].classList.add("select-hide");
      }
    }
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGalleries = document.querySelectorAll(`[id^="MediaGallery-${this.dataset.section}"]`);
    mediaGalleries.forEach((mediaGallery) =>
      mediaGallery.setActiveMedia(`${this.dataset.section}-${this.currentVariant.featured_media.id}`, true)
    );

    const modalContent = document.querySelector(`#ProductModal-${this.dataset.section} .product-media-modal__content`);
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector(`[data-media-id="${this.currentVariant.featured_media.id}"]`);
    modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    var currentVariantId = this.currentVariant.id;
    var quantityChanger = 1;
    var currentVariantTitle = this.currentVariant.title;
    let hasPacks = this.className.includes('has-packs');

    if (currentVariantTitle.indexOf('-Pack') != -1) {
      var tempString = currentVariantTitle.substring(0, currentVariantTitle.indexOf('-Pack'));
      var packSize = tempString.charAt(tempString.length - 1);
      if (hasPacks) {
        quantityChanger = Number(packSize);
      }
    }
    if (quantityChanger > 1) {
      var singleVariantTitle = currentVariantTitle.replace('2-Pack', 'Single').replace('3-Pack', 'Single').replace('5-Pack', 'Single');
      var singleVariantOptions = singleVariantTitle.replace(' / ', '/').replace(' /', '/').replace('/ ', '/').split("/")
      var singleVariant = this.getVariantData().find((variant) => {
        return !variant.options
        .map((option, index) => {
          return singleVariantOptions[index] === option;
        })
        .includes(false);
      });
      if (singleVariant) {
        currentVariantId = singleVariant.id;
      }
      
    }
    const inputQuantitySelector = this.querySelectorAll('[name="Quantity"]');

    if (this.currentVariant.title.indexOf('Single') != -1 && this.currentVariant.inventory_quantity < 2) {
      if (!inputQuantitySelector) return;
      inputQuantitySelector.forEach((inputQuantity) => {
        if (inputQuantity.getAttribute('value') == 'Single') return;
        inputQuantity.classList.add('disabled');
      });
    }

    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = currentVariantId;
      input.dispatchEvent(new Event('change', { bubbles: true }));

      const quantity = productForm.querySelector('input[name="quantity"]');
      quantity.value = quantityChanger;
      quantity.dispatchEvent(new Event('change', { bubbles: true }));

      if (quantityChanger > 1) {
        productForm.classList.add('multi');
      } else {
        productForm.classList.remove('multi');
      }

      if (!singleVariant) return;
      if (singleVariant.available && singleVariant.inventory_quantity > 2) {
        productForm.classList.remove('multi-soldout');
      } else {
        productForm.classList.add('multi-soldout');

        if (!inputQuantitySelector) return;
        inputQuantitySelector.forEach((inputQuantity) => {
          if (inputQuantity.getAttribute('value') == 'Single') return;
          inputQuantity.classList.add('disabled');
          console.log(inputQuantity)
        });
      }
    });
  }

   updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(':checked').value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll('.product-form__input')];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')];
      const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter((variant) => variant.available && variant[`option${index}`] === previousOptionSelected)
        .map((variantOption) => variantOption[`option${index + 1}`]);

      const OptionInputsValuewithsoldOut = selectedOptionOneVariants
        .filter((variant) => variant[`option${index}`] === previousOptionSelected)
        .map((variantOption) => variantOption[`option${index + 1}`]);
      
      this.setInputAvailability(optionInputs, availableOptionInputsValue, OptionInputsValuewithsoldOut);
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions, OptionInputsValuewithsoldOut) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.innerText = input.getAttribute('value');
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace('[value]', input.getAttribute('value'));
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;

    fetch(
      `${this.dataset.url}?variant=${requestedVariantId}&section_id=${
        this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section
      }`
    )
      .then((response) => response.text())
      .then((responseText) => {
        // prevent unnecessary ui changes from abandoned selections
        if (this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const sourceID = document.getElementById('pdp_source');
        const source = html.getElementById(
          `price-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const skuSource = html.getElementById(
          `Sku-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const sourceIDSource = html.getElementById('pdp_source');

        const skuDestination = document.getElementById(`Sku-${this.dataset.section}`);
        const inventorySource = html.getElementById(
          `Inventory-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const inventoryDestination = document.getElementById(`Inventory-${this.dataset.section}`);

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (inventorySource && inventoryDestination) inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle('visibility-hidden', skuSource.classList.contains('visibility-hidden'));
        }
        if (sourceID) {
          sourceID.innerHTML = sourceIDSource.innerHTML;
        }

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove('visibility-hidden');

        if (inventoryDestination)
          inventoryDestination.classList.toggle('visibility-hidden', inventorySource.innerText === '');

        const addButtonUpdated = html.getElementById(`ProductSubmitButton-${sectionId}`);
        const addButtonDestination = document.getElementById(`ProductSubmitButton-${sectionId}`);
        if(addButtonUpdated && addButtonDestination) {
          addButtonDestination.innerHTML = addButtonUpdated.innerHTML;
        }

        this.toggleAddButton(
          addButtonUpdated ? addButtonUpdated.hasAttribute('disabled') || document.getElementById(`product-form-${sectionId}`).classList.contains('multi-soldout') : true,
          window.variantStrings.soldOut
        );

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId,
            html,
            variant: this.currentVariant,
          },
        });
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;

    const addButton = productForm.querySelector('[name="add"]');
    if (!addButton) return;

    const addButtonText = productForm.querySelector('[name="add"] > span');
    const price = productForm.querySelector('[name="add"] > span')
    const afterPayText = productForm.querySelector('.afterpay-paragraph');

    const sectionElement = document.getElementById(`MainProduct-${this.dataset.section}`);
    const promoText = sectionElement.querySelector('.promo-text');

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (!addButton.classList.contains('select-size-load')) {
        if (text) addButtonText.textContent = text;
      }
      
      if (afterPayText) {
        afterPayText.style.display = 'none';
      }
      if (promoText) {
        promoText.style.display = 'none';
      }

    } else {
      if (!addButton.classList.contains('select-size-load')) {
        addButtonText.textContent = window.variantStrings.addToCart;
        addButton.removeAttribute('disabled');
      }

      if (afterPayText) {
        afterPayText.style.display = '';
      }
      if (promoText) {
        promoText.style.display = '';
      }
    }
    addButton.classList.remove('select-first');

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(`Inventory-${this.dataset.section}`);
    const sku = document.getElementById(`Sku-${this.dataset.section}`);

    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add('visibility-hidden');
    if (inventory) inventory.classList.add('visibility-hidden');
    if (sku) sku.classList.add('visibility-hidden');
  }

  setChooseSize() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const inventory = document.getElementById(`Inventory-${this.dataset.section}`);
    const sku = document.getElementById(`Sku-${this.dataset.section}`);

    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.chooseASize;
    addButton.classList.add('select-first');
    if (inventory) inventory.classList.add('visibility-hidden');
    if (sku) sku.classList.add('visibility-hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  connectedCallback() {
    this.soldOutStickyButton()
  }

   setInputAvailability(listOfOptions, listOfAvailableOptions, OptionInputsValuewithsoldOut) {
    listOfOptions.forEach((input) => {
      if (OptionInputsValuewithsoldOut.includes(input.getAttribute('value'))) {
        input.classList.remove('hide');
      } else {
        input.classList.add('hide');
      }
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.classList.remove('disabled');
      } else {
        input.classList.add('disabled');
      }
    });

    this.soldOutStickyButton()
  }

  soldOutStickyButton(inputs = [...document.querySelectorAll('.js-product-page variant-radios fieldset input')] ) {
    const fieldset = inputs

    if (!fieldset.length) return false

    const disabled = fieldset.filter(item => item.classList.contains('disabled'))
    const redirectSoldout = document.querySelector(`.js-sticky-add-to-cart .main-product-redirect-js`)
    const addToCart = document.querySelector(`.js-sticky-add-to-cart .sticky-add-to-cart__open-variants`)
    console.log({disabled})
    if (!redirectSoldout || !addToCart) return

    if (disabled.length) {
      redirectSoldout.removeAttribute('hidden', '')
      addToCart.setAttribute('hidden', '')
    } else {
      redirectSoldout.setAttribute('hidden', '')
      addToCart.removeAttribute('hidden', '')
      const fieldsetSticky = document.querySelectorAll(`.js-sticky-add-to-cart .variant-radios fieldset input`)

      if (!fieldsetSticky.length) return
      
      fieldsetSticky.forEach(item => {
        item.classList.remove('disabled')
      })

      const buttonSubmit = document.querySelector(`button.AddToCart`)
      const span = buttonSubmit.querySelector(`span:first-of-type`)

      if (buttonSubmit.classList.contains('disabled')) {
        span.textContent = 'Add To Cart'
        buttonSubmit.classList.remove('disabled')
      }
    }

  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio, i, array) => {

        if (radio.checked) {
          const inputSticky = document.querySelector(`.js-sticky-add-to-cart [name="Quantity"][value="${radio.value}"]`)
          const variantStickyfieldset = [...document.querySelectorAll('.js-sticky-add-to-cart .js.product-form__input input[type="hidden"][name="Quantity"]')]
          if (variantStickyfieldset.length) {
            variantStickyfieldset.forEach(item => {
              if (item.hasAttribute('data-active') && item.getAttribute('data-active') === 'true') {
                item.setAttribute('data-active', 'false')
              }
            })
          }

          if (inputSticky) inputSticky.setAttribute('data-active', 'true')
        }
         return radio.checked
      }).value
    });

  }
}

customElements.define('variant-radios', VariantRadios);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);

      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('product-recommendations');

          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }

          if (!this.querySelector('slideshow-component') && this.classList.contains('complementary-products')) {
            this.remove();
          }

          if (html.querySelector('.grid__item')) {
            this.classList.add('product-recommendations--loaded');
          }
        })
        .catch((e) => {
          console.error(e);
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), { rootMargin: '0px 0px 400px 0px' }).observe(this);
  }
}

customElements.define('product-recommendations', ProductRecommendations);
document.addEventListener("DOMContentLoaded", function () {
  $(".show-more a").on("click", function() {
    event.preventDefault();
    var $this = $(this); 
    var $content = $this.parent().prev("div.content");
    var linkText = $this.text().toUpperCase();    

    if (linkText === "+ MORE") {
      linkText = "- less";
      $content.switchClass("hide-content", "show-content", 400);
    } else {
      linkText = "+ more";
      $content.switchClass("show-content", "hide-content", 400);
    }

    $this.text(linkText);
  });
  $( ".menu-drawer__menu-item-dropdown" ).on( "click", function() {
    $(this).toggleClass( "show" );
    $(this).next().toggle( "slow" );
  });
  $(".accordion").accordion({
    active: false,
    collapsible: true,
    heightStyle: "content",
    icons: {
      "header": "plus",
      "activeHeader": "minus"
    }
  });
  // SIZE CHART MODAL
$('.size-here').on('click', function() {
  $('.sizing-modal').addClass('modalopen');
  $('.product-holder').attr('aria-hidden', 'true');
  $('.sizing-modal').attr('aria-hidden', 'false');
//  $('.sizing-modal .closing-icon').focus();



  // add all the elements inside modal which you want to make focusable
  const  focusableElements =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const modal = document.querySelector('#sizing-modal'); // select the modal by its id

  const firstFocusableElement = modal.querySelectorAll(focusableElements)[0]; // get first element to be focused inside modal
  const focusableContent = modal.querySelectorAll(focusableElements);
  const lastFocusableElement = focusableContent[focusableContent.length - 1]; // get last element to be focused inside modal

  function trapFocus(e) {
    //console.log("TRAP THAT FOCUS YO!");
    let isTabPressed = e.key === 'Tab' || e.keyCode === 9;

    if (!isTabPressed) {
    return;
    }

    if (e.shiftKey) { // if shift key pressed for shift + tab combination
    if (document.activeElement === firstFocusableElement) {
      lastFocusableElement.focus(); // add focus for the last focusable element
      e.preventDefault();
    }
    } else { // if tab key is pressed
    if (document.activeElement === lastFocusableElement) { // if focused has reached to last focusable element then focus first focusable element after pressing tab
      firstFocusableElement.focus(); // add focus for the first focusable element
      e.preventDefault();
    }
    }
  }

  document.addEventListener('keydown', trapFocus);

  firstFocusableElement.focus();


  $('.closing-icon').on('click', function() {
    $('.sizing-modal').removeClass('modalopen');
    $('.product-holder').attr('aria-hidden', 'false');
    $('.sizing-modal .closing-icon').blur();
    $('.sizing-modal').attr('aria-hidden', 'true');
    document.removeEventListener('keydown', trapFocus);
  });

  $(document).keyup(function(e) {
    if (e.keyCode === 27) {
      $('.sizing-modal').removeClass('modalopen');
      $('.sizing-modal .closing-icon').blur();
      $('.product-holder').attr('aria-hidden', 'false');
      $('.sizing-modal').attr('aria-hidden', 'true');
      document.removeEventListener('keydown', trapFocus);
    }
  });
});
});

// class StickyFilter extends HTMLElement {
//   constructor() {
//     super();
//   }

//   connectedCallback() {
//     this.header = document.querySelector('.section-header');
//     this.filters = document.querySelector('.filters');
//     this.headerBounds = {};

//     this.currentScrollTop = 0;
//     this.preventReveal = false;

//     this.onScrollHandler = this.onScroll.bind(this);
//     this.hideHeaderOnScrollUp = () => this.preventReveal = true;

//     this.addEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
//     window.addEventListener('scroll', this.onScrollHandler, false);

//     this.createObserver();
//   }

//   disconnectedCallback() {
//     this.removeEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
//     window.removeEventListener('scroll', this.onScrollHandler);
//   }

//   createObserver() {
//     let observer = new IntersectionObserver((entries, observer) => {
//       this.headerBounds = entries[0].intersectionRect;
//       observer.disconnect();
//     });

//     observer.observe(this.header);
//   }

//   onScroll() {
//     const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
//     if (scrollTop > this.currentScrollTop && scrollTop > this.headerBounds.top) {
//       this.filters.classList.add('scrolled-past-filters');
//       if (this.preventHide) return;
//       requestAnimationFrame(this.hide.bind(this));
//     } else if (scrollTop < this.currentScrollTop && scrollTop > this.headerBounds.top) {
//       this.filters.classList.add('scrolled-past-filters');
//       if (!this.preventReveal) {
//         requestAnimationFrame(this.reveal.bind(this));
//       } else {
//         window.clearTimeout(this.isScrolling);

//         this.isScrolling = setTimeout(() => {
//           this.preventReveal = false;
//         }, 66);

//         requestAnimationFrame(this.hide.bind(this));
//       }
//     } else if (scrollTop <= this.headerBounds.top) {
//       this.filters.classList.remove('scrolled-past-filters');
//       requestAnimationFrame(this.reset.bind(this));
//     }

//     this.currentScrollTop = scrollTop;
//     return;
//   }

//   hide() {
//     this.filters.classList.add('shopify-section-filters-hidden', 'shopify-section-filters-sticky');
//     return;
//   }

//   reveal() {
//     this.filters.classList.add('shopify-section-filters-sticky', 'animate');
//     this.filters.classList.remove('shopify-section-filters-hidden');
//     return;
//   }

//   reset() {
//     this.filters.classList.remove('shopify-section-filters-hidden', 'shopify-section-filters-sticky', 'animate');
//     return;
//   }
// }
// customElements.define('sticky-filter', StickyFilter);

$(document).ready(function() {
  $(".filters").sticky({
		wrapperClassName: 'sticky-filter-wrapper',
		topSpacing: 72,
		zIndex: 5
	});
});

/*
 FastClick: polyfill to remove click delays on browsers with touch UIs.

 @version 1.0.3
 @codingstandard ftlabs-jsv2
 @copyright The Financial Times Limited [All Rights Reserved]
 @license MIT License (see LICENSE.txt)
*/
(function(){"use strict";function e(t,r){function s(e,t){return function(){return e.apply(t,arguments)}}var i;r=r||{};this.trackingClick=false;this.trackingClickStart=0;this.targetElement=null;this.touchStartX=0;this.touchStartY=0;this.lastTouchIdentifier=0;this.touchBoundary=r.touchBoundary||10;this.layer=t;this.tapDelay=r.tapDelay||200;this.tapTimeout=r.tapTimeout||700;if(e.notNeeded(t)){return}var o=["onMouse","onClick","onTouchStart","onTouchMove","onTouchEnd","onTouchCancel"];var u=this;for(var a=0,f=o.length;a<f;a++){u[o[a]]=s(u[o[a]],u)}if(n){t.addEventListener("mouseover",this.onMouse,true);t.addEventListener("mousedown",this.onMouse,true);t.addEventListener("mouseup",this.onMouse,true)}t.addEventListener("click",this.onClick,true);t.addEventListener("touchstart",this.onTouchStart,false);t.addEventListener("touchmove",this.onTouchMove,false);t.addEventListener("touchend",this.onTouchEnd,false);t.addEventListener("touchcancel",this.onTouchCancel,false);if(!Event.prototype.stopImmediatePropagation){t.removeEventListener=function(e,n,r){var i=Node.prototype.removeEventListener;if(e==="click"){i.call(t,e,n.hijacked||n,r)}else{i.call(t,e,n,r)}};t.addEventListener=function(e,n,r){var i=Node.prototype.addEventListener;if(e==="click"){i.call(t,e,n.hijacked||(n.hijacked=function(e){if(!e.propagationStopped){n(e)}}),r)}else{i.call(t,e,n,r)}}}if(typeof t.onclick==="function"){i=t.onclick;t.addEventListener("click",function(e){i(e)},false);t.onclick=null}}var t=navigator.userAgent.indexOf("Windows Phone")>=0;var n=navigator.userAgent.indexOf("Android")>0&&!t;var r=/iP(ad|hone|od)/.test(navigator.userAgent)&&!t;var i=r&&/OS 4_\d(_\d)?/.test(navigator.userAgent);var s=r&&/OS ([6-9]|\d{2})_\d/.test(navigator.userAgent);var o=navigator.userAgent.indexOf("BB10")>0;e.prototype.needsClick=function(e){switch(e.nodeName.toLowerCase()){case"button":case"select":case"textarea":if(e.disabled){return true}break;case"input":if(r&&e.type==="file"||e.disabled){return true}break;case"label":case"iframe":case"video":return true}return/\bneedsclick\b/.test(e.className)};e.prototype.needsFocus=function(e){switch(e.nodeName.toLowerCase()){case"textarea":return true;case"select":return!n;case"input":switch(e.type){case"button":case"checkbox":case"file":case"image":case"radio":case"submit":return false}return!e.disabled&&!e.readOnly;default:return/\bneedsfocus\b/.test(e.className)}};e.prototype.sendClick=function(e,t){var n,r;if(document.activeElement&&document.activeElement!==e){document.activeElement.blur()}r=t.changedTouches[0];n=document.createEvent("MouseEvents");n.initMouseEvent(this.determineEventType(e),true,true,window,1,r.screenX,r.screenY,r.clientX,r.clientY,false,false,false,false,0,null);n.forwardedTouchEvent=true;e.dispatchEvent(n)};e.prototype.determineEventType=function(e){if(n&&e.tagName.toLowerCase()==="select"){return"mousedown"}return"click"};e.prototype.focus=function(e){var t;if(r&&e.setSelectionRange&&e.type.indexOf("date")!==0&&e.type!=="time"&&e.type!=="month"){t=e.value.length;e.setSelectionRange(t,t)}else{e.focus()}};e.prototype.updateScrollParent=function(e){var t,n;t=e.fastClickScrollParent;if(!t||!t.contains(e)){n=e;do{if(n.scrollHeight>n.offsetHeight){t=n;e.fastClickScrollParent=n;break}n=n.parentElement}while(n)}if(t){t.fastClickLastScrollTop=t.scrollTop}};e.prototype.getTargetElementFromEventTarget=function(e){if(e.nodeType===Node.TEXT_NODE){return e.parentNode}return e};e.prototype.onTouchStart=function(e){var t,n,s;if(e.targetTouches.length>1){return true}t=this.getTargetElementFromEventTarget(e.target);n=e.targetTouches[0];if(r){s=window.getSelection();if(s.rangeCount&&!s.isCollapsed){return true}if(!i){if(n.identifier&&n.identifier===this.lastTouchIdentifier){e.preventDefault();return false}this.lastTouchIdentifier=n.identifier;this.updateScrollParent(t)}}this.trackingClick=true;this.trackingClickStart=e.timeStamp;this.targetElement=t;this.touchStartX=n.pageX;this.touchStartY=n.pageY;if(e.timeStamp-this.lastClickTime<this.tapDelay){e.preventDefault()}return true};e.prototype.touchHasMoved=function(e){var t=e.changedTouches[0],n=this.touchBoundary;if(Math.abs(t.pageX-this.touchStartX)>n||Math.abs(t.pageY-this.touchStartY)>n){return true}return false};e.prototype.onTouchMove=function(e){if(!this.trackingClick){return true}if(this.targetElement!==this.getTargetElementFromEventTarget(e.target)||this.touchHasMoved(e)){this.trackingClick=false;this.targetElement=null}return true};e.prototype.findControl=function(e){if(e.control!==undefined){return e.control}if(e.htmlFor){return document.getElementById(e.htmlFor)}return e.querySelector("button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea")};e.prototype.onTouchEnd=function(e){var t,o,u,a,f,l=this.targetElement;if(!this.trackingClick){return true}if(e.timeStamp-this.lastClickTime<this.tapDelay){this.cancelNextClick=true;return true}if(e.timeStamp-this.trackingClickStart>this.tapTimeout){return true}this.cancelNextClick=false;this.lastClickTime=e.timeStamp;o=this.trackingClickStart;this.trackingClick=false;this.trackingClickStart=0;if(s){f=e.changedTouches[0];l=document.elementFromPoint(f.pageX-window.pageXOffset,f.pageY-window.pageYOffset)||l;l.fastClickScrollParent=this.targetElement.fastClickScrollParent}u=l.tagName.toLowerCase();if(u==="label"){t=this.findControl(l);if(t){this.focus(l);if(n){return false}l=t}}else if(this.needsFocus(l)){if(e.timeStamp-o>100||r&&window.top!==window&&u==="input"){this.targetElement=null;return false}this.focus(l);this.sendClick(l,e);if(!r||u!=="select"){this.targetElement=null;e.preventDefault()}return false}if(r&&!i){a=l.fastClickScrollParent;if(a&&a.fastClickLastScrollTop!==a.scrollTop){return true}}if(!this.needsClick(l)){e.preventDefault();this.sendClick(l,e)}return false};e.prototype.onTouchCancel=function(){this.trackingClick=false;this.targetElement=null};e.prototype.onMouse=function(e){if(!this.targetElement){return true}if(e.forwardedTouchEvent){return true}if(!e.cancelable){return true}if(!this.needsClick(this.targetElement)||this.cancelNextClick){if(e.stopImmediatePropagation){e.stopImmediatePropagation()}else{e.propagationStopped=true}e.stopPropagation();e.preventDefault();return false}return true};e.prototype.onClick=function(e){var t;if(this.trackingClick){this.targetElement=null;this.trackingClick=false;return true}if(e.target.type==="submit"&&e.detail===0){return true}t=this.onMouse(e);if(!t){this.targetElement=null}return t};e.prototype.destroy=function(){var e=this.layer;if(n){e.removeEventListener("mouseover",this.onMouse,true);e.removeEventListener("mousedown",this.onMouse,true);e.removeEventListener("mouseup",this.onMouse,true)}e.removeEventListener("click",this.onClick,true);e.removeEventListener("touchstart",this.onTouchStart,false);e.removeEventListener("touchmove",this.onTouchMove,false);e.removeEventListener("touchend",this.onTouchEnd,false);e.removeEventListener("touchcancel",this.onTouchCancel,false)};e.notNeeded=function(e){var t;var r;var i;if(typeof window.ontouchstart==="undefined"){return true}r=+(/Chrome\/([0-9]+)/.exec(navigator.userAgent)||[,0])[1];if(r){if(n){t=document.querySelector("meta[name=viewport]");if(t){if(t.content.indexOf("user-scalable=no")!==-1){return true}if(r>31&&document.documentElement.scrollWidth<=window.outerWidth){return true}}}else{return true}}if(o){i=navigator.userAgent.match(/Version\/([0-9]*)\.([0-9]*)/);if(i[1]>=10&&i[2]>=3){t=document.querySelector("meta[name=viewport]");if(t){if(t.content.indexOf("user-scalable=no")!==-1){return true}if(document.documentElement.scrollWidth<=window.outerWidth){return true}}}}if(e.style.msTouchAction==="none"){return true}if(e.style.touchAction==="none"){return true}return false};e.attach=function(t,n){return new e(t,n)};if(typeof define=="function"&&typeof define.amd=="object"&&define.amd){define(function(){return e})}else if(typeof module!=="undefined"&&module.exports){module.exports=e.attach;module.exports.FastClick=e}else{window.FastClick=e}})()
/* Jonathan Snook - MIT License - https://github.com/snookca/prepareTransition */
!(function(a){a.fn.prepareTransition=function(){return this.each(function(){var b=a(this);b.one("TransitionEnd webkitTransitionEnd transitionend oTransitionEnd",function(){b.removeClass("is-transitioning")});var c=["transition-duration","-moz-transition-duration","-webkit-transition-duration","-o-transition-duration"];var d=0;a.each(c,function(a,c){d=parseFloat(b.css(c))||d});if(d!=0){b.addClass("is-transitioning");b[0].offsetWidth}})}})(jQuery);
// Timber functions
window.theme = window.theme || {};
window.timber = window.timber || {};
timber.initCache = function () {
  timber.cache = {
    // General
    $html                    : $('html'),
    $body                    : $('body'),

    // Product Page
    $optionSelector          : $('.single-option-selector'),

  };
};

theme.initCache = function () {
  theme.cache = {
    $window                 : $(window),
    $html                   : $('html'),
    $body                   : $('body'),
    $drawerRight            : $('.drawer--right'),
    $cartBuggle             : $('.cart-link__bubble')
  };
};
theme.init = function () {
  theme.initCache();
  theme.afterCartLoad();
};
timber.init = function () {
  FastClick.attach(document.body);
  timber.initCache();
  timber.drawersInit();
};
timber.drawersInit = function () {
//    console.log(' RIGHT DRAWER YES');
    timber.RightDrawer = new timber.Drawers('CartDrawer', 'right', {
      'onDrawerOpen': ajaxCart.load
    });
  
};
/*============================================================================
  Drawer modules
  - Docs http://shopify.github.io/Timber/#drawers
==============================================================================*/
timber.Drawers = (function () {
//  console.log(' DRAWERS');
  
  var Drawer = function (id, position, options) {
//    console.log('  DRAWER constructor: ' + id + ": .js-drawer-open-button-" + position);
  
    var defaults = {
      close: '.js-drawer-close',
      open: '.js-drawer-open-button-' + position,
      openButtonLeftClass: 'js-drawer-open-button-left',
      drawerLeftClass: 'drawer--left',
      drawerRightClass: 'drawer--right',
      openClass: 'js-drawer-open',
      dirOpenClass: 'js-drawer-open-' + position
    };

    this.$nodes = {
      parent: $('body, html'),
      page: $('#MainContent, .header-wrapper'),
      moved: $('.is-moved-by-drawer')
    };

    this.config = $.extend(defaults, options);
    this.position = position;

    this.$drawer = $('#' + id);

    if (!this.$drawer.length) {
      return false;
    }

    this.drawerIsOpen = false;
    this.init();
  };

  Drawer.prototype.init = function () {
//  console.log('++ Drawer.prototype.init');
    var $openBtn = $(this.config.open);
    
//    console.log('  $openBtn is ' + $openBtn + ", " + this.config.open);

    // Add aria controls
    $openBtn.attr('aria-expanded', 'false');

    $openBtn.on('click', $.proxy(this.open, this));
    this.$drawer.find(this.config.close).on('click', $.proxy(this.close, this));
  };

  Drawer.prototype.open = function (evt) {
  
  $('.cart__checkout').on('click', function() {
    $('.cart__checkout').addClass('btn--loading');
  });
  

    
    // Keep track if drawer was opened from a click, or called by another function
    var externalCall = false;

    // don't open an opened drawer
    if (this.drawerIsOpen) {
      return;
    }

    // Prevent following href if link is clicked
    if (evt) {
//      console.log(' ++ EVT! Prevent Default!');
      evt.preventDefault();
    } else {
//      console.log(' ++ NO EVT! PRoblem!');
      externalCall = true;
    }

    // Without this, the drawer opens, the click event bubbles up to $nodes.page
    // which closes the drawer.
    if (evt && evt.stopPropagation) {
      evt.stopPropagation();
      // save the source of the click, we'll focus to this on close
      this.$activeSource = $(evt.currentTarget);
    }

    if (this.drawerIsOpen && !externalCall) {
      return this.close();
    }

    // Add is-transitioning class to moved elements on open so drawer can have
    // transition for close animation
    this.$nodes.moved.addClass('is-transitioning');
    this.$drawer.prepareTransition();

    this.$nodes.parent.addClass(this.config.openClass + ' ' + this.config.dirOpenClass);
    this.drawerIsOpen = true;

    // Set focus on drawer
    Drawer.prototype.trapFocus(this.$drawer, 'drawer_focus');

    // Run function when draw opens if set
    if (this.config.onDrawerOpen && typeof(this.config.onDrawerOpen) == 'function') {
      if (!externalCall) {
        this.config.onDrawerOpen();
      }
    }

    if (this.$activeSource && this.$activeSource.attr('aria-expanded')) {
      this.$activeSource.attr('aria-expanded', 'true');
    }

    this.bindEvents();
    const variantRadiosElement = document.querySelector('variant-radios');
    if (variantRadiosElement) {
      variantRadiosElement.dispatchEvent(new Event('change:custom'));
    } 
    
  };

  Drawer.prototype.close = function () {
    const variantRadiosElement = document.querySelector('variant-radios');
    if (variantRadiosElement) {
      variantRadiosElement.dispatchEvent(new Event('change:custom'));
    }
//    console.log('Drawer.prototype.close');
    
    // don't close a closed drawer
    if (!this.drawerIsOpen) {
      return;
    }

    // deselect any focused form elements
    $(document.activeElement).trigger('blur');

    // Ensure closing transition is applied to moved elements, like the nav
    this.$nodes.moved.prepareTransition({ disableExisting: true });
    this.$drawer.prepareTransition({ disableExisting: true });

    this.$nodes.parent.removeClass(this.config.dirOpenClass + ' ' + this.config.openClass);

    this.drawerIsOpen = false;

    // Remove focus on drawer
    Drawer.prototype.removeTrapFocus(this.$drawer, 'drawer_focus');

    if (this.$activeSource && this.$activeSource.attr('aria-expanded')) {
      this.$activeSource.attr('aria-expanded', 'false');
    }

    this.unbindEvents();
  };

  Drawer.prototype.trapFocus = function ($container, eventNamespace) {
    var eventName = eventNamespace ? 'focusin.' + eventNamespace : 'focusin';

    $container.attr('tabindex', '-1');

    $container.focus();

    $(document).on(eventName, function (evt) {
      if ($container[0] !== evt.target && !$container.has(evt.target).length) {
        $container.focus();
      }
    });
  };

  Drawer.prototype.removeTrapFocus = function ($container, eventNamespace) {
    var eventName = eventNamespace ? 'focusin.' + eventNamespace : 'focusin';

    $container.removeAttr('tabindex');
    $(document).off(eventName);
  };

  Drawer.prototype.bindEvents = function() {
    // Lock scrolling on mobile
    this.$nodes.page.on('touchmove.drawer', function () {
      return false;
    });

    // Clicking out of drawer closes it
    this.$nodes.page.on('click.drawer', $.proxy(function () {
      this.close();
      return false;
    }, this));

    // Pressing escape closes drawer
    this.$nodes.parent.on('keyup.drawer', $.proxy(function(evt) {
      if (evt.keyCode === 27) {
        this.close();
      }
    }, this));
  };

  Drawer.prototype.unbindEvents = function() {
    this.$nodes.page.off('.drawer');
    this.$nodes.parent.off('.drawer');
  };

  return Drawer;
})();
// Initialize Timber's JS on docready
$(timber.init);
theme.sizeCartDrawerFooter = function () {
  // Stop if our drawer doesn't have a fixed footer
  if (!theme.cache.$drawerRight.hasClass('drawer--has-fixed-footer')) {
    return;
  }

  // Elements are reprinted regularly so selectors are not cached
  var $cartFooter = $('.ajaxcart__footer').removeAttr('style'),
      $cartInner = $('.ajaxcart__inner').removeAttr('style'),
      cartFooterHeight = $cartFooter.outerHeight();

  //$cartInner.css('bottom', cartFooterHeight);
//  $cartFooter.css('height', cartFooterHeight);
};

function addCompareAtPrice(cart) {
  // console.log('addCompareAtPrice AND check for packs');
  // console.log('  gwp_active? false 500');

  if (false) {
    var gwpHandle = "heather-grey-whipped-eye-mask";  
//    console.log("  we're gonna want to keep an eye out for " + gwpHandle);
  }
  
  $.ajax({ 
    url: '/cart.js', 
    dataType: 'json',
    async: false, 
    success: function(cart) {
      var packsCheckedFor = [];
      
      // console.log(' cart json has been success call yes::::');        
      // console.log(cart);    
      // console.log(' ::::');
    
      for (i in cart.items) {
        var item = cart.items[i];
        // console.log(' >>>>>ITEM');
        // console.log(item);
        
        $('.ajaxcart__product[data-id=' + item.id + ']').attr('data-handle', item.handle).attr('data-size', item.variant_options[0]);
      } 
      for (i in cart.items) {
        var item = cart.items[i];
        // console.log(item.properties['_pack_handle']);
//        console.log('  ID: ' + item.id);
        
      //  console.log('pack handle? ' + item.properties['_pack_handle']);
        
  //      if ($('.child-products').length > 0) {

          if (item.properties['_pack_handle']) {
            var packHandle = item.properties['_pack_handle'];
            var checkedYet = false;
          
            // console.log(' + yes this has a pack ' + packHandle);
          
            for (j in packsCheckedFor) {
              if (packsCheckedFor[j] == packHandle) {
//                console.log('  compare ' + packsCheckedFor[j]  + ' and ' + packHandle);
                checkedYet = true;
              }
            }
          
            if (!checkedYet) {
            //  console.log("    + we're gonna check for it");
              packsCheckedFor.push(packHandle);

              var packItems = item.properties['_pack_items'];
              var productsToFind = packItems.length;
            /*
              console.log('    + we should look for ' + packItems);             
              console.log('    + gotta find ' + packItems.length);
            */
              for (j in cart.items) {
                for (k in packItems) {
                  if (cart.items[j].handle == packItems[k]) {
//                    console.log('     -- FOUND ' + cart.items[j].handle);
                    productsToFind--;
                  }
                }
              }

//              console.log('    + how much is left? ' + productsToFind);
            
              if (productsToFind <= 0) {
                // console.log("3123213213" + item.properties)
                var packTitle = item.properties['_pack_title'];
                var packImage = item.properties['_pack_image'];
                var packUrl = item.properties['_pack_url'];
                var packId = item.properties['_pack_id'];
                var packSize = item.properties['_pack_size'];
                var packPrice = item.properties['_pack_price'];
                var packOriginalPrice = item.properties['_pack_original_price'];
                var productIDs = '';
                
//                console.log('   ****** GENERATE PHANTOM PRODUCT ' + packTitle);
            
                for (j in packItems) {
                  var $itm = $('.ajaxcart__product[data-handle="' + packItems[j] + '"][data-size="' + packSize + '"]');               
//                  console.log(j + '.  found an itm, check its size? ' + $itm.data('size'));
                
                  if ($itm.data('size') == packSize) {
//                    console.log(" matches the pack, let's do it");
                    $itm.addClass('in-a-pack');
                    productIDs += $itm.data('id') + '|';
                  }
                }
                productIDs = productIDs.slice(0, -1);

                var phantomHtml = '';
                phantomHtml += '<div class="ajaxcart__product" data-link="' + packUrl + '" data-id="' + packId + '" data-size="' + packSize + '">';
                phantomHtml += '  <div class="ajaxcart__row" data-line="999">';
                phantomHtml += '    <div class="grid">';
                phantomHtml += '      <div class="grid__item one-quarter">';
                phantomHtml += '        <a href="' + packUrl + '" class="ajaxcart__product-image"><img src="' + packImage + '" alt="' + packTitle + '"></a>';
                phantomHtml += '      </div>';
                phantomHtml += '      <div class="grid__item three-quarters">';
                phantomHtml += '        <div class="ajaxcart__product-name--wrapper">';
                phantomHtml += '          <a href="' + packUrl + '" class="ajaxcart__product-name z">' + packTitle + '</a>';
                phantomHtml += '          <span class="ajaxcart__product-meta">Size: ' + packSize + '</span>';
                phantomHtml += '        </div>';
                phantomHtml += '        <div class="grid--full display-table">';
                phantomHtml += '          <div class="grid__item display-table-cell one-half">';
          //      phantomHtml += '            <div class="ajaxcart__qty">';
                phantomHtml += '              <button type="button" class="ajaxcart__remove-pack" data-pack-id="' + packId + '" data-size="' + packSize + '" data-ids="' + productIDs + '">&times;</button>';
          //      phantomHtml += '            </div>';
              
          /*      phantomHtml += '              <button type="button" class="ajaxcart__qty-adjust ajaxcart__qty--minus icon-fallback-text" data-id="' + packId + '" data-qty="0" data-line="999">';
                phantomHtml += '                <span class="icon icon-minus" aria-hidden="true"></span>';
                phantomHtml += '                <span class="fallback-text">&times;</span>';
                phantomHtml += '              </button>';
                phantomHtml += '              <input type="text" name="updates[]" class="ajaxcart__qty-num" value="1" min="0" data-id="' + packId + '" data-line="999" aria-label="quantity" pattern="[0-9]*">';
                phantomHtml += '              <button type="button" class="ajaxcart__qty-adjust ajaxcart__qty--plus icon-fallback-text" data-id="' + packId + '" data-line="999" data-qty="">';
                phantomHtml += '                <span class="icon icon-plus" aria-hidden="true"></span>';
                phantomHtml += '                <span class="fallback-text">+</span>';
                phantomHtml += '              </button>';
                phantomHtml += '            <div id="message-" class="ajaxcart__error"></div>';
          */      phantomHtml += '          </div>';
                phantomHtml += '          <div class="grid__item display-table-cell one-half text-right">';
                phantomHtml += '            <span class="ajaxcart__price">';
                phantomHtml += '              <div class="qb-total-line-item">';
                phantomHtml += '                <small class="ajaxcart-item__price-strikethrough"><s>' + packOriginalPrice + '</s></small>';
                phantomHtml += '                <div class="qb-price-item">' + packPrice + '</div>';
                phantomHtml += '              </div>';
                phantomHtml += '            </span>';
                phantomHtml += '          </div>';
                phantomHtml += '        </div>';
                phantomHtml += '      </div>';
                phantomHtml += '    </div>';
                phantomHtml += '  </div>';
                phantomHtml += '</div>';
              
            /*  
                console.log("======");
                console.log(phantomHtml);
                console.log("======");
            */  
                $('.ajaxcart__inner').append(phantomHtml);
              } else {
//                console.log('   ****** NOT ENOUGH TO EARN A BONUS ' + packTitle);
              }

            } else {
//              console.log('    - already checked');
            }
          }
  //      }
      }
      
//      console.log(' ::::');

      if (false) {
        var subtotal = cart.total_price / 100;
        //console.log('   hey now is ' + subtotal + ' >= 500');
      
        if (subtotal >= 500) {
          //console.log("      let's add something to the cart item that contains " + gwpHandle);
        
          $('.ajaxcart__product[data-link*=' + gwpHandle + '] .show-if-free').removeClass('hide');
          $('.ajaxcart__product[data-link*=' + gwpHandle + '] .qb-price-item').html('FREE').addClass('red');
        
          $('.cart-suggestions .show-if-free').removeClass('hide');
          $('.cart-suggestions .qb-price-item').html('FREE').addClass('red');
        }
        
      }
    } 
  });

  $('.ajaxcart__remove-pack').click(function() {
    var idsToRemove = $(this).data('ids').split('|');
    var sizeToRemove = $(this).data('size');
//    console.log('> REMOVE PACK - but only size ' + sizeToRemove);
//    console.log(idsToRemove);
    
    // immediate feedback
    $('.ajaxcart__product[data-id="' + $(this).data('pack-id') + '"]').hide();
    

    // actually remove the hidden ones
    var updateData = {};
    
    for (var i=0; i<cart.items.length; i++) {
      var item = cart.items[i];
//      console.log(' item ' + i);
//      console.log(item);

      for (var j=0; j<idsToRemove.length; j++) {
//        console.log(' compare item id ' + item.id + ' to ' + idsToRemove[j]);
        
        if (item.id == idsToRemove[j] && item.variant_options[0] == sizeToRemove) {
//          console.log('    yeah decrease ' + item.id + ' to ' + (item.quantity - 1));
          updateData[item.key] = item.quantity - 1;
        }
      }
    }

    $.ajax({
      type: 'POST',
      url: '/cart/update.js',
      data: {
        updates: updateData
      },
      dataType: 'json',
      success: function(cart) { 
//        console.log('Hooray!', cart); 
        ajaxCart.cartUpdateCallback(cart);
      },
      error: function(err) { 
        console.error('ERROR ', err);
      }
    });

  });

  if (cart.items) {
    cart.items.forEach(function(item) {
    /*    console.log(" checking sale prices :::::");
        console.log('ITEM: ' + item.handle);
        console.log(item);
    */    
      $.ajax({ 
        url: '/products/' + item.handle + '.js', 
        dataType: 'json',
        async: false, 
        success: function(product) {
          product.variants.forEach(function(variant) {  
            if (variant.id == item.variant_id) {
            
              // console.log(variant);
    //            console.log(variant);
            
              if (variant.compare_at_price != null) {
    //              console.log('has a compare-at: ' + variant.compare_at_price);
    
                item["compare_at_price"] = variant.compare_at_price;
                $('.ajaxcart__product[data-id=' + item.id + '] .ajaxcart-item__price-strikethrough s').html(Shopify.formatMoney(variant.compare_at_price).replace(/((\,00)|(\.00))$/g, ''));
              } else if (item.final_price != variant.price) {
    //              console.log(' ^^ variant.final_price: ' + item.final_price);
    //              console.log(' ^^ variant.price: ' + variant.price);
                item["compare_at_price"] = variant.price;

                $('.ajaxcart__product[data-id=' + item.id + '] .ajaxcart-item__price-strikethrough s').html(Shopify.formatMoney(variant.price).replace(/((\,00)|(\.00))$/g, ''));
                $('.ajaxcart__product[data-id=' + item.id + '] .qb-price-item').html(Shopify.formatMoney(item.final_price).replace(/((\,00)|(\.00))$/g, ''));
              }
            }
          });
        } 
      });
    });
  }
  

  return cart;
}
theme.afterCartLoad = function () {
  // console.log('theme.afterCartLoad');
  
  theme.cache.$body.on('ajaxCart.afterCartLoad', function(evt, cart) {
//    console.log('ajaxCart.afterCartLoad');
    
    addCompareAtPrice(cart);
    
    // Open cart drawer
//    debugger;
    timber.RightDrawer.open();

    // Size the cart's fixed footer
    theme.sizeCartDrawerFooter();

    // Show cart bubble in nav if items exist
    if (cart.items) {
      if (cart.items.length > 0) {
        theme.cache.$cartBuggle.addClass('cart-link__bubble--visible');
      } else {
        theme.cache.$cartBuggle.removeClass('cart-link__bubble--visible');
      }
    }
    
  });
};
$(theme.init);