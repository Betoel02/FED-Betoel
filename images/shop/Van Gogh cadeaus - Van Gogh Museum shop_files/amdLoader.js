(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var getConfig = (function (global) {
    'use strict';

    /** @var string */
    var revisionNumber = '';

    (function initialize () {
        var scripts = global.document.getElementsByTagName('script');
        var l = scripts.length;
        var mainScript = null;

        while (l--) {
            var script = scripts[l];

            if (script.hasAttribute('data-main')) {
                mainScript = script;
                break;
            }
        }

        if (mainScript === null) {
            return;
        }

        if (mainScript.hasAttribute('data-rev')) {
            revisionNumber = mainScript.getAttribute('data-rev');
        }
    }());

    return {
        /**
         * @returns {string}
         */
        getRevision: function () {
            return revisionNumber;
        }
    };
}(typeof window !== 'undefined' ? window : this));

module.exports = getConfig;
},{}],2:[function(require,module,exports){
(function () {
    'use strict';

    if ('define' in window && 'require' in window) {
        return;
    }

    var E_MALFORMED_REQUIRE = 'Malformed require';
    var E_REQUIRE_FAILED = 'Require failed (module not loaded)';

    /** @type {Function} */
    var normalizeId = require('./normalizeId');
    /** @type {Function} */
    var normalizeResource = require('./normalizeResource');
    /** @type {Object} */
    var amdModule = require('./module');
    /** @type {Object} */
    var path = require('./path');
    /** @type {Object} */
    var registry = require('./registry');
    /** @type {Object} */
    var magicModules = require('./magicModules');
    /** @type {Object} */
    var loader = require('./loader');
    /** @type {Object} */
    var globals = require('./globals');

    /** @type {Object} */
    var defineQueue = {};
    /** @type {Object} */
    var defineHistory = {};

    /**
     * @param {string|Array|Function} moduleId
     * @param {Array|Function} dependencies
     * @param {Function} definition
     */
    window.define = function (moduleId, dependencies, definition) {
        if (typeof moduleId !== 'string') {
            definition = dependencies;
            dependencies = moduleId;
            moduleId = null;
        }

        if (!dependencies || !(dependencies instanceof Array)) {
            definition = dependencies;
            dependencies = [];
        }

        if (moduleId === null) {
            if (loader.useInteractive()) {
                moduleId = loader.getIdOfCurrentlyExecutingModule();
            }

            defineQueue[moduleId || 'last'] = [moduleId, dependencies, definition];
            return;
        }

        moduleId = normalizeId(moduleId);
        defineHistory[moduleId] = true;
        var moduleToDefine = registry.getModule(moduleId) || amdModule.create(moduleId, path.get(moduleId));
        registry.registerModule(moduleToDefine);

        if (dependencies.length < 1) {
            definition && moduleToDefine.setValue(
                typeof definition === 'function' ? definition() : definition
            );
            registry.resolve(moduleToDefine);
            return;
        }

        queueDependencies(dependencies, function () {
            definition && moduleToDefine.setValue(definition.apply(null, arguments));
            registry.resolve(moduleToDefine);
        }, moduleToDefine);
    };

    /**
     * @param {Array|string|Function} dependencies
     * @param {Function} definition
     * @param {amdModule} context
     * @returns {*}
     */
    window.require = function (dependencies, definition, context) {
        if (!dependencies && !definition) {
            throw new Error(E_MALFORMED_REQUIRE);
        }

        if (dependencies instanceof Array) {
            queueDependencies(dependencies, definition, context);
            return;
        }

        if (typeof dependencies === 'string') {
            var moduleId = normalizeId(dependencies);
            var loadedModule = registry.getModule(moduleId);

            if (!loadedModule || !loadedModule.isDefined()) {
                throw new Error(E_REQUIRE_FAILED);
            }

            return loadedModule.getValue();
        }

        if (typeof dependencies === 'function' && !definition) {
            dependencies();
            return;
        }

        throw new Error(E_MALFORMED_REQUIRE);
    };

    /**
     * @param {string} moduleId
     * @param {string} modulePath
     * @returns {amdModule}
     */
    function createAndLoadModule (moduleId, modulePath) {
        if (registry.getModule(moduleId)) {
            return registry.getModule(moduleId);
        }

        var newModule = amdModule.create(moduleId, modulePath);
        registry.registerModule(newModule);

        if (!newModule.isDefined()) {
            try {
                loader.load(newModule, finishDefining);
            } catch (e) {
                return newModule;
            }
        }

        return newModule;
    }

    /**
     * @param {string} loadedModuleId
     */
    function finishDefining (loadedModuleId) {
        if (
            !(loadedModuleId in defineQueue)
            && !('last' in defineQueue)
            && !globals.isGlobal(loadedModuleId)
            && !(loadedModuleId in defineHistory)
        ) {
            var loadedModule = registry.getModule(loadedModuleId);
            loadedModule && loadedModule.setDefined() && registry.resolve(loadedModule);
            return;
        }

        var defineArguments = null;

        if (loader.useInteractive() && loadedModuleId in defineQueue) {
            defineArguments = defineQueue[loadedModuleId];
            delete defineQueue[loadedModuleId];
        } else if (!loader.useInteractive()) {
            defineArguments = defineQueue['last'] || [];
            defineArguments[0] = loadedModuleId;
            delete defineQueue['last'];
        }

        if (!defineArguments) {
            return;
        }

        if (globals.isGlobal(loadedModuleId) && defineArguments.length === 1) {
            if (loadedModuleId in defineHistory) {
                // Global is apparently using AMD to register itself
                return;
            }

            defineArguments[1] = [];
            defineArguments[2] = function () { return globals.get(loadedModuleId); };
        }

        window.define.apply(null, defineArguments);
    }

    function queueDependencies () {
        var args = arguments;

        window.setTimeout(function () {
            loadDependencies.apply(null, args);
        }, 4);
    }

    /**
     * @param {Array} dependencies
     * @param {Function} definition
     * @param {amdModule} context
     */
    function loadDependencies (dependencies, definition, context) {
        var values = [];
        var loaded = 0;

        /**
         * @param {amdModule} loadedModule
         * @param {string} resource
         */
        function dependencyLoaded (loadedModule, resource) {
            if (resource) {
                var moduleValue = loadedModule.getValue();
                moduleValue.load(resource, function (loadedValue) {
                    applyDependencyValue(loadedModule.getId() + '!' + resource, loadedValue || moduleValue);
                });
                return;
            }

            applyDependencyValue(loadedModule.getId(), loadedModule.getValue());
        }

        /**
         * @param {string} moduleResourceId
         * @param {*} moduleValue
         */
        function applyDependencyValue (moduleResourceId, moduleValue) {
            values[dependencies.indexOf(moduleResourceId)] = moduleValue;

            if (definition && ++loaded >= dependencies.length) {
                definition.apply(null, values);
            }
        }

        /**
         * @param {string} moduleId
         * @param {string} resource
         */
        function loadDependency (moduleId, resource) {
            var moduleToLoad;

            switch (moduleId) {
                case 'require':
                    moduleToLoad = magicModules.getLocalRequire(context);
                    break;
                case 'exports':
                    moduleToLoad = magicModules.getExports(context);
                    break;
                case 'module':
                    moduleToLoad = magicModules.getModule(context);
                    break;
                default:
                    moduleToLoad = registry.getModule(moduleId) || createAndLoadModule(moduleId, path.get(moduleId, context));
            }

            registry.addListener(moduleToLoad, function (loadedModule) {
                dependencyLoaded(loadedModule, resource);
            });
        }

        for (var i = 0; i < dependencies.length; i++) {
            var moduleId = normalizeId(dependencies[i], context);
            var resource = normalizeResource(dependencies[i], context);
            dependencies[i] = (resource) ? moduleId + '!' + resource : moduleId;
            loadDependency(moduleId, resource);
        }
    }

    /**
     * @type {{jQuery: boolean}}
     */
    window.define.amd = {
        jQuery: true
    };
})();

},{"./globals":3,"./loader":4,"./magicModules":5,"./module":6,"./normalizeId":7,"./normalizeResource":8,"./path":9,"./registry":10}],3:[function(require,module,exports){
var getGlobals = (function (global) {
    'use strict';

    /** @type {Object} */
    var globals = {
        'pb/pblib': {
            name: 'PbLib',
            get: function () {
                if (!('PbLib' in global)) {
                    return null;
                }

                return global['PbLib'];
            }
        },
        prototype: {
            name: 'Prototype',
            get: function () {
                if (!('Prototype' in global)) {
                    return null;
                }

                return global['$'];
            }
        },
        tinymce4: {
            name: 'TinyMCE',
            get: function () {
                if (!('tinymce' in global)) {
                    return null;
                }

                return global['tinymce'];
            }
        },
        elementQueries: {
            name: 'elementQueries',
            get: function () {
                if (!('elementQueries' in global)) {
                    return null;
                }

                return global['elementQueries'];
            }
        },
        resizeSensor: {
            name: 'resizeSensor',
            get: function () {
                if (!('resizeSensor' in global)) {
                    return null;
                }

                return global['resizeSensor'];
            }
        }
    };

    /**
     * @param {string} moduleId
     * @returns {*}
     */
    function get (moduleId) {
        return globals[moduleId].get();
    }

    /**
     * @param {string} moduleId
     * @returns {boolean}
     */
    function isGlobal (moduleId) {
        return (moduleId in globals);
    }

    /**
     * @param {string} moduleId
     * @returns {boolean}
     */
    function isLoaded (moduleId) {
        return isGlobal(moduleId) && globals[moduleId].get() !== null;
    }

    return {
        isGlobal: isGlobal,
        isLoaded: isLoaded,
        get: get
    };
})(typeof window !== 'undefined' ? window : this);

module.exports = getGlobals;

},{}],4:[function(require,module,exports){
var getLoader = (function (global) {
    'use strict';

    /** @type {string} */
    var E_INVALID_PATH = 'Unable to load module: invalid path';

    /** @type {boolean} */
    var isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]';
    /** @type {boolean} */
    var useInteractive = false;
    /** @type {Element} */
    var currentlyAddingScript;
    /** @type {Element} */
    var interactiveScript;

    /** @type {Node} */
    var baseElement = document.getElementsByTagName('base')[0];
    /** @type {Node} */
    var head = baseElement ? baseElement.parentNode : document.getElementsByTagName('head')[0];

    /** @type {Object} */
    var config = require('./config');

    /**
     * @param {amdModule} amdModule
     * @param {Function} defineCallback
     */
    function load (amdModule, defineCallback) {
        if (amdModule.getPath().match(/(^(\.{0,2}\/|(?:[a-z]+:)?\/\/)|\.js)/) === null) {
            throw new Error(E_INVALID_PATH);
        }

        var script = getScriptElement(amdModule);

        if (
            script.attachEvent
            && !(script.attachEvent.toString && script.attachEvent.toString().indexOf('[native code') < 0)
            && !isOpera
        ) {
            useInteractive = true;
            script.attachEvent('onreadystatechange', function (event) {
                onScriptLoad(script, event, defineCallback);
            });
        } else {
            script.addEventListener('load', function (event) {
                onScriptLoad(script, event, defineCallback);
            }, false);
            script.addEventListener('error', function () {
                if (!('console' in global)) {
                    return;
                }

                global['console'].error('`amdLoader`: Loading module `' + amdModule.getId() + '` failed, using script with url ' + amdModule.getPath());
            }, false);
        }

        script.src = getScriptSourceWithRevisionNumber(amdModule.getPath());

        // noinspection JSUnusedAssignment currentlyAddingScript is used in getInteractiveScript
        currentlyAddingScript = script;

        head.insertBefore(script, baseElement || null);

        currentlyAddingScript = null;
    }

    /**
     * @param {HTMLElement} script
     * @param {Event} event
     * @param {Function} defineCallback
     */
    function onScriptLoad (script, event, defineCallback) {
        if (
            event.type === 'load'
            || (/^(complete|loaded)$/.test((event.currentTarget || event.srcElement).readyState))
        ) {
            interactiveScript = null;
            defineCallback(script.getAttribute('data-moduleId'));
            script.removeAttribute('data-moduleId');
        }
    }

    /**
     * @param {amdModule} amdModule
     * @returns {Element}
     */
    function getScriptElement (amdModule) {
        var script = document.createElement('script');
        script.async = true;
        script.setAttribute('data-moduleId', amdModule.getId());
        return script;
    }

    /**
     * @returns {Element}
     */
    function getInteractiveScript () {
        if (currentlyAddingScript !== null) {
            return currentlyAddingScript;
        }

        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        var scripts = document.getElementsByTagName('script');
        var l = scripts.length;

        while (l--) {
            var script = scripts[l];

            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        }

        return null;
    }

    /**
     * @returns {string|null}
     */
    function getIdOfCurrentlyExecutingModule () {
        var script = getInteractiveScript();

        if (!script) {
            return null;
        }

        return script.getAttribute('data-moduleId') || null;
    }

    /**
     * @param {string} scriptPath
     * @returns {string}
     */
    function getScriptSourceWithRevisionNumber (scriptPath) {
        if (scriptPath.split('rev=').length > 1) {
            return scriptPath;
        }

        return scriptPath + (scriptPath.split('?')[1] ? '&' : '?') + 'rev=' + config.getRevision();
    }

    return {
        load: load,
        useInteractive: function () {
            return useInteractive;
        },
        getIdOfCurrentlyExecutingModule: getIdOfCurrentlyExecutingModule
    };
})(typeof window !== 'undefined' ? window : this);

module.exports = getLoader;

},{"./config":1}],5:[function(require,module,exports){
var defaultModules = (function () {
    'use strict';

    /** @type {Function} */
    var normalizeId = require('./normalizeId');
    /** @type {Object} */
    var path = require('./path');
    /** @type {Object} */
    var amdModule = require('./module');

    /**
     * @param {amdModule} context
     * @returns {amdModule}
     */
    function getLocalRequire (context) {
        function localRequire () {
            var args = [].slice.call(arguments);
            args[2] = context || null;
            return window.require.apply(window, args);
        }

        localRequire['toUrl'] = function (moduleId) {
            return path.get(normalizeId(moduleId), context);
        };

        return amdModule.create('require').setValue(localRequire);
    }

    /**
     * @param {amdModule} context
     * @returns {amdModule}
     */
    function getExports (context) {
        var exports = amdModule.create('exports');
        exports.setValue(context.getValue());
        return exports;
    }

    /**
     * @param {amdModule} context
     * @returns {amdModule}
     */
    function getModule (context) {
        return amdModule.create('module').setValue({
            id: context.getId(),
            uri: context.getPath()
        });
    }

    return {
        getLocalRequire: getLocalRequire,
        getExports: getExports,
        getModule: getModule
    };
}());

module.exports = defaultModules;

},{"./module":6,"./normalizeId":7,"./path":9}],6:[function(require,module,exports){
var moduleFactory = (function () {
    'use strict';

    /** @type {Object} */
    var globals = require('./globals');

    /**
     * @param {string} normalizedId
     * @param {string} path
     */
    function amdModule (normalizedId, path) {
        this.id = normalizedId;
        this.path = path || null;
        this.value = null;
        this.exports = {};
        this.defined = false;

        if (globals.isGlobal(normalizedId) && globals.isLoaded(normalizedId)) {
            this.setValue(globals.get(normalizedId));
        }
    }

    /**
     * @returns {string}
     */
    amdModule.prototype.getId = function () {
        return this.id;
    };

    /**
     * @returns {string}
     */
    amdModule.prototype.getPath = function () {
        return this.path;
    };

    /**
     * @param {*} value
     * @returns {amdModule}
     */
    amdModule.prototype.setValue = function (value) {
        this.value = value;
        this.defined = true;
        return this;
    };

    /**
     * @returns {*|null}
     */
    amdModule.prototype.getValue = function () {
        return this.value || this.exports;
    };

    /**
     * @returns {boolean}
     */
    amdModule.prototype.isDefined = function () {
        return this.defined;
    };

    /**
     * @returns {amdModule}
     */
    amdModule.prototype.setDefined = function () {
        this.defined = true;
        return this;
    };

    return {
        /**
         * @param {string} id
         * @param {string} path
         * @returns {amdModule}
         */
        create: function (id, path) {
            return new amdModule(id, path);
        }
    };
}());

module.exports = moduleFactory;

},{"./globals":3}],7:[function(require,module,exports){
var getNormalizeId = (function () {
    'use strict';

    /** @type {Object} */
    var path = require('./path');

    /**
     * @param {string} moduleResourceId
     * @param {amdModule} context
     * @returns {string}
     */
    return function (moduleResourceId, context) {
        var moduleId = moduleResourceId.indexOf('!') < 0 ? moduleResourceId : moduleResourceId.split('!')[0];
        moduleId = path.normalizePackageId(moduleId);

        if (!context || moduleId.indexOf('./') < 0) {
            return moduleId;
        }

        return path.resolve(moduleId, context.getId());
    };
})();

module.exports = getNormalizeId;

},{"./path":9}],8:[function(require,module,exports){
var getNormalizeResource = (function () {
    'use strict';

    /** @type {Object} */
    var path = require('./path');

    /**
     * @param {string} moduleResourceId
     * @param {amdModule} context
     * @returns {string|null}
     */
    function normalizeResource (moduleResourceId, context) {
        if (!moduleResourceId || moduleResourceId.indexOf('!') < 0) {
            return null;
        }

        var resourceParts = moduleResourceId.split('!');

        if (resourceParts[1].indexOf('./') < 0) {
            return resourceParts[1];
        }

        return path.get(resourceParts[1], context);
    }

    return normalizeResource;
})();

module.exports = getNormalizeResource;

},{"./path":9}],9:[function(require,module,exports){
var path = (function () {
    'use strict';

    /**
     * @type {Object.string}
     */
    var paths = {
        pb: '/a/userinterface/uibase/script/pblib',
        prototype: '/a/userinterface/uibase/script/prototype/prototype',
        oldComponent: '/a/userinterface/uibase/components',
        domReady: '/a/userinterface/uibase/vendor/domready/ready.min',
        css: '/a/userinterface/uibase/vendor/procurios/amdLoader/src/plugins/css',
        knockout: '/a/userinterface/uibase/vendor/knockout/dist/knockout',
        knockoutmapping: '/a/userinterface/uibase/vendor/knockout-mapping/build/output/knockout.mapping-latest',
        tinymce4: '/files/mod_editor/vendor/tinymce/4.9.6/tinymce.min',
        vendor: '/a/userinterface/uibase/vendor',
        highcharts233: '/a/userinterface/uibase/vendor/highcharts-2.3.3',
        highcharts401: '/a/userinterface/uibase/vendor/highcharts-4.0.1',
        highcharts415: '/a/userinterface/uibase/vendor/highcharts-4.1.5',
        highcharts711: '/a/userinterface/uibase/vendor/highcharts-7.1.1',
        component: '/a/lib/Component/script',
        droplet: '/a/userinterface/uibase/droplets',
        module: '/a/userinterface/module',
        elementQueries: '/a/userinterface/uibase/vendor/procurios/elementQueries/dist/elementQueries.min',
        resizeSensor: '/a/userinterface/uibase/vendor/procurios/resizeSensor/dist/resizeSensor.min',
        pusher: '/a/userinterface/uibase/vendor/pusher-js/dist/web/pusher.min'
    };

    /**
     * @type {Object.Object}
     */
    var packages = {
        moment: {
            location: '/a/userinterface/uibase/vendor/moment',
            main: 'moment'
        },
        'moment-timezone': {
            location: '/a/userinterface/uibase/vendor/moment-timezone',
            main: 'moment-timezone'
        },
        codemirror: {
            location: '/files/mod_editor/vendor/codemirror',
            main: 'lib/codemirror'
        }
    };

    /**
     * @param {string} normalizedModuleId
     * @param {amdModule|null} context
     * @returns {string}
     */
    function getPath (normalizedModuleId, context) {
        context = context || null;

        if (context !== null && isRelativePath(normalizedModuleId)) {
            return decorateWithExtension(resolveRelativePath(normalizedModuleId, context.getPath()));
        }

        if (isPackage(normalizedModuleId)) {
            return decorateWithExtension(getPathFromPackage(normalizedModuleId));
        }

        var nameParts = normalizedModuleId.split('/');
        var firstPart = nameParts.shift();
        if (!(firstPart in paths)) {
            // Assume its a full path to (external) file
            return normalizedModuleId;
        }

        var foundPath = paths[firstPart];
        if (nameParts.length > 0) {
            foundPath += '/' + nameParts.join('/');
        }
        return decorateWithExtension(foundPath);
    }

    /**
     * @param {string} moduleName
     * @returns {boolean}
     */
    function isRelativePath (moduleName) {
        return moduleName.match(/\.\.?\//) !== null;
    }

    /**
     * @param {string} moduleName
     * @param {string} filePath
     * @returns {string}
     */
    function resolveRelativePath (moduleName, filePath) {
        var nameParts = moduleName.split(/\/(?!\/)/);
        var filePathParts = filePath.split(/\/(?!\/)/);

        // Drop file name
        filePathParts.pop();

        var namePart;
        while (namePart = nameParts.shift()) {
            if (namePart === '.') {
                continue;
            }

            if (namePart === '..') {
                if (filePathParts.length <= 1) {
                    throw new Error('Invalid relative path');
                }
                filePathParts.pop();
                continue;
            }

            filePathParts.push(namePart);
        }

        return filePathParts.join('/');
    }

    /**
     * @param {string} moduleName
     * @returns {boolean}
     */
    function isPackage (moduleName) {
        return (
            (moduleName.indexOf('/') === -1 ? moduleName : moduleName.split('/')[0])
            in packages
        );
    }

    /**
     * @param {string} moduleName
     * @returns {string}
     */
    function getPathFromPackage (moduleName) {
        var nameParts = moduleName.split('/');
        var packageName = nameParts.shift();
        var myPackage = packages[packageName];

        return myPackage['location'] + '/' + (
            moduleName.indexOf('/') === -1
                ? myPackage['main']
                : nameParts.join('/')
        );
    }

    /**
     * @param {string} moduleName
     * @returns {string}
     */
    function normalizePackageId (moduleName) {
        if (!isPackage(moduleName) || moduleName.indexOf('/') !== -1) {
            return moduleName;
        }

        var nameParts = moduleName.split('/');
        var packageName = nameParts.shift();
        var myPackage = packages[packageName];

        return packageName + '/' + myPackage['main'];
    }

    /**
     * @param {string} pathToDecorate
     * @returns {string}
     */
    function decorateWithExtension (pathToDecorate) {
        if (pathToDecorate.match(/\.(css|js)$/) !== null) {
            return pathToDecorate;
        }

        return pathToDecorate + '.js';
    }

    return {
        get: getPath,
        normalizePackageId: normalizePackageId,
        resolve: resolveRelativePath
    };
}());

module.exports = path;

},{}],10:[function(require,module,exports){
var getRegistry = (function () {
    'use strict';

    /** @type {Object} */
    var modules = {};
    /** @type {Object} */
    var listeners = {};

    /**
     * @param {string} normalizedModuleId
     * @returns {amdModule|null}
     */
    function getModule (normalizedModuleId) {
        if (!(normalizedModuleId in modules)) {
            return null;
        }

        return modules[normalizedModuleId];
    }

    /**
     * @param {amdModule} amdModule
     */
    function registerModule (amdModule) {
        if (amdModule.getId() in modules) {
            return;
        }

        modules[amdModule.getId()] = amdModule;
    }

    /**
     * @param {amdModule} targetModule
     * @param {Function} listener
     */
    function addListener (targetModule, listener) {
        if (targetModule.isDefined()) {
            listener(targetModule);
            return;
        }

        var moduleId = targetModule.getId();
        if (listeners[moduleId]) {
            listeners[moduleId].push(listener);
            return;
        }

        listeners[moduleId] = [listener];
    }

    /**
     * @param {amdModule} definedModule
     */
    function resolve (definedModule) {
        var listener;
        var activeListeners = listeners[definedModule.getId()];
        if (activeListeners) {
            while (listener = activeListeners.shift()) {
                listener(definedModule);
            }
        }
    }

    return {
        getModule: getModule,
        registerModule: registerModule,
        addListener: addListener,
        resolve: resolve
    };
}());

module.exports = getRegistry;

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29uZmlnLmpzIiwic3JjL2RlZmluZS5qcyIsInNyYy9nbG9iYWxzLmpzIiwic3JjL2xvYWRlci5qcyIsInNyYy9tYWdpY01vZHVsZXMuanMiLCJzcmMvbW9kdWxlLmpzIiwic3JjL25vcm1hbGl6ZUlkLmpzIiwic3JjL25vcm1hbGl6ZVJlc291cmNlLmpzIiwic3JjL3BhdGguanMiLCJzcmMvcmVnaXN0cnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGdldENvbmZpZyA9IChmdW5jdGlvbiAoZ2xvYmFsKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqIEB2YXIgc3RyaW5nICovXG4gICAgdmFyIHJldmlzaW9uTnVtYmVyID0gJyc7XG5cbiAgICAoZnVuY3Rpb24gaW5pdGlhbGl6ZSAoKSB7XG4gICAgICAgIHZhciBzY3JpcHRzID0gZ2xvYmFsLmRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKTtcbiAgICAgICAgdmFyIGwgPSBzY3JpcHRzLmxlbmd0aDtcbiAgICAgICAgdmFyIG1haW5TY3JpcHQgPSBudWxsO1xuXG4gICAgICAgIHdoaWxlIChsLS0pIHtcbiAgICAgICAgICAgIHZhciBzY3JpcHQgPSBzY3JpcHRzW2xdO1xuXG4gICAgICAgICAgICBpZiAoc2NyaXB0Lmhhc0F0dHJpYnV0ZSgnZGF0YS1tYWluJykpIHtcbiAgICAgICAgICAgICAgICBtYWluU2NyaXB0ID0gc2NyaXB0O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1haW5TY3JpcHQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYWluU2NyaXB0Lmhhc0F0dHJpYnV0ZSgnZGF0YS1yZXYnKSkge1xuICAgICAgICAgICAgcmV2aXNpb25OdW1iZXIgPSBtYWluU2NyaXB0LmdldEF0dHJpYnV0ZSgnZGF0YS1yZXYnKTtcbiAgICAgICAgfVxuICAgIH0oKSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIGdldFJldmlzaW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gcmV2aXNpb25OdW1iZXI7XG4gICAgICAgIH1cbiAgICB9O1xufSh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHRoaXMpKTtcblxubW9kdWxlLmV4cG9ydHMgPSBnZXRDb25maWc7IiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBpZiAoJ2RlZmluZScgaW4gd2luZG93ICYmICdyZXF1aXJlJyBpbiB3aW5kb3cpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBFX01BTEZPUk1FRF9SRVFVSVJFID0gJ01hbGZvcm1lZCByZXF1aXJlJztcbiAgICB2YXIgRV9SRVFVSVJFX0ZBSUxFRCA9ICdSZXF1aXJlIGZhaWxlZCAobW9kdWxlIG5vdCBsb2FkZWQpJztcblxuICAgIC8qKiBAdHlwZSB7RnVuY3Rpb259ICovXG4gICAgdmFyIG5vcm1hbGl6ZUlkID0gcmVxdWlyZSgnLi9ub3JtYWxpemVJZCcpO1xuICAgIC8qKiBAdHlwZSB7RnVuY3Rpb259ICovXG4gICAgdmFyIG5vcm1hbGl6ZVJlc291cmNlID0gcmVxdWlyZSgnLi9ub3JtYWxpemVSZXNvdXJjZScpO1xuICAgIC8qKiBAdHlwZSB7T2JqZWN0fSAqL1xuICAgIHZhciBhbWRNb2R1bGUgPSByZXF1aXJlKCcuL21vZHVsZScpO1xuICAgIC8qKiBAdHlwZSB7T2JqZWN0fSAqL1xuICAgIHZhciBwYXRoID0gcmVxdWlyZSgnLi9wYXRoJyk7XG4gICAgLyoqIEB0eXBlIHtPYmplY3R9ICovXG4gICAgdmFyIHJlZ2lzdHJ5ID0gcmVxdWlyZSgnLi9yZWdpc3RyeScpO1xuICAgIC8qKiBAdHlwZSB7T2JqZWN0fSAqL1xuICAgIHZhciBtYWdpY01vZHVsZXMgPSByZXF1aXJlKCcuL21hZ2ljTW9kdWxlcycpO1xuICAgIC8qKiBAdHlwZSB7T2JqZWN0fSAqL1xuICAgIHZhciBsb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlcicpO1xuICAgIC8qKiBAdHlwZSB7T2JqZWN0fSAqL1xuICAgIHZhciBnbG9iYWxzID0gcmVxdWlyZSgnLi9nbG9iYWxzJyk7XG5cbiAgICAvKiogQHR5cGUge09iamVjdH0gKi9cbiAgICB2YXIgZGVmaW5lUXVldWUgPSB7fTtcbiAgICAvKiogQHR5cGUge09iamVjdH0gKi9cbiAgICB2YXIgZGVmaW5lSGlzdG9yeSA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd8QXJyYXl8RnVuY3Rpb259IG1vZHVsZUlkXG4gICAgICogQHBhcmFtIHtBcnJheXxGdW5jdGlvbn0gZGVwZW5kZW5jaWVzXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIHdpbmRvdy5kZWZpbmUgPSBmdW5jdGlvbiAobW9kdWxlSWQsIGRlcGVuZGVuY2llcywgZGVmaW5pdGlvbikge1xuICAgICAgICBpZiAodHlwZW9mIG1vZHVsZUlkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGVmaW5pdGlvbiA9IGRlcGVuZGVuY2llcztcbiAgICAgICAgICAgIGRlcGVuZGVuY2llcyA9IG1vZHVsZUlkO1xuICAgICAgICAgICAgbW9kdWxlSWQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkZXBlbmRlbmNpZXMgfHwgIShkZXBlbmRlbmNpZXMgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGRlZmluaXRpb24gPSBkZXBlbmRlbmNpZXM7XG4gICAgICAgICAgICBkZXBlbmRlbmNpZXMgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtb2R1bGVJZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGxvYWRlci51c2VJbnRlcmFjdGl2ZSgpKSB7XG4gICAgICAgICAgICAgICAgbW9kdWxlSWQgPSBsb2FkZXIuZ2V0SWRPZkN1cnJlbnRseUV4ZWN1dGluZ01vZHVsZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkZWZpbmVRdWV1ZVttb2R1bGVJZCB8fCAnbGFzdCddID0gW21vZHVsZUlkLCBkZXBlbmRlbmNpZXMsIGRlZmluaXRpb25dO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbW9kdWxlSWQgPSBub3JtYWxpemVJZChtb2R1bGVJZCk7XG4gICAgICAgIGRlZmluZUhpc3RvcnlbbW9kdWxlSWRdID0gdHJ1ZTtcbiAgICAgICAgdmFyIG1vZHVsZVRvRGVmaW5lID0gcmVnaXN0cnkuZ2V0TW9kdWxlKG1vZHVsZUlkKSB8fCBhbWRNb2R1bGUuY3JlYXRlKG1vZHVsZUlkLCBwYXRoLmdldChtb2R1bGVJZCkpO1xuICAgICAgICByZWdpc3RyeS5yZWdpc3Rlck1vZHVsZShtb2R1bGVUb0RlZmluZSk7XG5cbiAgICAgICAgaWYgKGRlcGVuZGVuY2llcy5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgICBkZWZpbml0aW9uICYmIG1vZHVsZVRvRGVmaW5lLnNldFZhbHVlKFxuICAgICAgICAgICAgICAgIHR5cGVvZiBkZWZpbml0aW9uID09PSAnZnVuY3Rpb24nID8gZGVmaW5pdGlvbigpIDogZGVmaW5pdGlvblxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJlZ2lzdHJ5LnJlc29sdmUobW9kdWxlVG9EZWZpbmUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcXVldWVEZXBlbmRlbmNpZXMoZGVwZW5kZW5jaWVzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkZWZpbml0aW9uICYmIG1vZHVsZVRvRGVmaW5lLnNldFZhbHVlKGRlZmluaXRpb24uYXBwbHkobnVsbCwgYXJndW1lbnRzKSk7XG4gICAgICAgICAgICByZWdpc3RyeS5yZXNvbHZlKG1vZHVsZVRvRGVmaW5lKTtcbiAgICAgICAgfSwgbW9kdWxlVG9EZWZpbmUpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge0FycmF5fHN0cmluZ3xGdW5jdGlvbn0gZGVwZW5kZW5jaWVzXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZGVmaW5pdGlvblxuICAgICAqIEBwYXJhbSB7YW1kTW9kdWxlfSBjb250ZXh0XG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgd2luZG93LnJlcXVpcmUgPSBmdW5jdGlvbiAoZGVwZW5kZW5jaWVzLCBkZWZpbml0aW9uLCBjb250ZXh0KSB7XG4gICAgICAgIGlmICghZGVwZW5kZW5jaWVzICYmICFkZWZpbml0aW9uKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoRV9NQUxGT1JNRURfUkVRVUlSRSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVwZW5kZW5jaWVzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIHF1ZXVlRGVwZW5kZW5jaWVzKGRlcGVuZGVuY2llcywgZGVmaW5pdGlvbiwgY29udGV4dCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGRlcGVuZGVuY2llcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHZhciBtb2R1bGVJZCA9IG5vcm1hbGl6ZUlkKGRlcGVuZGVuY2llcyk7XG4gICAgICAgICAgICB2YXIgbG9hZGVkTW9kdWxlID0gcmVnaXN0cnkuZ2V0TW9kdWxlKG1vZHVsZUlkKTtcblxuICAgICAgICAgICAgaWYgKCFsb2FkZWRNb2R1bGUgfHwgIWxvYWRlZE1vZHVsZS5pc0RlZmluZWQoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihFX1JFUVVJUkVfRkFJTEVEKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGxvYWRlZE1vZHVsZS5nZXRWYWx1ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkZXBlbmRlbmNpZXMgPT09ICdmdW5jdGlvbicgJiYgIWRlZmluaXRpb24pIHtcbiAgICAgICAgICAgIGRlcGVuZGVuY2llcygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKEVfTUFMRk9STUVEX1JFUVVJUkUpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlSWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlUGF0aFxuICAgICAqIEByZXR1cm5zIHthbWRNb2R1bGV9XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlQW5kTG9hZE1vZHVsZSAobW9kdWxlSWQsIG1vZHVsZVBhdGgpIHtcbiAgICAgICAgaWYgKHJlZ2lzdHJ5LmdldE1vZHVsZShtb2R1bGVJZCkpIHtcbiAgICAgICAgICAgIHJldHVybiByZWdpc3RyeS5nZXRNb2R1bGUobW9kdWxlSWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5ld01vZHVsZSA9IGFtZE1vZHVsZS5jcmVhdGUobW9kdWxlSWQsIG1vZHVsZVBhdGgpO1xuICAgICAgICByZWdpc3RyeS5yZWdpc3Rlck1vZHVsZShuZXdNb2R1bGUpO1xuXG4gICAgICAgIGlmICghbmV3TW9kdWxlLmlzRGVmaW5lZCgpKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxvYWRlci5sb2FkKG5ld01vZHVsZSwgZmluaXNoRGVmaW5pbmcpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXdNb2R1bGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3TW9kdWxlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsb2FkZWRNb2R1bGVJZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmlzaERlZmluaW5nIChsb2FkZWRNb2R1bGVJZCkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgICAhKGxvYWRlZE1vZHVsZUlkIGluIGRlZmluZVF1ZXVlKVxuICAgICAgICAgICAgJiYgISgnbGFzdCcgaW4gZGVmaW5lUXVldWUpXG4gICAgICAgICAgICAmJiAhZ2xvYmFscy5pc0dsb2JhbChsb2FkZWRNb2R1bGVJZClcbiAgICAgICAgICAgICYmICEobG9hZGVkTW9kdWxlSWQgaW4gZGVmaW5lSGlzdG9yeSlcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB2YXIgbG9hZGVkTW9kdWxlID0gcmVnaXN0cnkuZ2V0TW9kdWxlKGxvYWRlZE1vZHVsZUlkKTtcbiAgICAgICAgICAgIGxvYWRlZE1vZHVsZSAmJiBsb2FkZWRNb2R1bGUuc2V0RGVmaW5lZCgpICYmIHJlZ2lzdHJ5LnJlc29sdmUobG9hZGVkTW9kdWxlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBkZWZpbmVBcmd1bWVudHMgPSBudWxsO1xuXG4gICAgICAgIGlmIChsb2FkZXIudXNlSW50ZXJhY3RpdmUoKSAmJiBsb2FkZWRNb2R1bGVJZCBpbiBkZWZpbmVRdWV1ZSkge1xuICAgICAgICAgICAgZGVmaW5lQXJndW1lbnRzID0gZGVmaW5lUXVldWVbbG9hZGVkTW9kdWxlSWRdO1xuICAgICAgICAgICAgZGVsZXRlIGRlZmluZVF1ZXVlW2xvYWRlZE1vZHVsZUlkXTtcbiAgICAgICAgfSBlbHNlIGlmICghbG9hZGVyLnVzZUludGVyYWN0aXZlKCkpIHtcbiAgICAgICAgICAgIGRlZmluZUFyZ3VtZW50cyA9IGRlZmluZVF1ZXVlWydsYXN0J10gfHwgW107XG4gICAgICAgICAgICBkZWZpbmVBcmd1bWVudHNbMF0gPSBsb2FkZWRNb2R1bGVJZDtcbiAgICAgICAgICAgIGRlbGV0ZSBkZWZpbmVRdWV1ZVsnbGFzdCddO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkZWZpbmVBcmd1bWVudHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChnbG9iYWxzLmlzR2xvYmFsKGxvYWRlZE1vZHVsZUlkKSAmJiBkZWZpbmVBcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBpZiAobG9hZGVkTW9kdWxlSWQgaW4gZGVmaW5lSGlzdG9yeSkge1xuICAgICAgICAgICAgICAgIC8vIEdsb2JhbCBpcyBhcHBhcmVudGx5IHVzaW5nIEFNRCB0byByZWdpc3RlciBpdHNlbGZcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRlZmluZUFyZ3VtZW50c1sxXSA9IFtdO1xuICAgICAgICAgICAgZGVmaW5lQXJndW1lbnRzWzJdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZ2xvYmFscy5nZXQobG9hZGVkTW9kdWxlSWQpOyB9O1xuICAgICAgICB9XG5cbiAgICAgICAgd2luZG93LmRlZmluZS5hcHBseShudWxsLCBkZWZpbmVBcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHF1ZXVlRGVwZW5kZW5jaWVzICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbG9hZERlcGVuZGVuY2llcy5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgfSwgNCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGVwZW5kZW5jaWVzXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZGVmaW5pdGlvblxuICAgICAqIEBwYXJhbSB7YW1kTW9kdWxlfSBjb250ZXh0XG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZERlcGVuZGVuY2llcyAoZGVwZW5kZW5jaWVzLCBkZWZpbml0aW9uLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICAgICAgdmFyIGxvYWRlZCA9IDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7YW1kTW9kdWxlfSBsb2FkZWRNb2R1bGVcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBkZXBlbmRlbmN5TG9hZGVkIChsb2FkZWRNb2R1bGUsIHJlc291cmNlKSB7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbW9kdWxlVmFsdWUgPSBsb2FkZWRNb2R1bGUuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICBtb2R1bGVWYWx1ZS5sb2FkKHJlc291cmNlLCBmdW5jdGlvbiAobG9hZGVkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwbHlEZXBlbmRlbmN5VmFsdWUobG9hZGVkTW9kdWxlLmdldElkKCkgKyAnIScgKyByZXNvdXJjZSwgbG9hZGVkVmFsdWUgfHwgbW9kdWxlVmFsdWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXBwbHlEZXBlbmRlbmN5VmFsdWUobG9hZGVkTW9kdWxlLmdldElkKCksIGxvYWRlZE1vZHVsZS5nZXRWYWx1ZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlUmVzb3VyY2VJZFxuICAgICAgICAgKiBAcGFyYW0geyp9IG1vZHVsZVZhbHVlXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBhcHBseURlcGVuZGVuY3lWYWx1ZSAobW9kdWxlUmVzb3VyY2VJZCwgbW9kdWxlVmFsdWUpIHtcbiAgICAgICAgICAgIHZhbHVlc1tkZXBlbmRlbmNpZXMuaW5kZXhPZihtb2R1bGVSZXNvdXJjZUlkKV0gPSBtb2R1bGVWYWx1ZTtcblxuICAgICAgICAgICAgaWYgKGRlZmluaXRpb24gJiYgKytsb2FkZWQgPj0gZGVwZW5kZW5jaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRlZmluaXRpb24uYXBwbHkobnVsbCwgdmFsdWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlSWRcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBsb2FkRGVwZW5kZW5jeSAobW9kdWxlSWQsIHJlc291cmNlKSB7XG4gICAgICAgICAgICB2YXIgbW9kdWxlVG9Mb2FkO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKG1vZHVsZUlkKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAncmVxdWlyZSc6XG4gICAgICAgICAgICAgICAgICAgIG1vZHVsZVRvTG9hZCA9IG1hZ2ljTW9kdWxlcy5nZXRMb2NhbFJlcXVpcmUoY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2V4cG9ydHMnOlxuICAgICAgICAgICAgICAgICAgICBtb2R1bGVUb0xvYWQgPSBtYWdpY01vZHVsZXMuZ2V0RXhwb3J0cyhjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbW9kdWxlJzpcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlVG9Mb2FkID0gbWFnaWNNb2R1bGVzLmdldE1vZHVsZShjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlVG9Mb2FkID0gcmVnaXN0cnkuZ2V0TW9kdWxlKG1vZHVsZUlkKSB8fCBjcmVhdGVBbmRMb2FkTW9kdWxlKG1vZHVsZUlkLCBwYXRoLmdldChtb2R1bGVJZCwgY29udGV4dCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZWdpc3RyeS5hZGRMaXN0ZW5lcihtb2R1bGVUb0xvYWQsIGZ1bmN0aW9uIChsb2FkZWRNb2R1bGUpIHtcbiAgICAgICAgICAgICAgICBkZXBlbmRlbmN5TG9hZGVkKGxvYWRlZE1vZHVsZSwgcmVzb3VyY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRlcGVuZGVuY2llcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG1vZHVsZUlkID0gbm9ybWFsaXplSWQoZGVwZW5kZW5jaWVzW2ldLCBjb250ZXh0KTtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZSA9IG5vcm1hbGl6ZVJlc291cmNlKGRlcGVuZGVuY2llc1tpXSwgY29udGV4dCk7XG4gICAgICAgICAgICBkZXBlbmRlbmNpZXNbaV0gPSAocmVzb3VyY2UpID8gbW9kdWxlSWQgKyAnIScgKyByZXNvdXJjZSA6IG1vZHVsZUlkO1xuICAgICAgICAgICAgbG9hZERlcGVuZGVuY3kobW9kdWxlSWQsIHJlc291cmNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEB0eXBlIHt7alF1ZXJ5OiBib29sZWFufX1cbiAgICAgKi9cbiAgICB3aW5kb3cuZGVmaW5lLmFtZCA9IHtcbiAgICAgICAgalF1ZXJ5OiB0cnVlXG4gICAgfTtcbn0pKCk7XG4iLCJ2YXIgZ2V0R2xvYmFscyA9IChmdW5jdGlvbiAoZ2xvYmFsKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqIEB0eXBlIHtPYmplY3R9ICovXG4gICAgdmFyIGdsb2JhbHMgPSB7XG4gICAgICAgICdwYi9wYmxpYic6IHtcbiAgICAgICAgICAgIG5hbWU6ICdQYkxpYicsXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoISgnUGJMaWInIGluIGdsb2JhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFsnUGJMaWInXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcHJvdG90eXBlOiB7XG4gICAgICAgICAgICBuYW1lOiAnUHJvdG90eXBlJyxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICghKCdQcm90b3R5cGUnIGluIGdsb2JhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFsnJCddO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0aW55bWNlNDoge1xuICAgICAgICAgICAgbmFtZTogJ1RpbnlNQ0UnLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoJ3RpbnltY2UnIGluIGdsb2JhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFsndGlueW1jZSddO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBlbGVtZW50UXVlcmllczoge1xuICAgICAgICAgICAgbmFtZTogJ2VsZW1lbnRRdWVyaWVzJyxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICghKCdlbGVtZW50UXVlcmllcycgaW4gZ2xvYmFsKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsWydlbGVtZW50UXVlcmllcyddO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZXNpemVTZW5zb3I6IHtcbiAgICAgICAgICAgIG5hbWU6ICdyZXNpemVTZW5zb3InLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoJ3Jlc2l6ZVNlbnNvcicgaW4gZ2xvYmFsKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsWydyZXNpemVTZW5zb3InXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlSWRcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXQgKG1vZHVsZUlkKSB7XG4gICAgICAgIHJldHVybiBnbG9iYWxzW21vZHVsZUlkXS5nZXQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlSWRcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0dsb2JhbCAobW9kdWxlSWQpIHtcbiAgICAgICAgcmV0dXJuIChtb2R1bGVJZCBpbiBnbG9iYWxzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlSWRcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0xvYWRlZCAobW9kdWxlSWQpIHtcbiAgICAgICAgcmV0dXJuIGlzR2xvYmFsKG1vZHVsZUlkKSAmJiBnbG9iYWxzW21vZHVsZUlkXS5nZXQoKSAhPT0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBpc0dsb2JhbDogaXNHbG9iYWwsXG4gICAgICAgIGlzTG9hZGVkOiBpc0xvYWRlZCxcbiAgICAgICAgZ2V0OiBnZXRcbiAgICB9O1xufSkodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB0aGlzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBnZXRHbG9iYWxzO1xuIiwidmFyIGdldExvYWRlciA9IChmdW5jdGlvbiAoZ2xvYmFsKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqIEB0eXBlIHtzdHJpbmd9ICovXG4gICAgdmFyIEVfSU5WQUxJRF9QQVRIID0gJ1VuYWJsZSB0byBsb2FkIG1vZHVsZTogaW52YWxpZCBwYXRoJztcblxuICAgIC8qKiBAdHlwZSB7Ym9vbGVhbn0gKi9cbiAgICB2YXIgaXNPcGVyYSA9IHR5cGVvZiBvcGVyYSAhPT0gJ3VuZGVmaW5lZCcgJiYgb3BlcmEudG9TdHJpbmcoKSA9PT0gJ1tvYmplY3QgT3BlcmFdJztcbiAgICAvKiogQHR5cGUge2Jvb2xlYW59ICovXG4gICAgdmFyIHVzZUludGVyYWN0aXZlID0gZmFsc2U7XG4gICAgLyoqIEB0eXBlIHtFbGVtZW50fSAqL1xuICAgIHZhciBjdXJyZW50bHlBZGRpbmdTY3JpcHQ7XG4gICAgLyoqIEB0eXBlIHtFbGVtZW50fSAqL1xuICAgIHZhciBpbnRlcmFjdGl2ZVNjcmlwdDtcblxuICAgIC8qKiBAdHlwZSB7Tm9kZX0gKi9cbiAgICB2YXIgYmFzZUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYmFzZScpWzBdO1xuICAgIC8qKiBAdHlwZSB7Tm9kZX0gKi9cbiAgICB2YXIgaGVhZCA9IGJhc2VFbGVtZW50ID8gYmFzZUVsZW1lbnQucGFyZW50Tm9kZSA6IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG5cbiAgICAvKiogQHR5cGUge09iamVjdH0gKi9cbiAgICB2YXIgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7YW1kTW9kdWxlfSBhbWRNb2R1bGVcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBkZWZpbmVDYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWQgKGFtZE1vZHVsZSwgZGVmaW5lQ2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGFtZE1vZHVsZS5nZXRQYXRoKCkubWF0Y2goLyheKFxcLnswLDJ9XFwvfCg/OlthLXpdKzopP1xcL1xcLyl8XFwuanMpLykgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihFX0lOVkFMSURfUEFUSCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2NyaXB0ID0gZ2V0U2NyaXB0RWxlbWVudChhbWRNb2R1bGUpO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHNjcmlwdC5hdHRhY2hFdmVudFxuICAgICAgICAgICAgJiYgIShzY3JpcHQuYXR0YWNoRXZlbnQudG9TdHJpbmcgJiYgc2NyaXB0LmF0dGFjaEV2ZW50LnRvU3RyaW5nKCkuaW5kZXhPZignW25hdGl2ZSBjb2RlJykgPCAwKVxuICAgICAgICAgICAgJiYgIWlzT3BlcmFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB1c2VJbnRlcmFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICBzY3JpcHQuYXR0YWNoRXZlbnQoJ29ucmVhZHlzdGF0ZWNoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIG9uU2NyaXB0TG9hZChzY3JpcHQsIGV2ZW50LCBkZWZpbmVDYWxsYmFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNjcmlwdC5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgb25TY3JpcHRMb2FkKHNjcmlwdCwgZXZlbnQsIGRlZmluZUNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgIHNjcmlwdC5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoISgnY29uc29sZScgaW4gZ2xvYmFsKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZ2xvYmFsWydjb25zb2xlJ10uZXJyb3IoJ2BhbWRMb2FkZXJgOiBMb2FkaW5nIG1vZHVsZSBgJyArIGFtZE1vZHVsZS5nZXRJZCgpICsgJ2AgZmFpbGVkLCB1c2luZyBzY3JpcHQgd2l0aCB1cmwgJyArIGFtZE1vZHVsZS5nZXRQYXRoKCkpO1xuICAgICAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2NyaXB0LnNyYyA9IGdldFNjcmlwdFNvdXJjZVdpdGhSZXZpc2lvbk51bWJlcihhbWRNb2R1bGUuZ2V0UGF0aCgpKTtcblxuICAgICAgICAvLyBub2luc3BlY3Rpb24gSlNVbnVzZWRBc3NpZ25tZW50IGN1cnJlbnRseUFkZGluZ1NjcmlwdCBpcyB1c2VkIGluIGdldEludGVyYWN0aXZlU2NyaXB0XG4gICAgICAgIGN1cnJlbnRseUFkZGluZ1NjcmlwdCA9IHNjcmlwdDtcblxuICAgICAgICBoZWFkLmluc2VydEJlZm9yZShzY3JpcHQsIGJhc2VFbGVtZW50IHx8IG51bGwpO1xuXG4gICAgICAgIGN1cnJlbnRseUFkZGluZ1NjcmlwdCA9IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gc2NyaXB0XG4gICAgICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBkZWZpbmVDYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uU2NyaXB0TG9hZCAoc2NyaXB0LCBldmVudCwgZGVmaW5lQ2FsbGJhY2spIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgZXZlbnQudHlwZSA9PT0gJ2xvYWQnXG4gICAgICAgICAgICB8fCAoL14oY29tcGxldGV8bG9hZGVkKSQvLnRlc3QoKGV2ZW50LmN1cnJlbnRUYXJnZXQgfHwgZXZlbnQuc3JjRWxlbWVudCkucmVhZHlTdGF0ZSkpXG4gICAgICAgICkge1xuICAgICAgICAgICAgaW50ZXJhY3RpdmVTY3JpcHQgPSBudWxsO1xuICAgICAgICAgICAgZGVmaW5lQ2FsbGJhY2soc2NyaXB0LmdldEF0dHJpYnV0ZSgnZGF0YS1tb2R1bGVJZCcpKTtcbiAgICAgICAgICAgIHNjcmlwdC5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtbW9kdWxlSWQnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7YW1kTW9kdWxlfSBhbWRNb2R1bGVcbiAgICAgKiBAcmV0dXJucyB7RWxlbWVudH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRTY3JpcHRFbGVtZW50IChhbWRNb2R1bGUpIHtcbiAgICAgICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgICBzY3JpcHQuYXN5bmMgPSB0cnVlO1xuICAgICAgICBzY3JpcHQuc2V0QXR0cmlidXRlKCdkYXRhLW1vZHVsZUlkJywgYW1kTW9kdWxlLmdldElkKCkpO1xuICAgICAgICByZXR1cm4gc2NyaXB0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtFbGVtZW50fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldEludGVyYWN0aXZlU2NyaXB0ICgpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRseUFkZGluZ1NjcmlwdCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRseUFkZGluZ1NjcmlwdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbnRlcmFjdGl2ZVNjcmlwdCAmJiBpbnRlcmFjdGl2ZVNjcmlwdC5yZWFkeVN0YXRlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gICAgICAgICAgICByZXR1cm4gaW50ZXJhY3RpdmVTY3JpcHQ7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2NyaXB0cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKTtcbiAgICAgICAgdmFyIGwgPSBzY3JpcHRzLmxlbmd0aDtcblxuICAgICAgICB3aGlsZSAobC0tKSB7XG4gICAgICAgICAgICB2YXIgc2NyaXB0ID0gc2NyaXB0c1tsXTtcblxuICAgICAgICAgICAgaWYgKHNjcmlwdC5yZWFkeVN0YXRlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChpbnRlcmFjdGl2ZVNjcmlwdCA9IHNjcmlwdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0SWRPZkN1cnJlbnRseUV4ZWN1dGluZ01vZHVsZSAoKSB7XG4gICAgICAgIHZhciBzY3JpcHQgPSBnZXRJbnRlcmFjdGl2ZVNjcmlwdCgpO1xuXG4gICAgICAgIGlmICghc2NyaXB0KSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzY3JpcHQuZ2V0QXR0cmlidXRlKCdkYXRhLW1vZHVsZUlkJykgfHwgbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2NyaXB0UGF0aFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0U2NyaXB0U291cmNlV2l0aFJldmlzaW9uTnVtYmVyIChzY3JpcHRQYXRoKSB7XG4gICAgICAgIGlmIChzY3JpcHRQYXRoLnNwbGl0KCdyZXY9JykubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHNjcmlwdFBhdGg7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2NyaXB0UGF0aCArIChzY3JpcHRQYXRoLnNwbGl0KCc/JylbMV0gPyAnJicgOiAnPycpICsgJ3Jldj0nICsgY29uZmlnLmdldFJldmlzaW9uKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgbG9hZDogbG9hZCxcbiAgICAgICAgdXNlSW50ZXJhY3RpdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB1c2VJbnRlcmFjdGl2ZTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SWRPZkN1cnJlbnRseUV4ZWN1dGluZ01vZHVsZTogZ2V0SWRPZkN1cnJlbnRseUV4ZWN1dGluZ01vZHVsZVxuICAgIH07XG59KSh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHRoaXMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGdldExvYWRlcjtcbiIsInZhciBkZWZhdWx0TW9kdWxlcyA9IChmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqIEB0eXBlIHtGdW5jdGlvbn0gKi9cbiAgICB2YXIgbm9ybWFsaXplSWQgPSByZXF1aXJlKCcuL25vcm1hbGl6ZUlkJyk7XG4gICAgLyoqIEB0eXBlIHtPYmplY3R9ICovXG4gICAgdmFyIHBhdGggPSByZXF1aXJlKCcuL3BhdGgnKTtcbiAgICAvKiogQHR5cGUge09iamVjdH0gKi9cbiAgICB2YXIgYW1kTW9kdWxlID0gcmVxdWlyZSgnLi9tb2R1bGUnKTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7YW1kTW9kdWxlfSBjb250ZXh0XG4gICAgICogQHJldHVybnMge2FtZE1vZHVsZX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRMb2NhbFJlcXVpcmUgKGNvbnRleHQpIHtcbiAgICAgICAgZnVuY3Rpb24gbG9jYWxSZXF1aXJlICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgYXJnc1syXSA9IGNvbnRleHQgfHwgbnVsbDtcbiAgICAgICAgICAgIHJldHVybiB3aW5kb3cucmVxdWlyZS5hcHBseSh3aW5kb3csIGFyZ3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9jYWxSZXF1aXJlWyd0b1VybCddID0gZnVuY3Rpb24gKG1vZHVsZUlkKSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aC5nZXQobm9ybWFsaXplSWQobW9kdWxlSWQpLCBjb250ZXh0KTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gYW1kTW9kdWxlLmNyZWF0ZSgncmVxdWlyZScpLnNldFZhbHVlKGxvY2FsUmVxdWlyZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHthbWRNb2R1bGV9IGNvbnRleHRcbiAgICAgKiBAcmV0dXJucyB7YW1kTW9kdWxlfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldEV4cG9ydHMgKGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGV4cG9ydHMgPSBhbWRNb2R1bGUuY3JlYXRlKCdleHBvcnRzJyk7XG4gICAgICAgIGV4cG9ydHMuc2V0VmFsdWUoY29udGV4dC5nZXRWYWx1ZSgpKTtcbiAgICAgICAgcmV0dXJuIGV4cG9ydHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHthbWRNb2R1bGV9IGNvbnRleHRcbiAgICAgKiBAcmV0dXJucyB7YW1kTW9kdWxlfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldE1vZHVsZSAoY29udGV4dCkge1xuICAgICAgICByZXR1cm4gYW1kTW9kdWxlLmNyZWF0ZSgnbW9kdWxlJykuc2V0VmFsdWUoe1xuICAgICAgICAgICAgaWQ6IGNvbnRleHQuZ2V0SWQoKSxcbiAgICAgICAgICAgIHVyaTogY29udGV4dC5nZXRQYXRoKClcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0TG9jYWxSZXF1aXJlOiBnZXRMb2NhbFJlcXVpcmUsXG4gICAgICAgIGdldEV4cG9ydHM6IGdldEV4cG9ydHMsXG4gICAgICAgIGdldE1vZHVsZTogZ2V0TW9kdWxlXG4gICAgfTtcbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVmYXVsdE1vZHVsZXM7XG4iLCJ2YXIgbW9kdWxlRmFjdG9yeSA9IChmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqIEB0eXBlIHtPYmplY3R9ICovXG4gICAgdmFyIGdsb2JhbHMgPSByZXF1aXJlKCcuL2dsb2JhbHMnKTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBub3JtYWxpemVkSWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGFtZE1vZHVsZSAobm9ybWFsaXplZElkLCBwYXRoKSB7XG4gICAgICAgIHRoaXMuaWQgPSBub3JtYWxpemVkSWQ7XG4gICAgICAgIHRoaXMucGF0aCA9IHBhdGggfHwgbnVsbDtcbiAgICAgICAgdGhpcy52YWx1ZSA9IG51bGw7XG4gICAgICAgIHRoaXMuZXhwb3J0cyA9IHt9O1xuICAgICAgICB0aGlzLmRlZmluZWQgPSBmYWxzZTtcblxuICAgICAgICBpZiAoZ2xvYmFscy5pc0dsb2JhbChub3JtYWxpemVkSWQpICYmIGdsb2JhbHMuaXNMb2FkZWQobm9ybWFsaXplZElkKSkge1xuICAgICAgICAgICAgdGhpcy5zZXRWYWx1ZShnbG9iYWxzLmdldChub3JtYWxpemVkSWQpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgYW1kTW9kdWxlLnByb3RvdHlwZS5nZXRJZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgYW1kTW9kdWxlLnByb3RvdHlwZS5nZXRQYXRoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXRoO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlXG4gICAgICogQHJldHVybnMge2FtZE1vZHVsZX1cbiAgICAgKi9cbiAgICBhbWRNb2R1bGUucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5kZWZpbmVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHsqfG51bGx9XG4gICAgICovXG4gICAgYW1kTW9kdWxlLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWUgfHwgdGhpcy5leHBvcnRzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBhbWRNb2R1bGUucHJvdG90eXBlLmlzRGVmaW5lZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge2FtZE1vZHVsZX1cbiAgICAgKi9cbiAgICBhbWRNb2R1bGUucHJvdG90eXBlLnNldERlZmluZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuZGVmaW5lZCA9IHRydWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGlkXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gICAgICAgICAqIEByZXR1cm5zIHthbWRNb2R1bGV9XG4gICAgICAgICAqL1xuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uIChpZCwgcGF0aCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBhbWRNb2R1bGUoaWQsIHBhdGgpO1xuICAgICAgICB9XG4gICAgfTtcbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kdWxlRmFjdG9yeTtcbiIsInZhciBnZXROb3JtYWxpemVJZCA9IChmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqIEB0eXBlIHtPYmplY3R9ICovXG4gICAgdmFyIHBhdGggPSByZXF1aXJlKCcuL3BhdGgnKTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVSZXNvdXJjZUlkXG4gICAgICogQHBhcmFtIHthbWRNb2R1bGV9IGNvbnRleHRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIHJldHVybiBmdW5jdGlvbiAobW9kdWxlUmVzb3VyY2VJZCwgY29udGV4dCkge1xuICAgICAgICB2YXIgbW9kdWxlSWQgPSBtb2R1bGVSZXNvdXJjZUlkLmluZGV4T2YoJyEnKSA8IDAgPyBtb2R1bGVSZXNvdXJjZUlkIDogbW9kdWxlUmVzb3VyY2VJZC5zcGxpdCgnIScpWzBdO1xuICAgICAgICBtb2R1bGVJZCA9IHBhdGgubm9ybWFsaXplUGFja2FnZUlkKG1vZHVsZUlkKTtcblxuICAgICAgICBpZiAoIWNvbnRleHQgfHwgbW9kdWxlSWQuaW5kZXhPZignLi8nKSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBtb2R1bGVJZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYXRoLnJlc29sdmUobW9kdWxlSWQsIGNvbnRleHQuZ2V0SWQoKSk7XG4gICAgfTtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0Tm9ybWFsaXplSWQ7XG4iLCJ2YXIgZ2V0Tm9ybWFsaXplUmVzb3VyY2UgPSAoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8qKiBAdHlwZSB7T2JqZWN0fSAqL1xuICAgIHZhciBwYXRoID0gcmVxdWlyZSgnLi9wYXRoJyk7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlUmVzb3VyY2VJZFxuICAgICAqIEBwYXJhbSB7YW1kTW9kdWxlfSBjb250ZXh0XG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZVJlc291cmNlIChtb2R1bGVSZXNvdXJjZUlkLCBjb250ZXh0KSB7XG4gICAgICAgIGlmICghbW9kdWxlUmVzb3VyY2VJZCB8fCBtb2R1bGVSZXNvdXJjZUlkLmluZGV4T2YoJyEnKSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlc291cmNlUGFydHMgPSBtb2R1bGVSZXNvdXJjZUlkLnNwbGl0KCchJyk7XG5cbiAgICAgICAgaWYgKHJlc291cmNlUGFydHNbMV0uaW5kZXhPZignLi8nKSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiByZXNvdXJjZVBhcnRzWzFdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBhdGguZ2V0KHJlc291cmNlUGFydHNbMV0sIGNvbnRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiBub3JtYWxpemVSZXNvdXJjZTtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0Tm9ybWFsaXplUmVzb3VyY2U7XG4iLCJ2YXIgcGF0aCA9IChmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUge09iamVjdC5zdHJpbmd9XG4gICAgICovXG4gICAgdmFyIHBhdGhzID0ge1xuICAgICAgICBwYjogJy9hL3VzZXJpbnRlcmZhY2UvdWliYXNlL3NjcmlwdC9wYmxpYicsXG4gICAgICAgIHByb3RvdHlwZTogJy9hL3VzZXJpbnRlcmZhY2UvdWliYXNlL3NjcmlwdC9wcm90b3R5cGUvcHJvdG90eXBlJyxcbiAgICAgICAgb2xkQ29tcG9uZW50OiAnL2EvdXNlcmludGVyZmFjZS91aWJhc2UvY29tcG9uZW50cycsXG4gICAgICAgIGRvbVJlYWR5OiAnL2EvdXNlcmludGVyZmFjZS91aWJhc2UvdmVuZG9yL2RvbXJlYWR5L3JlYWR5Lm1pbicsXG4gICAgICAgIGNzczogJy9hL3VzZXJpbnRlcmZhY2UvdWliYXNlL3ZlbmRvci9wcm9jdXJpb3MvYW1kTG9hZGVyL3NyYy9wbHVnaW5zL2NzcycsXG4gICAgICAgIGtub2Nrb3V0OiAnL2EvdXNlcmludGVyZmFjZS91aWJhc2UvdmVuZG9yL2tub2Nrb3V0L2Rpc3Qva25vY2tvdXQnLFxuICAgICAgICBrbm9ja291dG1hcHBpbmc6ICcvYS91c2VyaW50ZXJmYWNlL3VpYmFzZS92ZW5kb3Iva25vY2tvdXQtbWFwcGluZy9idWlsZC9vdXRwdXQva25vY2tvdXQubWFwcGluZy1sYXRlc3QnLFxuICAgICAgICB0aW55bWNlNDogJy9maWxlcy9tb2RfZWRpdG9yL3ZlbmRvci90aW55bWNlLzQuOS42L3RpbnltY2UubWluJyxcbiAgICAgICAgdmVuZG9yOiAnL2EvdXNlcmludGVyZmFjZS91aWJhc2UvdmVuZG9yJyxcbiAgICAgICAgaGlnaGNoYXJ0czIzMzogJy9hL3VzZXJpbnRlcmZhY2UvdWliYXNlL3ZlbmRvci9oaWdoY2hhcnRzLTIuMy4zJyxcbiAgICAgICAgaGlnaGNoYXJ0czQwMTogJy9hL3VzZXJpbnRlcmZhY2UvdWliYXNlL3ZlbmRvci9oaWdoY2hhcnRzLTQuMC4xJyxcbiAgICAgICAgaGlnaGNoYXJ0czQxNTogJy9hL3VzZXJpbnRlcmZhY2UvdWliYXNlL3ZlbmRvci9oaWdoY2hhcnRzLTQuMS41JyxcbiAgICAgICAgaGlnaGNoYXJ0czcxMTogJy9hL3VzZXJpbnRlcmZhY2UvdWliYXNlL3ZlbmRvci9oaWdoY2hhcnRzLTcuMS4xJyxcbiAgICAgICAgY29tcG9uZW50OiAnL2EvbGliL0NvbXBvbmVudC9zY3JpcHQnLFxuICAgICAgICBkcm9wbGV0OiAnL2EvdXNlcmludGVyZmFjZS91aWJhc2UvZHJvcGxldHMnLFxuICAgICAgICBtb2R1bGU6ICcvYS91c2VyaW50ZXJmYWNlL21vZHVsZScsXG4gICAgICAgIGVsZW1lbnRRdWVyaWVzOiAnL2EvdXNlcmludGVyZmFjZS91aWJhc2UvdmVuZG9yL3Byb2N1cmlvcy9lbGVtZW50UXVlcmllcy9kaXN0L2VsZW1lbnRRdWVyaWVzLm1pbicsXG4gICAgICAgIHJlc2l6ZVNlbnNvcjogJy9hL3VzZXJpbnRlcmZhY2UvdWliYXNlL3ZlbmRvci9wcm9jdXJpb3MvcmVzaXplU2Vuc29yL2Rpc3QvcmVzaXplU2Vuc29yLm1pbicsXG4gICAgICAgIHB1c2hlcjogJy9hL3VzZXJpbnRlcmZhY2UvdWliYXNlL3ZlbmRvci9wdXNoZXItanMvZGlzdC93ZWIvcHVzaGVyLm1pbidcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUge09iamVjdC5PYmplY3R9XG4gICAgICovXG4gICAgdmFyIHBhY2thZ2VzID0ge1xuICAgICAgICBtb21lbnQ6IHtcbiAgICAgICAgICAgIGxvY2F0aW9uOiAnL2EvdXNlcmludGVyZmFjZS91aWJhc2UvdmVuZG9yL21vbWVudCcsXG4gICAgICAgICAgICBtYWluOiAnbW9tZW50J1xuICAgICAgICB9LFxuICAgICAgICAnbW9tZW50LXRpbWV6b25lJzoge1xuICAgICAgICAgICAgbG9jYXRpb246ICcvYS91c2VyaW50ZXJmYWNlL3VpYmFzZS92ZW5kb3IvbW9tZW50LXRpbWV6b25lJyxcbiAgICAgICAgICAgIG1haW46ICdtb21lbnQtdGltZXpvbmUnXG4gICAgICAgIH0sXG4gICAgICAgIGNvZGVtaXJyb3I6IHtcbiAgICAgICAgICAgIGxvY2F0aW9uOiAnL2ZpbGVzL21vZF9lZGl0b3IvdmVuZG9yL2NvZGVtaXJyb3InLFxuICAgICAgICAgICAgbWFpbjogJ2xpYi9jb2RlbWlycm9yJ1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBub3JtYWxpemVkTW9kdWxlSWRcbiAgICAgKiBAcGFyYW0ge2FtZE1vZHVsZXxudWxsfSBjb250ZXh0XG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQYXRoIChub3JtYWxpemVkTW9kdWxlSWQsIGNvbnRleHQpIHtcbiAgICAgICAgY29udGV4dCA9IGNvbnRleHQgfHwgbnVsbDtcblxuICAgICAgICBpZiAoY29udGV4dCAhPT0gbnVsbCAmJiBpc1JlbGF0aXZlUGF0aChub3JtYWxpemVkTW9kdWxlSWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjb3JhdGVXaXRoRXh0ZW5zaW9uKHJlc29sdmVSZWxhdGl2ZVBhdGgobm9ybWFsaXplZE1vZHVsZUlkLCBjb250ZXh0LmdldFBhdGgoKSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzUGFja2FnZShub3JtYWxpemVkTW9kdWxlSWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjb3JhdGVXaXRoRXh0ZW5zaW9uKGdldFBhdGhGcm9tUGFja2FnZShub3JtYWxpemVkTW9kdWxlSWQpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuYW1lUGFydHMgPSBub3JtYWxpemVkTW9kdWxlSWQuc3BsaXQoJy8nKTtcbiAgICAgICAgdmFyIGZpcnN0UGFydCA9IG5hbWVQYXJ0cy5zaGlmdCgpO1xuICAgICAgICBpZiAoIShmaXJzdFBhcnQgaW4gcGF0aHMpKSB7XG4gICAgICAgICAgICAvLyBBc3N1bWUgaXRzIGEgZnVsbCBwYXRoIHRvIChleHRlcm5hbCkgZmlsZVxuICAgICAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWRNb2R1bGVJZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmb3VuZFBhdGggPSBwYXRoc1tmaXJzdFBhcnRdO1xuICAgICAgICBpZiAobmFtZVBhcnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGZvdW5kUGF0aCArPSAnLycgKyBuYW1lUGFydHMuam9pbignLycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWNvcmF0ZVdpdGhFeHRlbnNpb24oZm91bmRQYXRoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlTmFtZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzUmVsYXRpdmVQYXRoIChtb2R1bGVOYW1lKSB7XG4gICAgICAgIHJldHVybiBtb2R1bGVOYW1lLm1hdGNoKC9cXC5cXC4/XFwvLykgIT09IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGhcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc29sdmVSZWxhdGl2ZVBhdGggKG1vZHVsZU5hbWUsIGZpbGVQYXRoKSB7XG4gICAgICAgIHZhciBuYW1lUGFydHMgPSBtb2R1bGVOYW1lLnNwbGl0KC9cXC8oPyFcXC8pLyk7XG4gICAgICAgIHZhciBmaWxlUGF0aFBhcnRzID0gZmlsZVBhdGguc3BsaXQoL1xcLyg/IVxcLykvKTtcblxuICAgICAgICAvLyBEcm9wIGZpbGUgbmFtZVxuICAgICAgICBmaWxlUGF0aFBhcnRzLnBvcCgpO1xuXG4gICAgICAgIHZhciBuYW1lUGFydDtcbiAgICAgICAgd2hpbGUgKG5hbWVQYXJ0ID0gbmFtZVBhcnRzLnNoaWZ0KCkpIHtcbiAgICAgICAgICAgIGlmIChuYW1lUGFydCA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChuYW1lUGFydCA9PT0gJy4uJykge1xuICAgICAgICAgICAgICAgIGlmIChmaWxlUGF0aFBhcnRzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByZWxhdGl2ZSBwYXRoJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZpbGVQYXRoUGFydHMucG9wKCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZpbGVQYXRoUGFydHMucHVzaChuYW1lUGFydCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmlsZVBhdGhQYXJ0cy5qb2luKCcvJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWVcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc1BhY2thZ2UgKG1vZHVsZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIChtb2R1bGVOYW1lLmluZGV4T2YoJy8nKSA9PT0gLTEgPyBtb2R1bGVOYW1lIDogbW9kdWxlTmFtZS5zcGxpdCgnLycpWzBdKVxuICAgICAgICAgICAgaW4gcGFja2FnZXNcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlTmFtZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UGF0aEZyb21QYWNrYWdlIChtb2R1bGVOYW1lKSB7XG4gICAgICAgIHZhciBuYW1lUGFydHMgPSBtb2R1bGVOYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIHZhciBwYWNrYWdlTmFtZSA9IG5hbWVQYXJ0cy5zaGlmdCgpO1xuICAgICAgICB2YXIgbXlQYWNrYWdlID0gcGFja2FnZXNbcGFja2FnZU5hbWVdO1xuXG4gICAgICAgIHJldHVybiBteVBhY2thZ2VbJ2xvY2F0aW9uJ10gKyAnLycgKyAoXG4gICAgICAgICAgICBtb2R1bGVOYW1lLmluZGV4T2YoJy8nKSA9PT0gLTFcbiAgICAgICAgICAgICAgICA/IG15UGFja2FnZVsnbWFpbiddXG4gICAgICAgICAgICAgICAgOiBuYW1lUGFydHMuam9pbignLycpXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZVBhY2thZ2VJZCAobW9kdWxlTmFtZSkge1xuICAgICAgICBpZiAoIWlzUGFja2FnZShtb2R1bGVOYW1lKSB8fCBtb2R1bGVOYW1lLmluZGV4T2YoJy8nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiBtb2R1bGVOYW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5hbWVQYXJ0cyA9IG1vZHVsZU5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgdmFyIHBhY2thZ2VOYW1lID0gbmFtZVBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIHZhciBteVBhY2thZ2UgPSBwYWNrYWdlc1twYWNrYWdlTmFtZV07XG5cbiAgICAgICAgcmV0dXJuIHBhY2thZ2VOYW1lICsgJy8nICsgbXlQYWNrYWdlWydtYWluJ107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhUb0RlY29yYXRlXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkZWNvcmF0ZVdpdGhFeHRlbnNpb24gKHBhdGhUb0RlY29yYXRlKSB7XG4gICAgICAgIGlmIChwYXRoVG9EZWNvcmF0ZS5tYXRjaCgvXFwuKGNzc3xqcykkLykgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXRoVG9EZWNvcmF0ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYXRoVG9EZWNvcmF0ZSArICcuanMnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldDogZ2V0UGF0aCxcbiAgICAgICAgbm9ybWFsaXplUGFja2FnZUlkOiBub3JtYWxpemVQYWNrYWdlSWQsXG4gICAgICAgIHJlc29sdmU6IHJlc29sdmVSZWxhdGl2ZVBhdGhcbiAgICB9O1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwYXRoO1xuIiwidmFyIGdldFJlZ2lzdHJ5ID0gKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvKiogQHR5cGUge09iamVjdH0gKi9cbiAgICB2YXIgbW9kdWxlcyA9IHt9O1xuICAgIC8qKiBAdHlwZSB7T2JqZWN0fSAqL1xuICAgIHZhciBsaXN0ZW5lcnMgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBub3JtYWxpemVkTW9kdWxlSWRcbiAgICAgKiBAcmV0dXJucyB7YW1kTW9kdWxlfG51bGx9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0TW9kdWxlIChub3JtYWxpemVkTW9kdWxlSWQpIHtcbiAgICAgICAgaWYgKCEobm9ybWFsaXplZE1vZHVsZUlkIGluIG1vZHVsZXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtb2R1bGVzW25vcm1hbGl6ZWRNb2R1bGVJZF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHthbWRNb2R1bGV9IGFtZE1vZHVsZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlZ2lzdGVyTW9kdWxlIChhbWRNb2R1bGUpIHtcbiAgICAgICAgaWYgKGFtZE1vZHVsZS5nZXRJZCgpIGluIG1vZHVsZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG1vZHVsZXNbYW1kTW9kdWxlLmdldElkKCldID0gYW1kTW9kdWxlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7YW1kTW9kdWxlfSB0YXJnZXRNb2R1bGVcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGFkZExpc3RlbmVyICh0YXJnZXRNb2R1bGUsIGxpc3RlbmVyKSB7XG4gICAgICAgIGlmICh0YXJnZXRNb2R1bGUuaXNEZWZpbmVkKCkpIHtcbiAgICAgICAgICAgIGxpc3RlbmVyKHRhcmdldE1vZHVsZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbW9kdWxlSWQgPSB0YXJnZXRNb2R1bGUuZ2V0SWQoKTtcbiAgICAgICAgaWYgKGxpc3RlbmVyc1ttb2R1bGVJZF0pIHtcbiAgICAgICAgICAgIGxpc3RlbmVyc1ttb2R1bGVJZF0ucHVzaChsaXN0ZW5lcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsaXN0ZW5lcnNbbW9kdWxlSWRdID0gW2xpc3RlbmVyXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2FtZE1vZHVsZX0gZGVmaW5lZE1vZHVsZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc29sdmUgKGRlZmluZWRNb2R1bGUpIHtcbiAgICAgICAgdmFyIGxpc3RlbmVyO1xuICAgICAgICB2YXIgYWN0aXZlTGlzdGVuZXJzID0gbGlzdGVuZXJzW2RlZmluZWRNb2R1bGUuZ2V0SWQoKV07XG4gICAgICAgIGlmIChhY3RpdmVMaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIHdoaWxlIChsaXN0ZW5lciA9IGFjdGl2ZUxpc3RlbmVycy5zaGlmdCgpKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIoZGVmaW5lZE1vZHVsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRNb2R1bGU6IGdldE1vZHVsZSxcbiAgICAgICAgcmVnaXN0ZXJNb2R1bGU6IHJlZ2lzdGVyTW9kdWxlLFxuICAgICAgICBhZGRMaXN0ZW5lcjogYWRkTGlzdGVuZXIsXG4gICAgICAgIHJlc29sdmU6IHJlc29sdmVcbiAgICB9O1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMgPSBnZXRSZWdpc3RyeTtcbiJdfQ==
