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