/**
 * @author Procurios (Peter Slagter)
 * @requires Prototype.js
 * @description Shared methods for all Article Gallery snippets
 */

ProContent = window.ProContent || {};

ProContent.ArticleGallery = function (config) {
    var self = this;

    // Make sure the function is called as a constructor (using new)
    if (ProContent === this) {
        return new ProContent.ArticleGallery(config);
    }

    // Store variables, elements, settings
    this.config = config;
    this.galleryContainer = $(config.id);
    this.articles = this.galleryContainer.select('.'+this.classNames.article);
    this.interval = '';
    this.settings = {
        'articleCount': this.articles.length,
        'currentArticle': 0,
        'previousArticle': 0,
        'isChangingArticle': false,
        'touchStart': 0,
        'touchEnd': 0
    };
    this.parentContainer = this.galleryContainer.up("div.article");

    if (this.config.useFlexDimensions === 1) {
        this.flexHeight = this.articles[0].getHeight();
        this.flexWidth = this.parentContainer.getWidth();

        this.galleryContainer.setStyle({
            'width': this.flexWidth + 'px',
            'height': this.flexHeight + 'px'
        });

        var interval = setInterval( function() {
            if (self.settings.isChangingArticle === false) {
                var tempWidth = self.parentContainer.getWidth(),
                    tempHeight = self.articles[0].getHeight();

                if (tempWidth !== self.flexWidth) {
                    self.galleryContainer.setStyle({'width': tempWidth + 'px'});
                    self.flexWidth = tempWidth;
                }

                if (tempHeight !== self.flexHeight) {
                    self.galleryContainer.setStyle({'height': tempHeight + 'px'});
                    self.flexHeight = tempHeight;
                }

                if (self.settings.transition !== '') {
                    self.articles[self.settings.currentArticle].setStyle({
                        'width': self.parentContainer.getWidth() + 'px'
                    });
                }
            }
        }, 20);
    } else {
        this.galleryContainer.setStyle({
            'height': config.height + 'px',
            'width': config.width + 'px'
        });
    }

    // Set general touch handler if supported
    if ('ontouchstart' in document.documentElement) {
        var self = this;

        this.galleryContainer.addEventListener('touchstart', function () {
            self.onGalleryTouch(self, event);
        }, false);

        this.galleryContainer.addEventListener('touchend', function () {
            self.onGalleryTouch(self, event);
        }, false);
    }

    /**
     * Private methods. Each of these methods may be overwritten by a Decorator-function
     * @see: http://addyosmani.com/resources/essentialjsdesignpatterns/book/#decoratorpatternjavascript
     */

    /**
     * Build gallery (add elements, set meta data)
     * @private
     */

    this.buildGallery = function () {
        // Let the DOM know why kind of gallery I am
        this.galleryContainer.addClassName('ag-appear');

        if (this.config.showNav) {
            // Add navigation
            var navFragment = this.getNavigationFragment.call(this);
            this.galleryContainer.appendChild(navFragment);
        }

        // Hide all articles, except the first one
        var i;

        for (i = 1; i < this.settings.articleCount; i++) {
            this.articles[i].addClassName(this.classNames.offscreen);
        }

        if (this.config.autoplayGallery !== 0) {
            // Set an interval to rotate through articles
            this.interval = this.getInterval.call(this);
        }
    };

    /**
     * Swap to (next) article
     * @param {Integer} nextArticle Article to show (integer is reference to article in this.articles)
     * @private
     */

    this.swapArticle = function (nextArticle) {
        this.settings.isChangingArticle = true;

        nextArticle = (nextArticle > -1) ? nextArticle : this.getNextArticle();

        if (this.config.useFlexDimensions === 1) {
            this.galleryContainer.setStyle({
                'height': this.articles[nextArticle].getHeight() + 'px'
            });

            this.articles[nextArticle].setStyle({'width': this.flexWidth + 'px'});
        }

        this.articles[this.settings.currentArticle].toggleClassName(this.classNames.offscreen);
        this.articles[nextArticle].toggleClassName(this.classNames.offscreen);
        this.settings.previousArticle = this.settings.currentArticle;
        this.settings.currentArticle = nextArticle;

        if (this.config.showNav) {
            this.setActiveNavButton.call(this);
        }

        this.settings.isChangingArticle = false;
    };

    /**
     * If necessary, decorate buildGallery & swapArticle and extend the gallery
     */

    if (this.config.transition === 'slide') {
        ProContent.ArticleGallerySlide(this);
    } else if (this.config.transition === 'fade') {
        ProContent.ArticleGalleryFade(this);
    }

    /**
     * Initialize gallery by building it
     */

    this.buildGallery();
};

/**
 * Public methods and properties
 */

/**
 * Show next or previous slide based on touch event and direction
 * @param {Event} Touch event data
 * @public
 */

ProContent.ArticleGallery.prototype.onGalleryTouch = function (scope, event) {
    var self = scope;

    if (event && event.type === "touchstart") {
        self.settings.touchStart = event.touches[0].screenX;
    }

    if (event && event.type === "touchend") {
        self.settings.touchEnd = event.changedTouches[0].screenX;

        if ((self.settings.touchStart + 60 < self.settings.touchEnd)) {
            // Swipe form left to right. Show previous image
            var nextArticle = self.getNextArticle.call(self, "left");
            self.swapArticle.call(self, nextArticle);

            if (self.config.autoplayGallery !== 0) {
                self.restartInterval.call(self);
            }
        } else if((self.settings.touchStart - 60 > self.settings.touchEnd)) {
            // Swipe form right to left. Show next image
            self.swapArticle.call(self);

            if (self.config.autoplayGallery !== 0) {
                self.restartInterval.call(self);
            }
        }
    }
};

