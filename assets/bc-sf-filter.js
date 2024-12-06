// Override Settings
var bcSfFilterSettings = {
    general: {
        limit: 60,
      	loadProductFirst: true,
      	showPlaceholderProductList: false,
      	enableSeo: false
    }
};

// Declare Templates
var bcSfFilterTemplate = {
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
										'<span class="grid-product__title">{{itemTitle}}</span>' +
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
    'sortingHtml': '<label class="label--hidden">Sort</label><select class="collection-sort__input">{{sortingItems}}</select>',
};

/************************** BUILD PRODUCT LIST **************************/

// Build Product Grid Item
BCSfFilter.prototype.buildProductGridItem = function(data, index) {
//	console.log('****** buildProductGridItem');
    /*** Prepare data ***/
    
    var images = data.images_info;
    var soldOut = !data.available; // Check a product is out of stock
//    console.log('compare ' + data['variants'][0].compare_at_price_min + ' to ' + data['variants'][0].price_min);
    var onSale = data['variants'][0].compare_at_price > data['variants'][0].price; // Check a product is on sale
    var priceVaries = data.price_min != data.price_max; // Check a product has many prices
    // Get First Variant (selected_or_first_available_variant)
    var firstVariant = data['variants'][0];
    if (getParam('variant') !== null && getParam('variant') != '') {
        var paramVariant = data.variants.filter(function(e) { return e.id == getParam('variant'); });
        if (typeof paramVariant[0] !== 'undefined') firstVariant = paramVariant[0];
    } else {
        for (var i = 0; i < data['variants'].length; i++) {
            if (data['variants'][i].available) {
                firstVariant = data['variants'][i];
                break;
            }
        }
    }
    /*** End Prepare data ***/
    
    var variantNames = "";
    
    for (var i=0; i<data['variants'].length; i++) {
    	var title = data['variants'][i].title;
    	variantNames += ' ' + title.replace('5-', '').replace('3-', '').toLowerCase();
    }
    variantNames = variantNames;
 //   console.log("//////variantNames: " + variantNames);

            
    // Get Template
    var itemHtml = bcSfFilterTemplate.productGridItemHtml;

    // Add Thumbnail
    var itemThumbUrl = images.length > 0 ? this.optimizeImage(images[0]['src']) : bcSfFilterConfig.general.no_image_url;
    itemHtml = itemHtml.replace(/{{itemThumbUrl}}/g, itemThumbUrl);
  	itemHtml = itemHtml.replace(/{{itemThumbnail}}/g, buildThumbnail(data));
    // Add Price
    var itemPriceHtml = '';
    if (data.title != '')  {
        console.log('asd')
        if (onSale) {
            itemPriceHtml += '<s class="grid-link__sale_price ' + variantNames.replace('/', '') + '">' + this.formatMoney(data.compare_at_price_min, this.moneyFormat, true) + '</s> ';
        }
        if (priceVaries) {
            itemPriceHtml += this.formatMoney(data.price_min, this.moneyFormat, true) + '<span class="icon-fallback-text"><span class="icon icon-plus grid-product__price-min" aria-hidden="true"></span><span class="fallback-text">+</span></span>';
        } else {
            itemPriceHtml += this.formatMoney(data.price_min, this.moneyFormat, true);
        }
    }
    itemHtml = itemHtml.replace(/{{itemPrice}}/g, itemPriceHtml);

    // Add soldOut class
    var soldOutClass = soldOut ? bcSfFilterTemplate.soldOutClass : '';
    itemHtml = itemHtml.replace(/{{soldOutClass}}/g, soldOutClass);
  
    // Add onSale class
    var saleClass = onSale ? bcSfFilterTemplate.saleClass : '';
    itemHtml = itemHtml.replace(/{{saleClass}}/g, saleClass);
  
    // Add soldOut Label
    var itemSoldOutLabelHtml = soldOut ? bcSfFilterTemplate.soldOutLabelHtml : '';
    itemHtml = itemHtml.replace(/{{itemSoldOutLabel}}/g, itemSoldOutLabelHtml);

    // Add pack status
    var isPack = (data.title.indexOf('Pack') != -1) ? bcSfFilterTemplate.isPack : '';
    itemHtml = itemHtml.replace(/{{isPack}}/g, isPack);	

    // Add onSale Label
    var itemSaleLabelHtml = onSale ? bcSfFilterTemplate.saleLabelHtml : '';
    itemHtml = itemHtml.replace(/{{itemSaleLabel}}/g, itemSaleLabelHtml);

    // Add Vendor
    var itemVendorHtml = bcSfFilterConfig.custom.vendor_enable ? bcSfFilterTemplate.vendorHtml.replace(/{{itemVendorLabel}}/g, data.vendor) : '';
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
  
/*  	// Okendo reviews
    var itemOkendoReviewsHtml = this.getProductMetafield(data, 'okendo', 'ProductListingSnippet') !== null ? this.getProductMetafield(data, 'okendo', 'ProductListingSnippet') : '';
    itemHtml = itemHtml.replace(/{{itemOkendoReviews}}/g, itemOkendoReviewsHtml);
*/
    // Add main attribute (Always put at the end of this function)
    itemHtml = itemHtml.replace(/{{itemId}}/g, data.id);
    itemHtml = itemHtml.replace(/{{itemHandle}}/g, data.handle);
    itemHtml = itemHtml.replace(/{{itemTitle}}/g, data.title);
    itemHtml = itemHtml.replace(/{{itemUrl}}/g, this.buildProductItemUrl(data));

    return itemHtml;
    
//    console.log('done now?');
};

