var WebshopCart = {};
WebshopCart.anchorElem;
WebshopCart.productId;
WebshopCart.isAvailable = true;
WebshopCart.origElemInnerHTML;
WebshopCart.replaceButtonText = false; // this is a config option

/**
 * If you need more flexibility try the terribly named but flexible addProductLight
 * @param elem
 * @param productId
 * @param categoryId
 * @returns {boolean}
 */
WebshopCart.addProduct = function(elem, productId, categoryId)
{
	// Make sure this function is "not in use"
	if (!this.isAvailable) {
		return false;
	}

	// Category ID is optional
	if (Object.isUndefined(categoryId)) {
		var categoryId = '';
	}

	// Make sure the element is a Prototype element
	elem = $(elem);

	// Check for available quantity field
	if (!elem.previous('input.product-quantity') || Object.isUndefined(elem.previous('input.product-quantity').value)) {
		return false;
	}

	// Set to "in use"
	this.isAvailable = false;

	var quantity = elem.previous('input.product-quantity').value;
	this.anchorElem = elem;
	this.productId = productId;
	this.origElemInnerHTML = elem.innerHTML;

	var loaderImage = new Element('img', {'src': PbLib.getNewURI('files/mod_webshop2/img/shopping-cart-loader.gif')});
	if (WebshopCart.replaceButtonText) {
		elem.update(loaderImage);
	} else {
		//elem.appendChild(loaderImage);
		var productListThumb = elem.up('.productList__thumb');

		if (productListThumb) {
			productListThumb.addClassName('productList__thumb--success');
		}
	}

	WebshopCart.addProductLight(productId, quantity, categoryId, WebshopCart.addSuccess.bindAsEventListener(this), WebshopCart.addFailed.bindAsEventListener(this));
}

/**
 * This function is an alternative for addProduct. Mainly because addProduct is way to specific concerning HTML that
 * should be present and loaders that are set. Therefor it is not reusable, this function hopes to be...
 *
 * @param productId
 * @param quantity
 * @param callBackSuccess
 * @param callbackFailure
 * @param categoryId
 */
WebshopCart.addProductLight = function(productId, quantity, categoryId, callBackSuccess, callbackFailure)
{
	// Category ID is optional
	if (Object.isUndefined(categoryId)) {
		var categoryId = '';
	}

	//quantity normalisation
	quantity = parseFloat( quantity.replace(',', '.') );
	if (Object.isNumber(quantity) && !isNaN(quantity)) {
		quantity = quantity.round().abs();
	} else {
		quantity = 1;
	}

	var url = PbLib.getNewURI('l/webshop2/shoppingcart/add/' + productId + '/' + quantity + '?c=' + categoryId);

	new Ajax.Request(url, {
		onFailure: callbackFailure || null,
		onSuccess: callBackSuccess || null
	});
}

WebshopCart.clearShoppingCartContents = function(webshopId, successCallback, failureCallback)
{
	var url = PbLib.getNewURI('l/webshop2/shoppingcart/clearcontents/' + webshopId);

	new Ajax.Request(url, {
		onSuccess: successCallback,
		onFailure: failureCallback
	});
};

WebshopCart.selectProductVariant = function(elem, productId)
{
	// Make sure this function is "not in use"
	if (!this.isAvailable) {
		return;
	}

	// Make sure the element is a Prototype element
	elem = $(elem);

	// Check for available quantity field
	if (!elem.previous('input.product-quantity') || Object.isUndefined(elem.previous('input.product-quantity').value)) {
		return;
	}

	var quantity = elem.previous('input.product-quantity').value;
	quantity = parseFloat(quantity.replace(',', '.'));
	if (Object.isNumber(quantity) && !isNaN(quantity)) {
		quantity = quantity.round().abs();
	} else {
		quantity = 1;
	}

	this.anchorElem = elem;
	this.origElemInnerHTML = elem.innerHTML;

	PbLib.createDialog(PbLib.getNewURI('k/webshop2/product/' + productId + '/selectvariant?quantity=' + quantity), 800, 'fit', {
		enableMaximize: false,
		enableResize: false,
		enableDragging: false,
		shadeWindow: false
	});
};

