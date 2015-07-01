'use strict';

/**
* Parent controller for all autoInputs. Provides basic functionality like
* - calls afterInit 
* - registers itself at the detailViewController
* - check if child controllers implement updateData()
* - Make element, detailViewController, entityName and entityId available
* - … (needs refactoring!)
*/
var AutoInputController = function( $scope, $attrs ) {

	// Make angular stuff available to methods
	this.$attrs				= $attrs;

	// $scope always holds two objects gotten from auto-form-element: 
	// - optionData
	// - originalAttributes
	// Is passed in from auto-form-element through a newly created 
	// and isolated scope.

	this.$scope				= $scope;

	this.$scope.entityName	= undefined;
	this.$scope.entityUrl	= undefined;

	$scope.data		= {
		value		: undefined
		, name		: $attrs[ 'for' ]
		// Required for backofficeLabel directive
		, valid		: true
	};

	// Needs to be defined in controller.
	/*this.isValid				= function() {
		return $scope.data.valid;
	};*/

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
	// -> I'll be notified on save and when data is gotten
	this.detailViewController.register( this );

	// Call afterInit
	// E.g. replace current element with new directive (see relation-input). Can only be done
	// after the element has been initialized and data set
	if( this.afterInit && angular.isFunction( this.afterInit ) ) {
		this.afterInit();
	}

	// Check if updateData method was implemented.
	if( !this.updateData ) {
		console.error( 'AutoInputController: updateData method missing in %o %o', this, el );
	}
	else {
		this.detailViewController.registerGetDataHandler( this.updateData.bind( this ) );
	}

};
( function() {

	'use strict';

	angular

	// jb.backofficeFormElements: Namespace for new form elements (replacement for jb.backofficeAutoFormElement)
	.module( 'jb.backofficeFormComponents', [] );

} )();

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
			'<label data-backoffice-label data-label-identifier=\'{{data.name}}\' data-is-valid=\'true\' data-is-required=\'false\'></label>' +
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

	$scope.isRequired = function() {
		return this.optionData.required;
	};

	$scope.isValid = function() {
		return !this.optionData.required || ( this.optionData.required && this.$scope.date );
	};

};

AutoDateTimeInputController.prototype = Object.create( AutoInputController.prototype );
AutoDateTimeInputController.prototype.constructor = AutoDateTimeInputController;

AutoDateTimeInputController.prototype.updateData = function( data ) {

	var value = data[ this.$attrs.for];

	if( !value ) {
		this.$scope.date = undefined;
	}
	else {
		this.$scope.date = new Date( value );
	}

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
			'<label data-backoffice-label data-label-identifier=\'{{data.name}}\' data-is-required=\'isRequired()\' data-is-valid=\'isValid()\'></label>' +
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

	this.$q					= $q; // Pass $q to methods. 
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

	// No image set: use empty array
	// Don't use !angular.isArray( data.image ); it will create [ undefined ] if there's no data.image.
	if( !data.image ) {
		data.image = [];
	}


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

		if( !img ) {
			console.warn( 'AutoImageInputController: Can\'t get file property of undefined image %o', img );
			continue;
		}

		// Only files added per drag and drop have a file property that's a file
		if( img.file && img.file instanceof File ) {

			requests.push( this._uploadFile( img ) );

		}

	}

	console.log( 'AutoImageInputController: Upload %o', requests );

	return this.$q.all( requests );

};



AutoImageInputController.prototype._uploadFile = function( img ) {

	console.log( 'AutoImageInputController: Upload file %o to /image through a POST request', img );

	return this.APIWrapperService.request( {
		method				: 'POST'
		, data				: {
			//dataSourceId	: 1
			image			: img.file
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
		return this.$q.reject( err );
	}.bind( this ) );

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
			'<label data-backoffice-label data-label-identifier=\'{{data.name}}\' data-is-required=\'false\' data-is-valid=\'true\'></label>' +
			'<div class=\'col-md-9\' data-image-component data-images=\'images\'></div>' +
		'</div>'
	);

} );








'use strict';

/**
* Auto language input. Inherits from AutoInput.
*/

