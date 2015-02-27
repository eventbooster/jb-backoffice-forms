'use strict';

/**
* Parent controller for all autoInputs. Provides basic functionality.
*/
var AutoInputController = function( $scope, $attrs ) {

	// Make angular stuff available to methods
	this.$attrs				= $attrs;

	// $scope always holds two objects gotten from auto-form-element: 
	// - optionData
	// - originalAttributes
	this.$scope				= $scope;

	this.$scope.entityName	= undefined;
	this.$scope.entityUrl	= undefined;

	$scope.data		= {
		value		: undefined
		, name		: $attrs[ 'for' ]
		// Required for backofficeLabel directive
		, valid		: true
	};

	this.isValid				= function() {
		return $scope.data.valid;
	};

	this.element				= undefined;
	this.detailViewController	= undefined;

};

/**
* Called from directive's link function 
*/
AutoInputController.prototype.init = function( el, detViewController ) {

	this.element				= el;
	this.detailViewController	= detViewController;

	// Make entityId and entityName available to scope
	this.$scope.entityName		= detViewController.getEntityName();
	this.$scope.entityId		= detViewController.getEntityId();

	// Register myself @ detailViewController 
	// -> I'll be notified on save
	this.detailViewController.register( this );

	// Call afterInit
	// E.g. replace current element with new directive (see relation-input). Can only be done
	// after the element has been initialized and data set
	if( this.afterInit && angular.isFunction( this.afterInit ) ) {
		this.afterInit();
	}

	if( !this.updateData ) {
		console.error( 'AutoInputController: updateData method missing in %o %o', this, el );
	}
	else {
		this.detailViewController.registerGetDataHandler( this.updateData.bind( this ) );
	}

};
'use strict';



/**
* Directive for autoFormElements: Replaces itself with the corresponding input element
* as soon as the detailView directive has gotten the necessary data (type, required etc.)
* from the server through an options call
*/
angular
.module( 'jb.backofficeAutoFormElement', [] )
.directive( 'autoFormElement', [ '$compile', function( $compile ) {

	return {
		require		: [ 'autoFormElement', '^detailView' ]
		, link		: function( scope, element, attrs, ctrl ) {

			ctrl[ 0 ].init( element, ctrl[ 1 ] );

		}
		, controller	: 'AutoFormElementController'
		// If we leave it out and use $scope.$new(), angular misses detailView controller
		// as soon as we use it twice on one site. 
		, scope			: true
	};

} ] )


.controller( 'AutoFormElementController', [ '$scope', '$attrs', '$compile', '$rootScope', function( $scope, $attrs, $compile, $rootScope ) {

	var scope					= $scope
		,self					= this
		, element
		, detailViewController;


	/**
	* Is called when OPTION data is gotten in detailViewController; inits the replacement of the element
	*/
	self.optionUpdateHandler = function( data ) {

		if( !data || !data[ name ] ) {
			console.error( 'AutoFormElement: Can\'t update element, specs for field %o missing in %o', name, data );
			return;
		}

		var fieldSpec		= data[ name ];
		self.updateElement( fieldSpec );

		// Remove handler; if getOptions is called multiple times in detailViewController, 
		// it will throw an error as the function is not available any more.
		detailViewController.removeOptionsDataHandler( self.optionUpdateHandler );

	};


	self.init = function( el, detViewController ) {

		detailViewController = detViewController;

		// $scope.$on won't work with multiple detail-view directives on one page (controller detailView cannot be
		// found). Therefore use callbacks … :-)
		//console.error( 'devview %o for %o', detailViewController, el.data( 'for' ) );
		detailViewController.registerOptionsDataHandler( self.optionUpdateHandler );

		element = el;

	};


	var name = $attrs[ 'for' ];

	// field property updated in detailView (i.e. OPTION data gotten from serer)
	// Select element's attributes, compile fitting directive
	/*$scope.$on( 'fieldDataUpdate', function( ev, args ) {

		console.error( 'AutoFormElement: fieldDataUpdate %o', args );

		if( !args.fields || !args.fields[ name ] ) {
			console.error( 'AutoFormElement: Can\'t update element, specs for field %o missing in %o', name, args );
			return;
		}

		var fieldSpec		= args.fields[ name ];
		self.updateElement( fieldSpec );

	} );*/


	/**
	* Replaces element with the correct element of the type corresponding
	* to the current property's type (text, email etc.)
	*/
	self.updateElement = function( fieldSpec ) {

		var elementType;

		if( !fieldSpec || !fieldSpec.type ) {
			console.error( 'AutoFormElement: fieldSpec %o is missing type', fieldSpec );
			return;
		}

		switch( fieldSpec.type ) {
			case 'text':
				elementType = 'text';
				break;

			case 'number':
				elementType = 'text';
				break;

			case 'boolean':
				elementType = 'checkbox';
				break;

			case 'relation':
				elementType = 'relation';
				break;

			case 'language':
				elementType = 'language';
				break;

			case 'image':
				elementType = 'image';
				break;

			case 'datetime':
				elementType = 'dateTime';
				break;

			default:
				console.error( 'AutoFormElement: Unknown type %o', fieldSpec.type );

		}
		
		if( !elementType ) {
			console.error( 'AutoFormElement: elementType missing for element %o', element );
			return;
		}

		console.log( 'AutoFormElement: Create new %s from %o', elementType, fieldSpec );

		// camelCase to camel-case
		var dashedCasedElementType = elementType.replace( /[A-Z]/g, function( v ) { return '-' + v.toLowerCase(); } );


		// Pass OPTION data to directive :-)
		scope.optionData = fieldSpec;

		// Pass attributes of original directive to replacement
		scope.originalAttributes = $attrs;

		var newElement = $( '<div data-auto-' + dashedCasedElementType + '-input data-for=\'' + name + '\'></div>' );

		element.replaceWith( newElement );
		$compile( newElement )( scope );

	};

} ] );


'use strict';

/**
* Auto checkbox input. Inherits from AutoInput. 
*/

var AutoCheckboxInputController = function( $scope, $attrs ) {

	AutoInputController.call( this, $scope, $attrs );

	// Set select to this field's for attribute
	// (that corresponds to data.name)
	this.select = this.$scope.data.name;

};

AutoCheckboxInputController.prototype = Object.create( AutoInputController.prototype );
AutoCheckboxInputController.prototype.constructor = AutoCheckboxInputController;



AutoCheckboxInputController.prototype.updateData = function( data ) {
	this.originalData = this.$scope.data.value = data[ this.$attrs.for ];
};

AutoCheckboxInputController.prototype.getSaveCalls = function() {

	if( this.originalData === this.$scope.data.value ) {
		return false;
	}

	var data = {};
	data[ this.$scope.data.name ] = this.$scope.data.value;
	console.error( data );
	return {
		url			: ''
		, data		: data
		, method	: this.detailViewController.getEntityId() ? 'PATCH' : 'POST'
	};
	
};





angular
.module( 'jb.backofficeAutoFormElement' )

/**
* Directive for an autoFormElement of type 'text'
*/
.directive( 'autoCheckboxInput', [ function() {

	return {
		require			: [ 'autoCheckboxInput', '^detailView' ]
		, controller	: 'AutoCheckboxInputController'
		, link			: function( scope, element, attrs, ctrl) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		, templateUrl	: 'autoCheckboxInputTemplate.html'
	};

} ] )

.controller( 'AutoCheckboxInputController', AutoCheckboxInputController )



.run( function( $templateCache ) {

	$templateCache.put( 'autoCheckboxInputTemplate.html',
		'<div class=\'form-group\'>' +
			'<label data-backoffice-label></label>' +
			'<div class=\'col-md-9\'>' +
				'<div class=\'checkbox\'>' +
					'<input type=\'checkbox\' data-ng-model=\'data.value\'/>' +
				'</div>' +
			'</div>' +
		'</div>'
	);

} );
'use strict';

var AutoDateTimeInputController = function( $scope, $attrs ) {

	AutoInputController.call( this, $scope, $attrs );

	// Set select for detailViewDirective
	this.select					= $attrs.for;

	// Initial data for the entity gotten from server when site was loaded: 
	// Needed to calculate differences on save
	this.originalData			= undefined;
	
	this.$scope.date			= undefined;

	// Display time only if type is datetime and not date
	$scope.showTime				= this.$scope.optionData.time;

};