function buildThumbnail(data){

//	console.log('**building thumbnail - do we know title??' + data.title);

  var html = '';
  html += buildItemImage(data.images[0]['src'], data.title);
  if(typeof data.images[1] !== 'undefined') {
  	html += buildItemImage(data.images[1]['src'], (data.title + ' (alternate view)'));
  } else {
  	html += '<img src="'+bcSfFilterMainConfig.general.no_image_url+'">';
  }
  
  return html;
}
function buildItemImage(image, title) {
  var html = '';
  
  html = '<img src="'+bcsffilter.optimizeImage(image, 'large')+'" '+
    'srcset="'+
      bcsffilter.optimizeImage(image, 'small') 		+ ' 100w,'+
      bcsffilter.optimizeImage(image, 'compact') 	+ ' 160w,'+
      bcsffilter.optimizeImage(image, 'medium') 	+ ' 240w,'+
      bcsffilter.optimizeImage(image, 'large') 		+ ' 480w,'+
      bcsffilter.optimizeImage(image, 'grande') 	+ ' 600w,'+
      bcsffilter.optimizeImage(image, '1024x1024') 	+ ' 1024w" '+
    'sizes="50vw" '+
    'data-js-responsive="true" '+
    'alt="' + title + '" '+
    'class="grid-product__image" ' +
 	' />';

  return html;
}


// Build Product List Item
BCSfFilter.prototype.buildProductListItem = function(data) {
    // // Add Description
    // var itemDescription = jQ('<p>' + data.body_html + '</p>').text();
    // // Truncate by word
    // itemDescription = (itemDescription.split(" ")).length > 51 ? itemDescription.split(" ").splice(0, 51).join(" ") + '...' : itemDescription.split(" ").splice(0, 51).join(" ");
    // // Truncate by character
    // itemDescription = itemDescription.length > 350 ? itemDescription.substring(0, 350) + '...' : itemDescription.substring(0, 350);
    // itemHtml = itemHtml.replace(/{{itemDescription}}/g, itemDescription);
};

/************************** END BUILD PRODUCT LIST **************************/

// Build Pagination
BCSfFilter.prototype.buildPagination = function(totalProduct) {
    if (this.getSettingValue('general.paginationType') == 'default') {
        // Get page info
        var currentPage = parseInt(this.queryParams.page);
        var totalPage = Math.ceil(totalProduct / this.queryParams.limit);

        // If it has only one page, clear Pagination
        if (totalPage == 1) {
            jQ(this.selector.bottomPagination).html('');
            return false;
        }

        if (this.getSettingValue('general.paginationType') == 'default') {
            var paginationHtml = bcSfFilterTemplate.paginateHtml;

            // Build Previous
            var previousHtml = (currentPage > 1) ? bcSfFilterTemplate.previousActiveHtml : bcSfFilterTemplate.previousDisabledHtml;
            previousHtml = previousHtml.replace(/{{itemUrl}}/g, this.buildToolbarLink('page', currentPage, currentPage - 1));
            paginationHtml = paginationHtml.replace(/{{previous}}/g, previousHtml);

            // Build Next
            var nextHtml = (currentPage < totalPage) ? bcSfFilterTemplate.nextActiveHtml :  bcSfFilterTemplate.nextDisabledHtml;
            nextHtml = nextHtml.replace(/{{itemUrl}}/g, this.buildToolbarLink('page', currentPage, currentPage + 1));
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
                    pageItemsHtml += bcSfFilterTemplate.pageItemRemainHtml;
                } else {
                    pageItemsHtml += (pageArr[iPage] == currentPage) ? bcSfFilterTemplate.pageItemSelectedHtml : bcSfFilterTemplate.pageItemHtml;
                }
                pageItemsHtml = pageItemsHtml.replace(/{{itemTitle}}/g, pageArr[iPage]);
                pageItemsHtml = pageItemsHtml.replace(/{{itemUrl}}/g, this.buildToolbarLink('page', currentPage, pageArr[iPage]));
            }
            paginationHtml = paginationHtml.replace(/{{pageItems}}/g, pageItemsHtml);

            jQ(this.selector.bottomPagination).html(paginationHtml);
        }
    }
};
/************************** BUILD TOOLBAR **************************/

