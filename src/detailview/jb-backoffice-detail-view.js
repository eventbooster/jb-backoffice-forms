'use strict';

/**
* Directive for every detail view: 
* - Gets field data from server (through an OPTIONS call)
* - Input components (text, images, relations) may register themselves
* - Stores data on server
*
* Child components must/may implement the following methods:
* - register: When all components were registered, GET call is made. 
*             To be called after OPTION data was processed by component.
* - registerOptionsDataHandler: get OPTION data (optional)
* - registerGetDataHandler: get GET data (optional)
* - getSaveCalls: Returns POST calls (optional)
* - isValid: Returns true if component is valid (optional)
* - getSelectFields: Returns select fields (replaces the select property)
*/
angular
.module( 'jb.backofficeDetailView', [ 'jb.apiWrapper', 'pascalprecht.translate' ] )
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
		// Problematic if we have nested detailViews (e.g. in articles on CC)
		// But true is needed to access entityId of a parent detailView (e.g. to filter in a 
		// nested detailView)
		, scope				: true
		, require			: [ 'detailView' ]
	};

} ] )




.controller( 'DetailViewController', [ '$scope', '$rootScope', '$q', '$attrs', '$filter',  '$state', 'APIWrapperService', function( $scope, $rootScope, $q, $attrs, $filter, $state, APIWrapperService ) {



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

		// Handlers that will be called on OPTIONs and GET data received, 
		// registered from sub-components through 
		// - self.registerOptionsDataHandler( callback )
		// - self.registerGetDataHandler( callback )
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
		// Path is equal to window.location.search.substring(1),
		// therefore «/entity/id» or «/entity»
		/*var path				= $location.path()
			, split				= path.split( '/' )
			, returnValue		= {
				name			: undefined
				, id			: undefined
			};

		// If data-entity-name is set, don't take name OR id 
		// from URL (URL needs to be overwritten by attributes)
		if( $attrs.entityName ) {
			return returnValue;
		}

		if( split.length < 2 ) {
			return returnValue;
		}

		// Name
		if( split.length > 1 ) {
			returnValue.name = split[ 1 ];
		}

		// ID	
		if( split.length > 2 ) {

			var id = parseInt( split[ 2 ], 10 );
			if( !isNaN( id ) ) {
				returnValue.id = id;
			}

		}

		return returnValue;*/

		return {
			name			: $state.params.entityName
			// Only return id if it's an ID (and not 'new'). If we return «new», a GET request will be made to /entityName/new
			, id			: ( $state.params.entityId && $state.params.entityId !== 'new' ) ? $state.params.entityId : false
			, isNew			: $state.params.entityId === 'new' ? true : false
		};

	};


	// Update entity whenever data-entity-id changes on element
	// Get data when attribute changes.
	$scope.$watch( $attrs.entityId, function( val ) {

		console.log( 'DetailViewController: $attrs.entityId changed to %o; if val exists, update $scope.entityId', val );

		if( val ) {
			$scope.entityId = val;
			self.getData();
		}
	} );

	if( $scope.$parent.$eval( $attrs.entityId ) ) {
		$scope.entityId = $scope.$parent.$eval( $attrs.entityId );
	}
	else {
		$scope.entityId = self.parseUrl().id;
	}



	// Name
	$scope.$watch( $attrs.entityName, function( val ) {

		console.log( 'DetailViewController: $attrs.entityName changed to %o; if val exists, update $scope.entityName', val );

		if( val ) {
			$scope.entityName = val;
			self.getData();
		}
	} );

	if( $scope.$parent.$eval( $attrs.entityName ) ) {
		$scope.entityName = $scope.$parent.$eval( $attrs.entityName );
	}
	else {
		$scope.entityName = self.parseUrl().name;
	}






	self.getEntityId = function() {
		return $scope.entityId;
	};

	self.getEntityName = function() {
		return $scope.entityName;
	};

	self.getEntityUrl = function() {
		var url = '/' + self.getEntityName();
		if( self.getEntityId() ) {
			url += '/' + self.getEntityId();
		}
		return url;
	};







	//////////////////////////////////////////////////////////////////////////
	//
	// Entity Name and URL
	//


	// Watch attributes
	/*$attrs.$observe( 'entityName', function( newName ) {
		$scope.entityName = newName;
	} );*/

	// Init (required if we have a nested detailView that has ng-if and is only displayed if a
	// certain condition is met)
	/*if( $attrs.entityName ) {
		$scope.entityName = $attrs.entityName;
	}*/

















	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//
	// Title
	//

	self.setTitle = function() {

		if( self.parseUrl().isNew ) {
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
		// [data-backoffice-component]: Individual components that get and store data.
		var autoFormElements		= element.find( '[data-auto-form-element], [data-hidden-input], [data-backoffice-tree-component], [data-backoffice-relation-component], [data-backoffice-component], [data-backoffice-image-component], [data-backoffice-image-detail-component], [data-backoffice-video-component], [data-backoffice-date-component], [data-backoffice-media-group-component], [data-backoffice-data-component]' );

		// If element has a parent [data-detail-view] that is different from the current detailView, don't count elements. 
		// This may happen if we have nested detailViews.
		autoFormElements.each( function() {
			var closest = $( this ).closest( '[data-detail-view]' );
			if( closest.get( 0 ) === element.get( 0 ) ) {
				autoFormElementCount++;
			}
		} );

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

				self.getData();

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

			// Bool
			if( singleFieldData.name && singleFieldData.type === 'boolean' ) {
				ret[ singleFieldData.name ] = {
					type		: 'boolean'
					, required	: !singleFieldData.nullable
				};
			}

			// Data
			if( singleFieldData.name && singleFieldData.type === 'json' ) {
				ret[ singleFieldData.name ] = {
					type		: 'json'
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

			// Date
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
							, relationType		: 'single'
							, relationKey		: singleFieldData[ j ].key
						};
					}

					else {
	
						// j contains the field's name
						ret[ j ] = {
							type				: 'relation'

							// Link to entity's collection (e.g. city)
							// referencedModelName is the same as modelName for has many (but referenced as it's hasOne)
							, relation			: singleFieldData[ j ].hasAlias ? singleFieldData[ j ].referencedModelName : singleFieldData[ j ].name

							// If property is an alias, set alias here. Alias for event is e.g. parentEvent (EventBooster).
							// Alias must be used to save relation, but is not available to GET data. 
							// GET /originalEntityNameName
							// POST /alias/id/otherEntity/id
							, alias				: singleFieldData[ j ].hasAlias ? singleFieldData[ j ].name : false

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
							, relation			: singleFieldData[ n ].name // Needed if we have a dropdown (relation-input) of type language! See e.g. eb movieType that has a language associated to it.
						};
					}

					else if( singleFieldData[ n ].name === 'image' ) {
						ret[ n ] = {
							type				: 'image'
							//, tableName		: singleFieldData[ n ].table.name
							, relationType		: 'multiple'
							, relationKey		: singleFieldData[ n ].key
						};
					}

					else {

						ret[ n ] = {
							type				: 'relation'
							
							// relation and alias: See hasOne
							// use modelName instead of referencedModelName as model is not referenced, but mapped
							, relation			: singleFieldData[ n ].hasAlias ? singleFieldData[ n ].modelName : singleFieldData[ n ].name
							, alias				: singleFieldData[ n ].hasAlias ? singleFieldData[ n ].name : false

							, relationType		: 'multiple'
							, originalRelation	: 'hasMany'
						};

					}
				}

			}

			else if( i === 'belongsTo' ) {

				for( var p in singleFieldData ) {

					var relation = singleFieldData[ p ]._rel ? singleFieldData[ p ]._rel.collection : false;

					ret[ p ] = {
						type					: 'relation'

						// relation and alias: See hasOne
						, relation			: singleFieldData[ p ].hasAlias ? singleFieldData[ p ].modelName : singleFieldData[ p ].name
						, alias				: singleFieldData[ p ].hasAlias ? singleFieldData[ p ].name : false

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
	* For a autoFormElements to register themselves. 
	* - Pushes them to registeredComponents
	* - As soon as all are registered, data is gotten (GET)
	* - Gotten data (GET) is distributed to registered components
	* - Registered components are asked for their data when saving
	* @param {Object} element		The child directive itself (this)
	*/
	self.register = function( el ) {

		self.registeredComponents.push( el );

		self.getData();

	};












 




	//////////////////////////////////////////////////////////////////////////
	//
	// GET data

	self.getData = function() {

		// autoFormElementCount is only set on init, as element is not available before. 
		// Register may happen before (as child elements are linked before parent elements). 
		// Return.
		if( autoFormElementCount === 0 ) {
			return;
		}

		// Only get data when all components have registered themselves.
		if( self.registeredComponents.length < autoFormElementCount ) {
			console.log( 'DetailViewController: Can\'t get data, not all autoFormElements registered yet: %o vs %o', self.registeredComponents.length, autoFormElementCount );
			return;
		}

		// Too many components registered
		if( self.registeredComponents.length > autoFormElementCount ) {
			console.error( 'DetailViewController: More components registered than detected in the DOM: %o vs %o. Registered: %o.', self.registeredComponents.length, autoFormElementCount, self.registeredComponents );
			// Data has already been gotten, therefore return.
			return;
		}

		if( !self.getEntityId() ) {
			console.log( 'DetailViewController: Can\'t get data, entity ID is not set.' );
			return;
		}


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

			// New notation: getSelectFields
			if( comp.getSelectFields && angular.isFunction( comp.getSelectFields ) ) {
				select = select.concat( comp.getSelectFields() );
			}
			// Old notation: select property
			else if( comp.select ) {
				// Array (when multiple selects must be made)
				// concat adds array or value
				select = select.concat( comp.select );
			}

		
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
	$scope.save = function( dontNotifyOrRedirect, ev, callback ) {

		// Needed for nested detailViews: We don't want to propagate the save event to the parent detailView
		// See e.g. article in CC back office
		if( ev && angular.isFunction( ev.preventDefault ) ) {
			ev.preventDefault();
		}

		// We need to get the saved entity's id so that we can redirect the user to it
		// after it has been created (when user was on /entity/new)
		// Can't be returned, as we're using promises. Therefore pass an object to the save
		// call that will be filled with the id
		/*var returnValue = {
			id: undefined
		};*/

		return self
			.makeSaveRequest( self.registeredComponents, self.getEntityName() )
			.then( function( entityId ) {

				// Entity didn't have an ID (was newly created): Redirect to new entity
				if( self.parseUrl().isNew && !dontNotifyOrRedirect ) {
					$state.go( 'app.detail', { entityName: self.getEntityName(), entityId: self.getEntityId() } );
				}

				// Do notify and redirect
				if( !dontNotifyOrRedirect ) {
					console.log( 'DetailViewController: Show success message on %o', $rootScope );
					$rootScope.$broadcast( 'notification', {
						type				: 'success'
						, message			: 'web.backoffice.detail.saveSuccess'
					} );
				}
				else {
					console.log( 'DetailViewController: Don\'t show any message or redirect' );
				}

				self.updateData();

				return entityId || null;


			}, function( err ) {

				$rootScope.$broadcast( 'notification', {
					type				: 'error'
					, message			: 'web.backoffice.detail.saveError'
					, variables			: {
						errorMessage	: err.message
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
				return $q.reject( new Error( 'Not all required fields filled out.' ) );
			}
		}

		// Pre-save tasks (upload images)
		return self.executePreSaveTasks()

			// Save stuff on current entity
			.then( function() {
				return self.makeMainSaveCall();
			} )
			.then( function() {
				return self.executePostSaveTasks();
			});

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
	* Executes save tasks that must be executed after the main entity was created, 
	* e.g. save the order of images in a mediaGroup: 
	* 1. Save main entity (done through regular save call)
	* 2. Update media links (/mediumGroup/id/medium/id) (done through regular save call)
	* 3. Update order (GET all media from /mediumGroup, then set order on every single relation)
	*/
	self.executePostSaveTasks = function() {

		var tasks = [];

		self.registeredComponents.forEach( function( component ) {
			if( component.afterSaveTasks && angular.isFunction( component.afterSaveTasks ) ) {
				tasks.push( component.afterSaveTasks() );
			}
		} );

		console.log( 'DetailView: executePostSaveTasks has %o tasks', tasks.length );

		return $q.all( tasks );

	};







	/**
	* Saves: 
	* - first, the data on the entity (creates entity, if not yet done)
	*   by doing all calls going to /
	* - second, all other things (e.g. relations that need the entity to be 
	*   existent)
	* @return Promise		Parameter passed is null or mainEntity's id
	*/
	self.makeMainSaveCall = function() {

		var calls = self.generateSaveCalls();

		console.log( 'DetailView: Save calls are %o', calls );

		var mainCall
			, relationCalls = []
			, mainCallData;

		// Split calls up in mainCall, needs to be done first
		// (main entity needs to be created before relations can be set)
		// Main calls start with /entityName or /entityName/entityId (for updates)
		// /entityName/entityId must be covered in case of redirects. Subsequent calls
		// to releations must be made to the new entityId. 
		for( var i = 0; i < calls.length; i++ ) {

			// If url is an object it should never be a call to the mainEnity (as mainEntity: append or prepend will be
			// used and therefore a relation be created.
			if( 
				!angular.isObject( calls[ i ].url ) && 
				( 
					!calls[ i ].url || 
					calls[ i ].url.indexOf( '/' + self.getEntityName() ) === 0 
				) 
			) {
				mainCall = calls[ i ];
			}

			else {
				relationCalls.push( calls[ i ] );
			}

		}
	
		// entityId not yet set: New element – but has no fields or no required fields, 
		// therefore no information might be provided, except for some relations. 
		// If entity is not generated (what would happen as there's no data to store), 
		// relations could not be created (POST to /entityName/otherEntityName/otherEntityId)
		// would fail, as entityId doesn't exist. 
		if( !mainCall && !self.getEntityId() ) {
			mainCall = {
				method			: 'POST'
				, url			: '/' + self.getEntityName()
			};
		}

		console.log( 'DetailView: Main save call is %o, other calls are %o', mainCall, relationCalls );

		// Make main call
		return self.executeSaveRequest( mainCall )

			// Make all secondary calls (to sub entities) simultaneously
			.then( function( mainCallResult ) {

				// Make mainCallData available to next promise
				mainCallData = mainCallResult;

				console.log( 'DetailView: Made main save call; got back %o', mainCallData );

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

			} )

			// Make sure we pass back the id.
			.then( function() {
				if( mainCallData && mainCallData.id ) {
					console.log( 'DetailView: Made call to the main entity; return it\'s id %o', mainCallData.id );
					return mainCallData.id;
				}
				return null;
			} );


	};





	/**
	* Adds the call componentCall gotten from a registered component to the
	* calls variable that's sorted by urls and methods. 
	* Therefore, if multiple calls to the same url exists, it groups them together
	* by an array item on calls and composes the data.
	*/
	self.addCall = function( componentCall, calls ) {

		// Components may pass back just a data field – means that it's stored on the entity itself.
		// Get url from self.getEntityUrl, as it is needed to determine the method of the call 
		// (PATCH or POST). 
		if( !componentCall.url ) {
			componentCall.url = self.getEntityUrl();
		}


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
		var call = this.getSaveCall( calls, componentCall.method, componentCall.url  );

		// If componentCall has headers, treat it as a different call. To improve, we might
		// compare headers, but let's save that for better times.
		// Headers are e.g. used in treeFormData to store a tree (needs Content-Type: application/json)
		if( componentCall.hasOwnProperty( 'headers' ) ) {
			call = false;
		}

		// Call doesn't yet exist
		if( !call ) {
			call = {
				method		: componentCall.method
				, url		: componentCall.url
				, data		: componentCall.data
				, headers	: componentCall.headers || {}
			};
			calls.push( call );
		}

		// Add data
		else {

			// Don't do that if we're sending a string or array (e.g. when using application/json as Content-Type
			if( componentCall.data ) {
				for( var p in componentCall.data ) {
					call.data[ p ] = componentCall.data[ p ];
				}
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
			// Check if URL is the same. Normally use === comparator. 
			// But if URL is not set, it might be false or '', therefore
			// use == comparator.
			var sameUrl			= call.url === url || ( !call.url && !url )
				, sameMethod	= call.method.toLowerCase() === method.toLowerCase();
			if( sameMethod && sameUrl ) {
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
		var url;


		//
		// Generate final URL 
		//


		// Object

		if( angular.isObject( call.url ) ) {

			// url.path missing – needs to be set if url is an object
			if( !call.url.path ) {
				console.error( 'DetailViewController: url property is missing on path on %o', call );
				return $q.reject( 'Got invalid call data, path property missing on url for ' + JSON.stringify( call ) );
			}

			// entityName/entityId or entityName
			var mainEntityUrl = self.getEntityId() ? 
				self.getEntityName() + '/' + self.getEntityId() : 
				self.getEntityName();

			// Remove trailing and leading slashes
			var path = call.url.path.replace( /^\/*/, '' ).replace( /\/*$/, '' );

			if( call.url.mainEntity === 'prepend' ) {

				url = '/' + mainEntityUrl + '/' + path;

			}
			else if( call.url.mainEntity === 'append' ) {

				url = '/' + path + '/' + mainEntityUrl;

			}

			else {
				url = call.url.path;
			}

		}



		// URL starts with /

		else if( call.url && call.url.indexOf( '/' ) === 0 ) {

			url = call.url;

		}


		// Relative URL

		else {

			url = '/' + self.getEntityName();

			// Only use entity's ID if it exists (i.e. we're not newly creating an entity)
			if( self.getEntityId() ) {
				url += '/' + self.getEntityId();
			}

			// Append call.url, if available
			if( call.url ) {
				url += '/' + call.url;
			}

		}

		console.log( 'DetailView: Make %s call to %s with %o. Call is %o, entityName is %o.', call.method, url, call.data, call, self.getEntityName() );

		// Add datasourceId as long as it's needed
		// #todo remove when eE's ready
		if( !call.data ) {
			call.data = {};
		}

		return APIWrapperService.request( {
			url			: url
			, data		: call.data
			, method	: call.method
			, headers	: call.headers
		} );

	};




	/**
	* Goes through all inputs, collects their save calls (by calling getSaveCalls)
	*
	* getSaveCalls() may return: 
	* - false (no call to be made)
	* - an array of objects or single object, where each object has the following properties
	*     - url (mandatory): URL to be called as 
	*           - a <String>: If prefixed with a /, will be an absolute path, else relative to the 
	*             current entity
	*           - an <Object> with the properties
	*                   - path <String>: path
	*                   - baseEntity <String> 'append|prepend' Whether and where to append
	*                     the current entity plus its ID. If not set or another value, 
	*                     current entity is not used at all.
	*     - method (mandatory, <String>): method to be used (GET,PATCH,POST)
	*     - headers (optional, <Object>): an object of headers, e.g. { range: '0-10' }
	*     - data (optional <Object>): data to be sent with a POST or PATCH request
	* - a Promise
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

			console.log( 'DetailView: componentCalls are %o for %o', componentCalls, comp );
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
	* @param <Boolean> nonInteractive		True if user should not be redirected to main view
	*/
	$scope.delete = function( nonInteractive ) {
		
		console.log( 'DetailView: Delete' );

		// Display confirmation dialog – must be done in interactive and non-interactive mode
		var confirmed = confirm( $filter( 'translate')('web.backoffice.detail.confirmDeletion' ) );

		if( !confirmed ) {
			return;
		}

		return self
			.makeDeleteRequest()
			.then( function( data ) {

				// Go to entity's list view
				if( !nonInteractive ) {
					
					$state.go( 'app.list', { entityName: self.getEntityName() } );
	
					$rootScope.$broadcast( 'notification', {
						type				: 'success'
						, message			: 'web.backoffice.detail.deleteSuccess'
					} );

				}

				// Resolve promise
				return true;

			}, function( err ) {

				if( !nonInteractive ) {
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