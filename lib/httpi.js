;(function( ng ) {

	"use strict";

	// Define our AngularJS module.
	var module = ng.module( "httpi", [] );


	// I provide a light-weight proxy for the $http service that will interpolate the 
	// URL using the configuration-based params and data collections. 
	module.factory(
		"httpi",
		[ "$http", "$q", "HttpiResource", 
		function httpiFactory( $http, $q, HttpiResource ) {

			// I proxy the $http service and merge the params and data values into 
			// the URL before creating the underlying request.
			function httpProxy( config ) {

				config.url = interpolateUrl( 
					config.url,
					config.params,
					config.data, 
					( config.keepTrailingSlash != true )
				);

				// NOTE: Adding the abort is a two-phase process (see below).
				var abort = addAbortHook( config );

				var request = $http( config );

				// Now that we have the request, inject the abort hook method. Unfortunately,
				// this has to be done in a two-step process since the timer has to be set up
				// before the request is initiated.
				// --
				// NOTE: The abort() method can be detached from the request and it will still
				// work properly (ie, does not rely on "this").
				request.abort = abort;

				return( request );

			}


			// I create a new Httpi Resource for the given URL.
			httpProxy.resource = function( url ) {

				return( new HttpiResource( httpProxy, url ) );

			};


			// Return the factory value.
			return( httpProxy );


			// ---
			// PRIVATE METHODS.
			// ---


			// If the timeout configuration is available (ie, not already set by the 
			// user), then I inject a deferred value and return a function that will 
			// resolve the deferred value, thereby aborting the request.
			// --
			// NOTE: This behavior is only as of AngularJS 1.1.5 (unstable) or 
			// AngularJS 1.2 (stable).
			function addAbortHook( config ) {

				// If the timeout property is already set by the user, there's nothing we
				// can do - return the no-op abort method.
				if ( config.timeout ) {

					return( noopAbort );

				}

				// If the timeout wasn't already set, we can create an abort that will 
				// resolve the promise that we'll inject into the request configuration.
				var abort = function() {

					abort.deferred.resolve();

				};

				abort.deferred = $q.defer();

				config.timeout = abort.deferred.promise;

				return( abort );

			}			


			// I move values from the params and data arguments into the URL where 
			// there is a match for labels. When the match occurs, the key-value 
			// pairs are removed from the parent object and merged into the string
			// value of the URL.
			function interpolateUrl( url, params, data, removeTrailingSlash ) {

				// Make sure we have an object to work with - makes the rest of the
				// logic easier. 
				params = ( params || {} );
				data = ( data || {} );

				// Strip out the delimiter fluff that is only there for readability
				// of the optional label paths.
				url = url.replace( /(\(\s*|\s*\)|\s*\|\s*)/g, "" );

				// Replace each label in the URL (ex, :userID).
				url = url.replace(
					/:([a-z]\w*)/gi,
					function( $0, label ) {

						// NOTE: Giving "data" precedence over "params".
						return( popFirstKey( data, params, label ) || "" );

					}
				);

				// Strip out any repeating slashes (but NOT the http:// version).
				url = url.replace( /(^|[^:])[\/]{2,}/g, "$1/" );

				// Strip out any trailing slash if necessary.
				if ( removeTrailingSlash ) {

					url = url.replace( /\/+$/i, "" );
					
				}

				return( url );

			}


			// I provide the default abort behavior, which doesn't do anything.
			function noopAbort() {

				if ( console && console.warn ) {

					console.warn( "This request cannot be aborted because the [timeout] property was already being used." );

				}

			}


			// I take 1..N objects and a key and perform a popKey() action on the 
			// first object that contains the given key. If other objects in the list
			// also have the key, they are ignored.
			function popFirstKey( object1, object2, objectN, key ) {

				// Convert the arguments list into a true array so we can easily 
				// pluck values from either end.
				var objects = Array.prototype.slice.call( arguments );

				// The key will always be the last item in the argument collection.
				var key = objects.pop();

				var object = null;

				// Iterate over the arguments, looking for the first object that
				// contains a reference to the given key.
				while ( object = objects.shift() ) {

					if ( object.hasOwnProperty( key ) ) {

						return( popKey( object, key ) );

					}

				}

			}


			// I delete the key from the given object and return the value.
			function popKey( object, key ) {

				var value = object[ key ];

				delete( object[ key ] );

				return( value );

			}

		}
	]);


	// I provide a proxy for the given http service that injects the same URL in every
	// one of the outgoing requests. It is intended to be used with "httpi", but it has
	// no direct dependencies other than the general format of the $http configuration.
	module.factory(
		"HttpiResource",
		function httpiResourceFactory() {

			// I provide a resource that injects the given URL into the configuration
			// object before passing it off to the given http service.
			function Resource( http, url ) {

				// Store the http service.
				this._http = http;

				// Store the URL to inject.
				this._url = url;

				// I determine if the trailing slash should be kept in place.
				this._keepTrailingSlash = false;

				return( this );

			}


			// Define the instance methods.
			Resource.prototype = {

				// We have to explicitly set the constructor since we are overriding the
				// prototype object (which naturally holds the constructor).
				constructor: Resource,


				// ---
				// PUBLIC METHODS.
				// ---


				// I execute a DELETE request and return the http promise.
				delete: function( config ) {
					
					return( this._makeHttpRequest( "delete", config ) );

				},


				// I execute a GET request and return the http promise.
				get: function( config ) {

					return( this._makeHttpRequest( "get", config ) );

				},


				// I execute a HEAD request and return the http promise.
				head: function( config ) {

					return( this._makeHttpRequest( "head", config ) );

				},


				// I execute a JSONP request and return the http promise.
				jsonp: function( config ) {

					return( this._makeHttpRequest( "jsonp", config ) );

				},


				// I execute a POST request and return the http promise.
				post: function( config ) {

					return( this._makeHttpRequest( "post", config ) );

				},


				// I execute a PUT request and return the http promise.
				put: function( config ) {

					return( this._makeHttpRequest( "put", config ) );

				},


				// I set whether or not the resource should keep the trailing slash after
				// URL interpolation. Returns the resource reference for method chaining.
				setKeepTrailingSlash: function( newKeepTrailingSlash ) {

					this._keepTrailingSlash = newKeepTrailingSlash;

					// Return a reference to the instance.
					return( this );

				},


				// ---
				// PRIVATE METHODS.
				// ---


				// I prepare the configuration for the given type of request, then initiate
				// the underlying httpi request.
				_makeHttpRequest: function( method, config ) {

					// Ensure the configuration object exists.
					config = ( config || {} );

					// Inject resource-related properties.
					config.method = method;
					config.url = this._url;
					
					// Only inject trailing slash property if it's not already in the config.
					if ( ! config.hasOwnProperty( "keepTrailingSlash" ) ) {

						config.keepTrailingSlash = this._keepTrailingSlash
							
					}

					if ( config.method === "jsonp" ) {

						// Make sure the JSONP callback is defined somewhere in the config 
						// object (AngularJS needs this to define the callback handle).
						this._paramJsonpCallback( config );

					}

					return( this._http( config ) );

				},


				// I make sure the callback marker is defined for the given JSONP request
				// configuration object.
				_paramJsonpCallback: function( config ) {

					var callbackName = "JSON_CALLBACK";

					// Check to see if it's in the URL already.
					if ( this._url.indexOf( callbackName ) !== -1 ) {
						
						return;

					}

					// Check to see if it's in the params already.
					if ( config.params ) {

						for ( var key in config.params ) {

							if ( 
								config.params.hasOwnProperty( key ) && 
								( config.params[ key ] === callbackName )
								) {

								return;

							}

						}

					// If there are no params, then make one so that we have a place to
					// inject the callback.
					} else {

						config.params = {}

					}

					// If we made it this far, then the current configuration does not
					// account for the JSONP callback. As such, let's inject it into the
					// params.
					config.params.callback = callbackName;

				}

			};


			// Return the constructor as the AngularJS factory result.
			return( Resource );

		}
	);

})( angular );