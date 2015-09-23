'use strict';

var AutoDateTimeInputController = function( $scope, $attrs ) {

	AutoInputController.call( this, $scope, $attrs );

	// Set select for detailViewDirective
	this.select					= $attrs.for;

	// Initial data for the entity gotten from server when site was loaded: 
	// Needed to calculate differences on save
	this.originalData			= undefined;
	
	this.$scope.values 			= {
		date					: undefined
	};

	// Display time only if type is datetime and not date
	$scope.showTime				= this.$scope.optionData.time;

	$scope.isRequired = function() {
		return this.optionData.required;
	};

	$scope.isValid = function() {
		return !this.optionData.required || ( this.optionData.required && this.$scope.values.date );
	};

};

AutoDateTimeInputController.prototype = Object.create( AutoInputController.prototype );
AutoDateTimeInputController.prototype.constructor = AutoDateTimeInputController;

AutoDateTimeInputController.prototype.updateData = function( data ) {

	var value = data[ this.$attrs.for];

	if( !value ) {
		this.$scope.values.date = undefined;
	}
	else {
		this.$scope.values.date = new Date( value );
	}

	this.originalData = this.$scope.values.date;

};

function pad( nr ) {
	return nr < 10 ? '0' + nr : nr;
}

AutoDateTimeInputController.prototype.getSaveCalls = function() {

	var date			= this.$scope.values.date;

	// Empty field (and original empty)
	if( !date && !this.originalData ) {
		return false;
	}

	// No change
	if( this.originalData && date && date.getTime() === this.originalData.getTime() ) {
		return false;
	}

	// Removed data
	if( this.originalData && !date ) {
		var emptyData = {};
		emptyData[ this.$scope.data.name ] = '';
		return {
			data: emptyData
		};
	}

	// Date change
	var dateString		= date.getFullYear() + '-' + pad( date.getMonth() + 1 ) + '-' + pad( date.getDate() ) + ' ' + pad( date.getHours() ) + ':' + pad( date.getMinutes() ) + ':' + pad( date.getSeconds() )
		, data			= {};

	data[ this.$scope.data.name ] = dateString;

	return {
		data		: data
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
			// input[time] and input[date] are bound to the same model. Should work nicely.
			'<div data-ng-class=\'{ "col-md-9": !showTime, "col-md-5": showTime}\'>' +
				'<input type=\'date\' class=\'form-control input-sm\' data-ng-model=\'values.date\'>' +
			'</div>' +
			'<div class=\'col-md-4\' data-ng-if=\'showTime\'>' +
				'<input type=\'time\' class=\'form-control input-sm\' data-ng-model=\'values.date\' />' +
			'</div>' +
		'</div>'
	);

} );