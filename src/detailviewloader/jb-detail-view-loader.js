/**
* Loads detail view template and controller that correspond to the current URL
* Then compiles them into the current element
* Loaded in $routeProvider
*/
angular
.module( 'jb.backofficeDetailView' )
.controller( 'DetailViewLoaderController', [ '$scope', '$location', '$http', '$q', '$compile', function( $scope, $location, $http, $q, $compile ) {


	var self = this;


	// Get entity & id from path
	var path			= $location.path()
		, pathParts		= path.split( '/' );

	// Path missing
	if( !pathParts.length ) {
		alert( 'no path provided' );
		return;
	}

	var entityName		= pathParts[ 1 ]
		, entityId		= pathParts[ 2 ];

	console.log( 'DetailViewLoader: entity name is %o, id %o', entityName, entityId );



	/**
	* Generate controller's name and template URL from current url
	*/
	self.getControllerAndTemplate = function( entityName, entityId ) {
		
		// EntityName is missing
		if( !entityName ) {
			return false;
		}

		// camel-case instead of camelCase
		var entityDashed		= entityName.replace( /[A-Z]/g, function( match ) { return '-' + match.toLowerCase(); } )
			, templateBasePath	= 'src/app/' + entityDashed + '/'
			, templatePath
			, controllerName;

		// List
		if( !entityId ) {
			controllerName	= 'ebBackoffice' + entityName.substring( 0, 1 ).toUpperCase() + entityName.substring( 1 ) + 'ListCtrl';
			templatePath	= templateBasePath + entityDashed + '-list.tpl.html';
		}


		// New or Edit (same template)
		else if( entityId ==='new' || !isNaN( parseInt( entityId, 10 ) ) ) {
			templatePath	= templateBasePath + entityDashed + '-detail.tpl.html';
		}

		// Id is not 'new' nor a number
		else {
			console.error( 'unknown entity id: %o', entityId );
		}

		return {
			controllerName		: controllerName
			, templateUrl		: templatePath
		};

	};


	/**
	* Gets template from server, returns promise
	*/
	self.getTemplate = function( templateUrl ) {
		return $http( { method: 'GET', url: templateUrl,  headers: { 'accept': 'text/html' } } )
			.then( function( data ) {
				console.log( 'DetailViewLoader: got template %o', data );
				return data.data;
			}, function( err ) {
				return $q.reject( err );
			} );
	};


	/**
	* Attachs template and controller to [ng-view], renders it 
	*/
	self.renderTemplate = function( template, controllerName) {
		
		var ngView		= $( '[ng-view], [data-ng-view]' );

		// Create parent that holds controller
		var parent		= $( '<div></div>' );
		if( controllerName ) {
			parent.attr( 'data-ng-controller', controllerName );
		}
		parent.html( template );

		console.log( 'DetailViewLoader: render Template %o with controller %o', parent, controllerName );

		ngView
			.empty()
			.append( parent );

		$compile( parent )( $scope );

	};




	/**
	* Gets the template and controller to be rendered, and does so.
	*/
	self.init = function() {
	
		var controllerAndTemplate = self.getControllerAndTemplate( entityName, entityId );

		// Entity was not available, getControllerAndTemplate returned false.
		if( !controllerAndTemplate ) {
			self.renderTemplate( '404 – Page could not be found', false );
			return;
		}


		// Everything fine
		var templateUrl			= controllerAndTemplate.templateUrl
			, controllerName	= controllerAndTemplate.controllerName;

		self.getTemplate( templateUrl )
			.then( function( data ) {
				self.renderTemplate( data, controllerName );
			}, function( err ) {

				var ngView		= $( '[ng-view], [data-ng-view]' );
				ngView.text( 'Template ' + templateUrl + ' not found. Entity can\'t be edited' );

			} );

	};


	self.init();




} ] );