// Build Sorting
BCSfFilter.prototype.buildFilterSorting = function() {
//	console.log('buildFilterSorting');
    if (bcSfFilterTemplate.hasOwnProperty('sortingHtml')) {
        jQ(this.selector.topSorting).html('');

        var sortingArr = this.getSortingList();
        if (sortingArr) {
            // Build content 
            var sortingItemsHtml = '';
            for (var k in sortingArr) {
                sortingItemsHtml += '<option value="' + k +'">' + sortingArr[k] + '</option>';
            }
            var html = bcSfFilterTemplate.sortingHtml.replace(/{{sortingItems}}/g, sortingItemsHtml);
            jQ(this.selector.topSorting).html(html);

            // Set current value
            jQ(this.selector.topSorting + ' select').val(this.queryParams.sort);
        }
    }
	
//	console.log('hide that first one on search');
	$('.template-search #bc-sf-filter-products .section-header').remove();

//	$("li.option-0").before('<div class="filter-header nonwire">Non-Wire Bras</div>');
    
};


// Build Display type (List / Grid / Collage)
// BCSfFilter.prototype.buildFilterDisplayType = function() {
//     var itemHtml = '<a href="' + this.buildToolbarLink('display', 'list', 'grid') + '" title="Grid view" class="change-view bc-sf-filter-display-grid" data-view="grid"><span class="icon-fallback-text"><i class="fa fa-th" aria-hidden="true"></i><span class="fallback-text">Grid view</span></span></a>';
//     itemHtml += '<a href="' + this.buildToolbarLink('display', 'grid', 'list') + '" title="List view" class="change-view bc-sf-filter-display-list" data-view="list"><span class="icon-fallback-text"><i class="fa fa-list" aria-hidden="true"></i><span class="fallback-text">List view</span></span></a>';
//     jQ(this.selector.topDisplayType).html(itemHtml);

//     // Active current display type
//     jQ(this.selector.topDisplayType).find('.bc-sf-filter-display-list').removeClass('active');
//     jQ(this.selector.topDisplayType).find('.bc-sf-filter-display-grid').removeClass('active');
//     if (this.queryParams.display == 'list') {
//         jQ(this.selector.topDisplayType).find('.bc-sf-filter-display-list').addClass('active');
//     } else if (this.queryParams.display == 'grid') {
//         jQ(this.selector.topDisplayType).find('.bc-sf-filter-display-grid').addClass('active');
//     }
// };

/************************** END BUILD TOOLBAR **************************/

// Build Default layout
function buildDefaultLink(a,b){var c=window.location.href.split("?")[0];return c+="?"+a+"="+b}BCSfFilter.prototype.buildDefaultElements=function(a){if(bcSfFilterConfig.general.hasOwnProperty("collection_count")&&jQ("#bc-sf-filter-bottom-pagination").length>0){var b=bcSfFilterConfig.general.collection_count,c=parseInt(this.queryParams.page),d=Math.ceil(b/this.queryParams.limit);if(1==d)return jQ(this.selector.pagination).html(""),!1;if("default"==this.getSettingValue("general.paginationType")){var e=bcSfFilterTemplate.paginateHtml,f="";f=c>1?bcSfFilterTemplate.hasOwnProperty("previousActiveHtml")?bcSfFilterTemplate.previousActiveHtml:bcSfFilterTemplate.previousHtml:bcSfFilterTemplate.hasOwnProperty("previousDisabledHtml")?bcSfFilterTemplate.previousDisabledHtml:"",f=f.replace(/{{itemUrl}}/g,buildDefaultLink("page",c-1)),e=e.replace(/{{previous}}/g,f);var g="";g=c<d?bcSfFilterTemplate.hasOwnProperty("nextActiveHtml")?bcSfFilterTemplate.nextActiveHtml:bcSfFilterTemplate.nextHtml:bcSfFilterTemplate.hasOwnProperty("nextDisabledHtml")?bcSfFilterTemplate.nextDisabledHtml:"",g=g.replace(/{{itemUrl}}/g,buildDefaultLink("page",c+1)),e=e.replace(/{{next}}/g,g);for(var h=[],i=c-1;i>c-3&&i>0;i--)h.unshift(i);c-4>0&&h.unshift("..."),c-4>=0&&h.unshift(1),h.push(c);for(var j=[],k=c+1;k<c+3&&k<=d;k++)j.push(k);c+3<d&&j.push("..."),c+3<=d&&j.push(d);for(var l="",m=h.concat(j),n=0;n<m.length;n++)"..."==m[n]?l+=bcSfFilterTemplate.pageItemRemainHtml:l+=m[n]==c?bcSfFilterTemplate.pageItemSelectedHtml:bcSfFilterTemplate.pageItemHtml,l=l.replace(/{{itemTitle}}/g,m[n]),l=l.replace(/{{itemUrl}}/g,buildDefaultLink("page",m[n]));e=e.replace(/{{pageItems}}/g,l),jQ(this.selector.pagination).html(e)}}if(bcSfFilterTemplate.hasOwnProperty("sortingHtml")&&jQ(this.selector.topSorting).length>0){jQ(this.selector.topSorting).html("");var o=this.getSortingList();if(o){var p="";for(var q in o)p+='<option value="'+q+'">'+o[q]+"</option>";var r=bcSfFilterTemplate.sortingHtml.replace(/{{sortingItems}}/g,p);jQ(this.selector.topSorting).html(r);var s=void 0!==this.queryParams.sort_by?this.queryParams.sort_by:this.defaultSorting;jQ(this.selector.topSorting+" select").val(s),jQ(this.selector.topSorting+" select").change(function(a){window.location.href=buildDefaultLink("sort_by",jQ(this).val())})}}};

