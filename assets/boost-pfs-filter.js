// Override Settings
var boostPFSFilterConfig = {
    general: {
        limit: 60,
      	loadProductFirst: false,
      	showPlaceholderProductList: false,
      	enableSeo: false,
        separateRefineByFromFilter: true,
        // Placeholder  
        showPlaceholderProductList: true,
        placeholderProductPerRow: 3,
        placeholderProductGridItemClass: 'grid__item grid-product small--one-half medium--one-half large--one-third',
    }
};

// Declare Templates
var boostPFSTemplate = {
    'soldOutClass': 'sold-out',
    'saleClass': 'on-sale',
    'soldOutLabelHtml': '<div>Soldout</div>',
    'saleLabelHtml': '<div class="saletag"></div>',
    'vendorHtml': '<div>{{itemVendorLabel}}</div>',
    'isPack': ' is-pack',

    // Grid Template 
    'productGridItemHtml': '<div data-product-id={{itemId}} class="grid__item grid-product small--one-half medium--one-half large--one-third{{isPack}} {{itemTags}} {{itemHandle}}">' +
								'<a href="{{itemUrl}}">' +
									'<span class="grid-product__image-wrapper {{itemTitle}} {{soldOutClass}} {{saleClass}}">' +
										'{{itemSaleLabel}}' +
										'{{itemBadges}}' + 
										'<span class="grid-product__image-link">' +
											'{{itemThumbnail}}' +
										'</span>' +
									'</span>' +
									'<span class="grid-product__meta {{saleClass}}">' +
										'<span class="grid-product__title">{{itemTitle}}</span><span class="grid-product__price">{{itemPrice}}</span>' +
									'</span>' +
								'</a>' +
  								'<div class="boost-custom-html"></div>' +
                            '</div>',
    'collectionHeaderItemHtml': 	'<div class="grid__item text-center small--hide medium--hide large--one-third section-header">' + 
                                    '<h1>{{itemTitle}}</h1>' +
                                    '<div class="grid">' + 
                                        '<div class="grid__item">' +
  											'<div class="rte">{{itemDesc}}</div>'+
                                        '</div>'+
                                    '</div>'+
  								'</div>',

    // Pagination Template
    'previousActiveHtml': '<span class="prev"><a href="{{itemUrl}}">&larr;</a></span>',
    'previousDisabledHtml': '',
    'nextActiveHtml': '<span class="next"><a href="{{itemUrl}}">&rarr;</a></span>',
    'nextDisabledHtml': '',
    'pageItemHtml': '<span class="page"><a href="{{itemUrl}}">{{itemTitle}}</a></span>',
    'pageItemSelectedHtml': '<span class="page current">{{itemTitle}}</span>',
    'pageItemRemainHtml': '<span class="deco">{{itemTitle}}</span>',
    'paginateHtml': '<div class="pagination">{{previous}}{{pageItems}}{{next}}</ul>',
  
    // Sorting Template
    'sortingHtml': '<label class="label--hidden">Sort</label><select class="collection-sort__input" aria-label="Sort">{{sortingItems}}</select>',
};

