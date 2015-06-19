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