var AutoLanguageInputController = function( $scope, $attrs ) {

	// Holds current validity state
	var valid = true;

	AutoInputController.call( this, $scope, $attrs );

	// Select: table
	this.select = this.$scope.optionData.tableName + '.*';

	console.log( 'AutoLanguageInputController: select is %o', this.select );

	this.originalData = undefined;


	// Key: id_language
	// Value			: {
	//	identifier		: 'name'
	// }
	// This structure is needed so that we can access the properties directly in the DOM
	// through ngmodel. 
	this.$scope.locales = {};

	$scope.fields = $scope.$eval( this.$scope.originalAttributes.fields );
	$scope.tableName = this.$scope.optionData.tableName;


	// Make data fit $scope.locales
	this.$scope.$on( 'dataUpdate', function( ev, data ) {
		var locs = data[ this.$scope.optionData.tableName ];
		this.setData( locs );
	}.bind( this ) );


	// Used detailView. data-backoffice-label: 
	// see $scope.isValid
	this.isValid = function() {
		return valid;
	};

	// Expose for back-office-label
	$scope.isValid = this.isValid;

	// Called from locale-component if validity changes.
	$scope.setValidity = function( validity ) {
		valid = validity;
	};


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

	console.log( 'AutoLanguageInput: updateData got %o for tableName %o', data, data[ this.$scope.optionData.tableName ] );

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
			// Component itself is never required and always valid. Only single fields may be required or invalid.
			'<label data-backoffice-label data-label-identifier=\'{{data.name}}\' data-is-required=\'false\' data-is-valid=\'isValid()\'></label>' +
				'<div data-locale-component class=\'col-md-9\' data-fields=\'fields\' data-table-name=\'tableName\' data-model=\'locales\' data-set-validity=\'setValidity(validity)\' data-entity-name=\'entityName\'>' +
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

	console.log( 'AutoRelationInputController: select is %o', this.select );




	// Create new scope
	this.scope					= this.$scope.$new();


	// Pass data to label directive
	// and use it to update validity
	this.scope.data				= this.$scope.data;


	// Initial data for the entity gotten from server when site was loaded: 
	// Needed to calculate differences on save
	this.originalData			= undefined;
	
	this.isMultiSelect			= this.$scope.optionData.relationType !== 'single';


	// User should be able to pass in a ngModel (to bind directive's selection to another controller). 
	// If it's provided, use it's name as ngModel; else
	//this.ngModelName 			= this.$scope.originalAttributes.ngModel || 'relations';


	// Set valid on $scope.data (for backoffice-label)
	// Propagate changes to ngModel
	/*this.scope.$watch( 'relations', function( newValue ) {

		if( this.$scope.optionData.required && ( !newValue || newValue.length === 0 ) ) {
			this.$scope.data.valid = false;
		}
		else {
			this.$scope.data.valid = true;
		}
	}.bind( this ) );
*/

	$scope.isValid = function() {

		if( $scope.optionData.required && ( !this.scope.relations || this.scope.relations.length === 0 ) ) {
			return false;
		}

		return true;

	}.bind( this );


	// Holds model
	this.scope.relations = [];


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

			// Post to /mainEntity/currentId/entityName/entityId, path needs to be entityName/entityId, 
			// is automatically prefixed by DetailViewController 
			return {
				url			:  this.$attrs.for + '/' + this.scope.relations[ 0 ].id
				, method	: 'POST'
				//, data		: data
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
		require			: [ 'autoRelationInput', '^detailView' ]
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
			'<label data-backoffice-label data-label-identifier=\'{{data.name}}\' data-is-valid=\'isValid()\'></label>' +
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

	$scope.isValid = function() {
		if( this.$scope.optionData.required && !this.$scope.data.value ) {
			return false;
		}
		return true;		
	}.bind( this );

	//this._validateInput();

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
	console.error( this.detailViewController.getEntityId());
	return {
		url			: ''
		, data		: data
		// entityId may be undefined, false or ''
		, method	: ( !this.detailViewController.getEntityId() && this.detailViewController.getEntityId() !== 0 ) ? 'POST' : 'PATCH'
	};
	
};

/*AutoTextInputController.prototype._validateInput = function() {

	// Update validity for label
	this.$scope.$watch( 'data.value', function( newValue ) {
		if( this.$scope.optionData.required && !newValue ) {
			this.$scope.data.valid = false;
		}
		else {
			this.$scope.data.valid = true;
		}
		console.log( 'AutoTextInputController: set validity to ' + this.$scope.data.valid );
	}.bind( this ) );

};*/





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
			'<label data-backoffice-label data-label-identifier=\'{{data.name}}\' data-is-valid=\'isValid()\'></label>' +
			'<div class=\'col-md-9\'>' +
				'<input type=\'text\' data-ng-attr-id=\'{{ entityName }}-{{ data.name }}-label\' class=\'form-control input-sm\' data-ng-attrs-required=\'isRequired()\' data-ng-model=\'data.value\'/>' +
			'</div>' +
		'</div>'
	);

} );
/**
* Newer version of jb-auto-relation-input. Is not automatically replaced by auto-form-element any more, 
* but needs to be used manually. Gives more freedom in usage. 
* Don't use ngModel as it can't properly deep-watch, especially not through $render
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	/**
	* <input data-backoffice-relation-component
	*	data-suggestion-template="[[property]]"
	* 	data-search-field="property"
	*	data-ng-model="model" // Optional
	*	data-for="enity">
	*/
	.directive( 'backofficeRelationComponent', [ function() {

		return {
			require				: [ 'backofficeRelationComponent', '^detailView' ]
			, controller		: 'BackofficeRelationComponentController'
			, controllerAs		: 'backofficeRelationComponent'
			, bindToController	: true
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'suggestionTemplate'	: '@'
				, 'searchField'			: '@'
				, 'propertyName'		: '@for'
				, 'relationModel'		: '=ngModel'
			}

		};

	} ] )

	.controller( 'BackofficeRelationComponentController', [ '$scope', '$compile', '$templateCache', function( $scope, $compile, $templateCache ) {

		var self = this
			, element
			, detailViewController

			// Data gotten from options call: 
			// - is value required? 
			// - is relation deletable? 
			// - is it a multi or single select field?
			, required
			, deletable
			, multiSelect

			// Original data gotten from server; needed to calculate differences
			// (when storing data)
			, originalData;


		
		// Model for relationInput
		self.relationModel = undefined;



		/**
		* Called by link function
		*/
		self.init = function( el, detailViewCtrl ) {

			element = el;
			detailViewController = detailViewCtrl;

			// Registers itself with detailViewController
			detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			detailViewController.registerGetDataHandler( self.updateData );

		};





		/**
		* GET data gotten from detailView
		*/
		self.updateData = function( data ) {
			var modelValue = angular.isArray( data[ self.propertyName ] ) ? data[ self.propertyName ] : [ data[ self.propertyName ] ];
			self.relationModel = modelValue; 

			// Store data in originalData to calculate differences when saving
			originalData = angular.copy( modelValue );

			console.log( 'BackofficeRelationComponentController: Model updated (updateData) to %o', self.relationModel );
		};




		/**
		* Parse option data gotten from detailViewController
		*/
		self.updateOptionsData = function( data ) {
			
			console.log( 'BackofficeRelationComponentController: Got options data %o', data[ self.propertyName ] );

			var elementData		= data[ self.propertyName ];

			deletable			= elementData.originalRelation !== 'belongsTo';	
			required			= elementData.required;
			multiSelect			= elementData.relationType !== 'single';

			self.replaceElement( multiSelect, deletable );

			// Now let detailViewController know we're ready to get GET data
			detailViewController.register( self );

		};


		/**
		* Returns the select statement for the GET call
		*/
		self.getSelectFields = function() {
			return self.propertyName + '.*';
		};



		/**
		* Replaces itself with the relation-input element
		*/
		self.replaceElement = function( multiSelect, deletable ) {

			var template = $( $templateCache.get( 'backofficeRelationComponentTemplate.html') );

			template
				.find( '[data-relation-input]')
				.attr( 'data-relation-entity-endpoint', self.propertyName )
				.attr( 'data-relation-entity-search-field', self.searchField )
				.attr( 'data-relation-suggestion-template', self.suggestionTemplate )
				.attr( 'data-ng-model', 'backofficeRelationComponent.relationModel' )
				.attr( 'data-multi-select', multiSelect )
				.attr( 'data-deletable', deletable );

			element.replaceWith( template );
			$compile( template )( $scope );

		};


		self.isRequired = function() {
			return required;
		};

		self.isValid = function() {

			// May return 1; therefore use !! to convert to bool.
			var valid = !!( !required || ( required && self.relationModel && self.relationModel.length ) );
			console.log( 'BackofficeRelationComponentController: isValid? %o', valid );
			return valid;

		};







		self.getSaveCalls = function() {

			var saveCalls = multiSelect ? self.getMultiSelectSaveCalls() : self.getSingleSelectSaveCalls();

			console.log( 'BackofficeRelationComponentController: saveCalls are %o', saveCalls );
			return saveCalls;

		};




		/**
		* Creates requests for a single relation. 
		* No delete calls needed.
		*/
		self.getSingleSelectSaveCalls = function() {

			// Relations missing; happens if relations were not set on server nor changed
			// by user
			if( !self.relationModel ) {
				console.log( 'AutoRelationInputController: relationModel empty' );
				return false;
			}


			// Element is required: It must be stored when main entity is created through POSTing to 
			// the main entity with id_entity. It may not be deleted, therefore on updating, a PATCH
			// call must be made to the main entity (and not DELETE/POST)
			if( required ) {

				var relationData = {};
				relationData[ 'id_' + self.propertyName ] = self.relationModel[ 0 ].id;

				// Creating main entity
				if( !detailViewController.getEntityId() ) {

					return {
						url			: false // Use main entity URL
						, method	: 'POST'
						, data		: relationData
					};
				}

				// Updating main entity
				else {
					return {
						url			: false // Use main entity URL
						, method	: 'PATCH'
						, data		: relationData
					};
				}

			}


			// Element was removed
			if( self.relationModel.length === 0 && originalData && originalData.length !== 0 ) {
				return {
					url			: self.propertyName + '/' + originalData[ 0 ].id
					, method	: 'DELETE'
				};
			}

			// Update
			// When scope.data[ 0 ].id != originalData[ 0 ].id 
			// Only [0] has to be checked, as it's a singleSelect
			if( self.relationModel.length ) {
				if( !originalData || ( originalData.length && self.relationModel[ 0 ].id !== originalData[ 0 ].id ) ) {
				
					var data = {};
					data[ detailViewController.fields[ self.propertyName ].relationKey ] = self.relationModel[ 0 ].id;

					// Post to /mainEntity/currentId/entityName/entityId, path needs to be entityName/entityId, 
					// is automatically prefixed by DetailViewController 
					return {
						url			:  self.propertyName + '/' + self.relationModel[ 0 ].id
						, method	: 'POST'
					};
			
				}
			}

			// No changes
			return false;

		};




		self.getMultiSelectSaveCalls = function() {

			// Deletes & posts

			// Select deleted and added elements
			// Just for console.log
			var deleted		= []
				, added		= [];

			var originalIds	= []
				, newIds	= []
				, calls		= [];

			// Make arrays of objects to arrays of ids
			if( self.relationModel && self.relationModel.length ) {
				self.relationModel.forEach( function( item ) {
					newIds.push( item.id );
				} );
			}
			if( originalData && originalData.length ) {
				originalData.forEach( function( item ) {
					originalIds.push( item.id );
				} );
			}


			// Deleted: in originalData, but not in newData
			originalIds.forEach( function( item ) {
				if( newIds.indexOf( item ) === -1 ) {
					deleted.push( item );
					calls.push( {
						method			: 'DELETE'
						, url			: self.propertyName + '/' + item
					} );
				}
			}.bind( this ) );

			// Added: in newData, but not in originalData
			newIds.forEach( function( item ) {
				if( originalIds.indexOf( item ) === -1 ) {
					added.push( item );
					calls.push( {
						method		: 'POST'
						, url		: self.propertyName + '/' + item
					} );
				}
			}.bind( this ) );

			console.log( 'BackofficeRelationComponentController: Added %o, deleted %o – calls: %o', added, deleted, calls );

			if( calls.length === 0 ) {
				return false;
			}

			return calls;

		};





	} ] )


	.run( function( $templateCache ) {

		$templateCache.put( 'backofficeRelationComponentTemplate.html',
			'<div class=\'form-group\'>' +
				'<label data-backoffice-label ' +
					'data-label-identifier=\'{{backofficeRelationComponent.propertyName}}\' ' +
					'data-is-required=\'backofficeRelationComponent.isRequired()\' ' + 
					'data-is-valid=\'backofficeRelationComponent.isValid()\'>' + 
				'</label>' +
				'<div data-relation-input ' +
					'class=\'relation-select col-md-9\'>' +
				'</div>' +
			'</div>'
		);

	} );




} )();