WebshopCart.addProductVariant = function (productId, quantity) {

	var url = PbLib.getNewURI('l/webshop2/shoppingcart/add/' + productId + '/' + quantity);

	this.productId = productId;

	var loaderImage = new Element('img', {src: PbLib.getNewURI('files/mod_webshop2/img/shopping-cart-loader.gif')});
	new Ajax.Request(url, {
		onSuccess: WebshopCart.addSuccess.bindAsEventListener(this),
		onFailure: WebshopCart.addFailed.bindAsEventListener(this)
	});

	PbLib.destroyDialog();

	if (this.anchorElem) {
		this.anchorElem.up('.productList__thumb').addClassName('productList__thumb--success');
	}
};

/**
 * Switch to the panel of the selected product variant
 * @param productId The id of the product variant
 */
WebshopCart.selectVariantPanel = function(productId)
{
	var newPanel = $('product-panel-' + productId);

	// find the currently active panel
	var oldPanel = newPanel.up(".variant-selector").select(".shown")[0];

	// hide the old panel
	oldPanel.removeClassName('shown');

	// show new panel
	newPanel.addClassName('shown');

	// check and focus the radiobutton
	var radio = newPanel.select('input[value=' + productId +']')[0];
	radio.checked = 'checked';
	radio.focus();

	// copy the quantity of products
	newPanel.select('input.product-quantity')[0].value = oldPanel.select('input.product-quantity')[0].value;
}

WebshopCart.selectProductConfiguration = function(elem, productId, categoryId) {
	// Make sure this function is "not in use"
	if (!this.isAvailable) {
		return;
	}

	// Category ID is optional
	if (Object.isUndefined(categoryId)) {
		var categoryId = '';
	}

	// Make sure the element is a Prototype element
	elem = $(elem);

	// Check for available quantity field
	if (!elem.previous('input.product-quantity') || Object.isUndefined(elem.previous('input.product-quantity').value)) {
		return;
	}

	var quantity = elem.previous('input.product-quantity').value;
	quantity = parseFloat( quantity.replace(',', '.') );
	if (Object.isNumber(quantity) && !isNaN(quantity)) {
		quantity = quantity.round().abs();
	} else {
		quantity = 1;
	}

	this.anchorElem = elem;
	this.origElemInnerHTML = elem.innerHTML;

	PbLib.createDialog(PbLib.getNewURI('k/webshop2/configurable-product/' + productId + '/configure?quantity=' + quantity), 600, 'fit', {
		enableMaximize: false,
		enableResize: false,
		enableDragging: false,
		shadeWindow: false
	});
}

WebshopCart.addProductConfiguration = function (productId, quantity, configuration) {

	var url = PbLib.getNewURI('l/webshop2/shoppingcart/add/' + productId + '/' + quantity + '?' + configuration);

	this.productId = productId;

	var loaderImage = new Element('img', {'src': PbLib.getNewURI('files/mod_webshop2/img/shopping-cart-loader.gif')});
	this.anchorElem.update(loaderImage);
	new Ajax.Request(url, {
		'onSuccess': WebshopCart.addSuccess.bindAsEventListener(this),
		'onFailure': WebshopCart.addFailed.bindAsEventListener(this)
	});


	PbLib.destroyDialog();
}

WebshopCart.addFailed = function(transport)
{
	// Reset the element and show a dialog with an error
	this.anchorElem.innerHTML = this.origElemInnerHTML;
	var dialogElem = window.top.PbLib.createDialog(false, 400, 75);
	dialogElem.update("<div style='text-align: center;'>" +
		"<div>" + transport.responseJSON.msg + "</div>" +
		"<div><a href='#' onclick='Event.stop(event); window.top.PbLib.destroyDialog();'>" + 'Sluiten' + "</a></div>" +
		"</div>");

	// Set back to "not in use"
	this.isAvailable = true;
}

