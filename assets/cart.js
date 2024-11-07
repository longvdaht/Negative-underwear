class CartRemoveButton extends HTMLElement {
    constructor() {
        super();

        this.addEventListener("click", (event) => {
            event.preventDefault();
            const cartItems =
                this.closest("cart-items") || this.closest("cart-drawer-items");
            cartItems.updateQuantity(this.dataset.index, 0);
        });
    }
}

customElements.define("cart-remove-button", CartRemoveButton);

class CartItems extends HTMLElement {
    constructor() {
        super();
        this.lineItemStatusElement =
            document.getElementById("shopping-cart-line-item-status") ||
            document.getElementById("CartDrawer-LineItemStatus");

        const debouncedOnChange = debounce((event) => {
            this.onChange(event);
        }, ON_CHANGE_DEBOUNCE_TIMER);

        
        // fetch(window.Shopify.routes.root + 'cart.js').then(res =>res.json()).then(parsedState => {
        //     this.checkGiftInCart(parsedState, '');
        // })

        this.addEventListener("change", debouncedOnChange.bind(this));
    }

    cartUpdateUnsubscriber = undefined;

    connectedCallback() {
        this.cartUpdateUnsubscriber = subscribe(
            PUB_SUB_EVENTS.cartUpdate,
            (event) => {
                if (event.source === "cart-items") {
                    return;
                }
                this.onCartUpdate();
            }
        );
    }

    disconnectedCallback() {
        if (this.cartUpdateUnsubscriber) {
            this.cartUpdateUnsubscriber();
        }
    }

    onChange(event) {
        
        this.updateQuantity(
            event.target.dataset.index,
            event.target.value,
            document.activeElement.getAttribute("name")
        );
    }

    onCartUpdate() {
        fetch(`${routes.cart_url}?section_id=main-cart-items`)
            .then((response) => response.text())
            .then((responseText) => {
                const html = new DOMParser().parseFromString(
                    responseText,
                    "text/html"
                );

                const sourceQty = html.querySelector("cart-items");
                this.innerHTML = sourceQty.innerHTML;
            })
            .catch((e) => {
                console.error(e);
            });
    }

    getSectionsToRender() {
        return [
            {
                id: "main-cart-items",
                section: document.getElementById("main-cart-items").dataset.id,
                selector: ".js-contents",
            },
            {
                id: "cart-icon-bubble",
                section: "cart-icon-bubble",
                selector: ".shopify-section",
            },
            {
                id: "cart-live-region-text",
                section: "cart-live-region-text",
                selector: ".shopify-section",
            },
            {
                id: "main-cart-footer",
                section: document.getElementById("main-cart-footer").dataset.id,
                selector: ".js-contents",
            },
        ];
    }