/**
 * @var {object} classNames Holds class-attribute values
 * @public
 */

ProContent.ArticleGallery.prototype.classNames = {
    'article': 'ag-article',
    'offscreen': 'ag-article-offscreen',
    'hidden': 'ag-article-hidden',
    'navigation': 'ag-nav',
    'navContainer': 'ag-nav-container',
    'navActive': 'ag-nav-active',
    'navArrowLeft': 'ag-nav-aleft',
    'navArrowRight': 'ag-nav-aright'
};

/**
 * Sets an interval that calls swapArticle based on the duration from the config set by the user
 * @returns {String}
 * @public
 */

ProContent.ArticleGallery.prototype.getInterval = function () {
    // Store reference to this to refer to the proper context inside setInterval
    var self = this;

    var interval = setInterval( function() {
        if (self.settings.isChangingArticle === false) {
            self.swapArticle.call(self);
        }
    }, this.config.intervalDuration * 1000);

    return interval;
};

/**
 * Resets interval that calls swapArticle
 * @public
 */

ProContent.ArticleGallery.prototype.restartInterval = function () {
    window.clearInterval(this.interval);
    this.interval = this.getInterval.call(this);
};

/**
 * Stops interval that calls swapArticle
 * @public
 */

ProContent.ArticleGallery.prototype.stopInterval = function () {
    window.clearInterval(this.interval);
};

/**
 * Calculate the index of the next article to show
 * @returns {Integer}
 * @public
 */

ProContent.ArticleGallery.prototype.getNextArticle = function (dir) {
    if (dir === "left") {
        if (this.settings.currentArticle === 0) {
            return this.settings.articleCount - 1;
        } else {
            return this.settings.currentArticle - 1;
        }
    } else if (this.settings.currentArticle === (this.settings.articleCount - 1)) {
        return 0;
    } else {
        return this.settings.currentArticle + 1;
    }
};

/**
 * Create a document fragment containing navigational elements of the gallery
 * Return the fragment and attach a click handler to the list container
 * @returns {DocumentFragment}
 * @public
 */

ProContent.ArticleGallery.prototype.getNavigationFragment = function () {
    var fragment = document.createDocumentFragment(), i, self = this;

    // Create list container
    var ul = document.createElement('ul'), l = this.settings.articleCount;
    ul.className = this.classNames.navigation;

    for (i = 0; i < l; i++) {
        var cls = (i === 0) ? 'first ' + this.classNames.navActive : ((i === (l - 1 )) ? 'last' : '');
            li = document.createElement('li'),
            liText = document.createTextNode(i+1);

        li.className = cls;
        li.appendChild(liText);
        ul.appendChild(li);
    }

    var navContainer = document.createElement('div');
    navContainer.className = this.classNames.navContainer;

    if (this.config.showNavArrows === 1) {
        var arrowLeft = document.createElement('span'),
            arrowLeftText = document.createTextNode('<'),
            arrowRight = document.createElement('span'),
            arrowRightText = document.createTextNode('>');

        arrowLeft.className = this.classNames.navArrowLeft;
        arrowRight.className = this.classNames.navArrowRight;

        arrowLeft.appendChild(arrowLeftText);
        arrowRight.appendChild(arrowRightText);

        navContainer.appendChild(arrowLeft);
        navContainer.appendChild(ul);
        navContainer.appendChild(arrowRight);
    } else {
        navContainer.appendChild(ul);
    }

    fragment.appendChild(navContainer);

    // Store reference to buttons
    this.navButtons = $(ul).select('li');

    // Listen for click events
    $(navContainer).on('click', function (event) {
        self.onNavigationClick.call(self, event);
    });

    return fragment;
};

/**
 * Sets active navigation button
 * @public
 */

ProContent.ArticleGallery.prototype.setActiveNavButton = function () {
    this.navButtons[this.settings.previousArticle].toggleClassName(this.classNames.navActive);
    this.navButtons[this.settings.currentArticle].toggleClassName(this.classNames.navActive);
};

/**
 * Handle click event on navigation buttons
 * @param {Event} event The click Event.
 * @public
 */

ProContent.ArticleGallery.prototype.onNavigationClick = function (event) {
    var element = event.element(),
        elementTag = element.tagName.toUpperCase();

    if (elementTag === "LI") {
        var nextArticle = parseInt(element.innerHTML, 10) - 1;

        if (nextArticle !== this.settings.currentArticle && this.settings.isChangingArticle === false) {
            this.swapArticle.call(this, nextArticle);

            if (this.config.autoplayGallery !== 0) {
                this.restartInterval.call(this);
            }
        }
    } else if (elementTag === "SPAN") {
        if (element.hasClassName(this.classNames.navArrowRight)) {
            this.swapArticle.call(this);

            if (this.config.autoplayGallery !== 0) {
                this.restartInterval.call(this);
            }
        } else {
            var nextArticle = this.getNextArticle.call(this, "left");
            this.swapArticle.call(this, nextArticle);

            if (this.config.autoplayGallery !== 0) {
                this.restartInterval.call(this);
            }
        }
    }
};