AutoDateTimeInputController.prototype = Object.create( AutoInputController.prototype );
AutoDateTimeInputController.prototype.constructor = AutoDateTimeInputController;

AutoDateTimeInputController.prototype.updateData = function( data ) {

	this.$scope.date = new Date( data[ this.$attrs.for] );
	this.originalData = this.$scope.date;

};

AutoDateTimeInputController.prototype.getSaveCalls = function() {

	var date			= this.$scope.date;

	// Empty field
	if( !date ) {
		return false;
	}

	// No change
	if( date.getTime() === this.originalData.getTime() ) {
		return false;
	}

	var dateString		= date.getFullYear() + '-' + ( date.getMonth() + 1 ) + '-' + date.getDate()  + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
		, data			= {};

	data[ this.$scope.data.name ] = dateString;

	return {
		url			: this.detailViewController.getEntityUrl()
		, data		: data
	};

};





angular
.module( 'jb.dateTime', [] )
.directive( 'autoDateTimeInput', [ function() {

	return {
		templateUrl			: 'dateTimeInputTemplate.html'
		, controller		: 'AutoDateTimeInputController'
		, require			: [ 'autoDateTimeInput', '^detailView' ]
		, link			: function( scope, element, attrs, ctrl ) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
	};

} ] )

.controller( 'AutoDateTimeInputController', AutoDateTimeInputController )

.run( function( $templateCache ) {

	$templateCache.put( 'dateTimeInputTemplate.html',
		'<div class=\'form-group form-group-sm\'>' +
			'<label data-backoffice-label></label>' +
			'<div data-ng-class=\'{ "col-md-9": !showTime, "col-md-5": showTime}\'>' +
				'<input type=\'date\' class=\'form-control input-sm\' data-ng-model=\'date\'>' +
			'</div>' +
			'<div class=\'col-md-4\' data-ng-if=\'showTime\'>' +
				'<input type=\'time\' class=\'form-control input-sm\' data-ng-model=\'date\' />' +
			'</div>' +
		'</div>'
	);

} );
'use strict';

/**
* Auto image input. Inherits from AutoInput.
*/

var AutoImageInputController = function( $scope, $attrs, $q, APIWrapperService ) {

	AutoInputController.call( this, $scope, $attrs );

	// Select: table
	this.select				= 'image.*,image.bucket.url';
	this.originalData		= undefined;

	this.$q					= $q;
	this.APIWrapperService	= APIWrapperService;


	// Contains data of uploaded files
	// Needed between this.beforeSaveTasks and this.getSaveCalls
	//this.uploadedFilesData	= [];


	/**
	* Data gotten from server or newly added image. See image-component
	*/
	this.$scope.images		= [];

};

AutoImageInputController.prototype = Object.create( AutoInputController.prototype );
AutoImageInputController.prototype.constructor = AutoImageInputController;

AutoImageInputController.prototype.updateData = function( data ) {

	// Image has a hasOne-relation: Is delivered as an object (instead of an array):
	// Convert to array
	if( !angular.isArray( data.image ) ) {
		data.image = [ data.image ];
	}

	this.$scope.images = data.image ? data.image : [];

	// Copy to originalData (will be used on getSaveCalls())
	if( data.image && angular.isArray( data.image ) ) {
		this.originalData = data.image.slice();
	}
	else {
		this.originalData = [];
	}

};



AutoImageInputController.prototype.getSaveCalls = function() {

	// Calls to be returned
	var ret			= []

		// IDs of images present on init
		, originalIds	= []

		// IDs of images present on save
		, scopeIds		= [];


	if( this.originalData && this.originalData.length ) {
		this.originalData.forEach( function( img ) {
			originalIds.push( img.id );
		} );
	}

	this.$scope.images.forEach( function( img ) {
		scopeIds.push( img.id );
	} );

	// Deleted
	originalIds.forEach( function( id ) {
		if( scopeIds.indexOf( id ) === -1 ) {
			// Remove relation (relative path, will be prefixed with current entity's path)
			ret.push( {
				method		: 'DELETE'
				, url		: 'image/' + id
			} );
			// Remove image (try to)
			ret.push( {
				method		: 'DELETE'
				, url		: '/image/' + id
			} );
		}
	} );

	// Added
	scopeIds.forEach( function( id ) {
		if( originalIds.indexOf( id ) === -1 ) {
			ret.push( {
				method		: 'POST'
				, url		: 'image/' + id
			} );
		}
	} );

	console.log( 'AutoImageInput: Calls to be made are %o', ret );
	return ret;

};


AutoImageInputController.prototype.beforeSaveTasks = function() {

	var requests = [];

	// Upload all added files (if there are any), then resolve promise
	for( var i = 0; i < this.$scope.images.length; i++ ) {

		var img		= this.$scope.images[ i ];

		// Only files added per drag and drop have a file property that's a file
		if( img.file && img.file instanceof File ) {

			requests.push( this._uploadFile( img ) );

		}

	}

	console.log( 'AutoImageInputController: Upload %o', requests );

	return this.$q.all( requests );

};



AutoImageInputController.prototype._uploadFile = function( img ) {

	return this.APIWrapperService.request( {
		method				: 'POST'
		, data				: {
			dataSource		: 'backoffice'
			, image			: img.file
		}
		, url				: '/image'
	} )
	.then( function( data ) {

		// Store data gotten from server on $scope.images[ i ] ) 
		// instead of the image file itself
		var index = this.$scope.images.indexOf( img );

		this.$scope.images
			.splice( index, 1, data);

		return true;

	}.bind( this ), function( err ) {
		this.$q.reject( err );
	} );

};







angular
.module( 'jb.backofficeAutoFormElement' )

/**
* Directive for an autoFormElement of type 'text'
*/
.directive( 'autoImageInput', [ function() {

	return {
		require			: [ 'autoImageInput', '^detailView' ]
		, controller	: 'AutoImageInputController'
		, link			: function( scope, element, attrs, ctrl ) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		, templateUrl	: 'autoImageInputTemplate.html'
	};


} ] )

.controller( 'AutoImageInputController', AutoImageInputController )



.run( function( $templateCache ) {

	$templateCache.put( 'autoImageInputTemplate.html',
		'<div class=\'row\'>' +
			'<label data-backoffice-label></label>' +
			'<div class=\'col-md-9\' data-image-component data-images=\'images\'></div>' +
		'</div>'
	);

} );








'use strict';

/**
* Auto language input. Inherits from AutoInput.
*/

var AutoLanguageInputController = function( $scope, $attrs ) {

	AutoInputController.call( this, $scope, $attrs );

	// Select: table
	this.select = this.$scope.optionData.tableName + '.*';

	this.originalData = undefined;


	// Key: id_language
	// Value			: {
	//	identifier		: 'name'
	// }
	// This structure is needed so that we can access the properties directly in the DOM
	// through ngmodel. 
	this.$scope.locales = {};


	$scope.fields = $scope.$eval( this.$scope.originalAttributes.fields );


	// Make data fit $scope.locales
	this.$scope.$on( 'dataUpdate', function( ev, data ) {
		var locs = data[ this.$scope.optionData.tableName ];
		this.setData( locs );
	}.bind( this ) );


};

AutoLanguageInputController.prototype = Object.create( AutoInputController.prototype );
AutoLanguageInputController.prototype.constructor = AutoLanguageInputController;

AutoLanguageInputController.prototype.getSaveCalls = function() {

	// Make one call per changed language
	// url: /entity/id/language/id
	// Method: POST or PATCH (can't use PUT as it tries to re-establish an already
	// made connection on a unique relation)
	// DELETE is not needed (done through data)
	// data: identifier -> translation

	var ret = [];

	// Go through languages
	for( var i in this.$scope.locales ) {

		var trans		= this.$scope.locales[ i ]
			, langId	= i;

		var url = 'language/' + langId;

		// Language didn't exist in originalData
		if( !this.originalData || !this.originalData[ langId ] ) {

			ret.push( {
				method			: 'POST'
				, url			: url
				, data			: this.$scope.locales[ langId ]
			} );

		}

		// Get changed fields
		else {

			// Store changed fields
			var changed			= {}
				, hasChanged	= false;


			// Go through fields (only the visible fields may have been changed)
			for( var n = 0; n < this.$scope.fields.length; n++ ) {

				var fieldName = this.$scope.fields[ n ];

				// Current field is not the same as it was at the beginning: Add to changed
				if( this.$scope.locales[ i ][ fieldName ] !== this.originalData[ i ][ fieldName ] ) {
					changed[ fieldName ] = this.$scope.locales[ i ][ fieldName ];
					hasChanged = true;
				}

			}

			// There were changes to that language
			if( hasChanged ) {
				var method = this.originalData[ langId ] ? 'PATCH' : 'POST';
				ret.push( {
					method			: method
					, data			: changed
					, url			: url
				} );

			}

		}

	}

	return ret;

};

