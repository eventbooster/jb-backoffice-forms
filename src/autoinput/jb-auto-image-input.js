'use strict';

/**
* Auto image input. Inherits from AutoInput.
*/

var AutoImageInputController = function( $scope, $attrs, $q, APIWrapperService ) {

	AutoInputController.call( this, $scope, $attrs );

	// Select: table
	this.select				= 'image.*,image.bucket.url';
	this.originalData		= undefined;

	this.$q					= $q; // Pass $q to methods. 
	this.APIWrapperService	= APIWrapperService;


	// Contains data of uploaded files
	// Needed between this.beforeSaveTasks and this.getSaveCalls
	//this.uploadedFilesData	= [];


	/**
	* Data gotten from server or newly added image. See image-component
	*/
	this.$scope.images		= [];

};

AutoImageInputController.prototype = Object.create( AutoInputController.prototype );
AutoImageInputController.prototype.constructor = AutoImageInputController;

AutoImageInputController.prototype.updateData = function( data ) {

	// No image set: use empty array
	// Don't use !angular.isArray( data.image ); it will create [ undefined ] if there's no data.image.
	if( !data.image ) {
		data.image = [];
	}


	// Image has a hasOne-relation: Is delivered as an object (instead of an array):
	// Convert to array
	if( !angular.isArray( data.image ) ) {
		data.image = [ data.image ];
	}



	this.$scope.images = data.image ? data.image : [];

	// Copy to originalData (will be used on getSaveCalls())
	if( data.image && angular.isArray( data.image ) ) {
		this.originalData = data.image.slice();
	}
	else {
		this.originalData = [];
	}

};



AutoImageInputController.prototype.getSaveCalls = function() {

	// Calls to be returned
	var ret			= []

		// IDs of images present on init
		, originalIds	= []

		// IDs of images present on save
		, scopeIds		= [];


	if( this.originalData && this.originalData.length ) {
		this.originalData.forEach( function( img ) {
			originalIds.push( img.id );
		} );
	}

	this.$scope.images.forEach( function( img ) {
		scopeIds.push( img.id );
	} );

	// Deleted
	originalIds.forEach( function( id ) {
		if( scopeIds.indexOf( id ) === -1 ) {
			// Remove relation (relative path, will be prefixed with current entity's path)
			ret.push( {
				method		: 'DELETE'
				, url		: 'image/' + id
			} );
			// Remove image (try to)
			ret.push( {
				method		: 'DELETE'
				, url		: '/image/' + id
			} );
		}
	} );

	// Added
	scopeIds.forEach( function( id ) {
		if( originalIds.indexOf( id ) === -1 ) {
			ret.push( {
				method		: 'POST'
				, url		: 'image/' + id
			} );
		}
	} );

	console.log( 'AutoImageInput: Calls to be made are %o', ret );
	return ret;

};


AutoImageInputController.prototype.beforeSaveTasks = function() {

	var requests = [];

	// Upload all added files (if there are any), then resolve promise
	for( var i = 0; i < this.$scope.images.length; i++ ) {

		var img		= this.$scope.images[ i ];

		if( !img ) {
			console.warn( 'AutoImageInputController: Can\'t get file property of undefined image %o', img );
			continue;
		}

		// Only files added per drag and drop have a file property that's a file
		if( img.file && img.file instanceof File ) {

			requests.push( this._uploadFile( img ) );

		}

	}

	console.log( 'AutoImageInputController: Upload %o', requests );

	return this.$q.all( requests );

};



AutoImageInputController.prototype._uploadFile = function( img ) {

	console.log( 'AutoImageInputController: Upload file %o to /image through a POST request', img );

	return this.APIWrapperService.request( {
		method				: 'POST'
		, data				: {
			//dataSourceId	: 1
			image			: img.file
		}
		, url				: '/image'
	} )
	.then( function( data ) {

		// Store data gotten from server on $scope.images[ i ] ) 
		// instead of the image file itself
		var index = this.$scope.images.indexOf( img );

		this.$scope.images
			.splice( index, 1, data);

		return true;

	}.bind( this ), function( err ) {
		return this.$q.reject( err );
	}.bind( this ) );

};







angular
.module( 'jb.backofficeAutoFormElement' )

/**
* Directive for an autoFormElement of type 'text'
*/
.directive( 'autoImageInput', [ function() {

	return {
		require			: [ 'autoImageInput', '^detailView' ]
		, controller	: 'AutoImageInputController'
		, link			: function( scope, element, attrs, ctrl ) {
			ctrl[ 0 ].init( element, ctrl[ 1 ] );
		}
		, templateUrl	: 'autoImageInputTemplate.html'
	};


} ] )

.controller( 'AutoImageInputController', AutoImageInputController )



.run( function( $templateCache ) {

	$templateCache.put( 'autoImageInputTemplate.html',
		'<div class=\'row\'>' +
			'<label data-backoffice-label data-label-identifier=\'{{data.name}}\' data-is-required=\'false\' data-is-valid=\'true\'></label>' +
			'<div class=\'col-md-9\' data-image-component data-images=\'images\'></div>' +
		'</div>'
	);

} );