// Customize data to suit the data of Shopify API
BCSfFilter.prototype.prepareProductData=function(data){for(var k=0;k<data.length;k++){data[k]['images']=data[k]['images_info'];if(data[k]['images'].length>0){data[k]['featured_image']=data[k]['images'][0]}else{data[k]['featured_image']={src:bcSfFilterConfig.general.no_image_url,width:'',height:'',aspect_ratio:0}}data[k]['url']='/products/'+data[k].handle;var optionsArr=[];for(var i=0;i<data[k]['options_with_values'].length;i++){optionsArr.push(data[k]['options_with_values'][i]['name'])}data[k]['options']=optionsArr;data[k]['price_min']*=100,data[k]['price_max']*=100,data[k]['compare_at_price_min']*=100,data[k]['compare_at_price_max']*=100;data[k]['price']=data[k]['price_min'];data[k]['compare_at_price']=data[k]['compare_at_price_min'];data[k]['price_varies']=data[k]['price_min']!=data[k]['price_max'];var firstVariant=data[k]['variants'][0];if(getParam('variant')!==null&&getParam('variant')!=''){var paramVariant=data.variants.filter(function(e){return e.id==getParam('variant')});if(typeof paramVariant[0]!=='undefined')firstVariant=paramVariant[0]}else{for(var i=0;i<data[k]['variants'].length;i++){if(data[k]['variants'][i].available){firstVariant=data[k]['variants'][i];break}}}data[k]['selected_or_first_available_variant']=firstVariant;for(var i=0;i<data[k]['variants'].length;i++){var variantOptionArr=[];var count=1;var variant=data[k]['variants'][i];var variantOptions=variant['merged_options'];if(Array.isArray(variantOptions)){for(var j=0;j<variantOptions.length;j++){var temp=variantOptions[j].split(':');data[k]['variants'][i]['option'+(parseInt(j)+1)]=temp[1];data[k]['variants'][i]['option_'+temp[0]]=temp[1];variantOptionArr.push(temp[1])}data[k]['variants'][i]['options']=variantOptionArr}data[k]['variants'][i]['compare_at_price']=parseFloat(data[k]['variants'][i]['compare_at_price'])*100;data[k]['variants'][i]['price']=parseFloat(data[k]['variants'][i]['price'])*100}data[k]['description']=data[k]['content']=data[k]['body_html']}return data};

// Add additional feature for product list, used commonly in customizing product list
BCSfFilter.prototype.buildExtrasProductList = function(data, eventType) {
  // Add collection header to product list
  if(jQ(this.getSelector('products') + ' > .grid__item.section-header').length == 0) {
    var collectionItemHtml = bcSfFilterTemplate.collectionHeaderItemHtml;
    var collectionItemTitle = bcSfFilterConfig.custom.collection_title || '';
    
    var collectionItemDesc = '';
    if(typeof(bcSfFilterConfig.custom.collection_desc) !== 'undefined' && bcSfFilterConfig.custom.collection_desc !== null && bcSfFilterConfig.custom.collection_desc !== ""){
      if(bcSfFilterConfig.custom.collection_desc.indexOf('===') !== -1){
        var descArr = bcSfFilterConfig.custom.collection_desc.split('===');
        var descF = descArr[0];
        var descS = descArr[1];
        collectionItemDesc = descF;
        var newDescS = '<div class="grid__item text-center one-whole extra-text">'+descS+'</div>';
        if(jQ('#bc-sf-filter-products .extra-text').length < 1){
        	jQ('#bc-sf-filter-products').append(newDescS);
        }
      }else{
        collectionItemDesc = bcSfFilterConfig.custom.collection_desc;
      }
    }

    collectionItemHtml = collectionItemHtml.replace(/{{itemTitle}}/g, collectionItemTitle);
    collectionItemHtml = collectionItemHtml.replace(/{{itemDesc}}/g, collectionItemDesc);

    jQ(this.getSelector('products')).prepend(collectionItemHtml);
  }
  
/* Call function to get extra product html by ajax */
  this.buildExtrasProductListByAjax(data, 'boost-integration', function(results){
    results.forEach(function(result){
     // Append the custom html to product item
     jQ('[data-product-id="'+ result.id+ '"] .boost-custom-html').html(result.custom_html);
    })
  })
  
};

