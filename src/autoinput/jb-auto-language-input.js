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
			//'<label data-backoffice-label data-label-identifier=\'{{data.name}}\' data-is-required=\'false\' data-is-valid=\'isValid()\'></label>' +
				'<div data-locale-component class=\'col-md-12\' data-fields=\'fields\' data-table-name=\'tableName\' data-model=\'locales\' data-set-validity=\'setValidity(validity)\' data-entity-name=\'entityName\'>' +
			'</div>' +
		'</div>'
	);

} );







