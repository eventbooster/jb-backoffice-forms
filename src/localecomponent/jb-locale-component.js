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