/**
* As a tree is a simple relation on the entity it belongs to, we have to create a component
* that is not initialized through auto-form
*/
angular
.module( 'jb.backofficeFormComponents' )
.directive( 'backofficeTreeComponent', [ function() {

	return {
		require				: [ '^detailView', 'backofficeTreeComponent' ]
		, controller		: 'TreeComponentController'
		, link				: function( scope, element, attrs, ctrl ) {
			
			ctrl[ 1 ].init( element, ctrl[ 0 ] );
		
		}
		, templateUrl		: 'treeTemplate.html'
		, scope				: {
			// Filter: When making GET call, filter is applied, e.g id_menu=5. Is needed if 
			// the nested set is grouped (e.g. menuItems might be grouped by menu). 
			// If data is stored, filter is passed through POST call to the server; 
			// { id: 5, children[ { id: 2 } ] } becomes { id: 5, id_menu: 3, children[ { id: 2, id_menu: 3 } ] } 
			filter			: '=treeComponentFilter'
			, labelName		: '@treeComponentLabel'
			, entityName	: '@for'
			, maxDepth		: '@'
		}
		, bindToController	: true
		, controllerAs		: 'treeComponentController'
	};

} ] )


.controller( 'TreeComponentController', [ '$scope', '$rootScope', '$attrs', '$location', '$q', 'APIWrapperService', function( $scope, $rootScope, $attrs, $location, $q, APIWrapperService ) {

	var self			= this
		, element
		, detailViewController
		, maxDepth		= $attrs.maxDepth || 10;

	self.dataTree		= undefined;

	
	if( !self.labelName || !self.entityName ) {
		console.warn( 'TreeComponentController: labelName or entityName (for) attribute missing' );
	}


	/**
	* Called when user clicks pencil on a list item 
	*/
	self.editEntity = function( ev, id ) {
		
		ev.preventDefault();
		$location.path( '/' + $attrs.for + '/' + id );

	};


	// Called by link function
	self.init = function( el, detViewCtrl ) {

		element					= el;
		detailViewController	= detViewCtrl;

		detailViewController.register( self );

		self.getData();

	};




	/**
	* If we get data through the detailViewController (self.select/registerGetDataHandler)
	* we can't pass a range argument. The menu might be much l
	*/
	self.getData = function() {

		// Create headers
		var headers = {
			range		: '0-0'
		};

		if( self.filter ) {
			var filter = '';
			for( var i in self.filter ) {
				filter = i + '=' + self.filter[ i ];
			}
			headers.filter = filter;
		}

		// Make GET request
		APIWrapperService.request( {
			method			: 'GET'
			, url			: '/' + self.entityName
			, headers		: headers
		} )
		.then( function( data ) {

			self.updateData( data );

		}, function( err ) {
			$rootScope.$broadcast( 'notification', {
				type				: 'error'
				, message			: 'web.backoffice.detail.loadingError'
				, variables			: {
					errorMessage	: err
				}
			} );
		} );

	};





	/**
	* Listens for data gotten in getData
	*/
	self.updateData = function( data ) {

		self.dataTree = getTree( data );
		console.log( 'TreeComponentController: dataTree is %o', self.dataTree );

		// Wait for template to be rendered
		setTimeout( function() {
		
			// Add class required for jQuery plugin			
			element.addClass( 'dd' );

			// Add jQuery plugin
			element.nestable( {
				dragClass				: 'dd-dragelement'
				, placeClass			: 'dd-placeholder'
				, maxDepth				: self.maxDepth
			} );

		}, 500 );
		
	};






	/**
	* Returns data to be stored. There's a special JSON POST call available to store a tree. 
	*/
	self.getSaveCalls = function() {
		
		var treeData = element.nestable( 'serialize' );
		console.log( 'TreeComponentController: Store data %o', treeData );

		var cleanedTreeData = self.cleanTreeData( treeData );
		console.log( 'TreeComponentController: Cleaned data %o, got %o', treeData, cleanedTreeData );

		return {
			method				: 'POST'
			, headers			: {
				'Content-Type'	: 'application/json'
			}
			, url				: '/' + self.entityName
			, data				: cleanedTreeData
		};

	};




	/**
	* nestable('serialize') returns data with a lot of junk on it – remove it and only leave
	* the properties «id» and «children» left. Recurive function.
	* originalTreeData, as serialized by nestable('serialize') is an object with keys 0, 1, 2, 3… 
	* and not an array.
	*/
	self.cleanTreeData = function( originalTreeData, cleaned ) {

		if( !cleaned ) {
			cleaned = [];
		}

		for( var i in originalTreeData ) {

			var branch = originalTreeData[ i ];

			var cleanBranch = {};
			cleanBranch.id = branch.id;

			// If filter was set, add it to the data that will be sent to the server. 
			if( self.filter ) {

				for( var j in self.filter ) {
					cleanBranch[ j ] = self.filter[ j ];
				}

			}

			// Children: Recursively call cleanTreeData
			if( branch.children ) {
				cleanBranch.children = [];
				self.cleanTreeData( branch.children, cleanBranch.children );
			}

			cleaned.push( cleanBranch );

		}

		return cleaned;

	};









	/* https://github.com/joinbox/eb-service-generics/blob/master/controller/MenuItem.js */
    var getTree = function(rows) {

        var rootNode = {};

        // sort the nodes
        rows.sort(function(a, b) {return a.left - b.left;});

        // get the tree, recursive function
        buildTree(rootNode, rows);

        // return the children, the tree has no defined root node
        return rootNode.children;

    };


    var buildTree = function(parentNode, children) {
        var   left          = 'left'
            , right         = 'right'
            , nextRight     = 0
            , nextChildren  = []
            , parent;

        if (!parentNode.children) {parentNode.children = [];}

        children.forEach(function(node) {
            if (node[right] > nextRight) {
                // store next rigth boundary
                nextRight = node[right];

                // reset children array
                nextChildren = [];

                // add to parent
                parentNode.children.push(node);

                // set as parent
                parent = node;
            }
            else if (node[right]+1 === nextRight) {
                nextChildren.push(node);

                // rcursiveky add chuildren
                buildTree(parent, nextChildren);
            }
            else { nextChildren.push(node);}
        });
    };



} ] )




