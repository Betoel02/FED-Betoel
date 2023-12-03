var WebshopFavorites = {};
WebshopFavorites.elem;

WebshopFavorites.addProduct = function(elem, productId)
{
    // Make sure the element is a Prototype element
    elem = $(elem);

    this.elem = elem;
    this.elem.productId = productId;

    var url = PbLib.getNewURI('l/webshop2/favorites/add/' + productId);
    new Ajax.Request(url, {
            'onSuccess': WebshopFavorites.addSuccess.bindAsEventListener(this),
            'onFailure': WebshopFavorites.addFailed.bindAsEventListener(this)
        });
};

WebshopFavorites.removeProduct = function(elem, productId)
{
    // Make sure the element is a Prototype element
    elem = $(elem);

    this.elem = elem;
    this.elem.productId = productId;

    var url = PbLib.getNewURI('l/webshop2/favorites/remove/' + productId);
    new Ajax.Request(url, {
            'onSuccess': WebshopFavorites.removeSuccess.bindAsEventListener(this),
            'onFailure': WebshopFavorites.removeFailed.bindAsEventListener(this)
        });
};

WebshopFavorites.addFailed = function(transport)
{
    dialogElem = window.top.PbLib.createDialog(false, 400, 75);
    dialogElem.update("<div style='text-align: center;'>" +
        "<div>" + 'Het product kon niet toegevoegd worden aan de favorieten.' + "</div>" +
        "<div><a href='" + window.top.document.location + "' onclick='Event.stop(event); window.top.PbLib.destroyDialog();'>" + 'Sluiten' + "</a></div>" +
        "</div>");
};

WebshopFavorites.addSuccess = function(transport)
{
    // Check the outcome of the transport
    if (Object.isUndefined(transport.responseText) || !transport.responseText.match(/^ok$/i)) {
        this.addFailed(transport);
        return false;
    }

    // Replace the innerHTML, onclick and class of the element
    this.elem.stopObserving('click');
    this.elem.writeAttribute('onclick', '');
    this.elem.removeClassName('product-add-to-favorites webshop-icon-heart');
    this.elem.addClassName('product-remove-from-favorites webshop-icon-heart-filled');
    var productFavoritesText = this.elem.querySelector('.product-favorites-text');

    if (!productFavoritesText) {
        this.elem.innerHTML = 'Verwijderen van favorieten';
    } else {
        productFavoritesText.innerText = 'Verwijderen van favorieten';
    }

    this.elem.observe('click', function(event) {
        WebshopFavorites.removeProduct(this, this.productId);
        Event.stop(event);
    });

    return true;
};

WebshopFavorites.removeFailed = function(transport)
{
    dialogElem = window.top.PbLib.createDialog(false, 400, 75);
    dialogElem.update("<div style='text-align: center;'>" +
        "<div>" + 'Het product kon niet verwijderd worden van de favorieten.' + "</div>" +
        "<div><a href='" + window.top.document.location + "' onclick='Event.stop(event); window.top.PbLib.destroyDialog();'>" + 'Sluiten' + "</a></div>" +
        "</div>");
};

WebshopFavorites.removeSuccess = function(transport)
{
    // Check the outcome of the transport
    if (Object.isUndefined(transport.responseText) || !transport.responseText.match(/^ok$/i)) {
        this.addFailed(transport);
        return false;
    }

    // Replace the innerHTML, onclick and class of the element
    this.elem.stopObserving('click');
    this.elem.writeAttribute('onclick', '');
    this.elem.removeClassName('product-remove-from-favorites webshop-icon-heart-filled');
    this.elem.addClassName('product-add-to-favorites webshop-icon-heart');
    var productFavoritesText = this.elem.querySelector('.product-favorites-text');

    if (!productFavoritesText) {
        this.elem.innerHTML = 'Voeg toe aan favorieten';
    } else {
        productFavoritesText.innerText = 'Voeg toe aan favorieten';
    }

    this.elem.observe('click', function(event) {
        WebshopFavorites.addProduct(this, this.productId);
        Event.stop(event);
    });

    return true;
};