// Build additional elements
BCSfFilter.prototype.buildAdditionalElements = function(data, eventType) {
  if(!data) data =  this.data;
//	console.log('BUILD ADDITIONAL ELEMENTS PLESZ');
    
    var braTopsHeaderHTML = '<div class="filter-header" id="bra-tops">Bra Tops</div>';

	if ( $("#bras li a[data-title=XS]").length )
	 	$("li a[data-title=XS]").parent().before(braTopsHeaderHTML);
	else if ( $("#bras li a[data-title=S]").length )
	 	$("li a[data-title=S]").parent().before(braTopsHeaderHTML);
	else if ( $("#bras li a[data-title=M]").length )
	 	$("li a[data-title=M]").parent().before(braTopsHeaderHTML);
	else if ( $("#bras li a[data-title=L]").length )
	 	$("li a[data-title=L]").parent().before(braTopsHeaderHTML);
    
    var mixedHeaderHTML = '<div class="filter-header" id="everything-else">Everything Else</div>';

	if ($("#mixed li a[data-title=XS]").length)
	 	$("li a[data-title=XS]").parent().before(mixedHeaderHTML);
	else if ($("#mixed li a[data-title=XS_M]").length )
	 	$("li a[data-title=XS-M]").parent().before(mixedHeaderHTML);
	else if ($("#mixed li a[data-title=S]").length )
	 	$("li a[data-title=S]").parent().before(mixedHeaderHTML);
	else if ( $("#mixed li a[data-title=M]").length )
	 	$("li a[data-title=M]").parent().before(mixedHeaderHTML);
	else if ( $("#mixed li a[data-title=M-XL]").length )
	 	$("li a[data-title=M-XL]").parent().before(mixedHeaderHTML);
	else if ( $("#mixed li a[data-title=L]").length )
	 	$("li a[data-title=L]").parent().before(mixedHeaderHTML);
	 	
    var cottonUnderwearHeaderHTML = '<div class="filter-header" id="cotton-underwear">Cotton Underwear</div>';

	if ( $("#underwear li a[data-title=XS-M]").length || $("#thongs li a[data-title=XS-M]").length )
	 	$("li a[data-title=XS-M]").parent().before(cottonUnderwearHeaderHTML);
	else if ( $("#underwear li a[data-title=M-XL]").length || $("#thongs li a[data-title=M-XL]").length )
	 	$("li a[data-title=M-XL]").parent().before(cottonUnderwearHeaderHTML);
	
	
	// add IDs to inputs - first on the standard one
	$('#bc-sf-filter-tree .bc-sf-filter-option-multiple-list li input').attr('id', function() {
		var inputID = $(this).data('value');
		inputID = inputID.replace(/%3A/g, '-');
		inputID = inputID.replace('%2B', 'plus');
		return inputID;
	});	
	// add IDs to inputs - next on the h-version
	$('#bc-sf-filter-tree-h .bc-sf-filter-option-multiple-list li input').attr('id', function() {
		var inputID = $(this).data('value');
		inputID = inputID.replace(/%3A/g, '-');
		inputID = inputID.replace('%2B', 'plus');
		return 'h' + inputID;
	});	
	
	// add labels with for
	$('.bc-sf-filter-option-multiple-list li').append(function() {
		var $input = $('input', this);
		var inputID = $input.attr('id');
		var inputTitle = 'Filter by ' + $input.data('parent-label') + ': ' + $input.data('title');

		return '<label class="hide" for="' + inputID + '">' + inputTitle + '</label>';
	});

      this.buildExtrasProductListByAjax(data.products, 'boost-multiple-currencies', function(results) {
        results.forEach(function(result,index) {
            var element = jQ('[data-product-id="' + result.id + '"]');
            var minPrice = '<span class="price">'+ bcsffilter.formatMoney(result.price_min, bcsffilter.moneyFormat, true) + '</span>';
            var maxPrice = '<s>' + bcsffilter.formatMoney(result.compare_at_price_min, bcsffilter.moneyFormat, true) + '</s>';
            if (result.compare_at_price_min !== 0 && result.price_min < result.compare_at_price_min) {
              element.find('.grid-product__meta ').append('<span class="grid-product__price">' + minPrice + ' ' + maxPrice + '</span>');
            } else {
              element.find('.grid-product__meta ').append('<span class="grid-product__price">' + minPrice + '</span>');
            }
        });
    });
};