AutoLanguageInputController.prototype.updateData = function( data ) {

	console.log( 'AutoLanguageInput: updateData got %o', data );

	// No data available
	if( !data ) {
		return;
	}

	var localeData = data[ this.$scope.optionData.tableName ];

	if( !localeData || !angular.isArray( localeData ) ) {
		console.error( 'AutoLanguageInput: data missing for locale. Key is %o, data is %o', this.$scope.optionData.tableName, data );
		return;
	}


	// Loop translations. They have an id_language and
	// some other fields (translations)
	localeData.forEach( function( loc ) {

		var langId = loc.id_language;
		if( !this.$scope.locales[ langId ] ) {
			this.$scope.locales[ langId ] = {};
		}

		for( var i in loc ) {
			if( i.substring( 0, 3 ) === 'id_' ) {
				continue;
			}
			this.$scope.locales[ langId ][ i ] = loc[ i ];
		}

	}.bind( this ) );

	// Copy to originalData
	this.originalData = angular.copy( this.$scope.locales );

};






angular
.module( 'jb.backofficeAutoFormElement' )

/**
* Directive for an autoFormElement of type 'text'
*/
.directive( 'autoLanguageInput', [ function() {

	return {
		require			: [ 'autoLanguageInput', '^detailView' ]
		, controller	: 'AutoLanguageInputController'
		, link			: function( scope, element, attrs, ctrl) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		, templateUrl	: 'autoLanguageInputTemplate.html'
	};

} ] )

.controller( 'AutoLanguageInputController', AutoLanguageInputController )



.run( function( $templateCache ) {

	$templateCache.put( 'autoLanguageInputTemplate.html',
		'<div class=\'row\'>'+
			'<label data-backoffice-label></label>' +
				'<div data-locale-component class=\'col-md-9\' fields=\'fields\' data-model=\'locales\' data-entity-name=\'entityName\'>' +
			'</div>' +
		'</div>'
	);

} );








'use strict';

/**
* Automatic input for relations. Basically initiates a jb-relation-input.
*/

var AutoRelationInputController = function( $scope, $attrs, $templateCache, $compile, RelationInputService ) {

	AutoInputController.call( this, $scope, $attrs );


	// Make templateCache available to prototype methods
	this.$templateCache			= $templateCache;
	this.$compile				= $compile;




	// Set fields that need to be selected on GET call. Take suggestionTemplate and parse
	// fields from it
	var suggestionTemplate		= this.$scope.originalAttributes.suggestionTemplate;
	var selectFields			= RelationInputService.extractSelectFields( suggestionTemplate );
	this.select					= [];

	// Prefix select with entity (take it from «for» attribute)
	selectFields.forEach( function( select ) {
		this.select.push( this.$scope.originalAttributes.for + '.' + select );
	}.bind( this ) );





	// Create new scope
	this.scope					= this.$scope.$new();


	// Pass data to label directive
	// and use it to update validity
	this.scope.data				= this.$scope.data;


	// Initial data for the entity gotten from server when site was loaded: 
	// Needed to calculate differences on save
	this.originalData			= undefined;
	
	this.isMultiSelect			= this.$scope.optionData.relationType !== 'single';



	// Set valid on $scope.data (for backoffice-label)
	this.scope.$watch( 'relations', function( newValue ) {
		if( this.$scope.optionData.required && ( !newValue || newValue.length === 0 ) ) {
			this.$scope.data.valid = false;
		}
		else {
			this.$scope.data.valid = true;
		}
	}.bind( this ) );



	// Holds model
	this.scope.relations = [];




/*	this.$scope.$on( 'dataUpdate', function( ev, data ) {

		this.scope.relations = [];

		// No data provided
		if( !data[ $attrs.for ] ) {
			return;
		}
		else {
			// Fill up scope.data (model for relationInput)
			if( this.isMultiSelect ) {
				// Is already an array
				this.scope.relations = data[ $attrs.for ];
			}
			else {
				this.scope.relations.push( data[ $attrs.for ] );
			}

		}

		// Copy data to originalData
		// Is used to get changes on save()
		this.originalData = this.scope.relations.slice();

		console.log( 'AutoRelationInput: scope.data is %o', this.scope.relations );

	}.bind( this ) );
*/
};



AutoRelationInputController.prototype = Object.create( AutoInputController.prototype );
AutoRelationInputController.prototype.constructor = AutoRelationInputController;



AutoRelationInputController.prototype.updateData = function( data ) {

	this.scope.relations = [];

	// No data provided
	if( !data[ this.$attrs.for ] ) {
		console.warn( 'No data provided for %o', this.$attrs.for );
		return;
	}
	else {
		// Fill up scope.data (model for relationInput)
		if( this.isMultiSelect ) {
			// Is already an array
			this.scope.relations = data[ this.$attrs.for ];
		}
		else {
			this.scope.relations.push( data[ this.$attrs.for ] );
		}

	}

	// Copy data to originalData
	// Is used to get changes on save()
	this.originalData = this.scope.relations.slice();

	console.log( 'AutoRelationInput: scope.data is %o', this.scope.relations );

};



AutoRelationInputController.prototype.getSaveCalls = function() {

	var saveCalls;

	if( this.isMultiSelect ) {
		saveCalls = this.getMultiSelectSaveCalls();
	}
	else {
		saveCalls = this.getSingleSelectSaveCalls();
	}

	console.log( 'AutoRelationInputController: saveCalls are %o', saveCalls );
	return saveCalls;

};

AutoRelationInputController.prototype.getSingleSelectSaveCalls = function() {

	// Relations missing; happens if relations were not set on server nor changed
	// by user
	if( !this.scope.relations ) {
		console.log( 'AutoRelationInputController: relations empty' );
		return false;
	}

	// Element was removed
	if( this.scope.relations.length === 0 && this.originalData && this.originalData.length !== 0 ) {
		return {
			url			: this.$attrs.for + '/' + this.originalData[ 0 ].id
			, method	: 'DELETE'
		};
	}

	// Update
	// When scope.data[ 0 ].id != originalData[ 0 ].id 
	// Only [0] has to be checked, as it's a singleSelect
	if( this.scope.relations.length ) {
		if( !this.originalData || ( this.originalData.length && this.scope.relations[ 0 ].id !== this.originalData[ 0 ].id ) ) {
		
			var data = {};
			data[ this.$scope.optionData.relationKey ] = this.scope.relations[ 0 ].id;

			return {
				//url		: this.optionData + '/' +  // this.detailViewController.getEntityUrl() + '/' + this.$attrs.for + '/' + this.scope.relations[ 0 ].id
				url			: ''
				, data		: data
			};
	
		}
	}

	// No changes
	return false;

};


AutoRelationInputController.prototype.getMultiSelectSaveCalls = function() {

	// Deletes & posts

	// Select deleted and added elements
	var deleted		= []
		, added		= [];

	var originalIds	= []
		, newIds	= []
		, calls		= [];

	// Make arrays of objects to arrays of ids
	if( this.scope.relations && this.scope.relations.length ) {
		this.scope.relations.forEach( function( item ) {
			newIds.push( item.id );
		} );
	}
	if( this.originalData && this.originalData.length ) {
		this.originalData.forEach( function( item ) {
			originalIds.push( item.id );
		} );
	}


	// Deleted: in originalData, but not in newData
	originalIds.forEach( function( item ) {
		if( newIds.indexOf( item ) === -1 ) {
			deleted.push( item );
			calls.push( {
				method			: 'DELETE'
				, url			: this.$attrs.for + '/' + item
			} );
		}
	}.bind( this ) );

	// Added: in newData, but not in originalData
	newIds.forEach( function( item ) {
		if( originalIds.indexOf( item ) === -1 ) {
			added.push( item );
			calls.push( {
				method		: 'POST'
				, url		: this.$attrs.for + '/' + item
			} );
		}
	}.bind( this ) );

	console.log( 'AutoRelationInput: Added %o, deleted %o – calls: %o', added, deleted, calls );

	if( calls.length === 0 ) {
		return false;
	}

	return calls;

};




