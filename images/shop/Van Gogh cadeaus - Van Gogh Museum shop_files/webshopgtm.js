
var gtmProductClickHandler = {};

gtmProductClickHandler.createDataLayerProductObject = function (dataLayer) {
    var layerData = [];
    var impressionsData = dataLayer[0].ecommerce.impressions;
    for (var i = 0; i < impressionsData.length; i++) {
        layerData[impressionsData[i].id] = impressionsData[i];
    }

    return layerData;
};

gtmProductClickHandler.pushToDataLayer = function (gtmPushTarget) {
    dataLayer.push({
        event: 'productClick',
        ecommerce: {
            click: {
                actionField: {list: gtmPushTarget.list},
                products: [{
                    id: gtmPushTarget.id,
                    price: gtmPushTarget.price,
                    brand: gtmPushTarget.brand,
                    category: gtmPushTarget.category,
                    variant: gtmPushTarget.variant,
                    position: gtmPushTarget.position
                }]
            }
        }
    });
    dataLayer.push({
        event: 'select_item',
        ecommerce: {
            currency: 'EUR',
            items: [{
                item_id: gtmPushTarget.id,
                item_name: gtmPushTarget.name,
                item_brand: gtmPushTarget.brand,
                item_category: gtmPushTarget.category,
                price: gtmPushTarget.price,
                item_variant: gtmPushTarget.variant,
                index: gtmPushTarget.position
            }]
        }
    });
};

document.observe('dom:loaded', function () {
    var dataLayerProductsObject = (typeof dataLayer !== 'undefined') ?
        gtmProductClickHandler.createDataLayerProductObject(dataLayer) : false;
    $$('.product-list > li').each(function (elem) {
        elem.observe('click', function () {
            if (this.getAttribute('data-product-id')) {
                var gtmPushTarget = dataLayerProductsObject[this.getAttribute('data-product-id')];
                gtmPushTarget.url = this.getAttribute('data-detail-href');
                gtmProductClickHandler.pushToDataLayer(gtmPushTarget);
            }
        });
    });
});