BCSfFilter.prototype.buildPlaceholderProductList = function(data, eventType) {
    if(!data) data = this.data;
    var isEnable = this.getSettingValue('general.showPlaceholderProductList');
    if (typeof isEnable !== 'undefined' && isEnable) {
        //check is first load products
        if (this.loadProductFirst == false || this.isSearchPage() || this.isVendorPage() || this.isTagPage() || this.defaultSorting == 'best-selling' || this.getSettingValue('general.productAndVariantAvailable') == true || (this.loadProductFirst == true && (eventType != 'init' || window.location.search.length > 0))) {
            //Check display is Grid tyle or this.buildPlaceholderProductExtra not defined
            if (typeof this.queryParams.display == 'undefined' || this.queryParams.display == 'grid' || typeof this.buildPlaceholderProductExtra != 'function') {
                var percent = 140,
                itemClass = bcSfFilterConfig.custom.product_grid_class || this.getSettingValue('general.placeholderProductGridItemClass');
                html = this.getTemplate('skeletonProduct'),
                imgRatio = this.getSettingValue('general.placeholderImageRatio');
                // Check if undefined 'placeholderProductGridItemClass', will get the current class from HTML
                if (itemClass == '') {
                    if (jQ(this.getSelector('products')).find('> *').length > 0) {
                        itemClass = jQ(this.getSelector('products')).find('> *').first().attr('class');
                    } else {
                        itemClass = 'bc-sf-filter-skeleton-def-width';
                    } 
                }
                html = html.replace(/{{wrapClass}}/g, itemClass);
                if (parseInt(imgRatio) > 0) {
                    percent = imgRatio * 100;
                }
                html = html.replace(/{{paddingTop}}/g, percent);

                if (this.isDefaultPaginationType() || (!this.isDefaultPaginationType() && eventType != 'page')) {
                    jQ(this.getSelector('products')).html('');
                }
                var products_per_row = parseInt(this.getSettingValue('general.placeholderProductPerRow'));
                if (products_per_row <= 0) {
                    products_per_row = bcSfFilterConfig.custom.products_per_row || 3;
                }
                for (var i = 0; i < products_per_row; i++) {
                  	if(jQ(this.getSelector('products') + ' > .grid__item.section-header').length == 0 && i == 0) {
                        var collectionItemHtml = bcSfFilterTemplate.collectionHeaderItemHtml;
                        var collectionItemTitle = bcSfFilterConfig.custom.collection_title || '';
                        var collectionItemDesc = '';
                      	if(typeof(bcSfFilterConfig.custom.collection_desc) !== 'undefined' && bcSfFilterConfig.custom.collection_desc !== null && bcSfFilterConfig.custom.collection_desc !== ""){
                          if(bcSfFilterConfig.custom.collection_desc.indexOf('===') !== -1){
                            var descArr = bcSfFilterConfig.custom.collection_desc.split('===');
                            var descF = descArr[0];
                            var descS = descArr[1];
                            collectionItemDesc = descF;
                            var newDescS = '<div class="grid__item text-center one-whole extra-text">'+descS+'</div>';
                            if(jQ('#bc-sf-filter-products .extra-text').length < 1){
                                jQ('#bc-sf-filter-products').append(newDescS);
                            }
                          }else{
                          	collectionItemDesc = bcSfFilterConfig.custom.collection_desc;
                          }
                        }
                        collectionItemHtml = collectionItemHtml.replace(/{{itemTitle}}/g, collectionItemTitle);
                        collectionItemHtml = collectionItemHtml.replace(/{{itemDesc}}/g, collectionItemDesc);
                        jQ(this.getSelector('products')).append(collectionItemHtml);
                    } else {
                    	jQ(this.getSelector('products')).append(html);
                    }
                } 
            } else {
                this.buildPlaceholderProductExtra(eventType);
            }
            jQ(this.getSelector('bottomPagination')).hide();
            jQ(this.getSelector('loadMore')).hide();
        }
    }
};


/* Start Fix version 2.3.2 */
BCSfFilter.prototype.addFilterTreeItem=function(e,r,t,i){e=jQ.parseHTML(e);if(i!=this.selector.filterTree&&i!=this.selector.filterTreeHorizontal&&jQ(i).html(""),void 0===i)i="vertical"==t?this.selector.filterTree:this.selector.filterTreeHorizontal;void 0!==r&&"before"==r?jQ(i).prepend(e):jQ(i).append(e)};
/* End Fix version 2.3.2 */