(function() {
    var onSale = false,
        soldOut = false,
        priceVaries = false,
        images = [],
        firstVariant = {},
        boostPFSImgDefaultSrc = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
        boostPFSRangeWidths = [180, 360, 540, 720, 900, 1080, 1296, 1512, 1728, 2048];
    
    BoostPFS.inject(this);
    boostPFSFilterConfig.general.separateRefineByFromFilter = (jQ('.boost-pfs-filter-tree-h').length && !Utils.isMobile() > 0 && boostPFSThemeConfig.custom.filter_tree_horizontal_style != 'style-expand') ? true : false;
    
    /************************** CUSTOMIZE DATA BEFORE BUILDING PRODUCT ITEM **************************/
    function prepareShopifyData(data) {
        // Displaying price base on the policy of Shopify, have to multiple by 100
        soldOut = !data.available; // Check a product is out of stock
        onSale = data['variants'][0].compare_at_price > data['variants'][0].price; // Check a product is on sale
        priceVaries = data.price_min != data.price_max; // Check a product has many prices
        // Convert images to array
        images = data.images_info;
        // Get First Variant (selected_or_first_available_variant)
        firstVariant = data['variants'][0];
        if (Utils.getParam('variant') !== null && Utils.getParam('variant') != '') {
            var paramVariant = data.variants.filter(function(e) {
                return e.id == Utils.getParam('variant');
            });
            if (typeof paramVariant[0] !== 'undefined') firstVariant = paramVariant[0];
        } else {
            for (var i = 0; i < data['variants'].length; i++) {
                if (data['variants'][i].available) {
                    firstVariant = data['variants'][i];
                    break;
                }
            }
        }
        return data;
    }
    
    /************************** END CUSTOMIZE DATA BEFORE BUILDING PRODUCT ITEM **************************/
    /************************** BUILD PRODUCT LIST **************************/
    // Build Product Grid Item
    ProductGridItem.prototype.compileTemplate = function(data) {
        if (!data) data = this.data;
        // Customize API data to get the Shopify data
        data = prepareShopifyData(data);

        var variantNames = "";

        for (var i=0; i<data['variants'].length; i++) {
        	var title = data['variants'][i].title;
        	variantNames += ' ' + title.replace('5-', '').replace('3-', '').toLowerCase();
        }
        variantNames = variantNames;
    
        // Get Template
        var itemHtml = boostPFSTemplate.productGridItemHtml;
        
        // Add Thumbnail
        var itemThumbUrl = images.length > 0 ? Utils.optimizeImage(images[0]['src']) : boostPFSConfig.general.no_image_url;
        itemHtml = itemHtml.replace(/{{itemThumbUrl}}/g, itemThumbUrl);
      	itemHtml = itemHtml.replace(/{{itemThumbnail}}/g, buildThumbnail(data));
        // Add Price
        var itemPriceHtml = '';
        if (data.title != '')  {
            if (onSale) {
                itemPriceHtml += '<s class="grid-link__sale_price ' + variantNames.replace('/', '') + '">' + Utils.formatMoney(data.compare_at_price_min, Globals.moneyFormat, true) + '</s> ';
            }
            if (priceVaries) {
                itemPriceHtml += Utils.formatMoney(data.price_min, Globals.moneyFormat, true) + '<span class="icon-fallback-text"><span class="icon icon-plus grid-product__price-min" aria-hidden="true"></span><span class="fallback-text">+</span></span>';
            } else {
                itemPriceHtml += Utils.formatMoney(data.price_min, Globals.moneyFormat, true);
            }
        }
        itemHtml = itemHtml.replace(/{{itemPrice}}/g, itemPriceHtml);
        // Add soldOut class
        var soldOutClass = soldOut ? boostPFSTemplate.soldOutClass : '';
        itemHtml = itemHtml.replace(/{{soldOutClass}}/g, soldOutClass);
      
        // Add onSale class
        var saleClass = onSale ? boostPFSTemplate.saleClass : '';
        itemHtml = itemHtml.replace(/{{saleClass}}/g, saleClass);
      
        // Add soldOut Label
        var itemSoldOutLabelHtml = soldOut ? boostPFSTemplate.soldOutLabelHtml : '';
        itemHtml = itemHtml.replace(/{{itemSoldOutLabel}}/g, itemSoldOutLabelHtml);
    
        // Add pack status
        var isPack = (data.title.indexOf('Pack') != -1) ? boostPFSTemplate.isPack : '';
        itemHtml = itemHtml.replace(/{{isPack}}/g, isPack);	
    
        // Add onSale Label
        var itemSaleLabelHtml = onSale ? boostPFSTemplate.saleLabelHtml : '';
        itemHtml = itemHtml.replace(/{{itemSaleLabel}}/g, itemSaleLabelHtml);
    
        // Add Vendor
        var itemVendorHtml = boostPFSConfig.custom.vendor_enable ? boostPFSTemplate.vendorHtml.replace(/{{itemVendorLabel}}/g, data.vendor) : '';
        itemHtml = itemHtml.replace(/{{itemVendor}}/g, itemVendorHtml);
      
      	// Add special Badge
      	var itemBadgesHtml = '';
      	var itemTagsHtml = '';
        for (var i = 0; i < data.tags.length; i++) {
          var tag = data.tags[i];
          if (tag == 'best-seller') {
            itemBadgesHtml = '<div class="saletag limited">Best Seller</div>';
          }
          if (tag == 'new') {
            itemBadgesHtml = '<div class="saletag limited">New</div>';
          }
          if (tag == 'selling-fast') {
            itemBadgesHtml = '<div class="saletag limited">Selling Fast</div>';
          }
          if (tag == 'low-stock') {
            itemBadgesHtml = '<div class="saletag limited">Low Stock</div>';
          }
        }
      	itemHtml = itemHtml.replace(/{{itemBadges}}/g, itemBadgesHtml);
    	itemHtml = itemHtml.replace(/{{itemTags}}/g, itemTagsHtml);
    
        // Add Review
        if (typeof Integration === 'undefined' ||
            (typeof Integration != 'undefined' &&
                typeof Integration.hascompileTemplate == 'function' &&
                !Integration.hascompileTemplate('reviews'))) {
            itemHtml = itemHtml.replace(/{{itemReviews}}/g, buildReview(data));
        }
    
        // Add main attribute (Always put at the end of this function)
        itemHtml = itemHtml.replace(/{{itemId}}/g, data.id);
        itemHtml = itemHtml.replace(/{{itemTitle}}/g, data.title);
        itemHtml = itemHtml.replace(/{{itemHandle}}/g, data.handle);
        itemHtml = itemHtml.replace(/{{itemVendorLabel}}/g, data.vendor);
        itemHtml = itemHtml.replace(/{{itemUrl}}/g, Utils.buildProductItemUrlWithVariant(data));
        
        return itemHtml;
    };
    /************************** END BUILD PRODUCT LIST **************************/
    /************************** BUILD PRODUCT ITEM ELEMENTS **************************/
    function buildThumbnail(data) {
        //	console.log('**building thumbnail - do we know title??' + data.title);
        var html = '';
        if (!data.images_info[0]) return html;
        html += buildItemImage(data.images_info[0]['src'], data.title);
        if (typeof data.images_info[1] !== 'undefined') {
            html += buildItemImage(data.images_info[1]['src'], (data.title + ' (alternate view)'));
        } else {
            html += '<img src="' + boostPFSConfig.general.no_image_url + '">';
        }
    
        return html;
    }
    
    function buildItemImage(image, title) {
        var html = '';
    
        html = '<img src="' + Utils.optimizeImage(image, 'large') + '" ' +
            'srcset="' +
            Utils.optimizeImage(image, 'small') + ' 100w,' +
            Utils.optimizeImage(image, 'compact') + ' 160w,' +
            Utils.optimizeImage(image, 'medium') + ' 240w,' +
            Utils.optimizeImage(image, 'large') + ' 480w,' +
            Utils.optimizeImage(image, 'grande') + ' 600w,' +
            Utils.optimizeImage(image, '1024x1024') + ' 1024w" ' +
            'sizes="50vw" ' +
            'data-js-responsive="true" ' +
            'alt="' + title + '" ' +
            'class="grid-product__image" ' +
            ' />';
    
        return html;
    }
    
    function buildReview(data) {
        var html = '';
        if (boostPFSThemeConfig.custom.hasOwnProperty('show_product_review') &&
            boostPFSThemeConfig.custom.show_product_review == true) {
            html = '<span class="shopify-product-reviews-badge" data-id="{{itemId}}"></span>';
        }
        return html;
    }
    /************************** END BUILD PRODUCT ITEM ELEMENTS **************************/
    /************************** BUILD TOOLBAR **************************/
    // Build Pagination
    ProductPaginationDefault.prototype.compileTemplate = function(totalProduct) {
        if (!totalProduct) totalProduct = this.totalProduct;
        // Get page info
        var currentPage = parseInt(Utils.stripHtml(Globals.queryParams.page));
        var totalPage = Math.ceil(totalProduct / Utils.stripHtml(Globals.queryParams.limit));
        if (!currentPage || isNaN(currentPage)) {
            currentPage = 1;
        }
        // If it has only one page, clear Pagination
        if (totalPage <= 1) {
            return '';
        }
    
        var paginationHtml = boostPFSTemplate.paginateHtml;
        // Build Previous
        var previousHtml = (currentPage > 1) ? boostPFSTemplate.previousActiveHtml : boostPFSTemplate.previousDisabledHtml;
        previousHtml = previousHtml.replace(/{{itemUrl}}/g, Utils.buildToolbarLink('page', currentPage, currentPage - 1));
        paginationHtml = paginationHtml.replace(/{{previous}}/g, previousHtml);
        // Build Next
        var nextHtml = (currentPage < totalPage) ? boostPFSTemplate.nextActiveHtml : boostPFSTemplate.nextDisabledHtml;
        nextHtml = nextHtml.replace(/{{itemUrl}}/g, Utils.buildToolbarLink('page', currentPage, currentPage + 1));
        paginationHtml = paginationHtml.replace(/{{next}}/g, nextHtml);
        // Create page items array
        var beforeCurrentPageArr = [];
        for (var iBefore = currentPage - 1; iBefore > currentPage - 3 && iBefore > 0; iBefore--) {
            beforeCurrentPageArr.unshift(iBefore);
        }
        if (currentPage - 4 > 0) {
            beforeCurrentPageArr.unshift('...');
        }
        if (currentPage - 4 >= 0) {
            beforeCurrentPageArr.unshift(1);
        }
        beforeCurrentPageArr.push(currentPage);
        var afterCurrentPageArr = [];
        for (var iAfter = currentPage + 1; iAfter < currentPage + 3 && iAfter <= totalPage; iAfter++) {
            afterCurrentPageArr.push(iAfter);
        }
        if (currentPage + 3 < totalPage) {
            afterCurrentPageArr.push('...');
        }
        if (currentPage + 3 <= totalPage) {
            afterCurrentPageArr.push(totalPage);
        }
        // Build page items
        var pageItemsHtml = '';
        var pageArr = beforeCurrentPageArr.concat(afterCurrentPageArr);
        for (var iPage = 0; iPage < pageArr.length; iPage++) {
            if (pageArr[iPage] == '...') {
                pageItemsHtml += boostPFSTemplate.pageItemRemainHtml;
            } else {
                pageItemsHtml += (pageArr[iPage] == currentPage) ? boostPFSTemplate.pageItemSelectedHtml : boostPFSTemplate.pageItemHtml;
            }
            pageItemsHtml = pageItemsHtml.replace(/{{itemTitle}}/g, pageArr[iPage]);
            pageItemsHtml = pageItemsHtml.replace(/{{itemUrl}}/g, Utils.buildToolbarLink('page', currentPage, pageArr[iPage]));
        }
        paginationHtml = paginationHtml.replace(/{{pageItems}}/g, pageItemsHtml);
        return paginationHtml;
    };
    
    // Build Sorting
    ProductSorting.prototype.compileTemplate = function() {
		var html = '';
		if (boostPFSTemplate.hasOwnProperty('sortingHtml')) {
			var sortingArr = Utils.getSortingList();
			if (sortingArr) {
				// Build content
				var sortingItemsHtml = '';
				for (var k in sortingArr) {
					sortingItemsHtml += '<option value="' + k + '">' + sortingArr[k] + '</option>';
				}
				html = boostPFSTemplate.sortingHtml.replace(/{{sortingItems}}/g, sortingItemsHtml);
			}
		}
		return html;
	};
    /************************** END BUILD TOOLBAR **************************/
    
    // Add additional feature for product list, used commonly in customizing product list
    ProductList.prototype.afterRender = function(data) {
        if (!data) data = this.data;
    
        // Fetch collection poster data
        var posterData = $('#collection-poster-data').html();
        var posterList = [];
    
        if (posterData) {
            var posterJson = JSON.parse(posterData);
            posterList = posterJson.posters;
        }
    
        // Integrate Review Shopify
        if (window.SPR && typeof window.SPR.initDomEls === 'function' && typeof window.SPR.loadBadges === 'function' && boostPFSThemeConfig.custom.show_product_review) {
            window.SPR.initDomEls();
            window.SPR.loadBadges();
        }
    
        // Existing collection item rendering logic
        if (!Utils.isSearchPage() && jQ('.boost-pfs-filter-products > .grid__item.section-header').length == 0) {
            var collectionItemHtml = boostPFSTemplate.collectionHeaderItemHtml;
            var collectionItemTitle = boostPFSConfig.custom.collection_title || '';
            var collectionItemDesc = '';
    
            if (typeof(boostPFSConfig.custom.collection_desc) !== 'undefined' && boostPFSConfig.custom.collection_desc !== null && boostPFSConfig.custom.collection_desc !== "") {
                if (boostPFSConfig.custom.collection_desc.indexOf('===') !== -1) {
                    var descArr = boostPFSConfig.custom.collection_desc.split('===');
                    var descF = descArr[0];
                    collectionItemDesc = descF.replace('<p>', '<p role="heading">');
                } else {
                    collectionItemDesc = boostPFSConfig.custom.collection_desc;
                }
            }
    
            collectionItemHtml = collectionItemHtml.replace(/{{itemTitle}}/g, collectionItemTitle);
            collectionItemHtml = collectionItemHtml.replace(/{{itemDesc}}/g, collectionItemDesc);
            jQ('.boost-pfs-filter-products').prepend(collectionItemHtml);
        }
    
        var hasShopifyRoutes = Shopify && Shopify.routes && typeof Shopify.routes.root !== 'undefined';
        var localeURLPart = hasShopifyRoutes ? Shopify.routes.root.replace(/\/$/, '') : '';
    
        for (var i = 0; i < data.length; i++) {
            const prodId = data[i]['id'];
            const quickUrlCustom = localeURLPart + '/products/' + data[i].handle + '?view=boost-pfs-integration';
    
            $.ajax({
                url: quickUrlCustom,
                success: function(result) {
                    $('[data-id="' + prodId + '"]').find('.boost-custom-html').append(result.trim());
                }
            });
        }
    
        // Insert posters after product items
        if (posterList.length > 0) {
            posterList.forEach(function(poster) {
                var position;
        
                // Determine the correct position based on screen size
                if (window.innerWidth <= 768) {
                    position = poster['position mobile'];
                } else {
                    position = poster.position;
                }
        
                // Check if the link exists and is not empty or null
                var posterHtml;
                if (poster.link) {
                    // If link exists, wrap the image in an anchor tag
                    posterHtml = `
                        <div class="grid__item grid_poster grid-product small--one-half medium--one-half large--one-third poster-wrapper">
                            <a href="${poster.link}">
                                <img class="collection-poster-image" src="${poster.image}" alt="${poster.title}" style="object-fit: cover; width: 100%; height: auto;">
                            </a>
                        </div>`;
                } else {
                    // If no link, display the image without a link
                    posterHtml = `
                        <div class="grid__item grid_poster grid-product small--one-half medium--one-half large--one-third poster-wrapper">
                            <img class="collection-poster-image" src="${poster.image}" alt="${poster.title}" style="object-fit: cover; width: 100%; height: auto;">
                        </div>`;
                }
        
                // Insert the poster after the corresponding product at the determined position
                if ($('.boost-pfs-filter-products .grid__item:nth-child(' + position + ')').length) {
                    $('.boost-pfs-filter-products .grid__item:nth-child(' + position + ')').after(posterHtml);
                } else {
                    // If the position exceeds the number of products, append at the end
                    $('.boost-pfs-filter-products').append(posterHtml);
                }
            });
        
            // Now update the height of the images based on the screen size
            var allPosterImages = document.querySelectorAll('.collection-poster-image');
        
            allPosterImages.forEach(function(image) {
                if (window.innerWidth <= 768) {
                    // Mobile screen - Set height to 100%
                    image.style.height = '100%';
                } else {
                    // Desktop screen - Set height to auto
                    image.style.height = 'auto';
                }
            });
        }              
    };
    
    // Build additional elements
    Filter.prototype.afterRender = function(data) {
        if (!data) data = this.data;
        var totalProduct = data.total_product + '<span> ' + boostPFSThemeConfig.label.items_with_count_other + '</span>';
        if (data.total_product == 1) {
            totalProduct = data.total_product + '<span> ' + boostPFSThemeConfig.label.items_with_count_one + '</span>';
        }
        if (data.total_product == 0) {
            jQ(".boost-pfs-filter-default-toolbar-inner").addClass('boost-pfs-filter-toolbar-product-0');
        } else {
            jQ(".boost-pfs-filter-default-toolbar-inner").removeClass('boost-pfs-filter-toolbar-product-0');
        }
        jQ('.boost-pfs-filter-total-product').html(totalProduct);
      
        var braTopsHeaderHTML = '<div class="filter-header" id="bra-tops">Bra Tops</div>';
        if (jQ('#bras li button span[aria-labelledby="XS"]').length) {
            jQ('#bras li button span[aria-labelledby="XS"]').parent().parent().before(braTopsHeaderHTML);
        } else if (jQ('#bras li button span[aria-labelledby="S"]').length) {
            jQ('#bras li button span[aria-labelledby="S"]').parent().parent().before(braTopsHeaderHTML);
        } else if (jQ('#bras li button span[aria-labelledby="M"]').length) {
            jQ('#bras li button span[aria-labelledby="M"]').parent().parent().before(braTopsHeaderHTML);
        } else if (jQ('#bras li button span[aria-labelledby="L"]').length) {
            jQ('#bras li button span[aria-labelledby="L"]').parent().parent().before(braTopsHeaderHTML);
        }
        
        var mixedHeaderHTML = '<div class="filter-header" id="everything-else">Everything Else</div>';
        if (jQ('#mixed li button span[aria-labelledby="XS"]').length) {
            jQ('#mixed li button span[aria-labelledby="XS"]').parent().parent().before(mixedHeaderHTML);
        } else if (jQ('#mixed li button span[aria-labelledby="XS-M"]').length) {
            jQ('#mixed li button span[aria-labelledby="XS-M"]').parent().parent().before(mixedHeaderHTML);
        } else if (jQ('#mixed li button span[aria-labelledby="S"]').length) {
            jQ('#mixed li button span[aria-labelledby="S"]').parent().parent().before(mixedHeaderHTML);
        } else if (jQ('#mixed li button span[aria-labelledby="M"]').length) {
            jQ('#mixed li button span[aria-labelledby="M"]').parent().parent().before(mixedHeaderHTML);
        } else if (jQ('#mixed li button span[aria-labelledby="M-XL"]').length) {
            jQ('#mixed li button span[aria-labelledby="M-XL"]').parent().parent().before(mixedHeaderHTML);
        } else if (jQ('#mixed li button span[aria-labelledby="L"]').length) {
            jQ('#mixed li button span[aria-labelledby="L"]').parent().parent().before(mixedHeaderHTML);
        }
        
        var cottonUnderwearHeaderHTML = '<div class="filter-header" id="cotton-underwear">Cotton Underwear</div>';
        if (jQ('#underwear li button span[aria-labelledby="XS-M"]').length || jQ('#thongs li button span[aria-labelledby="XS-M"]').length) {
            jQ('li button span[aria-labelledby="XS-M"]').parent().parent().before(cottonUnderwearHeaderHTML);
        } else if (jQ('#underwear li button span[aria-labelledby="M-XL"]').length || jQ('#thongs li button span[aria-labelledby="M-XL"]').length) {
            jQ('li button span[aria-labelledby="XS-M"]').parent().parent().before(cottonUnderwearHeaderHTML);
        }
    };

    FilterOption.prototype.afterRender = function() {
      if (this.filterOptionId == "pf_t_size") {
        var headerValues = '';
        this.filterItems.forEach(function(filterOption) {
    		// FilterOption has numberAppliedFilterItems field. We add those up.
            var header = filterOption.value.replace('boost:', '').split(':')[0];
            if (headerValues.indexOf(header) == -1) {
                var newHeader = '<div class="filter-header" id="' + header.toLowerCase() + '">';
                if (header.toLowerCase() == 'band') {
                    newHeader += 'Wired Bras';
                } else if (header.toLowerCase() == 'size') {
                    newHeader += 'Non-Wire Bras';
                } else {
                    newHeader += header;
                }
                newHeader += '</div>';
                headerValues += header + ',';
              
                filterOption.$element.before(newHeader);
            }
    	})
      }
    }
    FilterOptionItem.prototype.buildLabel = function() {
		var filterOption = this.filterOption ? this.filterOption : this.parent;
      
		var label = Utils.unescape(this.label);
		var prefix = filterOption.prefix;

		if (typeof label != 'string') return '';

		// Remove Prefix
		if (typeof prefix == 'string') {
			prefix = prefix.replace(/\\/g, '');
			label = label.replace(prefix, '').trim();
		}

        if (filterOption.filterOptionId == 'pf_t_size') {
            label = label.split(':')[1];
        }
      
		// No capital label of Rating filter option
		if (label.indexOf('boost-pfs-filter-icon-star') > -1) return label;

		// Make the text to uppercase
		filterOption.displayAllValuesInUppercaseForm = filterOption.displayAllValuesInUppercaseForm || false;
		if (filterOption.displayAllValuesInUppercaseForm) return label.toUpperCase();

		// Make all letters lowercase first, then capitalize all first letters of each string in a filter option value
		// For example: HELLO World => Hello World
		if (Settings.getSettingValue('general.forceCapitalizeFilterOptionValues')) return Utils.capitalize(label, true);

		// Make all letters lowercase first, then capitalize first letter of a filter option value
		// For example: product fILTER => Product filter
		if (Settings.getSettingValue('general.capitalizeFirstLetterFilterOptionValues')) return Utils.capitalize(label, true, true);

		// Just capitalize first letter and don't change the format of any other letters 
		// For example: hello wORLD => Hello WORLD
		if (Settings.getSettingValue('general.capitalizeFilterOptionValues')) return Utils.capitalize(label);

		// return label
		return Utils.stripHtml(label);
	};

    FilterApi.beforeCall = function() {
        Globals.queryParams.return_all_currency_fields = false;
    }
})();