// When all data is available, update element
AutoRelationInputController.prototype.afterInit = function() {

	// Add directive to current Element
	var tpl = $( this.$templateCache.get( 'autoRelationInputTemplate.html' ) );

	// Add required attributes to new element; must be done in js to render
	// element correctly
	tpl.find( '[data-relation-input]' )
		.attr( 'data-relation-entity-endpoint', this.$scope.optionData.relation )
		.attr( 'data-relation-entity-search-field', this.$scope.originalAttributes.suggestionSearchField )
		// Append template _after_ compiling the code – or {{ result.name }} etc. will be compiled :-)
		.attr( 'data-relation-suggestion-template', this.$scope.originalAttributes.suggestionTemplate )
		.attr( 'data-multi-select', this.isMultiSelect );

	this.element.append( tpl );
	this.$compile( tpl )( this.scope );




};







angular
.module( 'jb.backofficeAutoFormElement' )
.directive( 'autoRelationInput', [ function() {

	return {
		require			: [ 'autoRelationInput', '^^detailView' ]
		, controller	: 'AutoRelationInputController'
		, link			: function( scope, element, attrs, ctrl ) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		, scope			: true
	};

} ] )



.controller( 'AutoRelationInputController', AutoRelationInputController )



.run( function( $templateCache ) {

	$templateCache.put( 'autoRelationInputTemplate.html',
		'<div class=\'form-group\'>' +
			'<label data-backoffice-label></label>' +
			'<div data-relation-input ' +
				'class=\'relation-select col-md-9\'' +
				'data-ng-model=\'relations\'' +
				// deletable: true if the relations may be deleted.
				// belongsTo relations may only be deleted from original element (hasOne)
				'data-deletable=\'optionData.originalRelation != "belongsTo"\'>' +
			'</div>' +
		'</div>'
	);

} );



'use strict';

/**
* Auto text input. Inherits from AutoInput. Contains description for options passed.
*/

/**
* - Define function
* - Call AutoInputController.call()
* - Set prototype to Object.create(AutoInputController)
* - Set constructor to self.prototype
* - Register as angular controller
*
* - setData	         : Is called when data is received in DetailView
* - getSaveCalls     : Is called when user tries to save data. Return object with
*                      url, headers and data properties
* - select           : Is selected in getData call
*/
var AutoTextInputController = function( $scope, $attrs ) {

	AutoInputController.call( this, $scope, $attrs );

	// Set select to this field's for attribute
	// (that corresponds to data.name)
	this.select = this.$scope.data.name;

	this._validateInput();

};

AutoTextInputController.prototype = Object.create( AutoInputController.prototype );
AutoTextInputController.prototype.constructor = AutoTextInputController;


AutoTextInputController.prototype.updateData = function( data ) {
	this.originalData = this.$scope.data.value = data[ this.$attrs.for ];
};

AutoTextInputController.prototype.getSaveCalls = function() {

	if( this.originalData === this.$scope.data.value ) {
		return false;
	}

	var data = {};
	data[ this.$scope.data.name ] = this.$scope.data.value;
	return {
		url			: ''
		, data		: data
		, method	: this.detailViewController.getEntityId() === undefined ? 'POST' : 'PATCH'
	};
	
};

AutoTextInputController.prototype._validateInput = function() {

	// Update validity for label
	this.$scope.$watch( 'data.value', function( newValue ) {
		if( this.$scope.optionData.required && !newValue ) {
			this.$scope.data.valid = false;
		}
		else {
			this.$scope.data.valid = true;
		}
	}.bind( this ) );

};







angular
.module( 'jb.backofficeAutoFormElement' )

.controller( 'AutoTextInputController', AutoTextInputController )

/**
* Directive for an autoFormElement of type 'text'
*/
.directive( 'autoTextInput', [ function() {

	return {
		link			: function( scope, element, attrs, ctrl ) {
			ctrl[ 1 ].init( element, ctrl[ 0 ] );
		}
		, controller	: 'AutoTextInputController'
		, require		: [ '^detailView', 'autoTextInput' ]
		, templateUrl	: 'autoTextInputTemplate.html'
	};

} ] )



.run( function( $templateCache ) {

	$templateCache.put( 'autoTextInputTemplate.html',
		'<div class=\'form-group form-group-sm\'>' +
			'<label data-backoffice-label></label>' +
			'<div class=\'col-md-9\'>' +
				'<input type=\'text\' data-ng-attr-id=\'{{ entityName }}-{{ data.name }}-label\' class=\'form-control input-sm\' data-ng-attrs-required=\'isRequired()\' data-ng-model=\'data.value\'/>' +
			'</div>' +
		'</div>'
	);

} );
angular
.module( 'jb.backofficeAutoFormElement' )

.directive( 'backofficeLabel', [ '$templateCache', '$compile', function( $templateCache, $compile ) {
	return {
		link				: function( $scope, element, attrs ) {

			var scope	= $scope.$new()
				, tpl	= $( $templateCache.get( 'backofficeLabelTemplate.html' ) );

			scope.valid = scope.required = scope.name = scope.entityName = undefined;


			$scope.$watch( 'data', function( newValue ) {

				if( !newValue ) {
					scope.valid = scope.name = undefined;
					return;
				}

				scope.valid		= newValue.valid;
				scope.name		= newValue.name;
			}, true );

			$scope.$watch( 'entityName', function( newValue ) {
				scope.entityName = newValue;
			} );

			$scope.$watch( 'optionData.required', function( newValue ) {
				scope.required = newValue;
			} );

			element.replaceWith( tpl );
			$compile( tpl )( scope );

		}
	};
} ] )

.run( function( $templateCache ) {
	$templateCache.put( 'backofficeLabelTemplate.html',
		'<label class=\'control-label col-md-3\' data-ng-class=\'{invalid: !valid}\'>' +
			'<span data-ng-if=\'required\' class=\'required-indicator \'>*</span>' +
			'<span data-translate=\'web.backoffice.{{ entityName }}.{{ name }}\'></span>' +
		'</label>'
	);
} );
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
/**
* Loads detail view template and controller that correspond to the current URL
* Then compiles them into the current element
* Loaded in $routeProvider
*/
angular
.module( 'jb.backofficeDetailView' )
.controller( 'DetailViewLoaderController', [ '$scope', '$location', '$http', '$q', '$compile', function( $scope, $location, $http, $q, $compile ) {


	var self = this;


	// Get entity & id from path
	var path			= $location.path()
		, pathParts		= path.split( '/' );

	// Path missing
	if( !pathParts.length ) {
		alert( 'no path provided' );
		return;
	}

	var entityName		= pathParts[ 1 ]
		, entityId		= pathParts[ 2 ];

	console.log( 'DetailViewLoader: entity name is %o, id %o', entityName, entityId );



	/**
	* Generate controller's name and template URL from current url
	*/
	self.getControllerAndTemplate = function( entityName, entityId ) {
		
		// EntityName is missing
		if( !entityName ) {
			return false;
		}

		// camel-case instead of camelCase
		var entityDashed		= entityName.replace( /[A-Z]/g, function( match ) { return '-' + match.toLowerCase(); } )
			, templateBasePath	= 'src/app/' + entityDashed + '/'
			, templatePath
			, controllerName;

		// List
		if( !entityId ) {
			controllerName	= 'ebBackoffice' + entityName.substring( 0, 1 ).toUpperCase() + entityName.substring( 1 ) + 'ListCtrl';
			templatePath	= templateBasePath + entityDashed + '-list.tpl.html';
		}


		// New or Edit (same template)
		else if( entityId ==='new' || !isNaN( parseInt( entityId, 10 ) ) ) {
			templatePath	= templateBasePath + entityDashed + '-detail.tpl.html';
		}

		// Id is not 'new' nor a number
		else {
			console.error( 'unknown entity id: %o', entityId );
		}

		return {
			controllerName		: controllerName
			, templateUrl		: templatePath
		};

	};


	/**
	* Gets template from server, returns promise
	*/
	self.getTemplate = function( templateUrl ) {
		return $http( { method: 'GET', url: templateUrl,  headers: { 'accept': 'text/html' } } )
			.then( function( data ) {
				console.log( 'DetailViewLoader: got template %o', data );
				return data.data;
			}, function( err ) {
				return $q.reject( err );
			} );
	};


	/**
	* Attachs template and controller to [ng-view], renders it 
	*/
	self.renderTemplate = function( template, controllerName) {
		
		var ngView		= $( '[ng-view], [data-ng-view]' );

		// Create parent that holds controller
		var parent		= $( '<div></div>' );
		if( controllerName ) {
			parent.attr( 'data-ng-controller', controllerName );
		}
		parent.html( template );

		console.log( 'DetailViewLoader: render Template %o with controller %o', parent, controllerName );

		ngView
			.empty()
			.append( parent );

		$compile( parent )( $scope );

	};



	/**
	* Gets the template and controller to be rendered, and does so.
	*/
	self.init = function() {
	
		var controllerAndTemplate = self.getControllerAndTemplate( entityName, entityId );

		// Entity was not available, getControllerAndTemplate returned false.
		if( !controllerAndTemplate ) {
			self.renderTemplate( '404 – Page could not be found', false );
			return;
		}


		// Everything fine
		var templateUrl			= controllerAndTemplate.templateUrl
			, controllerName	= controllerAndTemplate.controllerName;

		self.getTemplate( templateUrl )
			.then( function( data ) {
				self.renderTemplate( data, controllerName );
			}, function( err ) {

				var ngView		= $( '[ng-view], [data-ng-view]' );
				ngView.text( 'Template ' + templateUrl + ' not found. Entity can\'t be edited' );

			} );

	};


	self.init();




} ] );
/**
* Hidden input. Used to 
* - add select statements to detailView (use for attribute)
* - store hidden fields in detailView
*/

