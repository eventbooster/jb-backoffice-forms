/**
* Displays a menu with the supported languages.
*
* Use like
* <div data-language-menu-component
* 	data-selected="property" <!-- is always an array consisting of objects returned by self.getLanguage() -->
*	data-is-multi-select="false|true"
*	data-has-translation="functionName"> <!-- must take a paramter languageId, e.g. DE -->
* </div>
*
*/

angular

.module( 'jb.backofficeShared', [] )

.directive( 'languageMenuComponent', [ function() {

	return {
		require					: [ 'languageMenuComponent' ]
		, controller			: 'LanguageMenuComponentController'
		, controllerAs			: 'languageMenuComponent'
		, bindToController		: true
		, templateUrl			: 'languageMenuComponentTemplate.html'
		, link					: function( scope, element, attrs, ctrl ) {
			ctrl[ 0 ].init( element );
		}
		, scope: {
			'selectedLanguages'	: '='
			, 'isMultiSelect'	: '='
			, 'hasTranslation'	: '&'
		}
	};

} ] )

.controller( 'LanguageMenuComponentController', [ 'SessionService', function( SessionService ) {

	var self = this
		, _element;


	self.languages = [];
	self.selectedLanguages = [];


	self.init = function( el ) {
		_element = el;
		self.getLanguages();
	};



	/**
	* Click handler
	*/
	self.toggleLanguage = function( ev, lang ) {

		if( ev && ev.originalEvent && ev.originalEvent instanceof Event ) {
			ev.preventDefault();
		}

		// Only one language may be selected
		if( !self.isMultiSelect ) {
			self.selectedLanguages = [ lang ];
			return;
		}


		// Don't untoggle last language
		if( self.selectedLanguages.length === 1 && self.selectedLanguages[ 0 ].id === lang.id ) {
			return;
		}

		// Add/remove language to self.selectedLanguages

		// Is language already selected? Strangely we cannot use indexOf – language objects change somehow.
		var isSelected = false;
		self.selectedLanguages.some( function( item, index ) {
			if( item.id === lang.id ) {
				isSelected = index;
				return true;
			}
		} );

		if( isSelected !== false ) {
			self.selectedLanguages.splice( isSelected, 1 );
		}
		else {
			self.selectedLanguages.push( lang );
		}

	};




	/**
	* Returns true if language is selected. 
	*/
	self.isSelected = function( language ) {

		var selected = false;
		self.selectedLanguages.some( function( item ) {
			if( language.id === item.id ) {
				selected = true;
				return true;
			}
		} );

		return selected;

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

		var languages = SessionService.get( 'supported-languages', 'local' );

		if( !languages ) {
			console.error( 'LocaleComponentController: supported-languages cannot be retrieved from Session' );
			return;
		}

		languages.forEach( function( language ) {

			self.languages.push( {
				id			: language.language.id
				, code		: language.language.code
			} );

			// Select first language
			if( self.selectedLanguages.length === 0 ) {
				self.toggleLanguage( null, self.languages[ 0 ] );
			}

		} );

	};




	self.checkForTranslation = function( languageId ) {

		if( !self.hasTranslation || !angular.isFunction( self.hasTranslation ) ) {
			console.warn( 'LanguageMenuComponentController: No hasTranslation function was passed' );
		}

		return self.hasTranslation( { 'languageId': languageId } );
	
	};




} ] )

.run( [ '$templateCache', function( $templateCache ) {

	$templateCache.put( 'languageMenuComponentTemplate.html',
		'<ul class=\'nav nav-tabs\'>' +
			'<li data-ng-repeat=\'lang in languageMenuComponent.languages\' data-ng-class=\'{active:languageMenuComponent.isSelected(lang)}\'>' +
				'<a href=\'#\' data-ng-click=\'languageMenuComponent.toggleLanguage( $event, lang )\'>' +
					'{{lang.code|uppercase}}' +
					'<span data-ng-if=\'languageMenuComponent.checkForTranslation(lang.id)\' class=\'fa fa-check\'></span>' +
				'</a>' +
			'</li>' +
		'</ul>'
	);


} ] );