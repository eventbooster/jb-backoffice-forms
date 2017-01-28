/**
* Directive for locales
*/

( function() {

	'use strict';


	angular
	.module( 'jb.localeComponent', [ 'jb.apiWrapper' ] )
	.directive( 'localeComponent', [ function() {

		return {
			link				: function( scope, element, attrs, ctrl ) {
				ctrl.init(element);
			}
			, controller		: 'LocaleComponentController'
			, templateUrl		: 'localeComponentTemplate.html'
			, scope				: {
				  fields		: '='
				, model			: '='
				, entityName	: '=' // For translation
				, tableName		: '='
				// Sets validity of the component on the parent scope
				, setValidity	: '&'
			}
		};

	} ] )

	.controller( 'LocaleComponentController', [
              '$scope'
            , 'APIWrapperService'
            //, 'backofficeFormEvents'
            , function( $scope, APIWrapperService/*, formEvents*/ ) {

		var   self = this
			, element;

        //this.formEvents = formEvents;

		// [
		// 	{
		//		id		: 1 ,
		//		code	: 'de'
		//	}
		// ]
		$scope.languages			= [];
		

		/**
		* Array with languageIds that were selected to be edited (multiselect)
		*/ 
		$scope.selectedLanguages	= undefined;


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
            //@todo: update this as soon as we receive data
			setTimeout( function() {
				self.adjustHeightOfAllAreas();
			}, 1000 );

			self.setupFieldDefinitionWatcher();
			self.setupValidityWatcher();
			self.setupSelectedLanguagesWatcher();
			//$scope.$emit(formEvents.registerComponents, self);
		};







		self.setupSelectedLanguagesWatcher = function() {
			$scope.$watch( 'selectedLanguages', function( newValue ) {

				// newValue available? Return if length is 0 to not divide by 0
				if( !newValue || !angular.isArray( newValue ) || newValue.length === 0 ) {
					return;
				}

				var colWidth = Math.floor( 100 / newValue.length  ) + '%';
				element.find( '.locale-col' ).css( 'width', colWidth );

				setTimeout( function() {
					self.adjustHeightOfAllAreas();
				} );

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

			// Field is not required.
			if( requiredFields.indexOf( fieldName ) === -1 ) {
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



		///////////////////////////////////////////////////////////////////////////////////////////////////////////
		//
		//   HEIGHT
		//


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

			// #TODO: Update height of all textareas to the highest one. 
			textarea.height( Math.max( h, parseInt( textarea.css( 'lineHeight'), 10 ) ) );

		};





		///////////////////////////////////////////////////////////////////////////////////////////////////////////
		//
		//   UI Stuff
		//


		$scope.isSelected = function( language ) {
			return $scope.selectedLanguages.indexOf( language ) > -1;
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
					//, required		: !data.relations.find((relation) => relation.name === field)
					, valid			: true
				} );

			} );

			console.log('LocaleComponentController: field definitions are %o', $scope.fieldDefinitions);

		};




	} ] )

	.run( function( $templateCache ) {

		$templateCache.put( 'localeComponentTemplate.html',
			'<div class=\'locale-component\'>' +
				'<div data-language-menu-component data-selected-languages=\'selectedLanguages\' data-is-multi-select=\'true\' data-has-translation=\'hasTranslation(languageId)\'></div>' +
				'<div class=\'locale-content clearfix\'>' +
					'<div class=\'locale-col\' data-ng-repeat=\'lang in selectedLanguages\'>' +
						'<p>{{ lang.code | uppercase }}</p>' +
						'<div data-ng-repeat=\'fieldDefinition in fieldDefinitions\'>' +

							'<label data-ng-attr-for=\'locale-{{lang.id}}-{{fielDefinition.name}}\' data-ng-class=\'{ "invalid": !isFieldValid(lang.id, fieldDefinition.name)}\'>' + 
								// Required asterisk
								'<span data-translate=\'web.backoffice.{{entityName}}.{{fieldDefinition.name}}\' ></span> <span class=\'required-indicator\'data-ng-show=\'fieldDefinition.required\'>*</span>' +
							'</label>' +
							'<textarea data-ng-model=\'model[ lang.id ][ fieldDefinition.name ]\' data-ng-attr-id=\'locale-{{lang.id}}-{{fieldDefinition.name}}\' class=\'form-control\' data-ng-keyup=\'adjustHeight( $event )\' data-ng-focus=\'adjustHeight( $event )\' /></textarea>' +

						'</div>' +
					'</div>' +
				'</div>' +
			'</div>'
		);

	} );

} )();

