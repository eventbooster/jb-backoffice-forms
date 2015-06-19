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