/**
 * @description Common UI improvements, should be included in all variants.
 * 				Usage: Replace all instances of "VGM" with the name of the UI you are building and rename the file accordingly.
 */

require([
        'domReady',
        '/ui/van-gogh-museum/script/stickybits.min.js'
    ],
    function (domReady, stickybits) {
        'use strict';

        var elements = {};
        var isSidePanelOpen = false;
        var cachedScrollPosY;
        var storage = {};

        function init () {
            var supportsTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);

            if (!supportsTouch) {
                document.documentElement.className += ' non-touch';
            }

            if (supportsTouch) {
                document.documentElement.className += ' has-touch';
            }

            elements.body = document.body;
            elements.webshopMenuToggler = elements.body.querySelector('.nav--webshop__toggler');
            elements.sidePanel = document.querySelector('.sidePanel');
            elements.sidePanelToggler = elements.body.querySelector('.menuButton');
            elements.sidePanelWithSubItems = document.querySelectorAll('.navMobile__inner .sub');
            elements.searchToggler = elements.body.querySelector('.searchButton');
            elements.closeSearchToggler = elements.body.querySelector('.webshop-product-search-close');
            elements.banner25 = elements.body.querySelectorAll('.bannerAT--25');
            elements.banner50 = elements.body.querySelectorAll('.bannerAT--50');
            elements.banner50portrait = elements.body.querySelectorAll('.bannerAT--50portrait');
            elements.banner75 = elements.body.querySelectorAll('.bannerAT--75');
            elements.banner100 = elements.body.querySelectorAll('.bannerAT--100');
            elements.video = elements.body.querySelectorAll('.videoAT');
            elements.donations = elements.body.querySelectorAll('.donationProducts');
            elements.webshopFilterTitle = elements.body.querySelector('.webshop-filter-article > h2');
            elements.webshopPackingEntity = elements.body.querySelector('.packing-entity');
            elements.webshopVideo = elements.body.querySelector('.productDetails__video');
            elements.videos = document.querySelectorAll('iframe[src*="//www.youtube"], ' +
                'iframe[src*="//player.vimeo.com"]');
            elements.shippingMethodDescriptions = document.querySelectorAll('#shippingMethod .payment-description');
            elements.compactShoppingCart = document.querySelector('.shopping-cart-compact');
            elements.compactShoppingCartButton = document.querySelector('.shopping-cart-compact > a');
            elements.mobileCategoryWithSubItems = document.querySelectorAll('.nav__sidepanelCategories .sub');
            elements.mobileCategoriesWrapper = document.querySelector('.nav__sidepanelCategories ul');
            elements.header = document.querySelector('.header');
            elements.headerTop = document.querySelector('.header__topBar');
            elements.navMainWithSubItems = document.querySelectorAll('.navMain__inner .sub');
            elements.viewport = document.querySelector('.viewport');
            elements.shoppingCartProductQuantityInputs = document.querySelectorAll('#s-page-products .product-quantity');

            rebuildProductQuantityInputs();

            if (elements.banner25) {
                addClassToArticleDivs(elements.banner25, 'vg__bannerAT--25');
            }
            if (elements.banner50) {
                addClassToArticleDivs(elements.banner50, 'vg__bannerAT--50');
            }
            if (elements.banner50portrait) {
                addClassToArticleDivs(elements.banner50portrait, 'vg__bannerAT--50portrait');
            }
            if (elements.banner75) {
                addClassToArticleDivs(elements.banner75, 'vg__bannerAT--75');
            }
            if (elements.banner100) {
                addClassToArticleDivs(elements.banner100, 'vg__bannerAT--100');
            }
            if (elements.video) {
                addClassToArticleDivs(elements.video, 'vg__videoAT');
            }
            if (elements.donations) {
                addClassToArticleDivs(elements.donations, 'vgm__donationArticle');
            }

            if (elements.webshopFilterTitle) {
                elements.webshopFilterTitle.addClassName('icon-arrow-down');
            }

            if (elements.webshopPackingEntity) {
                var packingEntity = elements.body.querySelector('.packing-entity');
                var addToShoppingCart = elements.body.querySelector('span.add-to-shopping-cart');
                var addToShoppingCartLink = elements.body.querySelector('.add-to-shopping-cart-link');

                addToShoppingCart.insertBefore(packingEntity, addToShoppingCartLink);
            }

            if (elements.videos.length > 0) {
                makeVideosResponsive(elements.videos);
            }

            if (elements.webshopVideo) {
                createLinkToVideo();
            }

            addTableWrappers();

            storage.popupIsOpen = false;

            // OnClick functions
            if (elements.webshopMenuToggler) elements.webshopMenuToggler.on('click', toggleWebshopMenu);
            if (elements.sidePanelToggler) elements.sidePanelToggler.on('click', togglesidePanel);
            if (elements.searchToggler) elements.searchToggler.on('click', togglesidePanelAndSearch);
            if (elements.closeSearchToggler) elements.closeSearchToggler.on('click', closeSearchPanel);
            if (elements.webshopFilterTitle) elements.webshopFilterTitle.on('click', toggleWebshopFilter);

            // Open/pin productPopup on hover
            if (storage.popupIsOpen === false) {
                elements.compactShoppingCartButton.on('mouseover', function () {
                    elements.compactShoppingCart.addClassName('shopping-cart-compact--productsPopupOpen');
                    storage.popupIsOpen = true;
                });
            }

            document.on('click', function () {
                if (!elements.compactShoppingCart || !elements.compactShoppingCartButton) {
                    return;
                }

                var productsPopup = document.querySelector('.c-productsPopup');

                if (productsPopup && elements.compactShoppingCart.hasClassName('shopping-cart-compact--productsPopupOpen')) {
                    elements.compactShoppingCart.removeClassName('shopping-cart-compact--productsPopupOpen');
                    storage.popupIsOpen = false;
                }
            });

            for (var i = 0; i < elements.mobileCategoryWithSubItems.length; i++) {
                elements.mobileCategoryWithSubItems[i].addEventListener('click', handleMobileCategoriesClick);
            }

            for (i = 0; i < elements.sidePanelWithSubItems.length; i++) {
                elements.sidePanelWithSubItems[i].addEventListener('click', toggleSidePanelSubMenuItems);
            }

            for (i = 0; i < elements.navMainWithSubItems.length; i++) {
                elements.navMainWithSubItems[i].addEventListener('click', toggleNavMainSubMenuItems);
            }

            var SubMenuItemsNavMainCloseButton = document.getElementById('closeSubMenuItemsNavMain');
            if (SubMenuItemsNavMainCloseButton) {
                SubMenuItemsNavMainCloseButton.addEventListener('click', function() {
                    if (storage.openMainMenuItem) {
                        hideSubMenuItems(elements.viewport);
                    }
                });
            }

            /** Mouse event handlers are used as an alternative for :hover,
             * since mobile devices can set :hover styling on a click */
            for (i = 0; i < elements.shippingMethodDescriptions.length; i++) {
                elements.shippingMethodDescriptions[i].addEventListener('mouseover', showShippingDescriptionOnMouseOver);
                elements.shippingMethodDescriptions[i].addEventListener('mouseout', hideShippingDescriptionOnMouseOut);
            }

            document.addEventListener('click', showPaymentDescriptionOnClick);

            // Prevent touchscreen devices from directly going to the first child in the menu
            if (window.addEventListener) {
                // Initialize Event handler for window size changes.
                window.addEventListener('resize', handleOnResizeWindow, false);
            }

            /**
             * Handle on resize window to move mobile navigation
             */
            function handleOnResizeWindow () {
                // First of all, create a timer to prevent this function firing 100s of times during the resize event
                if (typeof(storage.resizeTo) === 'number') {
                    window.clearTimeout(storage.resizeTo);
                    delete storage.resizeTo;
                }

                storage.resizeTo = function () {
                    handleMainNavigation();
                    storage.viewportHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
                }.delay(0.1);
            }

            function handleMainNavigation () {
                if (isTouchEnabled() && document.documentElement.clientWidth >= 769) {
                    elements.body.select('.nav--webshop > ul > li > a.sub').each(function(navElem) {
                        navElem.on('click', function () {
                            event.preventDefault();

                            var allItemsList = navElem.up(1);
                            var allItems = allItemsList.select('li');

                            allItems.each(function (item) {
                                item.removeClassName('active');
                            });

                            navElem.up(0).toggleClassName('active');
                        });
                    });

                    elements.body.on('click', function () {
                        allItems.each(function (item) {
                            item.removeClassName('active');
                        });
                    });
                }
            }

            Event.observe(document, 'keyup', closeOverlayWithEscKey);

            stickybits('.navWebshopBar');
        }

        function rebuildProductQuantityInputs() {
            if (elements.shoppingCartProductQuantityInputs < 1) {
                return;
            }

            for (var i = 0; i < elements.shoppingCartProductQuantityInputs.length; i++) {
                var input = elements.shoppingCartProductQuantityInputs[i];
                new ProductQuantity(input);
            }
        }

        var ProductQuantity = function (input) {
            this.input = input;

            this.buttonUp = document.createElement('button');
            this.buttonDown = document.createElement('button');

            this.buttonUp.classList.add('number-of-products__increase', 'icon-plus-bold');
            this.buttonDown.classList.add('number-of-products__decrease', 'icon-min-bold');

            this.input.insertAdjacentElement('afterend', this.buttonUp);
            this.input.insertAdjacentElement('beforebegin', this.buttonDown);

            this.buttonUp.addEventListener('click', this.updateStepUp.bind(this));
            this.buttonDown.addEventListener('click', this.updateStepDown.bind(this));
        };

        ProductQuantity.prototype.updateStepUp = function (event) {
            event.preventDefault();
            this.input.parentNode.querySelector('.product-quantity').stepUp();
            updateProductQuantity(this.input);
        };

        ProductQuantity.prototype.updateStepDown = function (event) {
            event.preventDefault();
            this.input.parentNode.querySelector('.product-quantity').stepDown();
            updateProductQuantity(this.input);
        };

        function closeOverlayWithEscKey(event) {
            if (event.keyCode === Event.KEY_ESC) {
                closeSearchPanel();
            }
            if (event.keyCode === Event.KEY_ESC && storage.openMainMenuItem) {
                hideSubMenuItems(elements.viewport);
            }
        }

        /**
         * Create a link to scroll to the webshop video
         */
        function createLinkToVideo () {
            // The main image, we want to use as background for the new link element
            var mainImage = document.querySelector('.productDetails__images--primary img');

            // The new element we want to insert
            var	liElem = document.createElement('li'),
                linkToVideoElement = document.createElement('a'),
                imgElem = document.createElement('img');

            imgElem.setAttribute('width', '100');
            imgElem.setAttribute('height', '100');
            imgElem.setAttribute('src', mainImage.getAttribute('src'));

            linkToVideoElement.setAttribute('class', 'productDetails__linkToVideo icon-play scrollToTarget');
            linkToVideoElement.setAttribute('href', '#productDetails__extraWrapper');
            linkToVideoElement.setAttribute('title', 'Bekijk de productvideo');

            // The element we want to append the new element to
            var secondaryImages = document.querySelector('.productDetails__images--secondary .wpd-imgages-gallery');

            secondaryImages.appendChild(liElem);
            liElem.appendChild(linkToVideoElement);
            linkToVideoElement.appendChild(imgElem);
        }

        /**
         * Check if device supports touch
         * @returns {Boolean}
         */
        function isTouchEnabled () {
            return 'ontouchstart' in window || 'onmsgesturechange' in window;
        }

        /**
         * Open/close the webshop menu on small screens
         */
        function toggleWebshopMenu () {
            elements.body.toggleClassName('webshopNav-visible');
        }

        function handleMobileCategoriesClick(event) {
            event.preventDefault();

            var element = event.currentTarget;
            var clickedItem = element.parentNode;
            var isActiveClickedItem = clickedItem === storage.openMainMenuItem;
            var secondLevelActiveContainer = document.querySelector('.navWebshopBar');

            if (storage.openMainMenuItem) {
                hideSubMenuItems(secondLevelActiveContainer);
            }

            if (!isActiveClickedItem) {
                showSubMenuItems(clickedItem, secondLevelActiveContainer);
            }
        }

        function toggleSidePanelSubMenuItems(event) {
            event.preventDefault();

            var element = event.currentTarget;
            var clickedItem = element.parentNode;
            var isActiveClickedItem = clickedItem === storage.openMainMenuItem;
            var secondLevelActiveContainer = elements.sidePanel;

            if (storage.openMainMenuItem) {
                hideSubMenuItems(secondLevelActiveContainer);
            }

            if (!isActiveClickedItem) {
                showSubMenuItems(clickedItem, secondLevelActiveContainer);
            }
        }

        function toggleNavMainSubMenuItems(event) {
            event.preventDefault();

            var element = event.currentTarget;
            var clickedItem = element.parentNode;
            var isActiveClickedItem = clickedItem === storage.openMainMenuItem;
            var secondLevelActiveContainer = elements.viewport;

            if (storage.openMainMenuItem) {
                hideSubMenuItems(secondLevelActiveContainer);
            }

            if (!isActiveClickedItem) {
                showSubMenuItems(clickedItem, secondLevelActiveContainer);
            }
        }

        function hideSubMenuItems(secondLevelActiveContainer) {
            storage.openMainMenuItem.classList.remove('open');
            secondLevelActiveContainer.classList.remove('secondLevelActive');
            storage.openMainMenuItem = false;
        }

        function showSubMenuItems(clickedItem, secondLevelActiveContainer) {
            clickedItem.classList.add('open');
            secondLevelActiveContainer.classList.add('secondLevelActive');
            storage.openMainMenuItem = clickedItem;
        }

        /**
         * Open/close the sidePanel
         */
        function togglesidePanel () {
            if (isSidePanelOpen === false) {
                var doc = document.documentElement;
                cachedScrollPosY = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
            }

            isSidePanelOpen = !isSidePanelOpen;
            elements.body.toggleClassName('sidePanel-visible');
            elements.sidePanelToggler.toggleClassName('icon-menu');
            elements.sidePanelToggler.toggleClassName('icon-close');

            if (isSidePanelOpen === true) {
                window.scrollTo(0, 0);
                return;
            }

            window.scrollTo(0, cachedScrollPosY);
        }

        /**
         * Open/close the sidePanel and focus search
         */
        function togglesidePanelAndSearch () {
            if (elements.body.classList.contains('webshop-searchresults')) {
                var searchFieldArticle = elements.body.querySelector('.article .webshop-product-search input');
                searchFieldArticle.focus();
                searchFieldArticle.select();
                return;
            }
            elements.body.toggleClassName('searchPanel-visible');

            var searchField = elements.body.querySelector('.webshop-product-search-header input');
            searchField.focus();
        }

        function closeSearchPanel () {
            elements.body.classList.remove('searchPanel-visible');
        }

        /**
         * Open/close the webshop filter
         */
        function toggleWebshopFilter () {
            elements.body.toggleClassName('webshop-filter-visible');
            elements.webshopFilterTitle.toggleClassName('icon-plus');
            elements.webshopFilterTitle.toggleClassName('icon-min');
        }

        /**
         * Add class to div around article template
         */
        function addClassToArticleDivs (elements, className) {
            for (var i = 0; i < elements.length; i++) {
                elements[i].up('.article').addClassName(className);
            }
        }

        function showShippingDescriptionOnMouseOver (event) {
            var element = event.target || event.srcElement;
            if (element.classList.contains('payment-description')) {
                element.classList.add('payment-description--visible');
            }
        }

        function hideShippingDescriptionOnMouseOut (event) {
            var element = event.target || event.srcElement;
            if (element.classList.contains('payment-description')) {
                element.classList.remove('payment-description--visible');
            }
        }

        /**
         * @param {Event} event
         */
        function showPaymentDescriptionOnClick (event) {
            var element = event.target || event.srcElement;

            /** Only show or hide description on click on touch devices, since desktop users can use :hover */
            if (!isTouchEnabled()) {
                return;
            }

            if (storage.activeShippingMethodeDescription &&
                storage.activeShippingMethodeDescription.classList.contains('payment-description--visible') &&
                storage.activeShippingMethodeDescription !== element) {
                storage.activeShippingMethodeDescription.classList.remove('payment-description--visible');
            }

            if (element.classList.contains('payment-description')) {
                element.classList.toggle('payment-description--visible');
                storage.activeShippingMethodeDescription = element;
            }
        }

        /**
         * Make videos responsive by
         * @param {Array} videoElements
         */
        function makeVideosResponsive (videoElements) {
            var i;

            for (i = 0; videoElements.length > i; i++) {
                var video = videoElements[i];
                var width = video.width ? video.width : video.clientWidth;
                var height = video.height ? video.height : video.clientHeight;
                var videoHeightPercentage = (100 / width) * height;
                var	videoWrapper = document.createElement('div');

                videoWrapper.setAttribute('class', 'video-wrapper');
                videoWrapper.style.paddingBottom = videoHeightPercentage + '%';

                video.parentNode.insertBefore(videoWrapper, video.nextSibling);
                videoWrapper.appendChild(video);
            }
        }

        /**
         * Add wrapper to around all tables (to apply styling with CSS: horizontal scroll on smaller screens)
         */
        function addTableWrappers () {
            var allTables = document.querySelectorAll('table');
            var j;

            for (j = 0; j < allTables.length; j++) {
                var table = allTables[j];
                var tableWrapper = document.createElement('div');

                tableWrapper.setAttribute('class', 'table-wrapper');
                table.parentNode.insertBefore(tableWrapper, table.nextSibling);
                tableWrapper.appendChild(table);
            }
        }

        domReady(init);
    }
);
