
# httpi - Lightweight AngularJS $http Wrapper For URL Interpolation

by [Ben Nadel][1] (on [Google+][2])

Out of the box, AngularJS provides the $http service for making AJAX (Asynchronous JavaScript and XML)
requests. This is a low-level, flexible abstraction for the underlying XMLHttpRequest object. You can
also include the optional $resource module, which provides a complex, persistence-oriented wrapper for 
the $http service. I don't particularly like the $resource module; but, it does have some features 
that I enjoy. I wanted to see if I could try to bridge the gap between the core $http service and the
aspects of $resource that I would like to use (less all the cruft).

When I look at the way I use $resource, the two features I enjoy the most are:

* URL interpolation.
* Encapsulation of the URL across multiple HTTP methods.

I built "httpi" to add an "interpolation" (hence the "i") preprocessor before the underlying $http
call was made. The preprocessor will attempt to pull values out of the params and data collection and
merge them into the URL:

```js
// URL is interpolated to be, /api/friends/4
var promise = httpi({
	method: "get",
	url: "/api/friends/:id",
	params: {
		id: 4
	}
});
```

Note that the configuration object being passed to the httpi() service is being passed-through to the
$http service.

To offer an encapsulated URL across requests, I added a super lightweight recourse factory that 
provides VERB-oriented methods that proxy the $http service:

```js
var resource = httpi.resource( "api/friends/:id" );

// URL and method are automatically injected.
var promise = resource.get({
	params: {
		id: 4
	}
});

// URL and method are automatically injected.
var promise = resource.post({
	data: {
		id: 4,
		name: "Tricia",
		status: "Best Friend"
	}
});

// URL, method, and JSON_CALLBACK handle are automatically injected.
var promise = resource.jsonp({
	params: {
		id: 4
	}	
});
```

Both the httpi and the resource methods are nothing more than lightweight preprocessors - you pass-in
the configuration object, it gets "massaged", and then it is passed into the $http service. This 
provides the flexibility of the $http service with only the best parts (in my opinion) of the optional
$resource module.

_**Note**: This is clearly based on my own usage patterns; your mileage may vary._

## Aborting Requests

As of __AngularJS 1.2__ (or 1.1.5 unstable), you can now pass in a promise in the "timeout" property. 
If the promise is resolved, AngularJS will abort the underlying AJAX request. httpi will attempt to 
inject a .abort() in the request object if the .timeout property is not already in use:

```js
// Initiate an AJAX request.
var promise = httpi({
	method: "get",
	url: "/api/friends/:id",
	params: {
		id: 4
	}
});

// Abort the request.
promise.abort();
```

If the .timeout property was already in use, the .abort() method still exists, but it's a no-op method.

## Keeping Trailing Slashes In Interpolated URLs

By default, the trailing slash will be stripped out of the interpolated URL. However, some APIs require
resource requests to contian the trailing slash. If this is the case, you can add a `keepTrailingSlash`
parameter to the httpi() configuration:

```js
// URL is interpolated to be, /api/friends/4/
var promise = httpi({
	method: "get",
	url: "/api/friends/:id/",
	params: {
		id: 4
	},
	keepTrailingSlash: true
});
```

You can also use this feature when using the HttpiResource module. However, in order to remove the need
to pass this setting through with every resource request, you can turn it on at the resource level:

```js
var resource = httpi
	.resource( "api/friends/:id/" )
	.setKeepTrailingSlash( true )
;
```

Once this setting is enabled, all HTTP requests made from the given resource will allow the trailing
slashes to remain in-tact, if they exist.


[1]: http://www.bennadel.com
[2]: https://plus.google.com/108976367067760160494?rel=author