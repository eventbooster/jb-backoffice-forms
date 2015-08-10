/**
* Edit/display markdown
*/
( function() {

	'use strict';

	angular

	.module( 'jb.backofficeFormComponents' )

	/**
	* <input data-backoffice-markdown-component 
	*	data-for="enity">
	*/
	.directive( 'backofficeMarkdownComponent', [ function() {

		return {
			require				: [ 'backofficeMarkdownComponent', '^detailView' ]
			, controller		: 'BackofficeMarkdownComponentController'
			, controllerAs		: 'backofficeMarkdownComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeMarkdownComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'suggestionTemplate'	: '@'
				, 'searchField'			: '@'
				, 'propertyName'		: '@for'
			}

		};

	} ] )

	.controller( 'BackofficeMarkdownComponentController', [ '$scope', function( $scope ) {

		var self = this
			, _element
			, _detailViewController;

		self.init = function( el, detailViewCtrl ) {
			_element = el;
			_detailViewController = detailViewCtrl;
		};



	} ] )


	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeMarkdownComponentTemplate.html', 

			'<div>' +
				'<div data-language-menu-component data-selected-languages=\'selectedLanguages\' data-is-multi-select=\'false\' data-has-translation=\'hasTranslation(languageId)\'></div>' +
			'</div>'

		);

	} ]);


} )();

