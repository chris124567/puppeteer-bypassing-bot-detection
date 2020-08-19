## puppeteer-bypassing-bot-detection

This repository contains code for bypassing common bot detection checks by a few vendors ([Distil Networks](https://www.whitepages.com/dstl-wp.js), [Adscore](http://c.adsco.re/d), and [Google IMA](https://imasdk.googleapis.com/js/sdkloader/ima3.js)).

Patched attributes

* navigator.webdriver
* navigator.permissions.query
* document.hasFocus
* document.hidden
* document.visiblityState
* document.onvisiblitychange
* navigator.mimeTypes
* navigator.plugins
* navigator.languages
* screen.width / screen.height
* screen.availWidth / screen.availHeight
* window.innerWidth / window.innerHeight
* window.outerWidth / window.outerHeight
* document.documentElement.clientWidth / document.documentElement.clientHeight
* window.matchMedia
* AudioElement.canPlayType
* VideoElement.canPlayType
* screen.orientation.type
* screen.orientation.angle
* Fix toString of HTMLElement.prototype.animate (Puppeteer doesn't make it "native code")
* Fake WebGLRenderingContext.prototype.getParameter values
* Make iframes have same window attribute
* Make window.alert a stub
* HTMLImageElement.prototype.width / HTMLImageElement.prototype.height for broken images
* Undetectable toString patched with Proxy
* window.chrome
	* csi
	* loadTimes
	* app
		* isInstalled
		* getDetails
		* getIsInstalled
		* runningState
		* InstallState
		* RunningState