    updateQuantity(line, quantity, name) {
        this.enableLoading(line);
        let properties = null;
        if (quantity > 1) {
            properties = { '_pack_creation_method': 'cart_plusbutton' };
        } else {
            properties = { '_pack_creation_method': '' };
        }
        
        let body = {
            line,
            quantity,
            properties, // Thêm properties vào body
            sections: this.getSectionsToRender().map(
                (section) => section.section
            ),
            sections_url: window.location.pathname,
        };

        body = JSON.stringify(body)

        fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
            .then((response) => {
                return response.text();
            })
            .then((state) => {
                const parsedState = JSON.parse(state);
                const quantityElement =
                    document.getElementById(`Quantity-${line}`) ||
                    document.getElementById(`Drawer-quantity-${line}`);
                const items = document.querySelectorAll(".cart-item");

                if (parsedState.errors) {
                    quantityElement.value =
                        quantityElement.getAttribute("value");
                    this.updateLiveRegions(line, parsedState.errors);
                    return;
                }

                this.classList.toggle("is-empty", parsedState.item_count === 0);
                const cartDrawerWrapper = document.querySelector("cart-drawer");
                const cartFooter = document.getElementById("main-cart-footer");

                if (cartFooter)
                    cartFooter.classList.toggle(
                        "is-empty",
                        parsedState.item_count === 0
                    );
                if (cartDrawerWrapper)
                    cartDrawerWrapper.classList.toggle(
                        "is-empty",
                        parsedState.item_count === 0
                    );

                this.getSectionsToRender().forEach((section) => {
                    const elementToReplace =
                        document
                            .getElementById(section.id)
                            .querySelector(section.selector) ||
                        document.getElementById(section.id);
                    elementToReplace.innerHTML = this.getSectionInnerHTML(
                        parsedState.sections[section.section],
                        section.selector
                    );
                });
                const updatedValue = parsedState.items[line - 1]
                    ? parsedState.items[line - 1].quantity
                    : undefined;
                let message = "";
                if (
                    items.length === parsedState.items.length &&
                    updatedValue !== parseInt(quantityElement.value)
                ) {
                    if (typeof updatedValue === "undefined") {
                        message = window.cartStrings.error;
                    } else {
                        message = window.cartStrings.quantityError.replace(
                            "[quantity]",
                            updatedValue
                        );
                    }
                }
                this.updateLiveRegions(line, message);

                const lineItem =
                    document.getElementById(`CartItem-${line}`) ||
                    document.getElementById(`CartDrawer-Item-${line}`);
                if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
                    cartDrawerWrapper
                        ? trapFocus(
                              cartDrawerWrapper,
                              lineItem.querySelector(`[name="${name}"]`)
                          )
                        : lineItem.querySelector(`[name="${name}"]`).focus();
                } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
                    trapFocus(
                        cartDrawerWrapper.querySelector(".drawer__inner-empty"),
                        cartDrawerWrapper.querySelector("a")
                    );
                } else if (
                    document.querySelector(".cart-item") &&
                    cartDrawerWrapper
                ) {
                    trapFocus(
                        cartDrawerWrapper,
                        document.querySelector(".cart-item__name")
                    );
                }
                publish(PUB_SUB_EVENTS.cartUpdate, { source: "cart-items" });

                const d = this.checkGiftInCart(parsedState, name);
            })
            .catch(() => {
                this.querySelectorAll(".loading-overlay").forEach((overlay) =>
                    overlay.classList.add("hidden")
                );
                const errors =
                    document.getElementById("cart-errors") ||
                    document.getElementById("CartDrawer-CartErrors");
                if (errors) 
                    errors.textContent = window.cartStrings.error;
            })
            .finally(() => {
                this.disableLoading(line);
            });
    }

    async checkGiftInCart(data, name) {
        var countX = 0,
            hasY = false,
            countY = 0,
            productY = '';
        
        if (window.buyXgetY) {
            productY = window.buyXgetY.productY;
        }
        
        if (data.items.length > 0) {
            for (var i=0; i < data.items.length; i++) {
                if (window.buyXgetY) {
                    if (data.items[i].properties !== null) {
                        if (data.items[i].properties.type_free_product == 'buy_x_get_y' && data.items[i].properties.product_y == productY) {
                            countX = countX + data.items[i].quantity;
                        }
                    }
                    if (data.items[i].id == productY) {
                        hasY = true;
                        countY = data.items[i].quantity;
                    }
                }
            }
        }

        var gift = {  
            updates : {},
            sections: this.getSectionsToRender().map(
                (section) => section.section
            ),
            sections_url: window.location.pathname,
        }
        // Buy X Get Y
        if (hasY) {
            if (window.buyXgetY.limitProductY) {
                if (countX == 0) {
                    gift.updates[productY] = 0;
                }
                else if (countY != parseInt(window.buyXgetY.limitProductY) && countX > 0) {
                    gift.updates[productY] = parseInt(window.buyXgetY.limitProductY);
                }
            } else if (countY != countX) {
                gift.updates[productY] = countX;
            }
        }
        // Spend X Get y
        if (window.spendXgetY) {
            const productSpend = window.spendXgetY.productSpend;

            var total_price = data.total_price / 100;
            if (total_price >= window.spendXgetY.priceSpend) {
                gift.updates[productSpend] = 1;
            } else {
                gift.updates[productSpend] = 0;
            }
        }

        this.updateProductInCart(gift)
    }

    updateProductInCart(gift) {
        if (Object.keys(gift.updates).length === 0) {
            return;
        }

        var body =  JSON.stringify(gift);

        fetch(window.routes.cart_update_url, { ...fetchConfig(), ...{ body } })
            .then((res) => res.text())
            .then((state) => {
                const parsedState = JSON.parse(state);
                
                this.classList.toggle("is-empty",parsedState.item_count === 0);
                const cartFooter = document.getElementById("main-cart-footer");
                if (cartFooter)
                    cartFooter.classList.toggle(
                        "is-empty",
                        parsedState.item_count === 0
                    );

                this.getSectionsToRender().forEach((section) => {
                    const elementToReplace =
                        document
                            .getElementById(section.id)
                            .querySelector(section.selector) ||
                        document.getElementById(section.id);
                    elementToReplace.innerHTML = this.getSectionInnerHTML(
                        parsedState.sections[section.section],
                        section.selector
                    );
                });

                publish(PUB_SUB_EVENTS.cartUpdate, { source: "cart-items" });

                // Check spend X get Y again (free gift doesn't cost 0)
                if (window.spendXgetY) {
                    var hasProductSpend = false;
                    const productSpend = window.spendXgetY.productSpend;
                    if (!parsedState.items.length) return;
                    for (var i = 0; i< parsedState.items.length; i++) {
                        console.log('check', parsedState.items[i].variant_id )
                        if (parsedState.items[i].variant_id == productSpend) {
                            hasProductSpend = true;
                            break;
                        } 
                    }
                    
                    var total_price = parsedState.total_price / 100;
                    var spendX = {  
                        updates : {},
                        sections: this.getSectionsToRender().map(
                            (section) => section.section
                        ),
                        sections_url: window.location.pathname,
                    }
                    console.log(total_price, window.spendXgetY.priceSpend, hasProductSpend)
                    if (total_price >= window.spendXgetY.priceSpend) {
                        if (hasProductSpend) return;
                        spendX.updates[productSpend] = 1;
                    } else {
                        if (!hasProductSpend) return
                        spendX.updates[productSpend] = 0;
                    }
                    if (Object.keys(spendX.updates).length === 0) {
                        return;
                    }
                    this.updateProductInCart(spendX)
                }

            })
    }

    updateLiveRegions(line, message) {
        const lineItemError =
            document.getElementById(`Line-item-error-${line}`) ||
            document.getElementById(`CartDrawer-LineItemError-${line}`);
        if (lineItemError)
            lineItemError.querySelector(".cart-item__error-text").innerHTML =
                message;

        this.lineItemStatusElement.setAttribute("aria-hidden", true);

        const cartStatus =
            document.getElementById("cart-live-region-text") ||
            document.getElementById("CartDrawer-LiveRegionText");
        cartStatus.setAttribute("aria-hidden", false);

        setTimeout(() => {
            cartStatus.setAttribute("aria-hidden", true);
        }, 1000);
    }

    getSectionInnerHTML(html, selector) {
        return new DOMParser()
            .parseFromString(html, "text/html")
            .querySelector(selector).innerHTML;
    }

    enableLoading(line) {
        const mainCartItems =
            document.getElementById("main-cart-items") ||
            document.getElementById("CartDrawer-CartItems");
        mainCartItems.classList.add("cart__items--disabled");

        const cartItemElements = this.querySelectorAll(
            `#CartItem-${line} .loading-overlay`
        );
        const cartDrawerItemElements = this.querySelectorAll(
            `#CartDrawer-Item-${line} .loading-overlay`
        );

        [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) =>
            overlay.classList.remove("hidden")
        );

        document.activeElement.blur();
        this.lineItemStatusElement.setAttribute("aria-hidden", false);
    }

    disableLoading(line) {
        const mainCartItems =
            document.getElementById("main-cart-items") ||
            document.getElementById("CartDrawer-CartItems");
        mainCartItems.classList.remove("cart__items--disabled");

        const cartItemElements = this.querySelectorAll(
            `#CartItem-${line} .loading-overlay`
        );
        const cartDrawerItemElements = this.querySelectorAll(
            `#CartDrawer-Item-${line} .loading-overlay`
        );

        cartItemElements.forEach((overlay) => overlay.classList.add("hidden"));
        cartDrawerItemElements.forEach((overlay) =>
            overlay.classList.add("hidden")
        );
    }
}

customElements.define("cart-items", CartItems);

if (!customElements.get("cart-note")) {
    customElements.define(
        "cart-note",
        class CartNote extends HTMLElement {
            constructor() {
                super();

                this.addEventListener(
                    "change",
                    debounce((event) => {
                        const body = JSON.stringify({
                            note: event.target.value,
                        });
                        fetch(`${routes.cart_update_url}`, {
                            ...fetchConfig(),
                            ...{ body },
                        });
                    }, ON_CHANGE_DEBOUNCE_TIMER)
                );
            }
        }
    );
}