BCSfFilter.prototype.buildFilterOptionItem = function(html, iLabel, iValue, fOType, fOId, fOLabel, fODisplayType, fOSelectType, fOItemValue, fOData, fTreeType) {
  var keepValuesStatic = fOData.hasOwnProperty('keepValuesStatic') ? fOData.keepValuesStatic : false;
  // Get Title which is only text and doesn't contain "product count"
  if (fOType == 'review_ratings' && this.getSettingValue('general.ratingSelectionStyle') == 'text') {
    var title = this.getReviewRatingsLabel(fOItemValue.from);
  } else {
    var title = this.customizeFilterOptionLabel(iLabel, fOData.prefix, fOType);
  }

  // Get product number
  if (keepValuesStatic === true) var productNumber = null;
  else var productNumber = fOItemValue.hasOwnProperty('doc_count') ? fOItemValue.doc_count : 0;

  // Build main attributes
  html = html.replace(/{{itemLabel}}/g, this.buildFilterOptionLabel(iLabel, productNumber, fOData));
  html = html.replace(/{{itemLink}}/g, this.buildFilterOptionLink(fOId, iValue, fOType, fODisplayType, fOSelectType, keepValuesStatic));
  html = html.replace(/{{itemValue}}/g, encodeURIParamValue(iValue));
  html = html.replace(/{{itemTitle}}/g, title);
  
  // Build event
  if (fTreeType == 'vertical' || fTreeType == 'both') {
    var func = "onInteractWithFilterOptionValue(event, this, '" + fOType + "', '" + fODisplayType + "', '" + fOSelectType + "', '" + keepValuesStatic + "')";
  } else {
    if (this.getSettingValue('general.requestInstantly') || fOType == 'collection') {
      var func = "onInteractWithFilterOptionValue(event, this, '" + fOType + "', '" + fODisplayType + "', '" + fOSelectType + "', '" + keepValuesStatic + "')";
    } else {
      var func = 'onSelectFilterOptionItem(event, this)';
    }
  }
  html = html.replace(/{{itemFunc}}/g, func);
  // Check if item is selected or not
  html = this.checkFilterOptionSelected(fOId, iValue, fOType, fODisplayType) ? html.replace(/{{itemSelected}}/g, 'selected') : html.replace(/{{itemSelected}}/g, '');
  // Add additional attributes
  var htmlElement = jQ(html);
  
  htmlElement.children().attr({
    'data-id': fOId,
    'data-value': encodeURIParamValue(iValue),
    'data-parent-label': fOLabel,
    'data-title': title,
    'data-count': productNumber
  });
  // Add nofollow to all filter option links to increase SEO
  if (this.getSettingValue('general.enableSeo') && fOType != 'collection') {
    htmlElement.children().attr('rel', 'nofollow');
  }
  // Build Collection scope (for only Collection type)
  if (fOType == 'collection') htmlElement.children().attr('data-collection-scope', fOItemValue.key);
  
/*  if(iValue.length > 10) {
    htmlElement.css({'min-width': '45%'});
  }
  */
  return jQ(htmlElement)[0].outerHTML;
};

// Fix image url issue of swatch option
function getFilePath(fileName, ext, version) {
    var self = bcsffilter;
    var ext = typeof ext !== 'undefined' ? ext : 'png';
    var version = typeof version !== 'undefined' ? version : '1';
    var prIndex = self.fileUrl.lastIndexOf('?');
    if (prIndex > 0) {
        var filePath = self.fileUrl.substring(0, prIndex);
    } else {
        var filePath = self.fileUrl;
    }
    filePath += fileName + '.' + ext + '?v=' + version;
    return filePath;
}

BCSfFilter.prototype.getFilterData=function(eventType,errorCount){function BCSend(eventType,errorCount){var self=bcsffilter;var errorCount=typeof errorCount!=="undefined"?errorCount:0;self.showLoading();if(typeof self.buildPlaceholderProductList=="function"){self.buildPlaceholderProductList(eventType)}self.beforeGetFilterData(eventType);self.prepareRequestParams(eventType);self.queryParams["callback"]="BCSfFilterCallback";self.queryParams["event_type"]=eventType;var url=self.isSearchPage()?self.getApiUrl("search"):self.getApiUrl("filter");var script=document.createElement("script");script.type="text/javascript";var timestamp=(new Date).getTime();script.src=url+"?t="+timestamp+"&"+jQ.param(self.queryParams);script.id="bc-sf-filter-script";script.async=true;var resendAPITimer,resendAPIDuration;resendAPIDuration=2e3;script.addEventListener("error",function(e){if(typeof document.getElementById(script.id).remove=="function"){document.getElementById(script.id).remove()}else{document.getElementById(script.id).outerHTML=""}if(errorCount<3){errorCount++;if(resendAPITimer){clearTimeout(resendAPITimer)}resendAPITimer=setTimeout(self.getFilterData("resend",errorCount),resendAPIDuration)}else{self.buildDefaultElements(eventType)}});document.getElementsByTagName("head")[0].appendChild(script);script.onload=function(){if(typeof document.getElementById(script.id).remove=="function"){document.getElementById(script.id).remove()}else{document.getElementById(script.id).outerHTML=""}}}this.requestFilter(BCSend,eventType,errorCount)};BCSfFilter.prototype.requestFilter=function(sendFunc,eventType,errorCount){sendFunc(eventType,errorCount)};