'use strict';


angular
.module( 'jb.backofficeHiddenInput', [] )

/**
* Directive for an autoFormElement of type 'text'
*/
.directive( 'hiddenInput', [ function() {

	return {
		require			: [ 'hiddenInput', '^detailView' ]
		, controller	: 'HiddenInputController'
		, link			: function( scope, element, attrs, ctrl) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		, scope			: true
	};

} ] )

.controller( 'HiddenInputController', [ '$scope', '$attrs', function( $scope, $attrs ) {

	var self			= this
		, element
		, detailViewController;

	self.init = function( el, detViewCtrl ) {

		element = el;
		detailViewController = detViewCtrl;

		// Register myself at detailViewController
		detailViewController.register( self );

	};

	// Purpose 1: let user select any field passed through for
	self.select = $attrs.for;

	// Purpose 2: Store hidden values
	self.getSaveCalls = function() {

		console.log( 'HiddenInput: Get save calls; $attrs is %o', $attrs.data );

		if( $attrs.data ) {

			var saveData = {};
			saveData[ $attrs.for ] = $attrs.data;

			console.log( 'HiddenInput: Store data %o', saveData );

			return {
				url			: ''
				, data		: saveData
				// Method: PATCH if entity already has an ID, else POST
				, method	: detailViewController.getEntityId() ? 'PATCH' : 'POST'
			};
		}

		return false;

	};


} ] );



/*.run( function( $templateCache ) {

	$templateCache.put( 'hiddenInputTemplate.html',
		'<div class=\'form-group form-group-sm\'>' +
			'<label data-backoffice-label></label>' +
			'<div class=\'col-md-9\'>' +
				'<input type=\'text\' data-ng-attr-id=\'{{ entityName }}-{{ data.name }}-label\' class=\'form-control input-sm\' data-ng-attrs-required=\'isRequired()\' data-ng-model=\'data.value\'/>' +
			'</div>' +
		'</div>'
	);

} );*/
angular
.module( 'jb.imageComponent', [] )
.directive( 'imageComponent', [ function() {
	return {
		link				: function( scope, element, attrs, ctrl ) {
			ctrl.init( element );
		}
		, controller		: 'ImageComponentController'
		, scope				: {
			// Holds images: 
			// Existing ones with originUrl etc
			// New ones with file (js File) and fileData (FileReader.target.result)
			images			: '='
		}
		, templateUrl		: 'imageComponentTemplate.html'
	};
} ] )

.controller( 'ImageComponentController', [ '$scope', '$rootScope', function( $scope, $rootScope ) {

	var self = this
		, element;

	self.init = function( el ) {
		element = el;
		self.addEventListeners();
	};


	//
	// Active
	//

	$scope.active = undefined;
	$scope.toggleActive = function( image ) {
		if( image === $scope.active ) {
			$scope.active = undefined;
			return;
		}
		$scope.active = image;
	};





	//
	// New Files
	//
	$scope.addedImages = [];


	//
	// Remove
	//

	$scope.removeImage = function( ev, image ) {
		ev.stopPropagation();
		ev.preventDefault();
		$scope.images.splice( $scope.images.indexOf( image ), 1 );
	};




	//
	// Events (Drag/drop)
	// 

	self.addEventListeners = function() {

		// D'n'D
		addDragDropListeners();

		// Click (old school)
		addFileUploadClickListener();

	};



	/**
	* Handles click on «add» button (propagates to the file input) for strange people
	* not knowing d'n'd.
	*/
	$scope.showFileSelectDialog = function( ev ) {
		
		ev.preventDefault();
		element
			.find( 'input[type=\'file\']' )
			.click();

	};


	/**
	* User clicks «add» on file dialog
	*/
	function addFileUploadClickListener() {
		element
			.find( 'input[type=\'file\']' )
			.change( function( ev ) {
				
				handleFiles( ev.target.files );

			} );
	}


	/**
	* Handles drop
	*/
	function addDragDropListeners() {

		element
			.bind( 'drop', function( ev ) {
				ev.preventDefault();

				var files = ev.originalEvent.dataTransfer.files;
				handleFiles( files );

				return false;
			} )
			.bind( 'dragover', dragOverHandler )
			.bind( 'dragenter', dragOverHandler );
	}



	/**
	* Handles drag-over and enter
	*/
	function dragOverHandler( ev ) {
		ev.preventDefault();
		ev.originalEvent.dataTransfer.effectAllowed = 'copy';
		return false;
	}



	/**
	* Returns true if file type is supported 
	*/
	function checkFileType( file ) {
		var acceptedFileTypes = [ 'image/jpeg', 'image/png', 'image/gif' ];
		if( acceptedFileTypes.indexOf( file.type ) === -1 ) {
			return false;
		}
		return true;
	}



	/**
	* Handles files (checks type, stores them)
	*/
	function handleFiles( files ) {

		// Check file type
		var validFiles = [];
		for( var i = files.length - 1; i >= 0; i-- ) {

			if( !checkFileType( files[ i ] ) ) {
				$scope.$apply( function() {
					$rootScope.$broadcast( 'notification', {
						'type'			: 'error'
						, 'message'		: 'web.backoffice.detail.imageTypeNotSupported'
						, 'variables'	: {
							'fileName'	: files[ i ].name
							, 'fileType': files[ i ].type
						}
					} );
				} );
			}
			else {
				validFiles.push( files[ i ] );
			}
		}


		// Read file, add them to $scope (through addImage)
		for( var n = 0; n < validFiles.length; n++ ) {

			( function() {
				var validFile = validFiles[ n ];
				var fileReader = new FileReader();
				fileReader.onload = function( loadEv ) {
					addImage( loadEv.target.result, validFile );
				};
				fileReader.readAsDataURL( validFile );
			} )();

		}

	}


	/**
	* Adds an image to $scope.addedImages
	*/
	function addImage( img, file ) {
		$scope.$apply( function() {
			$scope.images.push( {
				file		: file
				, fileData	: img
			} );
		} );
	}



} ] )

