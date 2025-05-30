$(document).on('click', '.form-plp .form-list-variants', function (event) {
    if ($(event.target).closest('.ajax-label').length === 0) {
        event.preventDefault();
    }
});

$(document).on('click', '.size-chart-opener', function () {
    $(this).closest('.form-plp').addClass('size-chart-modal-opened');
    $('body').addClass('body-size-chart-modal-opened');
});


$(document).on('click', '.plp-sizing-block-content .closing-icon', function () {
    $(this).closest('.form-plp').removeClass('size-chart-modal-opened');
    $('body').removeClass('body-size-chart-modal-opened');
});

$(document).on('click', '.AddToCart.plp-atc-redirect', function (event) {
    let $formPlp = $(this).closest('.form-plp');
    let productTitle = $formPlp
        .find('.plp-form-product-title')
        .text()
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

    if (productTitle.includes('2-pack')) {
        let href = $formPlp.closest('.plp-a-item').attr('href');
        if (href) {
            window.location.href = href;
        }
    }
});

$(document).on("click", ".form-plp .ajax-label input", function () {
    const form = $(this).closest(".form-plp");
    const fieldsets = form.find("fieldset:not(.hide)");

    if (fieldsets.length < 2) return;

    const firstFieldset = fieldsets.eq(0);
    const secondFieldset = fieldsets.eq(1);
    const jsonDataElement = form.find("#product-variants-json");

    if (!jsonDataElement.length) return;

    const variants = JSON.parse(jsonDataElement.text() || "{}");

    if ($(this).closest("fieldset").is(firstFieldset)) {
        secondFieldset.find("input").each(function () {
            const input = $(this);
            const parentLabel = input.closest(".ajax-label");
            parentLabel.removeClass("disabled");
            input.prop("disabled", false).prop("checked", false); 
        });

        const selectedValue = $(this).val();
        const availableVariants = variants.filter(function (variant) {
            return variant.options.includes(selectedValue);
        });

        secondFieldset.find("input").each(function () {
            const input = $(this);
            const inputValue = input.val();
            const parentLabel = input.closest(".ajax-label");

            const isAvailable = availableVariants.some(function (variant) {
                return variant.options.includes(inputValue);
            });

            if (isAvailable) {
                parentLabel.removeClass("disabled");
                input.prop("disabled", false);
            } else {
                parentLabel.addClass("disabled");
                input.prop("disabled", true); 
                input.prop("checked", false);
            }
        });

        form.find('button.AddToCart.product-form__submit.plp-form-atc')
            .addClass('select-size-load')
            .attr('disabled', true);

    } else if ($(this).closest("fieldset").is(secondFieldset) && !$(this).hasClass("disabled")) {
        const selectedFirstValue = firstFieldset.find("input:checked").val(); 
        const selectedSecondValue = $(this).val(); 

        const selectedVariant = variants.find(function (variant) {
            return selectedFirstValue && selectedSecondValue &&
                variant.options.includes(selectedFirstValue) && 
                variant.options.includes(selectedSecondValue) &&
                variant.options[0] !== variant.options[1]; 
        });

        if (selectedVariant) {
            const variantId = selectedVariant.id;
            form.find(".product-variant-id").val(variantId); 

            form.find('button.AddToCart.product-form__submit.plp-form-atc')
                .removeClass('select-size-load')
                .removeAttr('disabled');
        }
    }
});

$(document).on("click", ".form-plp .AddToCart.product-form__submit.plp-form-atc", function (e) {
    const button = $(this);

    if (button.prop("disabled") || button.attr("disabled") === "disabled") {
        e.preventDefault();
        return;
    }

    const form = button.closest(".form-plp");
    const variantId = form.find(".product-variant-id").val();

    if (!variantId) {
        return;
    }

    fetch("/cart/add.js", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id: variantId,
            quantity: 1,
        }),
    })
    .then(response => response.json())
    .then(data => {
        ShopifyAPI.getCart(function(cart) {
            ajaxCart.cartUpdateCallback(cart);
        });
    })
    .catch(error => {
        console.error("Add to Cart Error", error);
    });
});

$(document).on("click", ".form-plp .AddToCart.plp-atc-opener", function () {
    const form = $(this).closest(".form-plp");
    const fieldsets = form.find("fieldset.js.product-form__input");

    if (fieldsets.length === 3 && fieldsets.filter(".hide").length === 3) {
        const addToCartButton = form.find("button.AddToCart.product-form__submit.plp-form-atc");
        addToCartButton.prop("disabled", false).removeClass("select-size-load");

        const variantInput = form.find(".product-variant-id");
        variantInput.val(variantInput.attr("data-id"));
    }
});