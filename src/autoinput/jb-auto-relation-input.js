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