// Base template: create data-tree-form-element-list
.run( function( $templateCache ) {

	$templateCache.put( 'treeBranchTemplate.html',
		'<div class=\'dd-handle\'>' +
			'<span data-ng-if=\'branch[ treeComponentController.labelName ]\'>{{ branch[ treeComponentController.labelName ] }}</span>' +
			'<span data-ng-if=\'!branch[ treeComponentController.labelName ]\'>N/A</span>' +
		'</div>' +
		'<button class=\'fa fa-pencil btn btn-link edit\' data-ng-click=\'treeComponentController.editEntity($event,branch.id)\'></button>' +
		'<ol data-ng-if=\'branch.children\' class=\'dd-list\'>' +
			'<li data-ng-repeat=\'branch in branch.children\' data-ng-include=\'"treeBranchTemplate.html"\' class=\'dd-item\' data-id=\'{{ branch.id }}\'>' +
			'</li>' +
		'</ol>'
	);

	$templateCache.put( 'treeTemplate.html',
		'<ol>' +
			'<li data-ng-repeat=\'branch in treeComponentController.dataTree\' data-ng-include=\'"treeBranchTemplate.html"\' class=\'dd-item\' data-id=\'{{ branch.id }}\'>' +
			'</li>' +
		'</ol>'
	);

} );
angular
.module( 'jb.backofficeAutoFormElement' )

