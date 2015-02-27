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