.run( function( $templateCache ) {
	$templateCache.put( 'imageComponentTemplate.html',
		'<ul class=\'clearfix image-component\'>' +
			'<li><button class=\'add\' data-ng-click=\'showFileSelectDialog($event)\'>{{ \'web.backoffice.detail.imageDropZone\' | translate }}</button><input type=\'file\' multiple/></li>' +
			'<li data-ng-repeat=\'image in images\' data-ng-click=\'toggleActive(image)\' data-ng-class=\'{active: active===image}\'><img data-ng-attr-src=\'{{image.fileData}}\' data-ng-if=\'image.fileData\'/><img data-ng-attr-src=\'{{image.bucket.url}}{{image.url}}\' data-ng-if=\'image.url\'/><button class=\'remove\' data-ng-click=\'removeImage($event,image)\'>&times</button></li>' +
		'</ul>'
	);
} );
/**
* Directive for locales
*/

angular
.module( 'jb.localeComponent', [ 'eb.apiWrapper'] )
.directive( 'localeComponent', [ function() {

	return {
		link				: function( scope, element, attrs, ctrl ) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		, controller		: 'LocaleComponentController'
		, require			: [ 'localeComponent' ]
		, templateUrl		: 'localeComponentTemplate.html'
		, scope				: {
			fields			: '='
			, model			: '='
			, entityName	: '=' // For translation
		}
	};

} ] )

.controller( 'LocaleComponentController', [ '$scope', 'APIWrapperService', function( $scope, APIWrapperService ) {

	var self = this
		, element;

	// Array with 
	// {
	//	id		: 1
	//	, code	: 'de'
	//	}
	$scope.languages			= [];
	// Array with languageIds
	$scope.selectedLanguages	= [];


	$scope.$watch( 'selectedLanguages', function( newValue ) {

		// Don't divide by 0
		if( newValue.length === 0 ) {
			return;
		}
		var colWidth = Math.floor( 100 / newValue.length  ) + '%';
		element.find( '.locale-col' ).css( 'width', colWidth );

	}, true );



	/**
	* Adjusts height of textareas (functionality's very basic. very.)
	*/
	$scope.adjustHeight = function( ev ) {
		self.adjustHeight( $( ev.currentTarget ) );
	};


	self.adjustHeightOfAllAreas = function() {
		element.find( 'textarea' ).each( function() {
			self.adjustHeight( $( this ) );
		} );
	};


	self.adjustHeight = function( element ) {

		var textarea = element;

		var copy			= $( document.createElement( 'div' ) )
			, properties	= [ 'font-size', 'font-family', 'font-weight', 'lineHeight', 'width', 'padding-top', 'padding-left', 'padding-right' ];

		properties.forEach( function( prop ) {
			copy.css( prop, textarea.css( prop ) );
		} );

		copy
			.css( 'position', 'relative' )
			.css( 'top', '-10000px' )
			.text( textarea.val() )
			.appendTo( 'body' );

		var h = Math.min( copy.height(), 200 );

		copy.remove();
		textarea.height( Math.max( h, parseInt( textarea.css( 'lineHeight'), 10 ) ) );

	};




	self.toggleLanguage = function( lang ) {

		// Don't untoggle last language
		if( $scope.selectedLanguages.length === 1 && $scope.selectedLanguages[ 0 ] === lang ) {
		//	return;
		}

		// Add/remove language to $scope.selectedLanguages
		var idx = $scope.selectedLanguages.indexOf( lang );
		if( idx > -1 ) {
			$scope.selectedLanguages.splice( idx, 1 );
		}
		else {
			$scope.selectedLanguages.push( lang );
		}

		// Update height of all areas. All may have changed 
		// as the width has changed with the toggling of 
		// a textarea
		setTimeout( function() {
			self.adjustHeightOfAllAreas( $( this ) );
		}.bind( this ), 100 );



	};



	/**
	* Toggles language (if user clicks language in nav-tab): 
	* Adds/removes it from selectedLanguages
	*/
	$scope.toggleLanguage = function( ev, lang ) {

		ev.preventDefault();
		self.toggleLanguage( lang );

	};

	$scope.isSelected = function( id ) {
		return $scope.selectedLanguages.indexOf( id ) > -1;
	};



	/**
	* Returns true if a certain language has at least one translation
	*/
	$scope.hasTranslation = function( langId ) {
		
		if( !$scope.model[ langId ] ) {
			return false;
		}

		var propertyCount = 0;
		for( var i in $scope.model[ langId ] ) {
			if( $scope.model[ langId ][ i ] ) {
				propertyCount++;
			}
		}

		return propertyCount > 0;

	};


	self.init = function( el, mCtrl ) {
		element = el;

		// Adjust height of textareas
		setTimeout( function() {
			self.adjustHeightOfAllAreas();
		}, 1000 );

	};

	self.getLanguages = function() {
		APIWrapperService.request( {
			url			: '/language'
			, method	: 'GET'
		} )
		.then( function( data ) {

			// Put languages to $scope.languages
			data.forEach( function( lang ) {

				// Set one selected
				if( $scope.selectedLanguages.length === 0 ) {
					self.toggleLanguage( lang.id );
				}

				$scope.languages.push( {
					id		: lang.id
					, code	: lang.code
				} );
			} );

		}, function( err ) {
			$rootScope.$broadcast( 'notification', { type: 'error', message: 'web.backoffice.detail.loadingError', variables: { errorMessage: err } } );
		} );
	};

	self.getLanguages();

} ] )

.run( function( $templateCache ) {

	$templateCache.put( 'localeComponentTemplate.html',
		'<div class=\'locale-component\'>' +
			'<ul class=\'nav nav-tabs\'>' +
				'<li data-ng-repeat=\'lang in languages\' data-ng-class=\'{active:isSelected(lang.id)}\'>' +
					'<a href=\'#\' data-ng-click=\'toggleLanguage($event,lang.id)\'>' +
						'{{lang.code|uppercase}}' +
						' <span data-ng-if=\'hasTranslation(lang.id)\' class=\'fa fa-check\'></span>' +
					'</a>' +
				'</li>' +
			'</ul>' +
			'<div class=\'locale-content clearfix\'>' +
				'<div class=\'locale-col\' data-ng-repeat=\'lang in languages\' data-ng-show=\'isSelected( lang.id )\'>' +
					'<p>{{ lang.code | uppercase }}</p>' +
					'<div data-ng-repeat=\'field in fields\'>' +
						'<label data-translate=\'web.backoffice.{{entityName}}.{{field}}\' data-ng-attr-for=\'locale-{{lang.id}}-{{field}}\'></label>' +
						'<textarea data-ng-model=\'model[ lang.id ][ field ]\' data-ng-attr-id=\'locale-{{lang.id}}-{{field}}\' class=\'form-control\' data-ng-keyup=\'adjustHeight( $event )\' data-ng-focus=\'adjustHeight( $event )\' /></textarea>' +
					'</div>' +
				'</div>' +
			'</div>' +
		'</div>'
	);

} );
angular
.module( 'jb.relationInput', [ 'eb.apiWrapper' ] )
.directive( 'relationInput', [ function() {

	return {
		require				: [ 'relationInput', 'ngModel' ]
		, controller		: 'RelationInputController'
		, link				: function( scope, element, attrs, ctrl ) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		, scope				: {}
		, templateUrl		: 'relationInputTemplate.html'
	};

} ] )

