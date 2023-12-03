// To flush the cache of this file, increase the version number: 1

window.PbLib = window.PbLib || (function (window, document, undefined) {
    'use strict';

    var PbLib = {};

    PbLib.isDebug = function () {
        var isDebug = false;
        var scriptElements = document.getElementsByTagName('script');
        var i = scriptElements.length;
        while (i-- && !isDebug) {
            isDebug = (/ui\/uibase\/script\/pblib\/pblib\.js\?.*isdebug=1/i).test(scriptElements[i].src);
        }

        PbLib.isDebug = function () {
            return isDebug;
        };

        return PbLib.isDebug();
    };

    PbLib.self = {
        pathName: 'ui/uibase/script/pblib',
        fileName: 'pblib.js'
    };

    PbLib.getMetaUriParts = function () {
        var scripts = document.getElementsByTagName('script');
        var match;
        var revMatch;

        var pathBase = '/';
        var uriBase = '/';
        var langInfix = '';
        var revision = '';

        var re = new RegExp('^(.*)' + PbLib.self.pathName + '/' + PbLib.self.fileName + '(\\?.*)?$');
        for (var i = 0; i < scripts.length; i++) {
            match = scripts[i].src.match(re);
            if (match) {
                uriBase = match[1] === '' ? '/' : match[1];
                pathBase = uriBase.replace(/^(https?:\/\/)?([^\/]*)/i, '');

                revMatch = match[2].match(/(\?|&)rev=(.*?)($|&)/);
                if (revMatch) {
                    revision = revMatch[2];
                }

                /*
                    Search for elements:
                    * can have l/k/c
                    * can have language infix
                    * can have workspace infix
                */
                var url = window.location.href;
                // ([a-z]/)?(([a-z]{2})/)?([0-9]*)?(/.*)?$');
                re = new RegExp('^(https?:\/\/[^/]*)?' + uriBase + '([a-z]/)?(.*)$');
                match = url.match(re);
                if (!match) {
                    break;
                }
                url = match[3];

                var urlParts = url.split('/');
                if (typeof urlParts[0] !== 'undefined' && urlParts[0].match(/^[a-z]{2}$/)) {
                    langInfix = urlParts.shift() + '/';
                }
                break;
            }
        }

        if (revision === '') {
            revision = '' +
                PbLib.curDate.getFullYear() +
                (PbLib.curDate.getMonth() + 1) +
                PbLib.curDate.getDate() +
                PbLib.curDate.getHours();
        }

        // Redefine this method with cached values
        PbLib.getMetaUriParts = function () {
            return {
                uriBase: uriBase,
                pathBase: pathBase,
                langInfix: langInfix,
                revision: revision
            };
        };

        return PbLib.getMetaUriParts();
    };

    PbLib.getCacheString = function () {
        return PbLib.getMetaUriParts().revision;
    };

    function ProBaseUrl (path) {
        this.path = path;
        this.queryParams = {};
        this.addReturnUrl = false;
    }

    ProBaseUrl.prototype.setQueryParam = function (name, value) {
        this.queryParams[name] = value;
        return this;
    };

    ProBaseUrl.prototype.setAddReturnUrl = function (returnUrl) {
        this.addReturnUrl = returnUrl;
        return this;
    };

    ProBaseUrl.prototype.toString = function () {
        var metaUriParts = PbLib.getMetaUriParts();

        var path = this.path;
        if (path) {
            if (path.charAt(0) === '/') {
                path = path.substring(1);
            }
        } else {
            path = '';
        }

        var url = metaUriParts.uriBase;
        if (!path.match(/^(files|ui)\//)) {
            var match = path.match(/^([a-z]\/)/);
            if (match) {
                url += match[1];
                path = path.substring(2);
            }
            url += metaUriParts.langInfix;
        }
        url += path;

        var queryStarted = false;
        var params = this.queryParams;

        if (params.return_uri) {
            delete params.return_uri;
        }

        if (this.addReturnUrl === true) {
            var uri = '';
            if (document.location.pathname) {
                uri += document.location.pathname;
            }
            if (document.location.search) {
                uri += document.location.search;
            }

            params.return_uri = uri ? uri : '/';
        } else if (this.addReturnUrl) {
            params.return_uri = this.addReturnUrl;
        }

        for (var key in params) {
            if (!params.hasOwnProperty(key)) {
                continue;
            }

            url += queryStarted ? '&' : '?';
            queryStarted = true;

            url += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
        }

        return url;
    };

    PbLib.buildUrl = function (path) {
        return new ProBaseUrl(path);
    };

    PbLib.getNewURI = function (path) {
        return PbLib.buildUrl(path).toString();
    };

    // single page notice bar
    // noticeType: 'failure', 'success', 'info', 'warning', 'question'
    PbLib.notice = function (noticeClass, noticeText, showAsHtml) {
        if (window.parent !== window && window.parent.PbLib) {
            return window.parent.PbLib.notice(noticeClass, noticeText, showAsHtml);
        }

        var topDocument = window.top.document;
        var contentElement = topDocument.getElementById('content');
        if (!contentElement || !contentElement.parentNode) {
            return false;
        }

        var notices = topDocument.getElementById('spiNotices');
        var existingNotices = document.querySelectorAll('ul.notice');
        var numberOfExistingNotices = existingNotices.length;

        // Process existing notices
        for (var i = 0; i < numberOfExistingNotices; i++) {
            var existingNotice = existingNotices[i];

            if (!document.body.contains(existingNotice)) {
                continue;
            }

            // Remove normal (non SPI) notices
            if (notices && !notices.contains(existingNotice)) {
                PbLib.fadeOut(existingNotice, 0.05, 50, true);
                continue;
            }

            // Prevent hammering the user with equal notices
            var existingNoticeText = existingNotice.children[0].childNodes[0].nodeValue;
            if (existingNoticeText === noticeText) {
                return;
            }
        }

        if (!notices) {
            // spiNotices.parentNode.removeChild(spiNotices);
            notices = topDocument.createElement('div');
            notices.setAttribute('id', 'spiNotices');
            notices.setAttribute('class', 'singlepage');
            contentElement.parentNode.insertBefore(notices, contentElement.parentNode.firstChild);
        }

        var notice = topDocument.createElement('ul');
        notice.style.transition = 'opacity .2s ease';
        notice.style.opacity = '0';
        var item = topDocument.createElement('li');
        var text;
        if (showAsHtml) {
            text = topDocument.createElement('span');
            text.innerHTML = noticeText;
        } else {
            text = topDocument.createTextNode(noticeText);
        }
        var closeButton = topDocument.createElement('span');
        var closeButtonText = '@{Close this notice}';

        closeButton.update(closeButtonText);

        closeButton.onclick = function () {
            notice.parentNode.removeChild(notice);
        };

        if (noticeClass === 'failure') {
            noticeClass = 'fail';
        }

        notice.className = 'notice ' + noticeClass;
        closeButton.className = 'closebutton';

        item.appendChild(text);
        item.appendChild(closeButton);
        notice.appendChild(item);
        notices.appendChild(notice);

        var raf = (function () {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function (callback) {
                    window.setTimeout(callback, 1000 / 60);
                };
        })();

        raf(function () {
            notice.style.opacity = '1';
        });

        setTimeout(function () {
            if (!notices.contains(notice)) {
                return;
            }

            notice.style.opacity = '0';

            setTimeout(function () {
                notice.parentNode.removeChild(notice);
            }, 250);
        }, 10000);
    };

    PbLib.objectClone = function (obj) {
        if (obj === null || typeof (obj) !== 'object') {
            return obj;
        }

        var tObj = {};
        for (var k in obj) {
            if (!obj.hasOwnProperty(k)) {
                continue;
            }
            tObj[k] = PbLib.objectClone(obj[k]);
        }
        return tObj;
    };

    PbLib.getUniqId = function () {
        var idBase = 'pblibguid';
        var idBaseNum = 0;
        var guid = 0;
        while (document.getElementById(idBase + (idBaseNum === 0 ? '' : idBaseNum) + '_1')) {
            idBaseNum += 1;
        }
        idBase = idBase + (idBaseNum === 0 ? '' : idBaseNum) + '_';

        PbLib.getUniqId = function () {
            return idBase + (++guid);
        };

        return PbLib.getUniqId();
    };

    PbLib.escapeFrame = function () {
        if (window !== window.top) {
            window.top.location.replace(window.location.href);
        }
    };

    PbLib.loadScript = function (scripts, callback) {
        scripts = scripts instanceof Array ? scripts : [scripts];
        var total = scripts.length;
        var loaded = 0;
        var args = Array.prototype.slice.call(arguments, 2);
        var i;

        for (i = 0; i < total; ++i) {
            // make sure the translated script is loaded
            scripts[i] = scripts[i].replace(
                /^((([a-z]+:)?\/\/[^\/]+\/)ui|(\/?)ui)\//,
                '$2$4a/' + PbLib.getMetaUriParts().langInfix + 'userinterface/'
            );

            var scriptElementsRelative = document.querySelectorAll('script[src="' + scripts[i] + '"]');
            var scriptElementsWithProtocol = document.querySelectorAll(
                'script[src="' + window.location.protocol + '//' + window.location.host + scripts[i] + '"]'
            );
            var isLoaded = (
                scriptElementsRelative.length > 0 ||
                (!scripts[i].match(/^https?:\/\//) && scriptElementsWithProtocol.length > 0)
            );

            if (isLoaded) {
                ++loaded;
            } else {
                (function () {
                    var domscript = document.head.appendChild(document.createElement('script'));
                    var onloadFired;
                    domscript.src = scripts[i];
                    if (callback) {
                        var delay = 0;

                        // Test for onreadystatechange to trigger callback in IE
                        domscript.onreadystatechange = function () {
                            window.setTimeout(function () {
                                // Only check on 'loaded'.
                                // Checking on readyState 'complete' can result in Callback = NULL
                                if (!onloadFired && (domscript.readyState === 'loaded')) {
                                    onloadFired = true;
                                    if (++loaded === total) {
                                        callback.apply(window, args);
                                    }
                                }
                            }, delay);
                        };

                        domscript.onload = function () {
                            window.setTimeout(function () {
                                if (!onloadFired) {
                                    onloadFired = true;
                                    if (++loaded === total) {
                                        callback.apply(window, args);
                                    }
                                }
                            }, delay);
                        };
                    }
                })();
            }
        }

        callback && loaded === total && callback.apply(window, args);
    };

    PbLib.loadCss = function (sheets, callback) {
        sheets = sheets instanceof Array ? sheets : [sheets];
        var args = Array.prototype.slice.call(arguments, 2);
        var total = sheets.length;
        var loaded = 0;
        var cssTimer;
        var i;

        for (i = 0; i < total; ++i) {
            if (document.querySelectorAll('links[href="' + sheets[i] + '"]').length > 0) {
                ++loaded;
            } else {

                var sheetIndex = document.styleSheets.length;
                var domcss = document.head.appendChild(document.createElement('link'));
                var styleRules = '';

                domcss.rel = 'stylesheet';
                domcss.type = 'text/css';
                domcss.media = 'screen';
                domcss.href = sheets[i];

                // Check if href is external
                var match = sheets[i].match(/^([^:\/?#]+:)?(?:\/\/([^\/?#]*))?([^?#]+)?(\?[^#]*)?(#.*)?/);
                var isExternal = false;

                if (typeof match[1] === 'string' &&
                    match[1].length > 0 &&
                    match[1].toLowerCase() !== location.protocol
                ) {
                    isExternal = true;
                }

                if (typeof match[2] === 'string' &&
                    match[2].length > 0 &&
                    match[2].replace(new RegExp(':(' + {
                        'http:': 80,
                        'https:': 443
                    }[location.protocol] + ')?$'), '') !== location.host
                ) {
                    isExternal = true;
                }

                (function loader () {
                    try {
                        var sheet = document.styleSheets[sheetIndex];

                        // cssRules or rules are only present if stylesheet is loaded
                        if (isExternal === false && sheet.cssRules) {
                            styleRules = sheet.cssRules;
                        } else if (isExternal === false && sheet.rules) {
                            styleRules = sheet.rules;
                        }

                        if ((styleRules !== '' || isExternal === true) && callback) {
                            callback.apply(window, args);
                            clearTimeout(cssTimer);
                            ++loaded;
                        }
                    } catch (e) {
                        if ('NS_ERROR_DOM_SECURITY_ERR' !== e.name) {
                            cssTimer = setTimeout(loader, 100);
                        }
                    }

                })();
            }
        }

        if (callback && loaded === total) {
            callback.apply(window, args);
        }
    };

    PbLib.module = {};
    PbLib.modules = {};
    PbLib.curDate = new Date();
    PbLib.module.load = function (modName) {
        if (Array.isArray(modName)) {
            var returnval = true;
            for (var i = 0; i < modName.length; i++) {
                returnval = returnval && PbLib.module.load(modName[i]);
            }
            return returnval;
        } else if (typeof modName !== 'string') {
            return false;
        }

        modName = modName.toLowerCase();
        if (typeof PbLib.modules[modName] === 'undefined') {
            PbLib.modules[modName] = {
                loaded: false,
                loading: true,
                dependencies: [],
                dependencyOf: []
            };
        } else if (PbLib.modules[modName].loaded) {
            // Module is loaded
            return true;
        } else if (PbLib.modules[modName].loading) {
            // Module is being loaded
            return true;
        }

        // Load module content

        // make sure the translated module is loaded
        var path = PbLib.self.pathName.replace('ui/', 'a/userinterface/');
        var request = new XMLHttpRequest();
        request.onreadystatechange = function (event) {
            var element = event.target;
            if (element.status === 200 && element.responseText) {
                eval(element.responseText);
            }
        };
        request.open('GET', PbLib.getNewURI(path + '/' + modName + '.js?rev=' + PbLib.getCacheString()), false);
        request.send();

        return PbLib.modules[modName].loaded;
    };

    PbLib.module.loadDependencies = function (modName, dependencyString) {

        modName = modName.toLowerCase();
        if (typeof PbLib.modules[modName] === 'undefined' ||
            typeof PbLib.modules[modName].loaded === 'undefined' ||
            (!PbLib.modules[modName].loading && !PbLib.modules[modName].loaded)
        ) {
            return false;
        }

        var dependencies = dependencyString.toLowerCase().split(',');

        for (var i = 0; i < dependencies.length; i++) {
            PbLib.modules[modName].dependencies.push(dependencies[i]);
            if (PbLib.module.load(dependencies[i])) {
                PbLib.modules[dependencies[i]].dependencyOf.push(modName);
            } else {
                return false;
            }
        }

        return true;
    };

    PbLib.module.setLoaded = function (modName) {

        modName = modName.toLowerCase();
        if (typeof PbLib.modules[modName] === 'undefined') {
            PbLib.modules[modName] = {
                loaded: true,
                loading: false,
                dependencies: [],
                dependencyOf: []
            };
        } else {
            PbLib.modules[modName].loading = false;
            PbLib.modules[modName].loaded = true;
        }
    };

    /**
     * Dialog functions
     */

    PbLib.dialog = {};

    PbLib.createDialog = function (url, reqWidth, reqHeight, options) {
        options = options || {};

        PbLib.module.load('dialog');
        options.openerElem = document.activeElement;

        document.documentElement.classList.add('dialog--isOpen');

        if (options.isConfirmDialog) {
            document.documentElement.classList.add('dialog--isConfirmDialog');
        }

        return PbLib.createDialogImpl(url, reqWidth, reqHeight, options);
    };

    PbLib.createConfirmDialog = function (reqWidth, reqHeight, options) {
        PbLib.module.load('dialog');
        options.openerElem = document.activeElement;
        return PbLib.createConfirmDialogImpl(reqWidth, reqHeight, options);
    };

    PbLib.dialog.getOpener = function () {
        PbLib.module.load('dialog');
        return PbLib.getOpenerImpl();
    };

    PbLib.destroyDialog = function (force, callback) {
        PbLib.module.load('dialog');
        document.documentElement.classList.remove('dialog--isOpen');
        document.documentElement.classList.remove('dialog--isConfirmDialog');
        return PbLib.destroyDialogImpl(force, callback);
    };

    PbLib.dialog.reScaleToContent = function () {
        var opener = PbLib.dialog.getOpener();
        if (typeof opener.PbLib === 'undefined' || typeof opener.PbLib.dialog === 'undefined') {
            return;
        }
        if (opener.PbLib.dialog.loaderElem === null) {
            opener.PbLib.dialog.reScaleToContent();
        }
    };

    /**
     * Fade an element in or out
     * @param {HTMLElement} elem - The html element to fade
     * @param {number} from - The opacity percentage to start with (0-1)
     * @param {number} to - The opacity  percentage to end with (0-1)
     * @param {number} fadeTime - The total time of the fade
     * @param {number} onFinished - The function call to execute when fading is done
     * @param {number} frameRate - The amount of steps per second to take
     * @return {null|boolean}
     */
    PbLib.fade = function (elem, from, to, fadeTime, onFinished, frameRate) {

        if (!elem) {
            return false;
        } else if (!elem.parentNode) {
            return false;
        }

        var userAgent = window.navigator.userAgent;
        if (userAgent.indexOf('MSIE ') > 0) {
            //IE element needs to have layout for alpha filter to work
            elem.style.zoom = '1';
        }

        if (!frameRate) {
            frameRate = 12;
        }

        fadeTime = Math.max(1, parseInt(fadeTime));
        from = Math.min(1, parseInt(from));
        to = Math.max(0, parseInt(to));

        var period = (1 / frameRate);
        var step = period * (to - from);
        var stop = false;

        if (typeof elem.curOpacity === 'undefined') {
            elem.curOpacity = from;
        } else {
            elem.curOpacity += step;
            if (to > from) {
                if (elem.curOpacity >= to) {
                    elem.curOpacity = to;
                    stop = true;
                }
            } else if (elem.curOpacity <= to) {
                elem.curOpacity = to;
                stop = true;
            }
        }

        if (elem.curOpacity > 0) {
            if (elem.style.display === 'none') {
                elem.style.display = '';
            }
            if (elem.style.visibility === 'hidden') {
                elem.style.visibility = 'visible';
            }
        }

        elem.style.opacity = elem.curOpacity;

        if (stop) {
            if (onFinished) {
                onFinished(elem);
            }
            return null;
        }

        setTimeout(function () {
            PbLib.fade(elem, from, to, fadeTime, onFinished, frameRate);
        }, (1000 * period));
    };

    /**
     * Fade an element in
     * @param {HTMLElement} elem - HTML element to fade in
     * @param {number} step - Opacity to increase per step (0-1)
     * @param {number} time - Time in milliseconds per step
     */
    PbLib.fadeIn = function (elem, step, time) {
        PbLib.fade(elem, 0, 1, step * time, false, 1000 / time);
    };

    /**
     * Fade an element out
     * @param {HTMLElement} elem - HTML element to fade out
     * @param {number} step - Opacity to decrease per step (0-1)
     * @param {number} time - Time in milliseconds per step
     * @param {boolean} removeAfter - Remove element when faded out
     */
    PbLib.fadeOut = function (elem, step, time, removeAfter) {
        var onFinished = false;
        if (removeAfter) {
            onFinished = function () {
                if (elem.parentNode) {
                    elem.parentNode.removeChild(elem);
                }
            };
        }
        PbLib.fade(elem, 1, 0, step * time, onFinished, 1000 / time);
    };

    PbLib.setPos = function (elem, posLeft, posTop) {
        if (!posTop && typeof posLeft === 'object') {
            // Result of getPos given
            posTop = posLeft.top;
            posLeft = posLeft.left;
        }

        if (typeof elem.posDiff === 'undefined') {
            var startPos = {left: elem.offsetLeft, top: elem.offsetTop};

            positionAbsoluteOnSameSpot(elem);

            var curPos = {left: elem.offsetLeft, top: elem.offsetTop};
            elem.posDiff = {left: curPos.left - startPos.left, top: curPos.top - startPos.top};
        }

        elem.style.left = parseInt(posLeft) + elem.posDiff.left + 'px';
        elem.style.top = parseInt(posTop) + elem.posDiff.top + 'px';

        function positionAbsoluteOnSameSpot (el) {
            if (window.getComputedStyle(el).getPropertyValue('position') === 'absolute') {
                return;
            }

            var offsetParent = el.offsetParent;
            var eOffset = el.getBoundingClientRect();
            var pOffset = offsetParent.getBoundingClientRect();
            var offsetTop = eOffset.top - pOffset.top;
            var offsetLeft = eOffset.left - pOffset.left;

            el.setStyle({
                position: 'absolute',
                top: offsetTop + 'px',
                left: offsetLeft + 'px',
                width: eOffset.width + 'px',
                height: eOffset.height + 'px'
            });
        }
    };

    /**
     * Window/Popup functions
     */

    PbLib.getWindowSize = function (win) {

        win = win || window;

        if (typeof win.chromeSize === 'undefined') {
            PbLib.setChromeSize(win);
        }

        var size = {x: win.chromeSize.x, y: win.chromeSize.y};
        if (typeof win.innerWidth !== 'undefined') {
            size.x += win.innerWidth;
            size.y += win.innerHeight;
        } else if (typeof win.document.clientWidth !== 'undefined') {
            size.x += win.document.clientWidth;
            size.y += win.document.clientHeight;
        } else if (typeof win.documentElement !== 'undefined') {
            if (typeof win.documentElement.clientWidth !== 'undefined') {
                size.x += win.documentElement.clientWidth;
                size.y += win.documentElement.clientHeight;
            }
        } else if (typeof win.document.documentElement.clientWidth !== 'undefined') {
            size.x += win.document.documentElement.clientWidth;
            size.y += win.document.documentElement.clientHeight;
        }

        return size;
    };

    PbLib.setWindowSize = function (width, height, win) {
        win = win || window;

        win.resizeTo(parseInt(width), parseInt(height));
    };

    PbLib.setChromeSize = function (win) {
        win = win || window;
        win.chromeSize = {x: 0, y: 0};

        var startSize = PbLib.getWindowSize(win);
        PbLib.setWindowSize(startSize.x, startSize.y, win);
        var curSize = PbLib.getWindowSize(win);

        win.chromeSize = {x: startSize.x - curSize.x, y: startSize.y - curSize.y};

        PbLib.setWindowSize(startSize.x + win.chromeSize.x, startSize.y + win.chromeSize.y, win);
    };

    PbLib.availScreenWidth = window.screen.availWidth || 1024;
    PbLib.availScreenHeight = window.screen.availHeight || 768;
    PbLib.centerWindow = function (win) {
        win = win || window;

        var winS = PbLib.getWindowSize(win);
        win.moveTo((PbLib.availScreenWidth - winS.x) / 2, (PbLib.availScreenHeight - winS.y) / 2);
    };

    PbLib.scaleWindowToContent = function (scaleWidth, scaleHeight, win) {
        win = win || window;
        if (typeof scaleHeight === 'undefined') {
            scaleHeight = true;
        }
        if (typeof scaleWidth === 'undefined') {
            scaleWidth = false;
        }

        var doc = win.document;
        if (!doc.body) {
            return false;
        }

        if (!scaleWidth && !scaleHeight) {
            return true;
        }

        var curSize = PbLib.getWindowSize(win);
        var targetWidth = curSize.x;
        var targetHeight = curSize.y;
        var curScroll = 0;

        if (scaleWidth) {
            if (doc.all) {
                do {
                    curScroll += 200;
                    win.scrollTo(curScroll, 0);
                } while (Math.max(doc.body.scrollLeft, doc.body.parentNode.scrollLeft) >= curScroll);
                targetWidth += Math.max(doc.body.scrollLeft, doc.body.parentNode.scrollLeft);
            } else {
                do {
                    curScroll += 200;
                    win.scrollTo(curScroll, 0);
                } while (win.scrollX >= curScroll);
                targetWidth += win.scrollX;
            }
            win.scrollTo(0, 0);
            targetWidth = Math.min(PbLib.availScreenWidth, targetWidth + 1);
            win.moveTo((PbLib.availScreenWidth - targetWidth) / 2, (PbLib.availScreenHeight - targetHeight) / 2);
            win.resizeTo(targetWidth, targetHeight);
        }
        if (scaleHeight) {
            if (doc.all) {
                do {
                    curScroll += 200;
                    win.scrollTo(0, curScroll);
                } while (Math.max(doc.body.scrollTop, doc.body.parentNode.scrollTop) >= curScroll);
                targetHeight += Math.max(doc.body.scrollTop, doc.body.parentNode.scrollTop);
            } else {
                do {
                    curScroll += 200;
                    win.scrollTo(0, curScroll);
                } while (win.scrollY >= curScroll);
                targetHeight += win.scrollY;
            }
            win.scrollTo(0, 0);
            targetHeight = Math.min(PbLib.availScreenHeight, targetHeight + 1);
        }

        win.moveTo((PbLib.availScreenWidth - targetWidth) / 2, (PbLib.availScreenHeight - targetHeight) / 2);
        win.resizeTo(targetWidth, targetHeight);
    };

    /**
     * Add function to Elements
     */

    Element.prototype.isInDialog = function (onlyDirect) {
        if (getParentWithClassName(this, 'div.pbdialogcontainer')) {
            return true;
        }

        var found = false;
        var dialogFrames = isTopAccessible()
            ? window.top.document.querySelectorAll('div.pbdialogcontainer iframe')
            : [];

        dialogFrames.forEach(function (frame) {
            if (frame.contentWindow === window || (!onlyDirect && window.parent === frame.contentWindow)) {
                found = true;
            }
        });

        function getParentWithClassName (child, className) {
            var node = child.parentElement;
            while (node !== null) {
                if (node.classList.contains(className)) {
                    return node;
                }
                node = node.parentElement;
            }
        }

        function isTopAccessible() {
            try {
                window.top.document;
                return true;
            }
            catch (err) {
                return false;
            }
        }

        return found;
    };

    /**
     * JS version of Icon::getIconPath
     */

    PbLib.getIconPath = function (iconString, size) {
        size = size || 16;
        var parts = iconString.split(':');
        var iconPart = '/icons/';

        if (parts.length === 2) {
            return PbLib.getNewURI('files/' + parts[0] + iconPart + parts[1] + size + '.png');
        }
        return PbLib.getNewURI('ui/uibase' + iconPart + size + '/' + iconString + '.png');
    };

    return PbLib;

})(window, document);

document.documentElement.classList.add('has-js');

// ESC closes the topmost dialog; in order to do that each window and dialog iframe should have a handler
document.addEventListener('keydown', function (event) {
    'use strict';
    if (event.key === 'Escape') {
        // check if a dialog is open
        var stack = window.top.PbLib.dialog.windowStack;
        if (typeof stack !== 'undefined' && stack.length > 0) {
            event.preventDefault();
            PbLib.destroyDialog();
        }
    }
});

/**
 * Polyfill for the CustomEvent() constructor functionality in Internet Explorer 9 and higher. This is not optimal
 * to have here but it's the only functionality that would prevent us from getting rid of PrototypeJS, so far.
 * Copied from: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent#polyfill
 */
(function () {
    'use strict';

    if (typeof window.CustomEvent === 'function') {
        return false;
    }

    function CustomEvent (event, params) {
        params = params || { bubbles: false, cancelable: false, detail: null };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    }

    window.CustomEvent = CustomEvent;
})();

/**
 * Ajax.Request.abort
 * extend the prototype.js Ajax.Request object so that it supports an abort method
 * Copied from: http://blog.pothoven.net/2007/12/aborting-ajax-requests-for-prototypejs.html
 */
if (typeof Ajax !== 'undefined') {
    Ajax.Request.prototype.abort = function () {
        // prevent and state change callbacks from being issued
        this.transport.onreadystatechange = Prototype.emptyFunction;
        // abort the XHR
        this.transport.abort();
        // update the request counter
        Ajax.activeRequestCount = Math.max(Ajax.activeRequestCount - 1, 0);
    };
}
