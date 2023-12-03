!(function (global) {
    'use strict';

    if (!('document' in global)) {
        return;
    }

    var doc = global.document;
    var dependencies = ['domReady'];

    if (!doc.querySelectorAll || !doc.querySelector) {
        dependencies.push('droplet/QuerySelectorAllPolyfill/QuerySelectorAllPolyfill');
    }

    if ((!window.addEventListener || !window.removeEventListener) && window.attachEvent && window.detachEvent) {
        dependencies.push('droplet/EventListenerPolyfill/EventListenerPolyfill');
    }

    if (!('classList' in document.createElement('p'))) {
        dependencies.push('vendor/classlist/classList.min');
    }

    if (!('indexOf' in Array.prototype)) {
        dependencies.push('droplet/IndexOfPolyfill/IndexOfPolyfill');
    }

    require(dependencies, function (domReady) {
        var CookieControl = {};

        CookieControl.cookieBar = (function () {
            var classes = {
                cookieBar: 'scms-cc-cookie-bar',
                cookieSettingsContainer: 'cb-cookie-settings',
                cookieBarOpen: 'cb-open',
                cookieBarOpenBody: 'cookiebar-is-open',
                jsEnabled: 'cb-js',
                settingsButton: 'cd-settings-button',
                cookiesEnabled: 'cb-cookies-enabled',
                cookiesAlwaysOn: 'cb-cookies-always-on',
                onOffSwitch: 'cb-onoffswitch',
                onOffSwitchWrapper: 'cb-onoffswitch-wrapper',
                onOffSwitchInner: 'cb-onoffswitch-inner',
                onOffSwitchInactive: 'cb-onoffswitch-inactive',
                onOffSwitchActive: 'cb-onoffswitch-active',
                onOffSwitchHandle: 'cb-onoffswitch-switch'
            };
            var elements = {};

            function init () {
                // First, initialize
                elements.cookieBar = document.getElementById(classes.cookieBar);
                elements.settingsButton = document.getElementById(classes.settingsButton);
                elements.settingsListItems = document.querySelectorAll('.' + classes.cookieSettingsContainer + ' li');

                if (!('indexOf' in elements.settingsListItems)) {
                    var arr = [];
                    var i;
                    for(i = 0; i < elements.settingsListItems.length; ++i) {
                        arr.push(elements.settingsListItems[i]);
                    }
                    elements.settingsListItems = arr;
                }

                elements.cookieBar.classList.add(classes.jsEnabled);

                // Set observers
                elements.cookieBar.addEventListener('click', onCookieBarClick);

                // Yay, let's add some sugar!
                buildOnOffSwitches();
            }

            function onCookieBarClick (event) {
                var element = event.srcElement || event.target;
                var elementTag = element.tagName.toUpperCase();

                // Open cookie panel
                if (element === elements.settingsButton) {
                    elements.cookieBar.classList.toggle(classes.cookieBarOpen);
                    document.body.classList.toggle(classes.cookieBarOpenBody);
                    return;
                }

                // Toggle on/off-switch when clicking in checkbox
                var listElem = elementTag === 'LI' ? element : findParent(element, 'li');

                if (elementTag === 'INPUT') {
                    toggleOnOffSwitch(element, listElem);
                    return;
                }

                var testElem = element;

                while (testElem && testElem !== listElem && testElem !== doc) {
                    if (testElem && testElem.tagName.match(/^label|input$/i)) {
                        return;
                    }

                    testElem = testElem.parentNode;
                }

                // Toggle checkbox and on/off switch when clicking on LI or descendants
                if (listElem && listElem.classList.contains(classes.cookiesAlwaysOn) ||
                    elements.settingsListItems.indexOf(listElem) === -1
                ) {
                    return;
                }

                var inputElem = listElem.querySelector('input');
                inputElem.checked = !inputElem.checked;
                toggleOnOffSwitch(inputElem, listElem);
            }

            function toggleOnOffSwitch (inputElem, listElem) {
                var checked = inputElem.checked;

                if (checked === true) {
                    listElem.classList.add(classes.cookiesEnabled);
                } else {
                    listElem.classList.remove(classes.cookiesEnabled);
                }
            }

            function buildOnOffSwitches () {
                var count = elements.settingsListItems.length,
                    i;

                for (i = 0; i < count; i++) {
                    var listItem = elements.settingsListItems[i],
                        inputOn = listItem.querySelector('input').checked,
                        parentClass = (inputOn) ? classes.cookiesEnabled : false;

                    if (parentClass) {
                        listItem.classList.add(parentClass);
                    }

                    // Create elements
                    var div1 = doc.createElement('div');
                    div1.className = classes.onOffSwitch;

                    var div2 = doc.createElement('div');
                    div2.className = classes.onOffSwitchWrapper;

                    var span1 = doc.createElement('span');
                    span1.className = classes.onOffSwitchInner;

                    var span2 = doc.createElement('span');
                    span2.className = classes.onOffSwitchActive;
                    span2.innerHTML = 'AAN';

                    var span3 = doc.createElement('span');
                    span3.className = classes.onOffSwitchInactive;
                    span3.innerHTML = 'UIT';

                    var span4 = doc.createElement('span');
                    span4.className = classes.onOffSwitchHandle;

                    span1.appendChild(span2);
                    span1.appendChild(span3);
                    div2.appendChild(span1);
                    div2.appendChild(span4);
                    div1.appendChild(div2);
                    listItem.appendChild(div1);
                }
            }

            function findParent (element, tagName) {
                tagName = tagName.toLowerCase();

                while (element && element.parentNode) {
                    element = element.parentNode;

                    if (element.tagName && element.tagName.toLowerCase() === tagName) {
                        return element;
                    }
                }

                return null;
            }

            return {
                init: init
            };
        }());

        domReady(CookieControl.cookieBar.init);
    });
})(window);