.controller( 'RelationInputController', [ '$scope', '$attrs', '$q', '$rootScope', 'APIWrapperService', function( $scope, $attrs, $q, $rootScope, APIWrapperService ) {

	var self		= this
		, element
		, modelCtrl
		, open		= false;

	var eventNamespace = ( Math.random() + '' ).replace( '.', '' ).substring( 1, 15 );

	// URL to get suggestions from
	self.entityUrl				= $attrs.relationEntityEndpoint;

	// Variables for suggestion: 
	// - what fields do we search?
	self.searchField			= $attrs.relationEntitySearchField;

	// Template for search results
	self.searchResultTemplate	= $attrs.relationSuggestionTemplate;

	self.isMultiSelect			= $attrs.multiSelect === 'true' ? true : false;

	// May the relations be deleted?
	$scope.deletable			= $scope.$parent.$eval( $attrs.deletable );



	// Check if all fields are provided
	var requiredFields = [ 'entityUrl', 'searchResultTemplate', 'searchField' ];
	requiredFields.forEach( function( requiredField ) {
		if( !self[ requiredField ] ) {
			console.error( 'RealtinInput: Missing %s, is mandatory', requiredField );
		}
	} );

	// Make URLs public for «edit» and «new» buttons
	$scope.newEntityUrl		= self.entityUrl;



	// Make ngModel available to templates
	// -> one way binding
	$scope.entities		= undefined;

	$scope.$watch( function() {
		return modelCtrl.$modelValue;
	}, function( newValue ) {
		//console.log( 'RelationInput: entites for selected is %o', newValue );
		$scope.entities			= newValue;
	} );






	//
	// Init
	//

	self.init = function( el, model ) {
		element		= el;
		modelCtrl	= model;
		console.log( 'RelationInput: model is %o on init', model );
	};








	//
	// Change of entities (entities were added or removed)
	// -> Update model
	//

	// Make modelValue available to UI so that 
	// selected-entities can display the selected entities
	// But keep in self so that child directives may access it
	//self.entities = $scope.entities = [];


	self.addRelation = function( entity ) {

		// Update entities (will be displayed in selected-entities)

		// Update model
		if( !self.isMultiSelect ) {
			modelCtrl.$setViewValue( [ entity ] );
		}
		else {
			var currentData = ( modelCtrl.$modelValue && angular.isArray( modelCtrl.$modelValue ) ) ? modelCtrl.$modelValue.slice() : [];
			currentData.push( entity );
			modelCtrl.$setViewValue( currentData );
		}

		$scope.$broadcast( 'entitiesUpdated', $scope.entities );

	};


	self.removeRelation = function( entity ) {

		if( self.isMultiSelect ) {
			var originalData = modelCtrl.$modelValue;
			originalData.splice( originalData.indexOf( entity ), 1 );
			modelCtrl.$setViewValue( originalData );
		}
		else {
			modelCtrl.$setViewValue( [] );
		}

		$scope.$broadcast( 'entitiesUpdated', $scope.entities );

	};











	//
	// Select fields
	//





	//
	// Open?
	//
	self.isOpen = function() {
		// If we're open, remove the input field that catches the focus or the
		// user may not go one input field back (shift-tab)
		var focusInput = element.find( '.selected-entities input' );
		if( open ) {
			focusInput.hide();
			setupDocumentClickHandler();
		}
		else {
			focusInput.show();
			removeDocumentClickHandler();
		}
		return open;
	};






	// 
	// Event Listeners
	//

	// Watch for events, called from within init
	self.setupEventListeners = function() {

		// Open & close: 
		// Watch for events here (instead of suggestion), as most events happen
		// on this directive's element (and not the one of suggestion)

		$scope.$on( 'relationInputFieldFocus', function() {
			$scope.$apply( function() {
				open = true;
			} );
		} );

		$scope.$on( 'relationInputSelectedEntitiesClick', function() {
			$scope.$apply( function() {
				open = !open;
			} );
		} );

		setupInputBlurHandler();

	};





	/**
	* Blur on the input: Hide after some ms (that are needed for a click handler to fire first)
	*/
	function setupInputBlurHandler() {
		element.find( '.entity-suggestions input' ).blur( function( ev ) {
			setTimeout( function() {
				$scope.$apply( function() {
					open = false;
				} );
			}, 100 );
		} );
	}

	/**
	* Click on document: Is element.entity-suggestions above the element that was clicked?
	* If not, close
	*/
	function setupDocumentClickHandler() {
		$( document ).on( 'click.' + eventNamespace, function( ev ) {

			// Clicked selectedEntities: Is handled in setupSelectedClickHandler
			if( $( ev.target ).closest( element.find( '.selected-entities' ) ).length > 0 ) {
				return;
			}

			if( $( ev.target ).closest( element.find( '.entity-suggestions') ).length === 0 ) {
				$scope.$apply( function() {
					open = false;
				} );
			}
		} );
	}

	/**
	* Remove document.click handler
	*/
	function removeDocumentClickHandler() {
		$( document ).off( 'click.' + eventNamespace );
	}

} ] )



.run( function( $templateCache ) {

	$templateCache.put( 'relationInputTemplate.html',
		'<div data-relation-input-selected-entities></div>' +
		'<div data-relation-input-suggestions></div>' +
		'<div clearfix>' +
			'<a data-ng-attr-href=\'/#{{ newEntityUrl }}/new\'=\'#\'><span class=\'fa fa-plus\'></span> New</a>' +
		'</div>'
	);

} )






.directive( 'relationInputSuggestions', [ function() {

	return {
		require			: [ 'relationInputSuggestions', '^relationInput' ]
		, link			: function( scope, element, attrs, ctrl ) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		, controller	: 'RelationInputSuggestionsController'
		, replace		: true
	};

} ] )

.controller( 'RelationInputSuggestionsController', [ '$scope', '$rootScope', '$compile', '$templateCache', 'APIWrapperService', 'RelationInputService', function( $scope, $rootScope, $compile, $templateCache, APIWrapperService, RelationInputService ) {

	var self = this
		, element
		, relationInputController;


	// List of results gotten for searchQuery
	$scope.results		= [];

	// Result selected by cursors (but not yet added)
	$scope.selected		= undefined;

	// Are we requesting data from the server currently?
	// (If yes, display loading indicator)
	$scope.loading		= false;



	//
	// Seach query
	//

	$scope.searchQuery	= undefined;

	$scope.$watch( 'searchQuery', function( newValue ) {
		self.getData( newValue );
	} );



	//
	// Click on result or enter
	//

	$scope.selectResult = function( result ) {

		// Propagate to relationInputController that updates the model
		relationInputController.addRelation( result );

		$scope.results			= [];
		$scope.searchQuery		= '';

	};






	//
	// Model changed
	//

	// Entites updated (propagated from relationInput)
	// Update results displayed (remove added result from suggestions)
	$scope.$on( 'entitiesUpdated', function() {
		self.filterResults();
	} );






	//
	// Init
	//

	self.init = function( el, relInputCtrl ) {
		element = el;
		relationInputController = relInputCtrl;
		self.renderTemplate();
		self.setupEventListeners();
	};





	//
	// Open?
	//

	/**
	* Returns true if suggestions should be displayed; sets focus on input
	*/
	$scope.isOpen = function() {
		var open = relationInputController.isOpen();
		if( open ) {
			setTimeout( function() {
				element.find( 'input' ).focus();
			}, 100 );
		}
		return open;
	};







	//
	// Render Template
	// (don't use templateUrl as we need to insert searchResultTemplate)
	//

	self.renderTemplate = function() {

		// resultTemplate: replace [ name ] with {{ result.name }}
		// We can't use {{}} when template is passed, as it will be rendered and {{}} will be removed
		// if we have to $compile the code first (see autoRelationInputDirecitve)
		var resultTpl = relationInputController.searchResultTemplate;
		resultTpl = resultTpl.replace( /\[\[(\s*)(((?!\]\]).)*)\]\]/gi, function( res, space, name ) {
			return '{{ result.' + name + ' }}';
		} );

		var tpl = $( $templateCache.get( 'relationInputSuggestionsTemplate.html' ) );
		tpl.find( 'li' ).append( resultTpl );
		element.replaceWith( tpl );
		$compile( tpl )( $scope );
		element = tpl;

	};





	//
	// Event Handlers
	//

	self.setupEventListeners = function() {

		// If we use keyup, enter will only fire once (wtf?)

		element.find( 'input' ).keydown( function( ev ) {

			if( [ 40, 38, 13 ].indexOf( ev.which ) === -1 ) {
				return;
			}

			$scope.$apply( function() {

				switch( ev.which ) {
					// Down
					case 40:
						self.updateSelected( ev, 1 );
						break;
					// Up
					case 38:
						self.updateSelected( ev, -1 );
						break;
					// Enter
					case 13:
						self.addSelected( ev );
						break;
				}

			} );

		} );

	};


	// Up or down arrow
	self.updateSelected = function( ev, direction ) {

		ev.preventDefault();

		var currentIndex;
		for( var i = 0; i < $scope.results.length; i++ ) {
			if( $scope.results[ i ] === $scope.selected ) {
				currentIndex = i;
			}
		}

		if( currentIndex === undefined || ( direction === -1 && currentIndex === 0 ) || ( direction === 1 && currentIndex === $scope.results.length - 1 ) ) {
			return;
		}

		$scope.selected = $scope.results[ currentIndex + direction ];

	};

	// User presses enter
	self.addSelected = function( ev ) {
		
		ev.preventDefault();
		if( !$scope.selected ) {
			return;
		}
		$scope.selectResult( $scope.selected );

	};









	//
	// Get Data
	//

	self.getData = function( query ) {

		$scope.results = [];

		if( !query ) {
			return;
		}

		$scope.loading = true;

		var filterField			= relationInputController.searchField
			, filter			= filterField + '=like(\'%' + query + '%\')'
			, selectFields		= self.getSelectFields();

		console.log( 'RelationInput: request %s:%s, filter %o, select %o', relationInputController.entityUrl, filter, selectFields.join( ',' ) );

		APIWrapperService.request( {
			url				: relationInputController.entityUrl
			, method		: 'GET'
			, headers		: {
				filter		: filter
				, select	: selectFields.join( ',' )
				, range		: '0-10'
			}
		} )
		.then( function( data ) {
			$scope.loading	= false;
			$scope.results = data;
			self.filterResults();
			/*if( $scope.results.length > 0 ) {
				$scope.selected = $scope.results[ 0 ];
			}*/
		}, function( err ) {
			$scope.loading	= false;
			$rootScope.$broadcast( 'notification', { type: 'error', message: 'web.backoffice.detail.loadingError', variables: { errorMessage: err } } );
		} );

	};



	/**
	* Get select fields from <li>'s content
	*/
	self.getSelectFields = function() {

		var tpl = relationInputController.searchResultTemplate;

		if( !tpl ) {
			console.error( 'RelationInput: Missing searchResultTemplate in %o', self );
		}

		// Use service for template parsing (functionality is shared with selected entities controller)
		return RelationInputService.extractSelectFields( tpl );

	};









	/**
	* Updates $scope.results: Removes all entities that are already selected
	* Then updates selected (as it may have been removed)
	*/
	self.filterResults = function() {

		var selected = relationInputController.entities;

		if( relationInputController.isMultiRelation ) {
			for( var i = 0; i < selected.length; i++ ) {
				for( var j = $scope.results.length - 1; j >= 0; j-- ) {

					// id missing
					if( !$scope.results[ j ].id || !selected[ i ].id ) {
						continue;
					}

					if( $scope.results[ j ].id === selected[ i ].id ) {
						$scope.results.splice( j, 1 );
					}
				}
			}
		}
		else {

		}

		if( $scope.results.length > 0 ) {
			$scope.selected = $scope.results[ 0 ];
		}

		console.log( 'RelationInput: filterResults; results is %o, selected %o', $scope.results, $scope.selected );

	};

} ] )


