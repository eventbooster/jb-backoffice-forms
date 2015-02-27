'use strict';


/**
* Renders all default stuff for a listview, including
* - title
* - notifications
* - add button
* Transcludes datatable for the entity.
*/
angular
.module( 'jb.backofficeListView', [] )
.directive( 'listView', [ '$location', '$filter', function( $location, $filter ) {

	return {
		link			: function( scope, element, attrs ) {


			// Path (e.g. artist); remove leading slash
			var entity = $location.path().substring( 1 );

			// TRANSLATIONS
			// Set translations
			scope.titleText = $filter( 'translate' )( 'web.backoffice.' + entity + '.maintitle' );
			scope.addText = $filter( 'translate' )( 'web.backoffice.' + entity + '.add' );

			// FUNCTIONS
			// Redirect functions for add and edit
			scope.add = function() {
				$location.path( '/' + entity + '/new' );
			};

			scope.edit = function( id ) {
				$location.path( '/' + entity + '/' + id );
			};


			// Edit fields ( was initiated in ebBackoffice[EntityName])
			// - Prepend with ID
			// - Append edit button
			if( scope.fields ) {
				// ID
				scope.fields.unshift( {
					title		: 'ID'
					, selector	: 'id'
				} );
				// Edit
				scope.fields.push( {
					content: function( data ) {
						return '<button class="btn btn-default btn-sm" data-ng-click="edit('+data.id+')">' + $filter( 'translate' )( 'web.backoffice.edit' ) + '</button>';
					}
				} );
			}


		}
		, templateUrl	: 'listViewTemplate.html'
		, transclude	: true
	};

} ] )
.run( function( $templateCache ) {

	$templateCache.put( 'listViewTemplate.html',
		'<div clas=\'col-xs-12\'>' +
			'<h3>{{ titleText }}</h3>' +
			'<div class=\'boxed\'>' +
				'<div class=\'inner\'>' +

					'<div notification></div>' +
					'<div class=\'row list-menu\'>' +
						'<div class=\'col-xs-12\'>' +
							'<button type=\'button\' class=\'btn btn-sm btn-primary pull-right\' ng-click=\'add()\'>' +
								'<i class=\'fa fa-plus\'></i>' +
								'{{ addText }}' +
							'</button>' +
						'</div>' +
					'</div>' +
					'<div class=\'row\'>' +
						'<div class=\'col-xs-12\'>' +
							// Datatable goes here
							'<div data-ng-transclude></div>' +
						'</div>' +
					'</div>' +
				'</div>' +
			'</div>' +
		'</div>'
	);

} );