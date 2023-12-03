// Define global variables that will hold the cookie functions
var setCookie;
var getCookie;
var deleteCookie;
var maySetCookieType;

var Cookie = {
	'TYPE_FUNCTIONAL': 1,
	'TYPE_TRACKING': 2,
	'TYPE_STATISTICS': 4,
	'TYPE_EXTERNAL': 8,
	'allowedTypes': 15
};

(function () {
	var cookieJar = '' + window.document.cookie;

	/**
	 * @param name
	 * @param value
	 * @param type One of the Cookie.TYPE_* integers
	 * @param expires Date or number in seconds
	 * @param path
	 * @param domain
	 * @param secure
	 * @return string
	 * @private
	 */
	setCookie = function (name, value, type, expires, path, domain, secure)
	{
		if (!maySetCookieType(type)) {
			return '';
		}

		var cookieString = name + '=' + escape(value);
		var expireString = '';

		// Remove this cookie from the local cookie jar
		var re = new RegExp('((^|;)\\s*' + name + '=[^;]*|' + name + '=[^;]*($|;))');
		cookieJar = cookieJar.replace(re, '');

		// Evaluate the expires argument to a Date object
		if (typeof expires === 'string' && (/^\d+$/).test(expires)) {
			expires = parseInt(expires, 10);
		}

		if (expires instanceof Date) {
			expireString = expires.toUTCString();
		} else if (typeof(expires) === 'number') {
			var currentDate = new Date();
			expires = new Date(currentDate.getTime() + (expires * 1e3));
			expireString = expires.toUTCString();
		}

		// Add the cookie to the local cookie jar if it expires in the future
		if (!expireString || new Date() < expires) {
			cookieJar += '; ' + cookieString;
		}

		// Add other parts to the cookie string
		if (expireString) {
			cookieString += ';expires=' + expireString;
		}

		if (!path) {
			path = '/';
		}
		cookieString += ';path=' + path;

		if (domain) {
			cookieString += ';domain=' + domain;
		}

		if (secure) {
			cookieString += ';secure';
		}

		// Set the real cookie
		return window.document.cookie = cookieString;
	};

	/**
	 * @param name
	 * @return string|null
	 */
	getCookie = function (name)
	{
		var start = cookieJar.indexOf( name + '=' );
		var len = start + name.length + 1;

		if ((!start) && (name != cookieJar.substring(0, name.length))) {
			return null;
		}

		if (start == -1) {
			return null;
		}

		var end = cookieJar.indexOf( ';', len );

		if (end == -1) {
			end = cookieJar.length;
		}

		return unescape(cookieJar.substring(len, end));
	};

	/**
	 * @param name
	 * @param path
	 * @param domain
	 * @return string
	 */
	deleteCookie = function (name, path, domain)
	{
		return setCookie(name, '', Cookie.TYPE_FUNCTIONAL, -1, path, domain);
	};

	/**
	 * @param type
	 * @return {Boolean}
	 */
	maySetCookieType = function (type)
	{
		return (Cookie.allowedTypes & type) != 0;
	};
}());