.run( function( $templateCache ) {

	$templateCache.put( 'relationInputSuggestionsTemplate.html',
		'<div class=\'entity-suggestions\' data-ng-show=\'isOpen()\'>' +
			'<input type=\'text\' class=\'form-control\' data-ng-model=\'searchQuery\' />' +
			'<div class=\'progress progress-striped active\' data-ng-if=\'loading\'>' +
				'<div class=\'progress-bar\' role=\'progressbar\' style=\'width:100%\'></div>' +
			'</div>' +
			'<div class=\'results-list\'>' +
				'<ul data-ng-if=\'results.length > 0\'>' +
					'<li data-ng-repeat=\'result in results\' data-ng-class=\'{selected:selected===result}\' data-ng-click=\'selectResult(result)\'><!-- see renderTemplate --></li>' +
				'</ul>' +
			'</div>' +
		'</div>'
	);

} )







.directive( 'relationInputSelectedEntities', [ function() {
	return {
		link			: function( scope, element, attrs, ctrl ) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		, controller	: 'RelationInputSelectedEntitiesController'
		, require		: [ 'relationInputSelectedEntities', '^relationInput' ]
		, templateUrl	: 'relationInputSelectedEntitiesTemplate.html'
		, replace		: true
	};
} ] )


.controller( 'RelationInputSelectedEntitiesController', [ '$scope', '$location', '$templateCache', '$compile', function( $scope, $location, $templateCache, $compile ) {

	var self = this
		, element
		, relationInputController;


	$scope.visitEntity = function( ev, entity ) {
		ev.preventDefault();
		$location.path( $scope.newEntityUrl + '/' + entity.id );
	};


	$scope.removeEntity = function( ev, entity ) {
		ev.preventDefault();
		relationInputController.removeRelation( entity );
	};

	self.init = function( el, relInputCtrl ) {

		element						= el;
		relationInputController		= relInputCtrl;

		// eventListener of relationInput looks for events happening in this directive
		// therefore wait with setting them up until this directive is ready and it's template
		// is rendered
		relationInputController.setupEventListeners();
		$scope.isMultiSelect = relationInputController.isMultiSelect;

		self.renderTemplate();
		self.setupEventListeners();

	};

	self.renderTemplate = function() {

		// See renderTemplate in relationInputSuggestionsController
		var resultTpl = relationInputController.searchResultTemplate;
		resultTpl = resultTpl.replace( /\[\[(\s*)(((?!\]\]).)*)\]\]/gi, function( res, space, name ) {
			return '{{ result.' + name + ' }}';
		} );

		var tpl = $( $templateCache.get( 'relationInputSelectedEntitiesTemplate.html' ) );
		tpl.find( 'li > span' ).append( resultTpl );
		element.replaceWith( tpl );
		$compile( tpl )( $scope );
		element = tpl;

	};


	/**
	* Listens to focus, blur and click events, propagates them (to RelationInputController). 
	* They can't be listened to directly in the RelationInputController, as renderTemplate() is called
	* _after_ the eventListener setup function of RelationInputController
	*/
	self.setupEventListeners = function() {

		// Focus on (hidden) input: Show suggestions
		element.find( 'input' ).focus( function() {
				$scope.$emit( 'relationInputFieldFocus' );
			} );

		// Click on element
		element.click( function() {
			$scope.$emit( 'relationInputSelectedEntitiesClick' );
		} );

	};



} ] )



/**
* Small services that need to be accessible from all directives/controllers
*/
.factory( 'RelationInputService', [ function() {

	return {

		/**
		* Extracts select header fields from a template that is used for
		* - the suggestions
		* - the selected entities
		* Template uses syntax like [[ select[0].subselect | filter ]] (basically replaces
		* the angular {{ brackets with [[ )
		*
		* @return <Array>		Array of fields to be selected on GET call (as string)
		*/
		extractSelectFields: function( template ) {
		
			console.log( 'RelationInputService: Get fields from %o', template );

			// Split at [ 
			var tplSplit		= template.split( '[[' ).slice( 1 )
			// Fields to select (e.g. 'eventData.name')
				, selectFields	= [];

			tplSplit.forEach( function( tplPart ) {

				// Watch for closing ]]
				var field = tplPart.substring( 0, tplPart.indexOf( ']]' ) );

				// Remove part behind | (used for angular filters, e.g. with a date: «|date:'dd.mm.yy'»
				if( field.indexOf( '|' ) > -1 ) {
					field = field.substring( 0, field.indexOf( '|' ) );
				}

				// Remove white spaces
				field = field.replace( /^\s*|\s*$/gi, '' );

				// Remove [0] notation (used to output first element in array)
				field = field.replace( /\[\d+\]/g, '' );

				selectFields.push( field );

			} );

			return selectFields;

		}


	};


} ] )


.run( function( $templateCache ) {

	$templateCache.put( 'relationInputSelectedEntitiesTemplate.html',
		'<div class=\'selected-entities\' data-ng-class=\'{ "single-select": !isMultiSelect }\'>' +
			'<input type=\'text\' />' + // catch [tab]
			'<ul>' +
				// use result for the loop as in the suggestion directive so that we may use the same template
				'<li data-ng-repeat=\'result in entities\' data-ng-class=\'{empty: !result.name}\'>' +
				'<span><!-- see renderTemplate() --></span>' +
				'<button data-ng-click=\'visitEntity($event, result)\'><span class=\'fa fa-pencil\'></span></button>' +
				'<button data-ng-if=\'deletable\' data-ng-click=\'removeEntity($event,result)\'>&times;</button>' +
				'</li>' +
			'</ul>' +
		'</div>'
	);

} );