BCSfFilter.prototype.customizeFilterOptionLabel = function(label, prefix, filterType, displayAllValuesInUppercaseForm) {
    // Format label and value of each filter option item
    if (filterType == 'price' || filterType == 'percent_sale') {
        label = label.replace(/\*/g, '').replace(/\-/g, ':');
        if (filterType == 'price') label = this.getPriceLabel(label);
        else label = this.getPercentSaleLabel(label);
    }

    // Remove Prefix
    if (typeof prefix !== 'undefined' && prefix !== null && prefix !== false) {
        prefix = prefix.replace(/\\/g, '');
        label = label.replace(prefix, '').trim();
    }
  
  	label = label.replace('band:','').replace('cup:','').replace('size:','');
    // No capital label of Rating filter option
    if (label.indexOf('bc-sf-filter-icon-star') > -1) return label;

    // Make the text to uppercase
    displayAllValuesInUppercaseForm = displayAllValuesInUppercaseForm || false;
    if (displayAllValuesInUppercaseForm) return label.toUpperCase();

    // Make all letters lowercase first, then capitalize all first letters of each string in a filter option value
    // For example: HELLO World => Hello World
    if (this.getSettingValue('general.forceCapitalizeFilterOptionValues')) return capitalize(label, true);

    // Make all letters lowercase first, then capitalize first letter of a filter option value
    // For example: product fILTER => Product filter
    if (this.getSettingValue('general.capitalizeFirstLetterFilterOptionValues')) return capitalize(label, true, true);
    
    // Just capitalize first letter and don't change the format of any other letters 
    // For example: hello wORLD => Hello WORLD
    if (this.getSettingValue('general.capitalizeFilterOptionValues')) return capitalize(label);

    // return label
    return label;
};

BCSfFilter.prototype.buildFilterOptionMultipleList = function(data) {
    // Sort values
    if (data.hasOwnProperty('values') && (data.valueType == 'all' || this.getSettingValue('general.sortManualValues') || (data.valueType != 'all' && data.sortManualValues))) data.values = this.sortFilterOptionValue(data);
    // Reverse order values array of Percent Sale
    if (data.filterType == 'percent_sale') data.values.reverse();
    // Build content
    var verticalContent = horizontalContent = '';
    var fOType = data.filterType,
        fOId = data.filterOptionId,
        fOLabel = data.label,
        fODisplayType = data.displayType,
        fOSelectType = data.selectType;

//	horizontalContent += '<span>';

    for (var k in data.values) {
      	var header = data['values'][k]['key'].split(':')[1];
      	if (typeof header != 'undefined') {
            if (verticalContent.indexOf('id="' + header + '"') < 0 && horizontalContent.indexOf('id="' + header + '"') < 0) {
                verticalContent += '<div class="filter-header" id="' + header + '">' + header + '</div>';
                
          //      if (header != "cup")
           //     	horizontalContent += '</span><span class="filter-group">';
                
                horizontalContent += '<div class="filter-header" id="' + header + '">';
                
                if (header == "band")
                	horizontalContent += "Wired Bras"; 
                else if (header == "size")
                	horizontalContent += "Non-Wire Bras";
                else
                	horizontalContent += header; 
                 
                horizontalContent += '</div>';
            }
        }
      	
        verticalContent += this.buildFilterOptionMultipleListData(fOType, fOId, fOLabel, fODisplayType, fOSelectType, data['values'][k], data, 'vertical');
        horizontalContent += this.buildFilterOptionMultipleListData(fOType, fOId, fOLabel, fODisplayType, fOSelectType, data['values'][k], data, 'horizontal');
        
    }


    // Get Template & Append to Filter Tree
    if (verticalContent != '' && horizontalContent != '') {
        var html = this.getTemplate('filterOptionMultipleList');
        var verticalHtml = html.replace(/{{itemList}}/g, verticalContent);
        var horizontalHtml = html.replace(/{{itemList}}/g, horizontalContent);
        this.buildFilterOption(verticalHtml, data, 'vertical');
        this.buildFilterOption(horizontalHtml, data);
    }
};

/* Begin patch boost-010 run 2 */
BCSfFilter.prototype.initFilter=function(){return this.isBadUrl()?void(window.location.href=window.location.pathname):(this.updateApiParams(!1),void this.getFilterData("init"))},BCSfFilter.prototype.isBadUrl=function(){try{var t=decodeURIComponent(window.location.search).split("&"),e=!1;if(t.length>0)for(var i=0;i<t.length;i++){var n=t[i],a=(n.match(/</g)||[]).length,r=(n.match(/>/g)||[]).length,o=(n.match(/alert\(/g)||[]).length,h=(n.match(/execCommand/g)||[]).length;if(a>0&&r>0||a>1||r>1||o||h){e=!0;break}}return e}catch(l){return!0}};
/* End patch boost-010 run 2 */