.directive( 'backofficeLabel', [ '$templateCache', '$compile', function( $templateCache, $compile ) {
	return {
		link				: function( $scope, element, attrs, ctrl ) {

			
			var scope	= $scope.$new()
				, tpl	= $( $templateCache.get( 'backofficeLabelTemplate.html' ) );

			// Set validity to true for old components; in template, 
			// we test for !valid||!isValid
			scope.valid = true;

			// scope.required is used for old (auto) elements
			scope.required = scope.name = scope.entityName = undefined;

			$scope.entityName = ctrl[ 0 ].getEntityName();

			$scope.$watch( 'data', function( newValue ) {

				if( !newValue ) {
					scope.valid = scope.name = undefined;
					return;
				}

				scope.valid		= newValue.valid;
				scope.name		= newValue.name;
				console.log( 'backofficeLabel: Updated data %o', newValue );
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
		, require: [ '^detailView' ]
		, scope: {
			labelIdentifier	: '@'
			, isRequired	: '&'
			, isValid		: '&'
		}
	};
} ] )

.run( function( $templateCache ) {
	$templateCache.put( 'backofficeLabelTemplate.html',
		'<label class=\'control-label col-md-3\' data-ng-class=\'{invalid: !isValid()}\'>{{checkValidity()}}' +
			'<span data-ng-if=\'isRequired()||required\' class=\'required-indicator \'>*</span>' +
			'<span data-translate=\'web.backoffice.{{ entityName }}.{{ labelIdentifier }}\'></span>' +
		'</label>'
	);
} );
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
		// Problematic if we have nested detailViews (e.g. in articles on CC)
		// But true is needed to access entityId of a parent detailView (e.g. to filter in a 
		// nested detailView)
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

	// Init (required if we have a nested detailView that has ng-if and is only displayed if a
	// certain condition is met)
	if( $attrs.entityName ) {
		$scope.entityName = $attrs.entityName;
	}



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
		// [data-backoffice-component]: Individual components that get and store data.
		var autoFormElements		= element.find( '[data-auto-form-element], [data-hidden-input], [data-backoffice-tree-component], [data-backoffice-relation-component]', '[data-backoffice-component]' );

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

			// Bool
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
	* For a autoFormElements to register themselves. 
	* - Pushes them to registeredComponents
	* - As soon as all are registered, data is gotten (GET)
	* - Gotten data (GET) is distributed to registered components
	* - Registered components are asked for their data when saving
	* @param {Object} element		The child directive itself (this)
	*/
	self.register = function( el ) {

		self.registeredComponents.push( el );

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
	$scope.save = function( dontNotifyOrRedirect, ev ) {

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
			.then( function( data ) {

				// Entity didn't have an ID (was newly created): Redirect to new entity
				if( $location.path().indexOf( '/new') === $location.path().length - 4 && !dontNotifyOrRedirect ) {
					$location.path( '/' + self.getEntityName() + '/' + self.getEntityId() );
				}

				if( !dontNotifyOrRedirect ) {
					console.log( 'DetailViewController: Show success message on %o', $rootScope );
					$rootScope.$broadcast( 'notification', {
						type				: 'success'
						, message			: 'web.backoffice.detail.saveSuccess'
					} );
				}

				self.updateData();

				return true;

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
			.then( function( mainCallData ) {

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


				// No calls: Resolve instantly
				/*if( !callRequests.length ) {
					var deferred = $q.defer();
					deferred.resolve();
					return deferred.promise;
				}*/

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
		if( call.url && call.url.indexOf( '/' ) === 0 ) {
			url = call.url;
		}
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
		call.data.id_dataSource = BackofficeConfig.dataSourceId;

		return APIWrapperService.request( {
			url			: url
			, data		: call.data
			, method	: call.method
			, headers	: call.headers
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
* 
* Pass 
* - data-read="expression" to only read data if a certain condition is met or
* - data-write="expression" to only write data if a certain condition is met
* Default for both (if not passed) is true. Evals against $scope.$parent.
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
		// Let the user get stuff from the $parent scope to use 
		// as value
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

	self.isValid = function() {
		console.log( 'HiddenInputController: isValid? yes.' );
		return true;
	};


	// Purpose 1: let user select any field passed through for
	// If the elemen's data-read attribute evals to false, don't add the for
	// attribute to the select statement. 
	// This is e.g required for nested sets where we need to *set* «parentNode» or «after» or «before»,
	// but can't select those properties because they're virtual.	
	console.log( 'HiddenInput: for is %o, read %o (hasProperty %o) evals to %o', $attrs.for, $attrs.read, $attrs.hasOwnProperty( 'read' ), $scope.$parent.$eval( $attrs.read ) );
	if( !$attrs.hasOwnProperty( 'read' ) || $scope.$parent.$eval( $attrs.read ) ) {
		self.select = $attrs.for;
		console.log( 'HiddenInput: select is %o', self.select );
	}


	// Purpose 2: Store hidden values
	self.getSaveCalls = function() {

		var writeData = !$attrs.hasOwnProperty( 'write' ) || $scope.$parent.$eval( $attrs.write );

		console.log( 'HiddenInput: Get save calls; $attrs.data is %o, writeData is %o, data-write is %o and evals to %o', $attrs.data, writeData, $attrs.write, $scope.$parent.$eval( $attrs.write ) );

		if( writeData && $attrs.data ) {

			var isRelation = $attrs.for && $attrs.for.indexOf( '.' ) > -1;

			// If there's a star in the for attribute, we're working with a relation. 
			// Store it through POSTing to /entity/id/entity/id instead of sending data.
			if( isRelation ) {

				var entityName 		= $attrs.for.substring( 0, $attrs.for.lastIndexOf( '.' ) )
					, url			= entityName + '/' + $attrs.data;

				console.log( 'HiddenInput: Store relation %o', url );

				return {
					url			: url
					, method	: 'POST'
				};


			}
			else {

				// Compose data
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

		}

		return false;

	};


} ] );
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
		var acceptedFileTypes = [ 'image/jpeg' ];
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
			, tableName		: '='
			// Sets validity of the component on the parent scope
			, setValidity	: '&'
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
	

	/**
	* Array with languageIds that were selected to be edited (multiselect)
	*/ 
	$scope.selectedLanguages	= [];


	/**
	* Contains every field and it's definition, e.g. 
	* {
	*	name			: fieldName (taken from $scope.fields)
	* 	required		: true
	* }
	*/ 
	$scope.fieldDefinitions		= [];



	self.init = function( el, mCtrl ) {
		element = el;

		// Adjust height of textareas
		setTimeout( function() {
			self.adjustHeightOfAllAreas();
		}, 1000 );

		self.setupFieldDefinitionWatcher();
		self.setupValidityWatcher();
		self.setupSelectedLanguagesWatcher();

	};







	self.setupSelectedLanguagesWatcher = function() {
		$scope.$watch( 'selectedLanguages', function( newValue ) {

			// Don't divide by 0
			if( newValue.length === 0 ) {
				return;
			}
			var colWidth = Math.floor( 100 / newValue.length  ) + '%';
			element.find( '.locale-col' ).css( 'width', colWidth );

		}, true );
	};


	/**
	* Watches model for changes and updates validity on *parent scope‹ if
	* function was passed. Therefore tells if the whole component is valid or not (and 
	* not just a single field).
	* If at least one field (required or not) was set, all required fields must be set.
	*/
	self.setupValidityWatcher = function() {
		$scope.$watch( 'model', function( newVal ) {
			
			if( !$scope.setValidity || !angular.isFunction( $scope.setValidity ) ) {
				return;
			}

			// If model is not an object, there's no value missing.
			if( !angular.isObject( newVal ) || !Object.keys( newVal ) ) {
				$scope.setValidity( {validity: true } );
				return;
			}


			var requiredFields		= self.getRequiredFields()
				, valid				= true;


			// Go through all objects. Check if required properties are set.
			Object.keys( newVal ).forEach( function( languageKey ) {

				var languageData		= newVal[ languageKey ]
					, usedFields		= Object.keys( languageData );

				console.log( 'LocaleComponentController: used fields %o, required %o in %o', usedFields, requiredFields, languageData );

				requiredFields.some( function( reqField ) {
					if( usedFields.indexOf( reqField ) === -1 ) {
						valid = false;
						console.log( 'LocaleComponentController: Required field %o missing in %o', reqField, languageData );
					}
				} );

			} );

			$scope.setValidity( { validity: valid } );

		}, true );
	};




	/**
	* Checks if a certain field is valid. 
	*/
	self.isFieldValid = function( languageId, fieldName ) {

		var requiredFields		= self.getRequiredFields()
			, languageData		= $scope.model[ languageId ];

		// No value was set for the language: All it's fields are valid.
		// Not an object: Invalid, don't care.
		if( !languageData || !angular.isObject( languageData ) ) {
			return true;
		}

		// Not valid: Data is set for this language (i.e. some keys exist)
		// but current fieldName was not set. 
		// ATTENTION: '' counts as a set value (empty string).
		if( !languageData[ fieldName ] && languageData[ fieldName ] !== '' ) {
			return false;
		}

		return true;

	};



	/**
	* Checks if a certain field in a certain language is valid. Needed to 
	* set .invalid class on the label.
	*/
	$scope.isFieldValid = function( languageId, fieldName ) {
		return self.isFieldValid( languageId, fieldName );
	};





	/**
	* Returns an array of the required fields
	*/
	self.getRequiredFields = function() {
		var requiredFields = [];
		$scope.fieldDefinitions.forEach( function( fieldDef ) {
			if( fieldDef.required ) {
				requiredFields.push( fieldDef.name );
			}
		} );
		return requiredFields;
	};



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



	/**
	* Watches $scope.tableName and $scope.fields. Calls getFieldDefinitions.
	*/
	self.setupFieldDefinitionWatcher = function() {

		$scope.$watchGroup( [ 'tableName', 'fields' ], function() {
			self.getFieldDefinitions();
		} );

	};


	/** 
	* Gets definitions for fields
	*/
	self.getFieldDefinitions = function() {

		if( !$scope.fields || !$scope.tableName ) {
			console.log( 'LocaleComponentController: fields or tableName not yet ready' );
			return;
		}

		APIWrapperService.request( {
			url				: '/' + $scope.tableName
			, method		: 'OPTIONS'
		} )
		.then( function( data ) {
			self.parseOptionData( data );
		}, function( err ) {
			console.error( 'LocaleComponentController: Could not get OPTION data for table %o: %o', $scope.tableName, err );
		} );

	};


	/**
	* Parses data gotten from OPTIONS call. Goes through OPTIONS data for every field and 
	* sets fieldDefinitions accoringly.
	*/
	self.parseOptionData = function( data ) {

		console.log( 'LocaleComponentController: Parse OPTIONS data %o', data );

		// Reset fieldDefinitions
		$scope.fieldDefinitions = [];

		$scope.fields.forEach( function( field ) {

			$scope.fieldDefinitions.push( {
				name			: field
				, required		: !data[ field ].nullable
				, valid			: true
			} );

		} );

	};



	/**
	* Returns the languages that the current website supports. 
	* They need to be stored (on login) in localStorage in the form of
	* [ {
	*		id: 2
	*		, code: 'it'
	*		, name: 'Italian'
	* } ]
	*/
	self.getLanguages = function() {

		if( !localStorage || !localStorage.getItem( 'supportedLanguages' ) ) {
			console.error( 'LocaleComponentController: supportedLanguages cannot be retrieved from localStorage' );
			return;
		}

		var languages = localStorage.getItem( 'supportedLanguages' );
		languages = JSON.parse( languages );

		languages.forEach( function( language ) {

			$scope.languages.push( {
				id			: language.id
				, code		: language.code
			} );

			// Select first language
			if( $scope.selectedLanguages.length === 0 ) {
				self.toggleLanguage( language.id );
			}

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
					'<div data-ng-repeat=\'fieldDefinition in fieldDefinitions\'>' +
						'<label data-ng-attr-for=\'locale-{{lang.id}}-{{fielDefinition.name}}\' data-ng-class=\'{ "invalid": !isFieldValid(lang.id, fieldDefinition.name)}\'><span data-translate=\'web.backoffice.{{entityName}}.{{fieldDefinition.name}}\' ></span> <span class=\'required-indicator\'data-ng-show=\'fieldDefinition.required\'>*</span></label>' +
						'<textarea data-ng-model=\'model[ lang.id ][ fieldDefinition.name ]\' data-ng-attr-id=\'locale-{{lang.id}}-{{fieldDefinition.name}}\' class=\'form-control\' data-ng-keyup=\'adjustHeight( $event )\' data-ng-focus=\'adjustHeight( $event )\' /></textarea>' +
					'</div>' +
				'</div>' +
			'</div>' +
		'</div>'
	);

} );
/*https://raw.githubusercontent.com/dbushell/Nestable/master/jquery.nestable.js*/
/*!
 * Nestable jQuery Plugin - Copyright (c) 2012 David Bushell - http://dbushell.com/
 * Dual-licensed under the BSD or MIT licenses
 */
;(function($, window, document, undefined)
{
    var hasTouch = 'ontouchstart' in document;

    /**
     * Detect CSS pointer-events property
     * events are normally disabled on the dragging element to avoid conflicts
     * https://github.com/ausi/Feature-detection-technique-for-pointer-events/blob/master/modernizr-pointerevents.js
     */
    var hasPointerEvents = (function()
    {
        var el    = document.createElement('div'),
            docEl = document.documentElement;
        if (!('pointerEvents' in el.style)) {
            return false;
        }
        el.style.pointerEvents = 'auto';
        el.style.pointerEvents = 'x';
        docEl.appendChild(el);
        var supports = window.getComputedStyle && window.getComputedStyle(el, '').pointerEvents === 'auto';
        docEl.removeChild(el);
        return !!supports;
    })();

    var defaults = {
            listNodeName    : 'ol',
            itemNodeName    : 'li',
            rootClass       : 'dd',
            listClass       : 'dd-list',
            itemClass       : 'dd-item',
            dragClass       : 'dd-dragel',
            handleClass     : 'dd-handle',
            collapsedClass  : 'dd-collapsed',
            placeClass      : 'dd-placeholder',
            noDragClass     : 'dd-nodrag',
            emptyClass      : 'dd-empty',
            expandBtnHTML   : '<button data-action="expand" type="button">Expand</button>',
            collapseBtnHTML : '<button data-action="collapse" type="button">Collapse</button>',
            group           : 0,
            maxDepth        : 5,
            threshold       : 20
        };

    function Plugin(element, options)
    {
        this.w  = $(document);
        this.el = $(element);
        this.options = $.extend({}, defaults, options);
        this.init();
    }

    Plugin.prototype = {

        init: function()
        {
            var list = this;

            list.reset();

            list.el.data('nestable-group', this.options.group);

            list.placeEl = $('<div class="' + list.options.placeClass + '"/>');

            $.each(this.el.find(list.options.itemNodeName), function(k, el) {
                list.setParent($(el));
            });

            list.el.on('click', 'button', function(e) {
                if (list.dragEl) {
                    return;
                }
                var target = $(e.currentTarget),
                    action = target.data('action'),
                    item   = target.parent(list.options.itemNodeName);
                if (action === 'collapse') {
                    list.collapseItem(item);
                }
                if (action === 'expand') {
                    list.expandItem(item);
                }
            });

            var onStartEvent = function(e)
            {
                var handle = $(e.target);
                if (!handle.hasClass(list.options.handleClass)) {
                    if (handle.closest('.' + list.options.noDragClass).length) {
                        return;
                    }
                    handle = handle.closest('.' + list.options.handleClass);
                }

                if (!handle.length || list.dragEl) {
                    return;
                }

                list.isTouch = /^touch/.test(e.type);
                if (list.isTouch && e.touches.length !== 1) {
                    return;
                }

                e.preventDefault();
                list.dragStart(e.touches ? e.touches[0] : e);
            };

            var onMoveEvent = function(e)
            {
                if (list.dragEl) {
                    e.preventDefault();
                    list.dragMove(e.touches ? e.touches[0] : e);
                }
            };

            var onEndEvent = function(e)
            {
                if (list.dragEl) {
                    e.preventDefault();
                    list.dragStop(e.touches ? e.touches[0] : e);
                }
            };

            if (hasTouch) {
                list.el[0].addEventListener('touchstart', onStartEvent, false);
                window.addEventListener('touchmove', onMoveEvent, false);
                window.addEventListener('touchend', onEndEvent, false);
                window.addEventListener('touchcancel', onEndEvent, false);
            }

            list.el.on('mousedown', onStartEvent);
            list.w.on('mousemove', onMoveEvent);
            list.w.on('mouseup', onEndEvent);

        },

        serialize: function()
        {
            var data,
                depth = 0,
                list  = this,
                step  = function(level, depth)
                {
                    var array = [ ],
                        items = level.children(list.options.itemNodeName);
                    items.each(function()
                    {
                        var li   = $(this),
                            item = $.extend({}, li.data()),
                            sub  = li.children(list.options.listNodeName);
                        if (sub.length) {
                            item.children = step(sub, depth + 1);
                        }
                        array.push(item);
                    });
                    return array;
                };
            data = step(list.el.find(list.options.listNodeName).first(), depth);
            return data;
        },

        serialise: function()
        {
            return this.serialize();
        },

        reset: function()
        {
            this.mouse = {
                offsetX   : 0,
                offsetY   : 0,
                startX    : 0,
                startY    : 0,
                lastX     : 0,
                lastY     : 0,
                nowX      : 0,
                nowY      : 0,
                distX     : 0,
                distY     : 0,
                dirAx     : 0,
                dirX      : 0,
                dirY      : 0,
                lastDirX  : 0,
                lastDirY  : 0,
                distAxX   : 0,
                distAxY   : 0
            };
            this.isTouch    = false;
            this.moving     = false;
            this.dragEl     = null;
            this.dragRootEl = null;
            this.dragDepth  = 0;
            this.hasNewRoot = false;
            this.pointEl    = null;
        },

        expandItem: function(li)
        {
            li.removeClass(this.options.collapsedClass);
            li.children('[data-action="expand"]').hide();
            li.children('[data-action="collapse"]').show();
            li.children(this.options.listNodeName).show();
        },

        collapseItem: function(li)
        {
            var lists = li.children(this.options.listNodeName);
            if (lists.length) {
                li.addClass(this.options.collapsedClass);
                li.children('[data-action="collapse"]').hide();
                li.children('[data-action="expand"]').show();
                li.children(this.options.listNodeName).hide();
            }
        },

        expandAll: function()
        {
            var list = this;
            list.el.find(list.options.itemNodeName).each(function() {
                list.expandItem($(this));
            });
        },

        collapseAll: function()
        {
            var list = this;
            list.el.find(list.options.itemNodeName).each(function() {
                list.collapseItem($(this));
            });
        },

        setParent: function(li)
        {
            if (li.children(this.options.listNodeName).length) {
                li.prepend($(this.options.expandBtnHTML));
                li.prepend($(this.options.collapseBtnHTML));
            }
            li.children('[data-action="expand"]').hide();
        },

        unsetParent: function(li)
        {
            li.removeClass(this.options.collapsedClass);
            li.children('[data-action]').remove();
            li.children(this.options.listNodeName).remove();
        },

        dragStart: function(e)
        {
            var mouse    = this.mouse,
                target   = $(e.target),
                dragItem = target.closest(this.options.itemNodeName);

            this.placeEl.css('height', dragItem.height());

            mouse.offsetX = e.offsetX !== undefined ? e.offsetX : e.pageX - target.offset().left;
            mouse.offsetY = e.offsetY !== undefined ? e.offsetY : e.pageY - target.offset().top;
            mouse.startX = mouse.lastX = e.pageX;
            mouse.startY = mouse.lastY = e.pageY;

            this.dragRootEl = this.el;

            this.dragEl = $(document.createElement(this.options.listNodeName)).addClass(this.options.listClass + ' ' + this.options.dragClass);
            this.dragEl.css('width', dragItem.width());

            dragItem.after(this.placeEl);
            dragItem[0].parentNode.removeChild(dragItem[0]);
            dragItem.appendTo(this.dragEl);

            $(document.body).append(this.dragEl);
            this.dragEl.css({
                'left' : e.pageX - mouse.offsetX,
                'top'  : e.pageY - mouse.offsetY
            });
            // total depth of dragging item
            var i, depth,
                items = this.dragEl.find(this.options.itemNodeName);
            for (i = 0; i < items.length; i++) {
                depth = $(items[i]).parents(this.options.listNodeName).length;
                if (depth > this.dragDepth) {
                    this.dragDepth = depth;
                }
            }
        },

        dragStop: function(e)
        {
            var el = this.dragEl.children(this.options.itemNodeName).first();
            el[0].parentNode.removeChild(el[0]);
            this.placeEl.replaceWith(el);

            this.dragEl.remove();
            this.el.trigger('change');
            if (this.hasNewRoot) {
                this.dragRootEl.trigger('change');
            }
            this.reset();
        },

        dragMove: function(e)
        {
            var list, parent, prev, next, depth,
                opt   = this.options,
                mouse = this.mouse;

            this.dragEl.css({
                'left' : e.pageX - mouse.offsetX,
                'top'  : e.pageY - mouse.offsetY
            });

            // mouse position last events
            mouse.lastX = mouse.nowX;
            mouse.lastY = mouse.nowY;
            // mouse position this events
            mouse.nowX  = e.pageX;
            mouse.nowY  = e.pageY;
            // distance mouse moved between events
            mouse.distX = mouse.nowX - mouse.lastX;
            mouse.distY = mouse.nowY - mouse.lastY;
            // direction mouse was moving
            mouse.lastDirX = mouse.dirX;
            mouse.lastDirY = mouse.dirY;
            // direction mouse is now moving (on both axis)
            mouse.dirX = mouse.distX === 0 ? 0 : mouse.distX > 0 ? 1 : -1;
            mouse.dirY = mouse.distY === 0 ? 0 : mouse.distY > 0 ? 1 : -1;
            // axis mouse is now moving on
            var newAx   = Math.abs(mouse.distX) > Math.abs(mouse.distY) ? 1 : 0;

            // do nothing on first move
            if (!mouse.moving) {
                mouse.dirAx  = newAx;
                mouse.moving = true;
                return;
            }

            // calc distance moved on this axis (and direction)
            if (mouse.dirAx !== newAx) {
                mouse.distAxX = 0;
                mouse.distAxY = 0;
            } else {
                mouse.distAxX += Math.abs(mouse.distX);
                if (mouse.dirX !== 0 && mouse.dirX !== mouse.lastDirX) {
                    mouse.distAxX = 0;
                }
                mouse.distAxY += Math.abs(mouse.distY);
                if (mouse.dirY !== 0 && mouse.dirY !== mouse.lastDirY) {
                    mouse.distAxY = 0;
                }
            }
            mouse.dirAx = newAx;

            /**
             * move horizontal
             */
            if (mouse.dirAx && mouse.distAxX >= opt.threshold) {
                // reset move distance on x-axis for new phase
                mouse.distAxX = 0;
                prev = this.placeEl.prev(opt.itemNodeName);
                // increase horizontal level if previous sibling exists and is not collapsed
                if (mouse.distX > 0 && prev.length && !prev.hasClass(opt.collapsedClass)) {
                    // cannot increase level when item above is collapsed
                    list = prev.find(opt.listNodeName).last();
                    // check if depth limit has reached
                    depth = this.placeEl.parents(opt.listNodeName).length;
                    if (depth + this.dragDepth <= opt.maxDepth) {
                        // create new sub-level if one doesn't exist
                        if (!list.length) {
                            list = $('<' + opt.listNodeName + '/>').addClass(opt.listClass);
                            list.append(this.placeEl);
                            prev.append(list);
                            this.setParent(prev);
                        } else {
                            // else append to next level up
                            list = prev.children(opt.listNodeName).last();
                            list.append(this.placeEl);
                        }
                    }
                }
                // decrease horizontal level
                if (mouse.distX < 0) {
                    // we can't decrease a level if an item preceeds the current one
                    next = this.placeEl.next(opt.itemNodeName);
                    if (!next.length) {
                        parent = this.placeEl.parent();
                        this.placeEl.closest(opt.itemNodeName).after(this.placeEl);
                        if (!parent.children().length) {
                            this.unsetParent(parent.parent());
                        }
                    }
                }
            }

            var isEmpty = false;

            // find list item under cursor
            if (!hasPointerEvents) {
                this.dragEl[0].style.visibility = 'hidden';
            }
            this.pointEl = $(document.elementFromPoint(e.pageX - document.body.scrollLeft, e.pageY - (window.pageYOffset || document.documentElement.scrollTop)));
            if (!hasPointerEvents) {
                this.dragEl[0].style.visibility = 'visible';
            }
            if (this.pointEl.hasClass(opt.handleClass)) {
                this.pointEl = this.pointEl.parent(opt.itemNodeName);
            }
            if (this.pointEl.hasClass(opt.emptyClass)) {
                isEmpty = true;
            }
            else if (!this.pointEl.length || !this.pointEl.hasClass(opt.itemClass)) {
                return;
            }

            // find parent list of item under cursor
            var pointElRoot = this.pointEl.closest('.' + opt.rootClass),
                isNewRoot   = this.dragRootEl.data('nestable-id') !== pointElRoot.data('nestable-id');

            /**
             * move vertical
             */
            if (!mouse.dirAx || isNewRoot || isEmpty) {
                // check if groups match if dragging over new root
                if (isNewRoot && opt.group !== pointElRoot.data('nestable-group')) {
                    return;
                }
                // check depth limit
                depth = this.dragDepth - 1 + this.pointEl.parents(opt.listNodeName).length;
                if (depth > opt.maxDepth) {
                    return;
                }
                var before = e.pageY < (this.pointEl.offset().top + this.pointEl.height() / 2);
                    parent = this.placeEl.parent();
                // if empty create new list to replace empty placeholder
                if (isEmpty) {
                    list = $(document.createElement(opt.listNodeName)).addClass(opt.listClass);
                    list.append(this.placeEl);
                    this.pointEl.replaceWith(list);
                }
                else if (before) {
                    this.pointEl.before(this.placeEl);
                }
                else {
                    this.pointEl.after(this.placeEl);
                }
                if (!parent.children().length) {
                    this.unsetParent(parent.parent());
                }
                if (!this.dragRootEl.find(opt.itemNodeName).length) {
                    this.dragRootEl.append('<div class="' + opt.emptyClass + '"/>');
                }
                // parent root list has changed
                if (isNewRoot) {
                    this.dragRootEl = pointElRoot;
                    this.hasNewRoot = this.el[0] !== this.dragRootEl[0];
                }
            }
        }

    };

    $.fn.nestable = function(params)
    {
        var lists  = this,
            retval = this;

        lists.each(function()
        {
            var plugin = $(this).data("nestable");

            if (!plugin) {
                $(this).data("nestable", new Plugin(this, params));
                $(this).data("nestable-id", new Date().getTime());
            } else {
                if (typeof params === 'string' && typeof plugin[params] === 'function') {
                    retval = plugin[params]();
                }
            }
        });

        return retval || lists;
    };

})(window.jQuery || window.Zepto, window, document);