WebshopCart.addSuccess = function(transport)
{
	// Check the outcome of the transport
	if (Object.isUndefined(transport.responseJSON) || transport.responseJSON.status !== 'OK') {
		this.addFailed(transport);
		return false;
	}

	var _this = this;

    this.reloadShoppingCartSnippet(this.productId, function () {
        _this.anchorElem.addClassName("product-add-success");

        var elem = _this.anchorElem;
        var elemInnerHTML = _this.origElemInnerHTML;
        (function (elem, elemInnerHTML) {(function () {
            elem.innerHTML = elemInnerHTML;
            elem.removeClassName("product-add-success");

            if (elem.up('.productList__thumb')) {
                elem.up('.productList__thumb').removeClassName('productList__thumb--success');
            }
        }).delay(2);})(elem, elemInnerHTML);

        if (elem.up(1).down('span.add-to-shopping-cart')) {
            elem.up(1).down('span.add-to-shopping-cart').addClassName('product-in-shopping-cart');
        }

        _this.isAvailable = true;
        document.fire('webshop:productAddedToCart');
    });
};

WebshopCart.reloadShoppingCartSnippet = function (productId, callback)
{
	var snippet = $('webshop-shopping-cart-snippet');

	if (!snippet) {
        callback();
        return;
	}

	var siteId = 0;
	var header = snippet.down('h3');
	if (!Object.isUndefined(header.id)) {
		siteId = header.id.gsub('site-', '');
	}

	var articleId = 0;
	var article = snippet.up(1);
	if (!Object.isUndefined(article.id)) {
		articleId = article.id.gsub('art_', '');
	}

	var url = PbLib.getNewURI('l/webshop2/shoppingcart/reload/' + productId);
	if (siteId > 0) {
		url += '/' + siteId;
	}

	new Ajax.Request(url, {
		'parameters': {
			'article_id': articleId
		},
		'method': 'get',
		'onSuccess': function (response) {
			callback();

			if (response.responseText.indexOf("webshop-shopping-cart-snippet") > 0) {
				snippet.replace(response.responseText);
			} else {
				snippet.replace('<div id="webshop-shopping-cart-snippet">' + response.responseText + '</div>');
			}

			var shoppingCartElement = $('webshop-shopping-cart-snippet');

			window.setTimeout(function () {
				shoppingCartElement.addClassName('shopping-cart-compact--peekInto');

				window.setTimeout(function () {
					shoppingCartElement.removeClassName('shopping-cart-compact--peekInto');
				}, 3000);
			}, 0);

			Event.fire(shoppingCartElement, 'pb:webshop2:updateShoppingCart');
		}
	});
}

WebshopCart.addProductSingle = function(productId, categoryId)
{
	// Make sure this function is "not in use"
	if (!this.isAvailable) {
		return false;
	}

	// Category ID is optional
	if (Object.isUndefined(categoryId)) {
		var categoryId = '';
	}

	var url = PbLib.getNewURI('l/webshop2/shoppingcart/add/' + productId + '/1' + '?c=' + categoryId);
	new Ajax.Request(url, {
		'onSuccess': WebshopCart.addSuccessSingle.bindAsEventListener(this),
		'onFailure': WebshopCart.addFailedSingle.bindAsEventListener(this)
	});
}

WebshopCart.addFailedSingle = function(transport)
{
	// Reset the element and show a dialog with an error
	if ( ! Object.isUndefined(this.anchorElem) && ! Object.isUndefined(this.origElemInnerHTML)) {
		this.anchorElem.innerHTML = this.origElemInnerHTML;
	}
	var dialogElem = window.top.PbLib.createDialog(false, 400, 75);
	dialogElem.update("<div style='text-align: center;'>" +
		"<div>" + transport.responseJSON.msg + "</div>" +
		"<div><a href='#' onclick='Event.stop(event); window.top.PbLib.destroyDialog();'>" + 'Sluiten' + "</a></div>" +
		"</div>");
}

WebshopCart.addSuccessSingle = function(transport)
{
	if (Object.isUndefined(transport.responseJSON) || transport.responseJSON.status !== 'OK') {
		this.addFailedSingle(transport);
	} else {
		PbLib.notice('success', 'Product toegevoegd aan winkelwagen');
	}
}

