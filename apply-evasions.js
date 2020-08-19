module.exports = async function (page) {
    /*
    TODO: Add windows profile.  Sophisticated bot detection vendors check TCP stack features (see p0f) so system level changes may be necessary.
    Will likely need to add:
    - navigator.platform
    - Different vendor/renderer names (DirectX vs Mesa) for WebGL getParameter
    - Different codec support (untested)
    - Different avail/inner/outer widths/heights because Windows has a different size taskbar and other things
    - Widevine plugin
    */

    const userAgent =
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36";

    await page.setUserAgent(userAgent);

    // pass the Webdriver test
    await page.evaluateOnNewDocument(() => {
        delete navigator.webdriver;
        delete Navigator.prototype.webdriver;
    });

    // pass the permissions test by denying all permissions
    await page.evaluateOnNewDocument(() => {
        const originalQuery = window.navigator.permissions.query;
        Permissions.prototype.query = function query(parameters) {
            if (!parameters || !parameters.name)
                return originalQuery(parameters);

            return Promise.resolve({
                state: "denied",
                onchange: null,
            });
        };
    });

    // Fake standard visiblity checks
    await page.evaluateOnNewDocument(() => {
        // https://adtechmadness.wordpress.com/2019/03/14/spoofing-viewability-measurements-technical-examples/
        Object.defineProperty(Document.prototype, "hasFocus", {
            value: function hasFocus(document) {
                return true;
            },
        });
        Object.defineProperty(Document.prototype, "hidden", {
            get: () => false,
        });
        Object.defineProperty(Document.prototype, "visiblityState", {
            get: () => "visible",
        });
        // window.locationbar.visible, window.menubar.visible, window.personalbar.visible, window.scrollbars.visible, window.statusbar.visible, window.toolbar.visible
        Object.defineProperty(BarProp.prototype, "visible", {
            get: () => true,
        });
        Object.defineProperty(Document.prototype, "onvisiblitychange", {
            set: (params) => function () {}, // ignore visiblity changes even when an event handler is registered
        });
    });

    // Set plugins to Chrome's
    await page.evaluateOnNewDocument(() => {
        /* global MimeType MimeTypeArray PluginArray */

        const fakeData = {
            mimeTypes: [
                {
                    type: "application/pdf",
                    suffixes: "pdf",
                    description: "",
                    __pluginName: "Chrome PDF Viewer",
                },
                {
                    type: "application/x-google-chrome-pdf",
                    suffixes: "pdf",
                    description: "Portable Document Format",
                    __pluginName: "Chrome PDF Plugin",
                },
                {
                    type: "application/x-nacl",
                    suffixes: "",
                    description: "Native Client Executable",
                    enabledPlugin: Plugin,
                    __pluginName: "Native Client",
                },
                {
                    type: "application/x-pnacl",
                    suffixes: "",
                    description: "Portable Native Client Executable",
                    __pluginName: "Native Client",
                },
            ],
            plugins: [
                {
                    name: "Chrome PDF Plugin",
                    filename: "internal-pdf-viewer",
                    description: "Portable Document Format",
                },
                {
                    name: "Chrome PDF Viewer",
                    filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
                    description: "",
                },
                {
                    name: "Native Client",
                    filename: "internal-nacl-plugin",
                    description: "",
                },
            ],
            fns: {
                namedItem: (instanceName) => {
                    // Returns the Plugin/MimeType with the specified name.
                    return function namedItem(name) {
                        if (!arguments.length) {
                            throw new TypeError(
                                `Failed to execute 'namedItem' on '${instanceName}': 1 argument required, but only 0 present.`,
                            );
                        }
                        return this[name] || null;
                    };
                },
                item: (instanceName) => {
                    // Returns the Plugin/MimeType at the specified index into the array.
                    return function item(index) {
                        if (!arguments.length) {
                            throw new TypeError(
                                `Failed to execute 'namedItem' on '${instanceName}': 1 argument required, but only 0 present.`,
                            );
                        }
                        return this[index] || null;
                    };
                },
                refresh: (instanceName) => {
                    // Refreshes all plugins on the current page, optionally reloading documents.
                    return function refresh() {
                        return undefined;
                    };
                },
            },
        };
        // Poor mans _.pluck
        const getSubset = (keys, obj) =>
            keys.reduce((a, c) => ({...a, [c]: obj[c]}), {});

        function generateMimeTypeArray() {
            const arr = fakeData.mimeTypes
                .map((obj) =>
                    getSubset(["type", "suffixes", "description"], obj),
                )
                .map((obj) => Object.setPrototypeOf(obj, MimeType.prototype));
            arr.forEach((obj) => {
                Object.defineProperty(arr, obj.type, {
                    value: obj,
                    enumerable: false, // make sure its not enumerable or distil networks will put duplicates in their list
                });
            });

            // Mock functions
            arr.namedItem = fakeData.fns.namedItem("MimeTypeArray");
            arr.item = fakeData.fns.item("MimeTypeArray");

            return Object.setPrototypeOf(arr, MimeTypeArray.prototype);
        }

        const mimeTypeArray = generateMimeTypeArray();
        Object.defineProperty(Object.getPrototypeOf(navigator), "mimeTypes", {
            get: () => mimeTypeArray,
        });

        function generatePluginArray() {
            const arr = fakeData.plugins
                .map((obj) =>
                    getSubset(["name", "filename", "description"], obj),
                )
                .map((obj) => {
                    const mimes = fakeData.mimeTypes.filter(
                        (m) => m.__pluginName === obj.name,
                    );
                    // Add mimetypes
                    mimes.forEach((mime, index) => {
                        navigator.mimeTypes[mime.type].enabledPlugin = obj;
                        obj[mime.type] = navigator.mimeTypes[mime.type];
                        obj[index] = navigator.mimeTypes[mime.type];
                    });
                    obj.length = mimes.length;
                    return obj;
                })
                .map((obj) => {
                    // Mock functions
                    obj.namedItem = fakeData.fns.namedItem("Plugin");
                    obj.item = fakeData.fns.item("Plugin");
                    return obj;
                })
                .map((obj) => Object.setPrototypeOf(obj, Plugin.prototype));
            arr.forEach((obj) => {
                Object.defineProperty(arr, obj.name, {
                    value: obj,
                    enumerable: false, // make sure its not enumerable or distil networks will put duplicates in their list
                });
            });

            // Mock functions
            arr.namedItem = fakeData.fns.namedItem("PluginArray");
            arr.item = fakeData.fns.item("PluginArray");
            arr.refresh = fakeData.fns.refresh("PluginArray");

            return Object.setPrototypeOf(arr, PluginArray.prototype);
        }

        const pluginArray = generatePluginArray();
        Object.defineProperty(Object.getPrototypeOf(navigator), "plugins", {
            get: () => pluginArray,
        });
    });

    // Puppeteer defines languages to be "" for some reason
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(Object.getPrototypeOf(navigator), "languages", {
            get: () => ["en-US", "en"],
        });
    });

    // Fake resolution info
    await page.evaluateOnNewDocument(() => {
        const resolution = {
            width: 1366,
            height: 768,
        };
        Object.defineProperty(Screen.prototype, "width", {
            get: () => resolution.width,
        });
        Object.defineProperty(Screen.prototype, "height", {
            get: () => resolution.height,
        });
        Object.defineProperty(Screen.prototype, "availWidth", {
            get: () => resolution.width,
        });
        Object.defineProperty(Screen.prototype, "availHeight", {
            get: () => resolution.height,
        });

        Object.defineProperty(window, "innerWidth", {
            get: () => resolution.width,
        });
        Object.defineProperty(window, "innerHeight", {
            get: () => resolution.height - 72,
        });
        Object.defineProperty(window, "outerWidth", {
            get: () => resolution.width,
        });
        Object.defineProperty(window, "outerHeight", {
            get: () => resolution.height,
        });
        Object.defineProperty(HTMLHtmlElement.prototype, "clientWidth", {
            get: () => window.innerWidth,
        });
        Object.defineProperty(HTMLHtmlElement.prototype, "clientHeight", {
            get: () => window.innerHeight,
        });

        // Fake min-width based resolution checks
        const originalMatchMedia = window.matchMedia;
        Object.defineProperty(window, "matchMedia", {
            value: function matchMedia(query) {
                var lowerQuery = query.toLowerCase();
                var result = originalMatchMedia(query);
                if (lowerQuery.includes("min-width")) {
                    Object.defineProperty(result, "matches", {
                        get: () => true,
                    });
                }

                return result;
            },
        });
    });

    // Codec support
    await page.evaluateOnNewDocument(() => {
        // ACCEPTED CODECS UNUSED
        const acceptedCodecs = [
            "audio/ogg;codecs=flac",
            "audio/ogg;codecs=vorbis",
            'audio/mp4; codecs="mp4a.40.2"',
            'audio/mpeg;codecs="mp3"',
            'video/mp4; codecs="avc1.42E01E"',
            'video/mp4;codecs="avc1.42E01E, mp4a.40.2"',
            'video/mp4;codecs="avc1.4D401E, mp4a.40.2"',
            'video/mp4;codecs="avc1.58A01E, mp4a.40.2"',
            'video/mp4;codecs="avc1.64001E, mp4a.40.2"',
            'video/ogg;codecs="theora, vorbis"',
            'video/webm; codecs="vorbis,vp8"',
        ];

        Object.defineProperty(HTMLVideoElement.prototype, "canPlayType", {
            value: function canPlayType(codec) {
                codec = codec.toLowerCase();
                if (
                    codec.includes("ogg") ||
                    codec.includes("mp4") ||
                    codec.includes("webm") ||
                    codec.includes("mp3") ||
                    codec.includes("mpeg") ||
                    codec.includes("wav")
                ) {
                    return "probably";
                } else if (codec.includes("wav")) {
                    return "maybe";
                } else {
                    return "";
                }
            },
        });
        Object.defineProperty(HTMLAudioElement.prototype, "canPlayType", {
            value: function canPlayType(codec) {
                codec = codec.toLowerCase();
                if (
                    codec.includes("ogg") ||
                    codec.includes("mp4") ||
                    codec.includes("webm") ||
                    codec.includes("mp3") ||
                    codec.includes("mpeg") ||
                    codec.includes("wav")
                ) {
                    return "probably";
                } else if (codec.includes("m4a")) {
                    return "maybe";
                } else {
                    return "";
                }
            },
        });
    });

    // Standard desktop screen orientation
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(ScreenOrientation.prototype, "type", {
            get: () => "landscape-primary",
        });
        Object.defineProperty(ScreenOrientation.prototype, "angle", {
            get: () => 0,
        });
    });

    // Fix HTMLElement animate toString (Puppeteer doesn't make it native code for some reason)
    await page.evaluateOnNewDocument(() => {
        const oldAnimate = HTMLElement.prototype.animate;
        Object.defineProperty(HTMLElement.prototype, "animate", {
            value: function animate(parameters) {
                return oldAnimate(this, parameters);
            },
        });
    });
    await page.evaluateOnNewDocument(() => {
        WebGLRenderingContext.prototype.getParameter = (function getParameter(
            originalFunction,
        ) {
            // TODO: Remove linux strings like Mesa and OpenGL and find Windows version
            const paramMap = {};
            // UNMASKED_VENDOR_WEBGL
            paramMap[0x9245] = "Intel Open Source Technology Center";
            // UNMASKED_RENDERER_WEBGL
            paramMap[0x9246] =
                "Mesa DRI Intel(R) HD Graphics 5500 (Broadwell GT2)";
            // VENDOR
            paramMap[0x1f00] = "WebKit";
            // RENDERER
            paramMap[0x1f01] = "WebKit WebGL";
            // VERSION
            paramMap[0x1f02] = "WebGL 1.0 (OpenGL ES 2.0 Chromium)";

            return function getParameter(parameter) {
                return (
                    paramMap[parameter] ||
                    originalFunction.call(this, parameter)
                );
            };
        })(WebGLRenderingContext.prototype.getParameter);
    });

    // Overwrite iframe window object so we don't have to reapply the above evasions for every iframe
    // Stolen from https://github.com/berstend/puppeteer-extra/blob/ceca9c6fed0a9f39d6c80b71fd413f3656ebb704/packages/puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow/index.js
    await page.evaluateOnNewDocument(() => {
        try {
            // Adds a contentWindow proxy to the provided iframe element
            const addContentWindowProxy = (iframe) => {
                const contentWindowProxy = {
                    get(target, key) {
                        // Now to the interesting part:
                        // We actually make this thing behave like a regular iframe window,
                        // by intercepting calls to e.g. `.self` and redirect it to the correct thing. :)
                        // That makes it possible for these assertions to be correct:
                        // iframe.contentWindow.self === window.top // must be false
                        if (key === "self") {
                            return this;
                        }
                        // iframe.contentWindow.frameElement === iframe // must be true
                        if (key === "frameElement") {
                            return iframe;
                        }
                        return Reflect.get(target, key);
                    },
                };

                if (!iframe.contentWindow) {
                    const proxy = new Proxy(window, contentWindowProxy);
                    Object.defineProperty(iframe, "contentWindow", {
                        get() {
                            return proxy;
                        },
                        set(newValue) {
                            return newValue; // contentWindow is immutable
                        },
                        enumerable: true,
                        configurable: false,
                    });
                }
            };

            // Handles iframe element creation, augments `srcdoc` property so we can intercept further
            const handleIframeCreation = (target, thisArg, args) => {
                const iframe = target.apply(thisArg, args);

                // We need to keep the originals around
                const _iframe = iframe;
                const _srcdoc = _iframe.srcdoc;

                // Add hook for the srcdoc property
                // We need to be very surgical here to not break other iframes by accident
                Object.defineProperty(iframe, "srcdoc", {
                    configurable: true, // Important, so we can reset this later
                    get: function () {
                        return _iframe.srcdoc;
                    },
                    set: function (newValue) {
                        addContentWindowProxy(this);
                        // Reset property, the hook is only needed once
                        Object.defineProperty(iframe, "srcdoc", {
                            configurable: false,
                            writable: false,
                            value: _srcdoc,
                        });
                        _iframe.srcdoc = newValue;
                    },
                });
                return iframe;
            };

            // Adds a hook to intercept iframe creation events
            const addIframeCreationSniffer = () => {
                /* global document */
                const createElement = {
                    // Make toString() native
                    get(target, key) {
                        return Reflect.get(target, key);
                    },
                    apply: function (target, thisArg, args) {
                        const isIframe =
                            args &&
                            args.length &&
                            `${args[0]}`.toLowerCase() === "iframe";
                        if (!isIframe) {
                            // Everything as usual
                            return target.apply(thisArg, args);
                        } else {
                            return handleIframeCreation(target, thisArg, args);
                        }
                    },
                };
                // All this just due to iframes with srcdoc bug
                document.createElement = new Proxy(
                    document.createElement,
                    createElement,
                );
            };

            // Let's go
            addIframeCreationSniffer();
        } catch (err) {}
    });

    // disable alert since it blocks
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(window, "alert", {
            value: function alert(parameter) {
                return undefined;
            },
        });
    });

    // default broken image test
    await page.evaluateOnNewDocument(() => {
        ["height", "width"].forEach((property) => {
            // store the existing descriptor
            const imageDescriptor = Object.getOwnPropertyDescriptor(
                HTMLImageElement.prototype,
                property,
            );

            // redefine the property with a patched descriptor
            Object.defineProperty(HTMLImageElement.prototype, property, {
                ...imageDescriptor,
                get: function () {
                    // return an arbitrary non-zero dimension if the image failed to load
                    if (this.complete && this.naturalHeight == 0) {
                        return 16;
                    }
                    // otherwise, return the actual dimension
                    return imageDescriptor.get.apply(this);
                },
            });
        });
    });

    await page.evaluateOnNewDocument(() => {
        /* Copied from Google Chrome v83 on Linux */
        var currentTime = new Date().getTime();
        var currentTimeDivided = currentTime / 1000;
        var randOffset = Math.random() * 3;

        Object.defineProperty(window, "chrome", {
            writable: true,
            enumerable: true,
            configurable: false, // note!
            value: {}, // We'll extend that later
        });

        Object.defineProperty(window.chrome, "csi", {
            value: function csi() {
                /* https://chromium.googlesource.com/chromium/src.git/+/master/chrome/renderer/loadtimes_extension_bindings.cc */
                return {
                    startE: currentTime,
                    onloadT: currentTime + 3 * randOffset,
                    pageT: 30000 * randOffset,
                    tran: 15,
                };
            },
        });

        Object.defineProperty(window.chrome, "loadTimes", {
            value: function loadTimes() {
                return {
                    requestTime: currentTimeDivided + 1 * randOffset,
                    startLoadTime: currentTimeDivided + 1 * randOffset,
                    commitLoadTme: currentTimeDivided + 2 * randOffset,
                    finishDocumentLoadTime: currentTimeDivided + 3 * randOffset,
                    firstPaintTime: currentTimeDivided + 4 * randOffset,
                    finishLoadTime: currentTimeDivided + 5 * randOffset,
                    firstPaintAfterLoadTime: 0,
                    navigationType: "Other",
                    wasFetchedViaSpdy: true,
                    wasNpnNegotiated: true,
                    npnNegotiatedProtocol: "h2",
                    wasAlternateProtocolAvailable: false,
                    connectionInfo: "h2",
                };
            },
        });

        const stripErrorWithAnchor = (err, anchor) => {
            const stackArr = err.stack.split("\n");
            const anchorIndex = stackArr.findIndex((line) =>
                line.trim().startsWith(anchor),
            );
            if (anchorIndex === -1) {
                return err; // 404, anchor not found
            }
            // Strip everything from the top until we reach the anchor line (remove anchor line as well)
            // Note: We're keeping the 1st line (zero index) as it's unrelated (e.g. `TypeError`)
            stackArr.splice(1, anchorIndex);
            err.stack = stackArr.join("\n");
            return err;
        };

        const makeError = {
            ErrorInInvocation: (fn) => {
                const err = new TypeError(`Error in invocation of app.${fn}()`);
                return stripErrorWithAnchor(
                    err,
                    `at ${fn} (eval at <anonymous>`,
                );
            },
        };

        // https://github.com/berstend/puppeteer-extra/blob/9c3d4aace43cb44da984f1e2f581ad376ebefeea/packages/puppeteer-extra-plugin-stealth/evasions/chrome.app/index.js
        Object.defineProperty(window.chrome, "app", {
            value: {
                InstallState: {
                    DISABLED: "disabled",
                    INSTALLED: "installed",
                    NOT_INSTALLED: "not_installed",
                },
                RunningState: {
                    CANNOT_RUN: "cannot_run",
                    READY_TO_RUN: "ready_to_run",
                    RUNNING: "running",
                },
                get isInstalled() {
                    return false;
                },
                getDetails: function getDetails() {
                    if (arguments.length) {
                        throw makeError.ErrorInInvocation(`getDetails`);
                    }
                    return null;
                },
                getIsInstalled: function getIsInstalled() {
                    if (arguments.length) {
                        throw makeError.ErrorInInvocation(`getIsInstalled`);
                    }
                    return false;
                },
                runningState: function runningState() {
                    if (arguments.length) {
                        throw makeError.ErrorInInvocation(`runningState`);
                    }
                    return "cannot_run";
                },
            },
        });
    });

    /* Evade toString detection */
    await page.evaluateOnNewDocument(() => {
        // Spoofs the toString output of the following functions to native code.  If you spoof another function, add it to this list.
        var functionList = [
            Permissions.prototype.query,
            window.alert,
            Document.prototype.hasFocus,
            WebGLRenderingContext.prototype.getParameter,
            navigator.mimeTypes.item,
            navigator.mimeTypes.namedItem,
            navigator.plugins.refresh,
            HTMLVideoElement.prototype.canPlayType,
            HTMLAudioElement.prototype.canPlayType,
            window.matchMedia,
            Object.getOwnPropertyDescriptor(Screen.prototype, "height").get,
            Object.getOwnPropertyDescriptor(Screen.prototype, "width").get,
            Object.getOwnPropertyDescriptor(Screen.prototype, "availHeight")
                .get,
            Object.getOwnPropertyDescriptor(ScreenOrientation.prototype, "type")
                .get,
            Object.getOwnPropertyDescriptor(
                ScreenOrientation.prototype,
                "angle",
            ).get,
            Object.getOwnPropertyDescriptor(Screen.prototype, "availWidth").get,
            Object.getOwnPropertyDescriptor(Document.prototype, "hidden").get,
            Object.getOwnPropertyDescriptor(
                Document.prototype,
                "visiblityState",
            ).get,
            Object.getOwnPropertyDescriptor(BarProp.prototype, "visible").get,
            Object.getOwnPropertyDescriptor(Navigator.prototype, "mimeTypes")
                .get,
            Object.getOwnPropertyDescriptor(Navigator.prototype, "plugins").get,
            Object.getOwnPropertyDescriptor(Navigator.prototype, "languages")
                .get,
            Object.getOwnPropertyDescriptor(window, "innerWidth").get,
            Object.getOwnPropertyDescriptor(window, "innerHeight").get,
            Object.getOwnPropertyDescriptor(window, "outerWidth").get,
            Object.getOwnPropertyDescriptor(window, "outerHeight").get,
            Object.getOwnPropertyDescriptor(
                HTMLHtmlElement.prototype,
                "clientWidth",
            ).get,
            Object.getOwnPropertyDescriptor(
                HTMLHtmlElement.prototype,
                "clientHeight",
            ).get,
            Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "width")
                .get,
            Object.getOwnPropertyDescriptor(
                HTMLImageElement.prototype,
                "height",
            ).get,
            HTMLElement.prototype.animate,
            window.chrome.csi,
            window.chrome.loadTimes,
            window.chrome.app.getDetails,
            window.chrome.app.getIsInstalled,
            window.chrome.app.runningState,
            Object.getOwnPropertyDescriptor(window.chrome.app, "isInstalled")
                .get,
            document.createElement,
        ];

        // Undetecable toString modification - https://adtechmadness.wordpress.com/2019/03/23/javascript-tampering-detection-and-stealth/ */
        var toStringProxy = new Proxy(Function.prototype.toString, {
            apply: function toString(target, thisArg, args) {
                // Special functions we make always return "native code"
                // NOTE: This depends on the functions being named (see hasFocus example).  Anonymous functions will not work (or at least will not show the proper output) because their name attribute is equal to "".
                if (functionList.includes(thisArg)) {
                    return "function " + thisArg.name + "() { [native code] }";
                } else {
                    return target.call(thisArg);
                }
            },
        });

        Function.prototype.toString = toStringProxy;
        functionList.push(Function.prototype.toString); // now that its modified, we can add it
    });
};
