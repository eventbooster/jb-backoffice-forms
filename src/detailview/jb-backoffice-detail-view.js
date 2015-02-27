'use strict';

/**
* Directive for every detail view: 
* - Gets field data from server (through an OPTIONS call)
* - Input components (text, images, relations) may register themselves
* - Stores data on server
*/
angular
.module( 'jb.backofficeDetailView', [ 'eb.apiWrapper', 'ebBackofficeConfig' ] )
.directive( 'detailView', [ function() {

	return {
		link				: function( scope, element, attrs, ctrl ) {

			ctrl[ 0 ].init( element );

			// Expose controller to DOM element; needed e.g. to manually save 
			scope.detailViewController = ctrl[ 0 ];

		}
		, controller		: 'DetailViewController'

		// Parent inheritance is needed for events (save, remove) to be handled and 
		// properties to be exposed to DOM (?)
		, scope				: true
		, require			: [ 'detailView' ]
	};

} ] )




.controller( 'DetailViewController', [ '$scope', '$rootScope', '$location', '$q', '$attrs', '$filter', 'APIWrapperService', 'BackofficeConfig', function( $scope, $rootScope, $location, $q, $attrs, $filter, APIWrapperService, BackofficeConfig ) {



	//////////////////////////////////////////////////////////////////////////
	//
	// Private vars
	//

	var scope					= $scope.$new()
		, self					= this

		// Number of [data-auto-form-element] elements;
		// get data only when all elements have registered
		// themselves
		, autoFormElementCount	= 0

		// Element directive belongs to, set on init
		, element

		// Handlers that will be called on OPTIONs data received
		, optionHandlers		= []
		, getHandlers			= [];




	//////////////////////////////////////////////////////////////////////////
	//
	// Public vars
	//

	// Components registered for this view
	self.registeredComponents	= [];


	/**
	* Parsed data from OPTIONS call
	* - key			: field's name
	* - value		: {
	*	type		: 'text|email|int|image|singleRelation|multiRelation'
	*	, required	: true
	*	, etc.
	* }
	*/
	self.fields					= undefined;

	// Data from GET call
	self.data					= undefined;






	//////////////////////////////////////////////////////////////////////////
	//
	// Scope vars
	//
	$scope.entityId					= undefined;
	$scope.entityName				= undefined;

	$scope.title					= undefined;










	//////////////////////////////////////////////////////////////////////////
	//
	// Entity ID 
	//

	// Entity ID and name are taken from URL (on init) or from attribute (on change) and stored
	// in self.entityId and self.entityName

	/**
	* Parses current URL and looks for entityName and entityId.
	*
	* @return <Object>		with properties name and id
	*/
	self.parseUrl = function() {

		// Take id from path
		var path				= $location.path()
			, split				= path.split( '/' )
			, returnValue		= {
				name			: undefined
				, id			: undefined
			};

		if( split.length < 2 ) {
			return returnValue;
		}

		// Only name
		if( split.length >= 2 ) {
			returnValue.name = split[ 1 ];
		}

		// Name and ID	
		if( split.length >= 3 ) {

			var id = parseInt( split[ 2 ], 10 );
			if( !isNaN( id ) ) {
				returnValue.id = id;
			}

		}

		return returnValue;

	};

	$scope.entityId = self.parseUrl().id;

	// Update entity whenever data-entity-id changes on element
	$attrs.$observe( 'entityId', function( newId ) {
		$scope.entityId = newId;
	} );

	self.getEntityId = function() {
		return $scope.entityId;
	};









	//////////////////////////////////////////////////////////////////////////
	//
	// Entity Name and URL
	//

	$scope.entityName = self.parseUrl().name;

	self.getEntityName = function() {
		return $scope.entityName;
	};

	// Watch attributes
	$attrs.$observe( 'entityName', function( newName ) {
		$scope.entityName = newName;
	} );



	self.getEntityUrl = function() {
		var url = '/' + self.getEntityName();
		if( self.getEntityId() ) {
			url += '/' + self.getEntityId();
		}
		return url;
	};










	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//
	// Title
	//

	self.setTitle = function() {

		if( $location.path().indexOf( '/new' ) === $location.path().length - 4 ) {
			$scope.title = $filter( 'translate' )( 'web.backoffice.create' ) + ': ';
		}
		else {
			$scope.title = $filter( 'translate' )( 'web.backoffice.edit' ) + ': ';
		}

		$scope.title += self.getEntityName();

		if( self.getEntityId() ) {
			$scope.title += ' #' + self.getEntityId();
		}
	};


	$scope.$watchGroup( [ 'entityName', 'entityId' ], function() {
		self.setTitle();
	} );









	//////////////////////////////////////////////////////////////////////////
	//
	// Init (called from directive's link function)
	//
	self.init = function( el ) {

		element = el;

		// Store number of auto form elements
		var autoFormElements = element.find( '[data-auto-form-element], [data-hidden-input]' );
		autoFormElementCount = autoFormElements.length;

	
		// getOptionData whenever entityId changes if entityId is on $attrs
		if( $attrs.hasOwnProperty( 'entityId' ) ) {

			$attrs.$observe( 'entityId', function() {
				self.getOptionData();
			} );


		}
		else {
			self.getOptionData();
		}
	

	};










	//////////////////////////////////////////////////////////////////////////
	//
	// OPTION data
	//


	// Make OPTIONS call 
	self.getOptionData = function() {

		console.log( 'DetailView: Make OPTIONS call for %o', self.getEntityName() );

		self
			.makeOptionRequest( '/' + self.getEntityName() )
			.then( function( fields ) {

				self.fields = fields;

				// As soon as a handler is called, it will be removed from optionHandlers through auto-form-element. 
				// Therefore splice is called; original array will be modified, elements will be missing -> make a
				// copy first so that removed elements won't be missing.
				var optionHandlersClone = optionHandlers.slice( 0 );
				optionHandlersClone.forEach( function( handler ) {
					handler( fields );
				} );

				// getOptions may be called multiple times. If it's the second time, all components will already be
				// registered. Make sure that getData is called again
				//console.log( '%o vs %o (%o)', autoFormElementCount, self.registeredComponents.length, self.registeredComponents );
				if( autoFormElementCount === self.registeredComponents.length ) {
					self.getData();
				}

			}, function( err ) {

				$rootScope.$broadcast( 'notification', {
					'type'		: 'error'
					, 'message'	: 'web.backoffice.detail.optionsLoadingError'
					, variables	: {
						errorMessage: err
					}
				} );

			} );

	};


	/**
	* Register handlers that will be called when OPTIONS data is received
	* Is needed insteadd of $scope.$emit, as $scope causes problems if multiple detail-view directives
	* are present on one site.
	*/
	self.registerOptionsDataHandler = function( handler ) {
		optionHandlers.push( handler );
	};

	self.removeOptionsDataHandler = function( handler ) {
		optionHandlers.splice( optionHandlers.indexOf( handler ), 1 );
	};


	/**
	* Makes options call, sets self.fields
	*/
	self.makeOptionRequest = function( url ) {

		return APIWrapperService
			.request( {
				method		: 'OPTIONS'
				, url		: url
			} )
			.then( function( data ) {
				console.log( 'DetailView: Got OPTIONS data for %o %o', url, data );
				self.fields = self.parseOptionData( data );
				return self.fields;
			}, function( err ) {
				return $q.reject( err );
			} );

	};





	/**
	* Parses options call made by getOptionData
	*/
	self.parseOptionData = function( fieldData ) {

		var ret = {};

		console.log( 'DetailView: parse %o', fieldData );
		
		// Go through all direct children of option's response data
		for( var i in fieldData ) {

			var singleFieldData = fieldData[ i ];
			
			// String
			if( singleFieldData.name && singleFieldData.type === 'string' ) {
				ret[ singleFieldData.name ] = {
					type		: 'text'
					, required	: !singleFieldData.nullable
				};
			}

			// Int
			if( singleFieldData.name && singleFieldData.type === 'decimal' ) {
				ret[ singleFieldData.name ] = {
					type		: 'number'
					, required	: !singleFieldData.nullable
				};
			}

			// Int
			if( singleFieldData.name && singleFieldData.type === 'boolean' ) {
				ret[ singleFieldData.name ] = {
					type		: 'boolean'
					, required	: !singleFieldData.nullable
				};
			}


			// Datetime
			if( singleFieldData.name && singleFieldData.type === 'datetime' ) {
				ret[ singleFieldData.name ] = {
					type		: 'datetime'
					, date		: true
					, time		: true
					, required	: !singleFieldData.nullable
				};
			}

			if( singleFieldData.name && singleFieldData.type === 'date' ) {
				ret[ singleFieldData.name ] = {
					type		: 'datetime'
					, date		: true
					, time		: false
					, required	: !singleFieldData.nullable
				};
			}



			// HasOne
			else if( i === 'hasOne' ) {

				// Go through each hasOwn property
				for( var j in singleFieldData ) {

					if( singleFieldData[ j ].name === 'image' ) {
						ret[ j ] = {
							type				: 'image'
						};
					}

					else {
	
						// j contains the field's name
						ret[ j ] = {
							type				: 'relation'
							// Link to entity's collection (e.g. /city)
							, relation			: singleFieldData[ j ]._rel.collection
							, relationType		: 'single'
							, required			: !singleFieldData[ j ].nullable
							, originalRelation	: 'hasOne'
							, relationKey		: singleFieldData[ j ].key // Store id directly on this field
						};
	
					}

				}

			}

			// hasMany
			else if( i === 'hasMany' ) {

				for( var n in singleFieldData ) {

					if( singleFieldData[ n ].name === 'language' ) {
						ret[ n ] = {
							type				: 'language'
							, tableName			: singleFieldData[ n ].table.name
						};
					}

					else if( singleFieldData[ n ].name === 'image' ) {
						ret[ n ] = {
							type				: 'image'
							, tableName			: singleFieldData[ n ].table.name
						};
					}

					else {

						ret[ n ] = {
							type				: 'relation'
							, relation			: singleFieldData[ n ]._rel.collection
							, relationType		: 'multiple'
							, originalRelation	: 'hasMany'
						};

					}
				}

			}

			else if( i === 'belongsTo' ) {

				for( var p in singleFieldData ) {

					var relation = singleFieldData[ p ]._rel ? singleFieldData[ p ]._rel.collection : false;

					ret[ p ] = {
						type					: 'relation'
						, relation				: relation
						, relationType			: 'multiple' // #todo: always multiple?
						, required				: false //!singleFieldData[ p ].nullable won't work, as nullable ain't set
						, originalRelation		: 'belongsTo'
					};

				}

			}

		}

		console.log( 'DetailView: parsed options are %o', ret );
		return ret;

	};









	//////////////////////////////////////////////////////////////////////////
	//
	// Register Components

	/**
	* For a autoFormElement to register itself
	*/
	self.register = function( element ) {

		self.registeredComponents.push( element );

		// All components registered
		if( self.registeredComponents.length === autoFormElementCount ) {

			console.log( 'DetailView: all elements registered (%o). Get data.', self.registeredComponents );

			// We're in new mode: No data available
			if( !self.getEntityId() ) {
				console.log( 'New mode (no id provided); don\'t get data' );
				return;
			}

			self.getData();

		}
	};












 




	//////////////////////////////////////////////////////////////////////////
	//
	// GET data

	self.getData = function() {

		self
			.makeGetRequest()
			.then( function( data ) {
				self.data = data;
				self.distributeData( data );
			}, function( err ) {
				$rootScope.$broadcast( 'notification', {
					type			: 'error'
					, message		: 'web.backoffice.detail.loadingError'
					, variables		: {
						errorMessage: err
					}
				} );
			} );

	};



	/**
	* See @registerOptionDataHandler
	*/
	self.registerGetDataHandler = function( handler ) {
		getHandlers.push( handler );
	};





	/**
	* Goes through all registered components and sets 
	* select fields that have to be sent to server (through header)
	* whenever a GET call is made. They are collected from the autoFormElement
	* directive
	*/
	self.getSelectParameters = function() {
		
		var select = [];
		for( var i = 0; i < self.registeredComponents.length; i++ ) {

			var comp = self.registeredComponents[ i ];

			if( !comp.select ) {
				continue;
			}

			// Array (when multiple selects must be made)
			// concat adds array or value
			select = select.concat( comp.select );
		
		}
		
		console.log( 'DetailView %o: getSelectParameters returns %o', self.getEntityName(), select );

		return select;

	};





	// Whenever data is gotten from server (GET), distribute data to child components
	// and child controllers
	self.distributeData = function( data ) {

		// $broadcast for child and parent Controllers (view-specific)
		//$scope.$broadcast( 'dataUpdate', { entity: self.getEntityName(), data: data } );
		$scope.$emit( 'dataUpdate', { entity: self.getEntityName(), data: data } );

		// Call handlers for child components (auto-forml-elements); 
		// can't use $broadcast as auito-form-elements need to have an isolated
		// scope for nexted detailViews
		getHandlers.forEach( function( handler ) {
			handler( data );
		} );

	};



	/**
	* Get data for current entity from server, fire dateUpdate. Done after changes were saved.
	*/
	self.updateData = function() {
		
		return self
			.makeGetRequest()
			.then( function( data ) {

				self.distributeData( data );
				return data;

			}, function( err ) {
				$rootScope.$broadcast( 'notification', {
					type				: 'error'
					, message			: 'web.backoffice.detail.saveError'
					, variables			: {
						errorMessage	: err
					}
				} );
				return $q.reject( err );
			} );
	};





	/**
	* Gets current entity's data through GET call
	*/
	self.makeGetRequest = function() {

		var url			= self.getEntityUrl()
			, select	= self.getSelectParameters();
		
		console.log( 'DetailView: Get Data from %o with select %o', url, select );

		return APIWrapperService.request( {
			url				: url
			, headers		: {
				select		: select
			}
			, method		: 'GET'
		} )
		.then( function( data ) {

			return data;

		}.bind( this ), function( err ) {
			return $q.reject( err );
		} );

	};







	






	///////////////////////////////////////////////////////////////////////////////////////////////
	//
	// Save
	//

	/**
	* Called when user clicks 'save'. Can be called manually through scope(). 
	*
	* @param <Boolean> dontNotifyOrRedirect			If true, no notification is shown and on successful creation, user is
	*												_not_ redirected to the new entity. Needed for manual saving. 
	* @returns <Integer>							ID of the current entity
	*/
	$scope.save = function( dontNotifyOrRedirect ) {

		// We need to get the saved entity's id so that we can redirect the user to it
		// after it has been created (when user was on /entity/new)
		// Can't be returned, as we're using promises. Therefore pass an object to the save
		// call that will be filled with the id
		var returnValue = {
			id: undefined
		};

		return self
			.makeSaveRequest( self.registeredComponents, self.getEntityName(), returnValue )
			.then( function( data ) {

				// Entity didn't have an ID (was newly created): Redirect to new entity
				if( $location.path().indexOf( '/new') === $location.path().length - 4 && !dontNotifyOrRedirect ) {
					$location.path( '/' + self.getEntityName() + '/' + self.getEntityId() );
				}

				if( !dontNotifyOrRedirect ) {
					$rootScope.$broadcast( 'notification', {
						type				: 'success'
						, message			: 'web.backoffice.detail.saveSuccess'
					} );
				}

				self.updateData();

				return returnValue.id;

			}, function( err ) {

				$rootScope.$broadcast( 'notification', {
					type				: 'error'
					, message			: 'web.backoffice.detail.saveError'
					, variables			: {
						errorMessage	: err
					}
				} );

				return $q.reject( err );

			} );

	};




	/**
	* Stores all component's data on server
	*/
	self.makeSaveRequest = function() {

		// Check if all form elements are valid
		for( var i = 0; i < self.registeredComponents.length; i++ ) {
			if( angular.isFunction( self.registeredComponents[ i ].isValid ) && !self.registeredComponents[ i ].isValid() ) {
				return $q.reject( 'Not all required fields filled out.' );
			}
		}

		// Pre-save tasks (upload images)
		return self.executePreSaveTasks()

			// Save stuff on current entity
			.then( function() {
				return self.makeMainSaveCall();
			}, function( err ) {
				return $q.reject( err );
			} );

	};





	/**
	* Executes tasks that must be done before the current entity is saved, i.e.
	* create all entities that will be linked to this entity afterwards, like e.g.
	* upload an image
	* Calls beforeSaveTasks on registered components. They must return a promise.
	*/
	self.executePreSaveTasks = function() {

		var tasks = [];

		for( var i = 0; i < self.registeredComponents.length; i++ ) {
			var reg = self.registeredComponents[ i ];
			if( reg.beforeSaveTasks && angular.isFunction( reg.beforeSaveTasks ) ) {
				tasks.push( reg.beforeSaveTasks() );
			}
		}

		console.log( 'DetailView: executePreSaveTasks has %o tasks', tasks.length );

		return $q.all( tasks );

	};





	/**
	* Saves: 
	* - first, the data on the entity (creates entity, if not yet done)
	*   by doing all calls going to /
	* - second, all other things (e.g. relations that need the entity to be 
	*   existent)
	*/
	self.makeMainSaveCall = function() {

		var calls = self.generateSaveCalls();

		console.log( 'DetailView: Save calls are %o', calls );

		var mainCall
			, relationCalls = [];

		// Split calls up in mainCall (call to /), needs to be done first
		// (main entity needs to be created before relations can be set)
		// Main calls start with /entityName or have no URL (relative)
		for( var i = 0; i < calls.length; i++ ) {
			if( calls[ i ].url === '/' + self.getEntityName() || !calls[ i ].url ) {
				mainCall = calls[ i ];
			}
			else {
				relationCalls.push( calls[ i ] );
			}
		}

		console.log( 'DetailView: Main save call is %o, other calls are %o', mainCall, relationCalls );

		// Make main call
		return self.executeSaveRequest( mainCall )

			// Make all secondary calls (to sub entities) simultaneously
			.then( function( mainCallData ) {

				// Pass id of newly created object back to the Controller
				// so that user can be redirected to new entity
				if( mainCallData && mainCallData.id ) {
					$scope.entityId = mainCallData.id;
				}

				var callRequests = [];
				relationCalls.forEach( function( call ) {
					callRequests.push( self.executeSaveRequest( call ) );
				} );

				return $q.all( callRequests );

			}, function( err ) {
				return $q.reject( err );
			} );

	};





	/**
	* Adds the call componentCall gotten from a registered component to the
	* calls variable that's sorted by urls and methods. 
	* Therefore, if multiple calls to the same url exists, it groups them together
	* by an array item on calls and composes the data.
	*/
	self.addCall = function( componentCall, calls ) {

		// Method's missing
		if( !componentCall.method ) {

			// Test if URL has an ID (ends with /12329)
			// If it does, use patch, else post.
			if(  /\/\d*\/?$/.test( componentCall.url ) ) {
				componentCall.method = 'PATCH';
			}
			else {
				componentCall.method = 'POST';
			}
		}

		// Check if call to url does already exit
		var call = this.getSaveCall( calls, componentCall.method, componentCall.url );

		// Call doesn't yet exist
		if( !call ) {
			call = {
				method		: componentCall.method
				, url		: componentCall.url
				, data		: {}
			};
			calls.push( call );
		}

		// Add data
		if( componentCall.data ) {
			for( var p in componentCall.data ) {
				call.data[ p ] = componentCall.data[ p ];
			}
		}

	};



	/**
	* Check if a call to method and url does already exist in calls. If it does, return it,
	* else return false
	* @param <Array> calls			Array of calls
	* @pparam <String> method
	* @param <String> url
	*/
	self.getSaveCall = function( calls, method, url ) {

		// Default: empty array, if not found
		var saveCall = false;
		calls.some( function( call ) {
			if( call.method === method && call.url === url ) {
				saveCall = call;
				return true;
			}
		} );
		return saveCall;

	};





	/**
	* Makes POST or PATCH call to server to store data.
	* @param <Object> data			Key: URL to be called
	*								Value: Data to be sent
	* @param <String> basePath		The current entity's path (e.g. /event/18), 
	*								needed to generate calls to relative URLs
	* @return <Promise>				Promise of the corresponding call
	*/
	self.executeSaveRequest = function( call ) {

		// Empty call (if there's no call to / to be made, e.g.)
		// Just resolve the promise
		if( !call ) {
			console.log( 'DetailView: No call to be made' );
			var deferred = $q.defer();
			deferred.resolve();
			return deferred.promise;
		}

		// url
		// - Take current url + url, if it's relative (doesn't start with a /)
		// - Take url if it's absolute (starts with a /)
		var url	= call.url.indexOf( '/' ) === 0 ? call.url : self.getEntityName() + '/' + self.getEntityId() + '/' + call.url;

		console.log( 'DetailView: Make %o call to %o with %o', call.method, url, call.data );

		// Add datasourceId as long as it's needed
		// #todo remove when eE's ready
		call.data.id_dataSource = BackofficeConfig.dataSourceId;

		return APIWrapperService.request( {
			url			: url
			, data		: call.data
			, method	: call.method
		} );

	};




	/**
	* Goes through all inputs, collects their save calls (by calling getSaveCalls)
	*/
	self.generateSaveCalls = function() {

		// Holds all calls to be made: 
		// [ {
		//		url			: '/city'
		//		method		: 'POST|PUT|PATCH'
		//		data		: {} // Data to be stored on url/method
		// } ]
		var calls = [];
		console.log( 'DetailView: Generate calls for %o registered components', self.registeredComponents.length );

		for( var i = 0; i < self.registeredComponents.length; i++ ) {

			var comp = self.registeredComponents[ i ];

			if( !comp.getSaveCalls || !angular.isFunction( comp.getSaveCalls ) ) {
				console.error( 'DetailView: Missing getSaveCalls on component %o', comp[ i ] );
				continue;
			}

			//console.log( 'DetailView: generateSaveCalls for %o', this.registered[ i ] );
			var componentCalls =  comp.getSaveCalls();

			// Component has to return false if there's nothing to save
			if( componentCalls === false ) {
				console.log( 'DetailView: No save calls for %o', comp );
				continue;
			}

			// Make array out of a componentCall
			if( !angular.isArray( componentCalls ) ) {
				componentCalls = [ componentCalls ];
			}

			console.log( 'DetailView: componentCalls are %o', componentCalls );
			componentCalls.forEach( function( componentCall ) {
				self.addCall( componentCall, calls );
			} );

		}

		console.log( 'DetailView: calls are %o', calls );
		return calls;

	};










	///////////////////////////////////////////////////////////////////////////////////////////////
	//
	// DELETE
	//

	/**
	* Deletes the entity. 
	* @param <Boolean> nonInteracitve		True if user should not be redirected to main view
	*/
	$scope.delete = function( nonInteracitve ) {
		
		console.log( 'DetailView: Delete' );

		return self
			.makeDeleteRequest()
			.then( function( data ) {

				// Go to entity's list view
				if( !nonInteracitve ) {
					$location.path( '/' + self.getEntityName() );
	
					$rootScope.$broadcast( 'notification', {
						type				: 'success'
						, message			: 'web.backoffice.detail.deleteSuccess'
					} );

				}

				// Resolve promise
				return true;

			}, function( err ) {

				if( !nonInteracitve ) {
					$rootScope.$broadcast( 'notification', {
						type				: 'error'
						, message			: 'web.backoffice.detail.deleteError'
						, variables			: {
							errorMessage	: err
						}
					} );
				}

				return $q.reject( err );

			} );

	};


	/**
	* Delete an entity
	*/
	self.makeDeleteRequest = function() {

		console.log( 'DetailView: Make DELETE request' );

		return APIWrapperService.request( {
			url			: '/' + self.getEntityName() + '/' + self.getEntityId()
			, method	: 'DELETE'
		} );
	};



} ] );